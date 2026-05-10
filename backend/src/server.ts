import express from "express";
import cors from "cors";
import helmet from "helmet";
import http from "http";
import { pinoHttp } from "pino-http";
import type { Request, Response } from "express";
import { toNodeHandler } from "better-auth/node";

import { auth } from "./lib/auth.js";
import { connectDB } from "./lib/db.js";
import { env } from "./lib/env.js";
import { logger } from "./lib/logger.js";
import router from "./routes/index.js";
import { initSocket } from "./socket.js";

const app = express();

/* Trust the first proxy hop (so req.ip reflects X-Forwarded-For when deployed
   behind a load balancer / reverse proxy). Required for express-rate-limit. */
app.set("trust proxy", 1);

/* Request logging */
app.use(
  pinoHttp({
    logger,
    /* Lower the log level for healthy noise like preflight + the root probe */
    customLogLevel: (_req: Request, res: Response, err?: Error) => {
      if (err || res.statusCode >= 500) return "error";
      if (res.statusCode >= 400) return "warn";
      return "debug";
    },
  })
);

/* Security headers */
app.use(helmet());

/* CORS — accepts a comma-separated list via CORS_ORIGIN */
app.use(
  cors({
    origin: env.CORS_ORIGIN,
    credentials: true,
  })
);

connectDB();

const server = http.createServer(app);
export const io = initSocket(server);

/* Better Auth handler must come BEFORE express.json() — it streams its own body */
app.all("/api/auth/*splat", toNodeHandler(auth));

app.use(express.json({ limit: "100kb" }));
app.use("/api", router);

app.get("/", (_, res) => {
  res.send("Chat API running");
});

server.listen(env.PORT, () => {
  logger.info({ port: env.PORT, env: env.NODE_ENV }, "server started");
});
