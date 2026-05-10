import type { Request, Response, NextFunction } from "express";
import { Types } from "mongoose";
import { fromNodeHeaders } from "better-auth/node";
import { auth } from "../lib/auth.js";
import { logger } from "../lib/logger.js";

export interface AuthenticatedRequest extends Request {
  user?: {
    _id: Types.ObjectId;
    email?: string;
    name?: string;
  };
}

export const protectRoute = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(req.headers),
    });

    if (!session) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    /* Convert string → ObjectId once so handlers don't have to */
    req.user = {
      _id: new Types.ObjectId(session.user.id),
      email: session.user.email,
      name: session.user.name,
    };

    next();
  } catch (err) {
    logger.warn({ err }, "auth middleware error");
    res.status(401).json({ message: "Unauthorized" });
  }
};
