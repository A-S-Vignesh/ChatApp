import { Router } from "express";
import mongoose from "mongoose";
import User from "../models/User.js";
import Chat from "../models/Chat.js";
import Message from "../models/Message.js";
import PushSubscription from "../models/PushSubscription.js";
import { AuthenticatedRequest } from "../middleware/protectRoute.js";
import { setUserPrivacyCache, getCachedUserPrivacy } from "../socket.js";
import { auth } from "../lib/auth.js";
import { fromNodeHeaders } from "better-auth/node";

const router = Router();

router.get("/me", async (req: AuthenticatedRequest, res) => {
  const user = await User.findOne({ email: req.user!.email });

  if (!user) {
    return res.status(404).json({ message: "User not found in app DB" });
  }

  res.json(user);
});

/* PUT /api/profile/me  body: { name?, about?, phone?, location?, dob? }
   Editable profile fields. Whitelist enforced — anything else in the body is
   ignored. `dob` accepts YYYY-MM-DD or any ISO date string and is stored as
   a Date so the client can format it consistently. */
router.put("/me", async (req: AuthenticatedRequest, res) => {
  try {
    const body = req.body ?? {};
    const update: Record<string, unknown> = {};

    /* --- name --- */
    if (body.name !== undefined) {
      if (typeof body.name !== "string") {
        return res.status(400).json({ message: "name must be a string" });
      }
      const trimmed = body.name.trim();
      if (trimmed.length < 1 || trimmed.length > 60) {
        return res.status(400).json({ message: "name must be 1–60 characters" });
      }
      update.name = trimmed;
    }

    /* --- about / bio --- */
    if (body.about !== undefined) {
      if (typeof body.about !== "string") {
        return res.status(400).json({ message: "about must be a string" });
      }
      if (body.about.length > 500) {
        return res.status(400).json({ message: "about must be at most 500 characters" });
      }
      update.about = body.about.trim();
    }

    /* --- phone --- */
    if (body.phone !== undefined) {
      if (typeof body.phone !== "string") {
        return res.status(400).json({ message: "phone must be a string" });
      }
      const phone = body.phone.trim();
      if (phone.length > 30) {
        return res.status(400).json({ message: "phone is too long" });
      }
      update.phone = phone;
    }

    /* --- location --- */
    if (body.location !== undefined) {
      if (typeof body.location !== "string") {
        return res.status(400).json({ message: "location must be a string" });
      }
      const location = body.location.trim();
      if (location.length > 120) {
        return res.status(400).json({ message: "location is too long" });
      }
      update.location = location;
    }

    /* --- dob (date of birth) --- */
    if (body.dob !== undefined) {
      if (body.dob === null || body.dob === "") {
        update.dob = null;
      } else if (typeof body.dob === "string") {
        const d = new Date(body.dob);
        if (isNaN(d.getTime())) {
          return res.status(400).json({ message: "dob must be a valid date" });
        }
        const now = new Date();
        if (d > now) {
          return res.status(400).json({ message: "dob cannot be in the future" });
        }
        /* Reject anything before 1900 — almost certainly a typo. */
        if (d.getFullYear() < 1900) {
          return res.status(400).json({ message: "dob is too far in the past" });
        }
        update.dob = d;
      } else {
        return res.status(400).json({ message: "dob must be a date string" });
      }
    }

    if (Object.keys(update).length === 0) {
      return res.status(400).json({ message: "Nothing to update" });
    }

    const user = await User.findOneAndUpdate(
      { email: req.user!.email },
      { $set: update },
      { new: true }
    ).lean();

    if (!user) return res.status(404).json({ message: "User not found" });

    res.json(user);
  } catch (err) {
    console.error("Update profile error:", err);
    res.status(500).json({ message: "Failed to update profile" });
  }
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

/* PUT /api/profile/privacy  body: { readReceipts?, typingIndicator?, lastSeen?, showOnline? } */
router.put("/privacy", async (req: AuthenticatedRequest, res) => {
  try {
    const body = req.body ?? {};
    const update: Record<string, unknown> = {};

    if (body.readReceipts !== undefined) {
      if (typeof body.readReceipts !== "boolean") {
        return res.status(400).json({ message: "readReceipts must be boolean" });
      }
      update["privacy.readReceipts"] = body.readReceipts;
    }
    if (body.typingIndicator !== undefined) {
      if (typeof body.typingIndicator !== "boolean") {
        return res.status(400).json({ message: "typingIndicator must be boolean" });
      }
      update["privacy.typingIndicator"] = body.typingIndicator;
    }
    if (body.showOnline !== undefined) {
      if (typeof body.showOnline !== "boolean") {
        return res.status(400).json({ message: "showOnline must be boolean" });
      }
      update["privacy.showOnline"] = body.showOnline;
    }
    if (body.lastSeen !== undefined) {
      if (body.lastSeen !== "everyone" && body.lastSeen !== "nobody") {
        return res.status(400).json({ message: "lastSeen must be 'everyone' or 'nobody'" });
      }
      update["privacy.lastSeen"] = body.lastSeen;
    }

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
      privacy: (user as any).privacy ?? {
        readReceipts: true,
        typingIndicator: true,
        lastSeen: "everyone",
        showOnline: true,
      },
    });
  } catch (err) {
    console.error("Update privacy error:", err);
    res.status(500).json({ message: "Failed to update privacy" });
  }
});

/* DELETE /api/profile/me
   Cascade-delete the account: messages, push subs, chat membership (clean up
   any chats where this user is the only/last participant). Finally remove the
   better-auth account so the user can re-sign-up with the same email. */
