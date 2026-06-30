import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import { toNodeHandler, fromNodeHeaders } from "better-auth/node";
import { auth } from "./lib/auth.js";
import { connectDB } from "./lib/db.js";
import router from "./routes/index.js";
import http from "http";
import { initSocket } from "./socket.js";

/* Crash-safety: never let a stray rejection or thrown error silently zombify
   the process without a clear log. On an uncaught exception the process is in
   an undefined state, so we log it as fatal and exit — the host (Render, etc.)
   restarts a clean instance. Unhandled rejections are logged but not fatal. */
process.on("unhandledRejection", (reason) => {
  console.error("Unhandled promise rejection:", reason);
});
process.on("uncaughtException", (err) => {
  console.error("FATAL uncaught exception:", err);
  process.exit(1);
});

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

/* ───────────────────────────────────────────────────────────────────────────
   Social-login handoff (cross-domain bearer auth).

   Google's OAuth callback lands on THIS backend (`/api/auth/callback/google`),
   where the new session cookie is first-party and readable. But the frontend
   lives on a different registrable domain (Vercel), so it can never read that
   cookie. To bridge the gap we mint a one-time token here — where the session
   IS visible — and redirect to the frontend with it. The frontend exchanges the
   OTT for the bearer token it stores in localStorage. The OTT is single-use and
   expires in minutes, so it's safe to carry in the URL.

   `signIn.social({ callbackURL })` from the client points here, with the real
   frontend destination passed as `?to=`. */
app.get("/api/social-complete", async (req, res) => {
  const frontend = (process.env.FRONTEND_URL || "http://localhost:5173").replace(/\/$/, "");
  /* Open-redirect guard: only ever bounce back to our own frontend. */
  const to = typeof req.query.to === "string" ? req.query.to : "";
  const dest = to.startsWith(frontend) ? to : frontend;

  try {
    const { token } = await auth.api.generateOneTimeToken({
      headers: fromNodeHeaders(req.headers),
    });
    const url = new URL(dest);
    url.searchParams.set("ott", token);
    return res.redirect(url.toString());
  } catch (err) {
    /* No session (cookie missing) or token generation failed — send the user
       back to the login screen with a surfaced error instead of a blank page. */
    console.error("social-complete handoff failed:", err);
    const url = new URL(frontend);
    url.searchParams.set("error", "oauth_complete_failed");
    return res.redirect(url.toString());
  }
});

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
