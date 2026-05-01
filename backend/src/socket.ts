import { Server } from "socket.io";
import http from "http";
import { auth } from "./lib/auth.js";
import { fromNodeHeaders } from "better-auth/node";
import Chat from "./models/Chat.js";
import User from "./models/User.js";

export function initSocket(server: http.Server) {
  const io = new Server(server, {
    cors: {
      origin: "http://localhost:5173",
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
      next(new Error("Unauthorized"));
    }
  });

  /* 👥 ONLINE TRACKING (MULTI-TAB SAFE) */
  const onlineUsers = new Map<string, number>();

  io.on("connection", async (socket) => {
    const userId = socket.data.userId;
    console.log("🔌 Connected:", userId);

    /* PERSONAL ROOM */
    socket.join(userId);

    /* JOIN ALL CHAT ROOMS */
    const chats = await Chat.find({ participants: userId }).select("_id");
    chats.forEach((chat) => socket.join(chat._id.toString()));

    /* ONLINE STATE */
    const count = onlineUsers.get(userId) ?? 0;
    onlineUsers.set(userId, count + 1);
    console.log("Online users:", count);

    if (count === 0) {
      await User.findByIdAndUpdate(userId, { isOnline: true });
      socket.broadcast.emit("user:online", { userId });
    }

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

      console.log("❌ Disconnected:", userId);
    });
  });

  return io;
}
