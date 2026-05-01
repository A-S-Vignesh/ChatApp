import type { Request } from "express";
import { auth } from "./auth.js";

export const getSessionFromRequest = async (req: Request) => {
  return auth.api.getSession({
    method: "GET",
    headers: {
      ...(req.headers as Record<string, string>),
      cookie: req.headers.cookie ?? "",
    },
  });
};

