import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import { toNodeHandler } from "better-auth/node";
import { auth } from "./lib/auth.js";
import { connectDB } from "./lib/db.js";
import router from "./routes/index.js";
import http from "http";
import { initSocket } from "./socket.js";

const app = express();
const port = Number(process.env.PORT) || 5000;
const frontendOrigin = process.env.FRONTEND_URL || "http://localhost:5173";

// CORS (before auth)
app.use(
  cors({
    origin: frontendOrigin,
    credentials: true,
  })
);

// DB connection
connectDB();

// 🔥 Create HTTP server ONCE
const server = http.createServer(app);

// 🔥 Attach socket to SAME server
export const io = initSocket(server);

// 🔑 Better Auth handler (must be before JSON)
app.all("/api/auth/*splat", toNodeHandler(auth));

// JSON middleware AFTER auth
app.use(express.json());
app.use("/api", router);

app.get("/", (_, res) => {
  res.send("Chat API running 🚀");
});

// ✅ START THE HTTP SERVER (NOT app.listen)
server.listen(port, () => {
  console.log(`🚀 Server + Socket running on port ${port}`);
});
