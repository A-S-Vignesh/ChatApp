import { Router } from "express";
import { z } from "zod";

import User from "../models/User.js";
import { AuthenticatedRequest } from "../middleware/protectRoute.js";
import { validateBody } from "../middleware/validate.js";
import { profileUpdateLimiter } from "../middleware/rateLimit.js";
import { logger } from "../lib/logger.js";

const router = Router();

router.get("/me", async (req: AuthenticatedRequest, res) => {
  try {
    const user = await User.findById(req.user!._id);
    if (!user) {
      return res.status(404).json({ message: "User not found in app DB" });
    }
    res.json(user);
  } catch (err) {
    logger.error({ err }, "fetch profile failed");
    res.status(500).json({ message: "Failed to fetch profile" });
  }
});

const UpdateProfileBody = z
  .object({
    name: z.string().trim().min(1).max(80).optional(),
    about: z.string().max(500).optional(),
    phone: z.string().max(40).optional(),
    location: z.string().max(120).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "No editable fields provided",
  });

router.patch(
  "/me",
  profileUpdateLimiter,
  validateBody(UpdateProfileBody),
  async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user!._id;
      const update = req.body as z.infer<typeof UpdateProfileBody>;

      const user = await User.findByIdAndUpdate(userId, update, {
        new: true,
        strict: false,
      });

      if (!user) return res.status(404).json({ message: "User not found" });

      res.json(user);
    } catch (err) {
      logger.error({ err }, "update profile failed");
      res.status(500).json({ message: "Failed to update profile" });
    }
  }
);

export default router;
