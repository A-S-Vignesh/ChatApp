import { Server } from "socket.io";
import http from "http";
import { Types } from "mongoose";
import { auth } from "./lib/auth.js";
import { fromNodeHeaders } from "better-auth/node";
import Chat from "./models/Chat.js";
import User from "./models/User.js";
import Message from "./models/Message.js";

/* Module-level so routes can query online state */
const onlineUsers = new Map<string, number>();

export function isUserOnline(userId: string): boolean {
  return (onlineUsers.get(userId) ?? 0) > 0;
}

/* Per-socket presence: which chat is the user actively viewing, and is the
   page actually visible? A user counts as "focused on chat X" only if at
   least one of their sockets is (visible: true AND activeChatId === X).
   Used to decide whether to send a push notification. */
type SocketPresence = { userId: string; activeChatId: string | null; visible: boolean };
const socketPresence = new Map<string, SocketPresence>();

export function isUserFocusedOn(userId: string, chatId: string): boolean {
  for (const p of socketPresence.values()) {
    if (p.userId === userId && p.visible && p.activeChatId === chatId) return true;
  }
  return false;
}

/* ── Privacy cache ──────────────────────────────────────────────────────
   Privacy preferences gate high-frequency events (typing, online/offline),
   so we cache them in memory instead of hitting the DB per event. Populated
   on connect; updated in real time by `setUserPrivacyCache` from the route
   handler when a user changes their settings.

   The toggles are MUTUAL: turning a flag off both stops you from emitting
   that signal AND stops you from receiving it from others. That's enforced
   in the helpers below. */
export type UserPrivacy = {
  readReceipts: boolean;
  typingIndicator: boolean;
  lastSeen: "everyone" | "nobody";
  showOnline: boolean;
};

const DEFAULT_PRIVACY: UserPrivacy = {
  readReceipts: true,
  typingIndicator: true,
  lastSeen: "everyone",
  showOnline: true,
};

const userPrivacy = new Map<string, UserPrivacy>();

function normalizePrivacy(raw: any): UserPrivacy {
  return {
    readReceipts: raw?.readReceipts !== false,
    typingIndicator: raw?.typingIndicator !== false,
    lastSeen: raw?.lastSeen === "nobody" ? "nobody" : "everyone",
    showOnline: raw?.showOnline !== false,
  };
}

export function getCachedUserPrivacy(userId: string): UserPrivacy {
  return userPrivacy.get(userId) ?? DEFAULT_PRIVACY;
}

export function setUserPrivacyCache(userId: string, raw: any): void {
  userPrivacy.set(userId, normalizePrivacy(raw));
}

/* Async fetcher for routes — uses cache when available, falls back to DB.
   Returns DEFAULT_PRIVACY if the user has no settings yet. */
export async function getUserPrivacy(userId: string): Promise<UserPrivacy> {
  const cached = userPrivacy.get(userId);
  if (cached) return cached;
  const u = await User.findById(userId).select("privacy").lean<{ privacy?: any }>();
  const normalized = normalizePrivacy(u?.privacy);
  userPrivacy.set(userId, normalized);
  return normalized;
}

