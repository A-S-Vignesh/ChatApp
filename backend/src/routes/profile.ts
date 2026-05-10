import { Router } from "express";
import User from "../models/User.js";
import {
  protectRoute,
  AuthenticatedRequest,
} from "../middleware/protectRoute.js";

const router = Router();

router.get("/me", async (req: AuthenticatedRequest, res) => {
  const user = await User.findOne({ email: req.user!.email });

  if (!user) {
    return res.status(404).json({ message: "User not found in app DB" });
  }

  res.json(user);
});

/* PUT /api/profile/notifications  body: { previews?: boolean, sounds?: boolean }
   Per-user, per-account notification preferences. Stored on the user so they
   survive across devices and so push notifications can honor `previews`. */
router.put("/notifications", async (req: AuthenticatedRequest, res) => {
  try {
    const { previews, sounds } = req.body as {
      previews?: boolean;
      sounds?: boolean;
    };

    const update: Record<string, boolean> = {};
    if (typeof previews === "boolean") update["notificationSettings.previews"] = previews;
    if (typeof sounds === "boolean") update["notificationSettings.sounds"] = sounds;

    if (Object.keys(update).length === 0) {
      return res.status(400).json({ message: "Nothing to update" });
    }

    const user = await User.findOneAndUpdate(
      { email: req.user!.email },
      { $set: update },
      { new: true }
    ).lean();

    if (!user) return res.status(404).json({ message: "User not found" });

    res.json({
      notificationSettings: (user as any).notificationSettings ?? {
        previews: true,
        sounds: true,
      },
    });
  } catch (err) {
    console.error("Update notification settings error:", err);
    res.status(500).json({ message: "Failed to update settings" });
  }
});

export default router;
