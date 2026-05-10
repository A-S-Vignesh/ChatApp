import { Server } from "socket.io";
import http from "http";
import { auth } from "./lib/auth.js";
import { fromNodeHeaders } from "better-auth/node";
import Chat from "./models/Chat.js";
import User from "./models/User.js";
import Message from "./models/Message.js";
import { env } from "./lib/env.js";
import { logger } from "./lib/logger.js";

/* 👥 ONLINE TRACKING (MULTI-TAB SAFE) — module level so route handlers can query it.
   NOTE: this is in-process state. To run more than one Node instance, swap for a
   shared store (Redis socket.io adapter). */
const onlineUsers = new Map<string, number>();

export function isUserOnline(userId: string): boolean {
  return onlineUsers.has(userId);
}

type TypingPayload = { chatId?: string };

export function initSocket(server: http.Server) {
  const io = new Server(server, {
    cors: {
      origin: env.CORS_ORIGIN,
      credentials: true,
    },
  });

  /* 🔐 AUTH MIDDLEWARE */
  io.use(async (socket, next) => {
    try {
      const session = await auth.api.getSession({
        headers: fromNodeHeaders(socket.request.headers),
      });

      if (!session) return next(new Error("Unauthorized"));

      socket.data.userId = session.user.id;
      next();
    } catch (err) {
      logger.warn({ err }, "socket auth failed");
      next(new Error("Unauthorized"));
    }
  });

  io.on("connection", async (socket) => {
    const userId: string = socket.data.userId;

    socket.join(userId);

    const chats = await Chat.find({ participants: userId }).select("_id");
    chats.forEach((chat) => socket.join(chat._id.toString()));

    const count = onlineUsers.get(userId) ?? 0;
    onlineUsers.set(userId, count + 1);

    if (count === 0) {
      await User.findByIdAndUpdate(userId, { isOnline: true });
      socket.broadcast.emit("user:online", { userId });
    }

    /* 📨 ON-CONNECT DELIVERY FLUSH */
    try {
      const chatIds = chats.map((c) => c._id);
      const undelivered = await Message.find({
        chatId: { $in: chatIds },
        sender: { $ne: userId },
        deliveredTo: { $ne: userId },
      }).select("_id sender");

      if (undelivered.length > 0) {
        const messageIds = undelivered.map((m) => m._id);

        await Message.updateMany(
          { _id: { $in: messageIds } },
          { $addToSet: { deliveredTo: userId } }
        );

        const bySender = new Map<string, string[]>();
        undelivered.forEach((m) => {
          const s = m.sender.toString();
          const arr = bySender.get(s) ?? [];
          arr.push(m._id.toString());
          bySender.set(s, arr);
        });

        bySender.forEach((ids, senderId) => {
          io.to(senderId).emit("messages:delivered", {
            messageIds: ids,
            userId,
          });
        });
      }
    } catch (err) {
      logger.error({ err, userId }, "delivery flush failed");
    }

    /* ⌨️ TYPING — relay to chat room (excluding sender) */
    socket.on("typing:start", ({ chatId }: TypingPayload) => {
      if (!chatId || typeof chatId !== "string") return;
      socket.to(chatId).emit("typing:start", { chatId, userId });
    });

    socket.on("typing:stop", ({ chatId }: TypingPayload) => {
      if (!chatId || typeof chatId !== "string") return;
      socket.to(chatId).emit("typing:stop", { chatId, userId });
    });

    socket.on("disconnect", async () => {
      const current = (onlineUsers.get(userId) ?? 1) - 1;

      if (current <= 0) {
        onlineUsers.delete(userId);
        const lastSeen = new Date();

        await User.findByIdAndUpdate(userId, {
          isOnline: false,
          lastSeen,
        });

        socket.broadcast.emit("user:offline", { userId, lastSeen });
      } else {
        onlineUsers.set(userId, current);
      }
    });
  });

  return io;
}