export function initSocket(server: http.Server) {
  const io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL || "http://localhost:5173",
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  /* AUTH MIDDLEWARE
     Browsers can't attach an `Authorization` header to a WebSocket handshake,
     so the client passes the bearer token via `socket.handshake.auth.token`
     (see frontend lib/socket.ts). We fold it into the headers as a Bearer token
     so the bearer plugin resolves the session. The cookie header is still
     forwarded as a fallback for same-site/local-dev sessions. */
  io.use(async (socket, next) => {
    try {
      const headers = fromNodeHeaders(socket.request.headers);
      const token = socket.handshake.auth?.token;
      if (token) headers.set("authorization", `Bearer ${token}`);

      const session = await auth.api.getSession({ headers });
      if (!session) return next(new Error("Unauthorized"));
      socket.data.userId = session.user.id;
      next();
    } catch (_err) {
      next(new Error("Unauthorized"));
    }
  });

  /* Iterate every connected socket and run `fn` for each one (except the
     caller's). Used for selective broadcasts that need per-recipient privacy
     checks. */
  function forEachOtherSocket(
    selfSocketId: string,
    fn: (sid: string, presence: SocketPresence) => void
  ) {
    for (const [sid, presence] of socketPresence.entries()) {
      if (sid === selfSocketId) continue;
      fn(sid, presence);
    }
  }

  io.on("connection", async (socket) => {
    const userId = socket.data.userId as string;

    /* Personal room + all chat rooms */
    socket.join(userId);
    const chats = await Chat.find({ participants: userId }).select("_id");
    const chatIds = chats.map((c) => c._id);
    chats.forEach((chat) => socket.join(chat._id.toString()));

    /* Online tracking (multi-tab safe) */
    const count = onlineUsers.get(userId) ?? 0;
    onlineUsers.set(userId, count + 1);

    /* Presence defaults to "no chat focused, page assumed visible until told
       otherwise" — covers the case where a client never emits presence:focus
       (e.g. older client). */
    socketPresence.set(socket.id, { userId, activeChatId: null, visible: true });

    /* Load privacy into the cache for this user (cheap: only on first socket). */
    if (!userPrivacy.has(userId)) {
      const u = await User.findById(userId).select("privacy").lean<{ privacy?: any }>();
      userPrivacy.set(userId, normalizePrivacy(u?.privacy));
    }

    if (count === 0) {
      await User.findByIdAndUpdate(userId, { isOnline: true });

      /* Broadcast user:online ONLY if this user shows their online state, AND
         only TO recipients who themselves opted in to seeing online status
         (the mutual rule). */
      if (userPrivacy.get(userId)?.showOnline !== false) {
        forEachOtherSocket(socket.id, (sid, presence) => {
          if (userPrivacy.get(presence.userId)?.showOnline !== false) {
            io.to(sid).emit("user:online", { userId });
          }
        });
      }
    }

    /* Deliver any messages this user missed while offline */
    if (chatIds.length > 0) {
      const userObjectId = new Types.ObjectId(userId);

      const undelivered = await Message.find({
        chatId: { $in: chatIds },
        sender: { $ne: userObjectId },
        deliveredTo: { $nin: [userObjectId] },
      }).select("_id sender");

      if (undelivered.length > 0) {
        await Message.updateMany(
          { _id: { $in: undelivered.map((m) => m._id) } },
          { $addToSet: { deliveredTo: userObjectId } }
        );

        /* Group by sender so we send one batch event per sender */
        const bySender = new Map<string, string[]>();
        for (const msg of undelivered) {
          const sid = (msg.sender as Types.ObjectId).toString();
          if (!bySender.has(sid)) bySender.set(sid, []);
          bySender.get(sid)!.push((msg._id as Types.ObjectId).toString());
        }

        for (const [senderId, messageIds] of bySender) {
          io.to(senderId).emit("messages:delivered", { messageIds, deliveredBy: userId });
        }
      }
    }

    /* Typing indicators — mutual rule. Don't broadcast if the sender opted
       out of typing, and don't deliver to recipients who also opted out. */
    function relayTyping(event: "typing:start" | "typing:stop", chatId: string) {
      if (userPrivacy.get(userId)?.typingIndicator === false) return;

      const room = io.sockets.adapter.rooms.get(chatId);
      if (!room) return;

      for (const sid of room) {
        if (sid === socket.id) continue;
        const presence = socketPresence.get(sid);
        if (!presence) continue;
        if (userPrivacy.get(presence.userId)?.typingIndicator === false) continue;
        io.to(sid).emit(event, { chatId, userId });
      }
    }

    socket.on("typing:start", ({ chatId }: { chatId: string }) => {
      relayTyping("typing:start", chatId);
    });

    socket.on("typing:stop", ({ chatId }: { chatId: string }) => {
      relayTyping("typing:stop", chatId);
    });

    /* Presence — client tells us which chat it's focused on and whether the
       page is visible. Drives the "should I push?" decision. */
    socket.on(
      "presence:focus",
      ({ chatId, visible }: { chatId: string | null; visible: boolean }) => {
        const current = socketPresence.get(socket.id);
        if (!current) return;
        socketPresence.set(socket.id, {
          ...current,
          activeChatId: chatId,
          visible: !!visible,
        });
      }
    );

    /* Disconnect — mutual rule applies to user:offline too. lastSeen is
       additionally masked per the SUBJECT's lastSeen setting and per the
       RECIPIENT's lastSeen setting (the recipient sees no times at all if
       they opted out). */
    socket.on("disconnect", async () => {
      socketPresence.delete(socket.id);

      const current = (onlineUsers.get(userId) ?? 1) - 1;

      if (current <= 0) {
        onlineUsers.delete(userId);
        const lastSeen = new Date();
        await User.findByIdAndUpdate(userId, { isOnline: false, lastSeen });

        const senderPrivacy = userPrivacy.get(userId) ?? DEFAULT_PRIVACY;

        if (senderPrivacy.showOnline) {
          const subjectExposesLastSeen = senderPrivacy.lastSeen === "everyone";

          forEachOtherSocket(socket.id, (sid, presence) => {
            const rp = userPrivacy.get(presence.userId) ?? DEFAULT_PRIVACY;
            if (!rp.showOnline) return; // mutual: recipient opted out
            const payload = {
              userId,
              lastSeen:
                subjectExposesLastSeen && rp.lastSeen === "everyone"
                  ? lastSeen
                  : null,
            };
            io.to(sid).emit("user:offline", payload);
          });
        }

        /* Drop the in-memory privacy entry when the user has no more sockets,
           so reconnects re-read the DB and any out-of-band changes apply. */
        userPrivacy.delete(userId);
      } else {
        onlineUsers.set(userId, current);
      }
    });
  });

  return io;
}
