import rateLimit from "express-rate-limit";
import type { Request, Response } from "express";
import type { AuthenticatedRequest } from "./protectRoute.js";

/* Key by user id when authenticated, IP otherwise. Lets two users behind the
   same NAT each get their own bucket. */
function keyByUser(req: Request) {
  const auth = req as AuthenticatedRequest;
  return auth.user?._id?.toString() ?? req.ip ?? "anonymous";
}

function tooMany(_req: Request, res: Response) {
  res.status(429).json({
    message: "Too many requests, slow down a moment and try again.",
  });
}

/* Sending messages — generous, but bounded so a runaway client can't flood */
export const sendMessageLimiter = rateLimit({
  windowMs: 10_000, // 10 seconds
  limit: 30,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  keyGenerator: keyByUser,
  handler: tooMany,
});

/* Reactions — same rough budget as sending */
export const reactionLimiter = rateLimit({
  windowMs: 10_000,
  limit: 30,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  keyGenerator: keyByUser,
  handler: tooMany,
});

/* Group create / mutation — much rarer */
export const groupMutationLimiter = rateLimit({
  windowMs: 60_000, // 1 minute
  limit: 20,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  keyGenerator: keyByUser,
  handler: tooMany,
});

/* Profile updates — typo-resistant but spam-resistant */
export const profileUpdateLimiter = rateLimit({
  windowMs: 60_000,
  limit: 20,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  keyGenerator: keyByUser,
  handler: tooMany,
});
