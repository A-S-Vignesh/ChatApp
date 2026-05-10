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

export function initSocket(server: http.Server) {
  const io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL || "http://localhost:5173",
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  /* AUTH MIDDLEWARE */
  io.use(async (socket, next) => {
    try {
      const session = await auth.api.getSession({
        headers: fromNodeHeaders(socket.request.headers),
      });
      if (!session) return next(new Error("Unauthorized"));
      socket.data.userId = session.user.id;
      next();
    } catch (_err) {
      next(new Error("Unauthorized"));
    }
  });

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

    if (count === 0) {
      await User.findByIdAndUpdate(userId, { isOnline: true });
      socket.broadcast.emit("user:online", { userId });
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

    /* Typing indicators */
    socket.on("typing:start", ({ chatId }: { chatId: string }) => {
      socket.to(chatId).emit("typing:start", { chatId, userId });
    });

    socket.on("typing:stop", ({ chatId }: { chatId: string }) => {
      socket.to(chatId).emit("typing:stop", { chatId, userId });
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

    /* Disconnect */
    socket.on("disconnect", async () => {
      socketPresence.delete(socket.id);

      const current = (onlineUsers.get(userId) ?? 1) - 1;

      if (current <= 0) {
        onlineUsers.delete(userId);
        const lastSeen = new Date();
        await User.findByIdAndUpdate(userId, { isOnline: false, lastSeen });
        socket.broadcast.emit("user:offline", { userId, lastSeen });
      } else {
        onlineUsers.set(userId, current);
      }
    });
  });

  return io;
}