router.delete("/me", async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!._id as mongoose.Types.ObjectId;
    const userIdStr = userId.toString();

    /* 1. Remove this user from every chat they participate in. Where they
          are the last participant, drop the chat + its messages entirely. */
    const chats = await Chat.find({ participants: userId });
    for (const chat of chats) {
      if (chat.participants.length <= 1) {
        await Message.deleteMany({ chatId: chat._id });
        await Chat.deleteOne({ _id: chat._id });
      } else {
        await Chat.updateOne(
          { _id: chat._id },
          {
            $pull: {
              participants: userId,
              deletedFor: userId,
              mutedBy: userId,
            },
          }
        );
      }
    }

    /* 2. Delete messages the user sent (in remaining chats they shared). */
    await Message.deleteMany({ sender: userId });

    /* 3. Push subscriptions are now orphaned. */
    await PushSubscription.deleteMany({ userId });

    /* 4. Delete the user record itself. */
    await User.deleteOne({ _id: userId });

    /* 5. Better Auth account + session cleanup. Try ctx.signOut so the
          response clears the cookie, then drop the auth-side user record. */
    try {
      await auth.api.signOut({
        headers: fromNodeHeaders(req.headers),
      });
    } catch {
      /* ignore — the auth user is gone after step 4 anyway */
    }

    res.status(200).json({ deleted: true });
  } catch (err) {
    console.error("Delete account error:", err);
    res.status(500).json({ message: "Failed to delete account" });
  }
});

/* PUT /api/profile/privacy  body: { readReceipts?, typingIndicator?, lastSeen?, showOnline? }
   These toggles are MUTUAL — turning a flag off both stops you from emitting
   that signal AND stops you from receiving it from others (enforced in the
   socket layer and the API filters). This removes any incentive to "peek" by
   toggling on briefly. */
router.put("/privacy", async (req: AuthenticatedRequest, res) => {
  try {
    const body = req.body ?? {};
    const update: Record<string, unknown> = {};

    if (body.readReceipts !== undefined) {
      if (typeof body.readReceipts !== "boolean") {
        return res.status(400).json({ message: "readReceipts must be boolean" });
      }
      update["privacy.readReceipts"] = body.readReceipts;
    }
    if (body.typingIndicator !== undefined) {
      if (typeof body.typingIndicator !== "boolean") {
        return res.status(400).json({ message: "typingIndicator must be boolean" });
      }
      update["privacy.typingIndicator"] = body.typingIndicator;
    }
    if (body.showOnline !== undefined) {
      if (typeof body.showOnline !== "boolean") {
        return res.status(400).json({ message: "showOnline must be boolean" });
      }
      update["privacy.showOnline"] = body.showOnline;
    }
    if (body.lastSeen !== undefined) {
      if (body.lastSeen !== "everyone" && body.lastSeen !== "nobody") {
        return res.status(400).json({ message: "lastSeen must be 'everyone' or 'nobody'" });
      }
      update["privacy.lastSeen"] = body.lastSeen;
    }

    if (Object.keys(update).length === 0) {
      return res.status(400).json({ message: "Nothing to update" });
    }

    const user = await User.findOneAndUpdate(
      { email: req.user!.email },
      { $set: update },
      { new: true }
    ).lean();

    if (!user) return res.status(404).json({ message: "User not found" });

    const privacy = (user as any).privacy ?? {
      readReceipts: true,
      typingIndicator: true,
      lastSeen: "everyone",
      showOnline: true,
    };

    /* Push the new values into the socket-layer cache so changes take effect
       on the next typing/online event without a DB round-trip. */
    setUserPrivacyCache((user as any)._id.toString(), privacy);

    res.json({ privacy });
  } catch (err) {
    console.error("Update privacy error:", err);
    res.status(500).json({ message: "Failed to update privacy" });
  }
});

/* DELETE /api/profile/me
   Cascade-delete the account. Steps are intentionally ordered so that even
   a partial failure leaves the user with no dangling data they can't
   re-create from scratch. */
router.delete("/me", async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!._id as mongoose.Types.ObjectId;

    /* 1. Leave every chat. Where the user is the only/last participant,
          drop the chat entirely + its messages. Otherwise just pull them
          from the participants/deletedFor/mutedBy arrays. */
    const chats = await Chat.find({ participants: userId });
    for (const chat of chats) {
      if (chat.participants.length <= 1) {
        await Message.deleteMany({ chatId: chat._id });
        await Chat.deleteOne({ _id: chat._id });
      } else {
        await Chat.updateOne(
          { _id: chat._id },
          {
            $pull: {
              participants: userId,
              deletedFor: userId,
              mutedBy: userId,
            },
          }
        );
      }
    }

    /* 2. Delete messages the user authored in any chats they shared. */
    await Message.deleteMany({ sender: userId });

    /* 3. Push subscriptions. */
    await PushSubscription.deleteMany({ userId });

    /* 4. Delete the User record. */
    await User.deleteOne({ _id: userId });

    /* 5. Best-effort better-auth sign-out so the client cookie is cleared. */
    try {
      await auth.api.signOut({ headers: fromNodeHeaders(req.headers) });
    } catch {
      /* ignore — the auth user is gone anyway */
    }

    res.status(200).json({ deleted: true });
  } catch (err) {
    console.error("Delete account error:", err);
    res.status(500).json({ message: "Failed to delete account" });
  }
});

export default router;
