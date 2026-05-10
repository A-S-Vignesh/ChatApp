import { Router, Response } from "express";
import PushSubscription from "../models/PushSubscription.js";
import { AuthenticatedRequest } from "../middleware/protectRoute.js";

const router = Router();

/* Save a new push subscription (upsert so re-subscribing is idempotent) */
router.post("/subscribe", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!._id;
    const { endpoint, keys } = req.body;

    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return res.status(400).json({ message: "Invalid subscription data" });
    }

    await PushSubscription.findOneAndUpdate(
      { userId, endpoint },
      { userId, endpoint, keys },
      { upsert: true, new: true }
    );

    res.status(200).json({ success: true });
  } catch (err) {
    console.error("Push subscribe error:", err);
    res.status(500).json({ message: "Failed to save subscription" });
  }
});

/* Remove a push subscription on logout / permission revoke */
router.post("/unsubscribe", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!._id;
    const { endpoint } = req.body;

    if (!endpoint) {
      return res.status(400).json({ message: "Endpoint required" });
    }

    await PushSubscription.deleteOne({ userId, endpoint });
    res.status(200).json({ success: true });
  } catch (err) {
    console.error("Push unsubscribe error:", err);
    res.status(500).json({ message: "Failed to remove subscription" });
  }
});

export default router;
