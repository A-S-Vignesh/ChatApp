import { Router, Response } from "express";
import Chat from "../models/Chat.js";
import mongoose from "mongoose";
import { AuthenticatedRequest } from "../middleware/protectRoute.js";
import User from "../models/User.js";
import Message from "../models/Message.js";
import { io } from "../server.js";
import { getUserPrivacy } from "../socket.js";

const router = Router();

/**
 * POST /api/chats/direct
 * Create or get a 1–1 chat
 */
router.post("/direct", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const currentUserId = req.user!._id;
    console.log("currentUserId", currentUserId);
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const userId = user._id;

    if (userId.equals(currentUserId)) {
      return res.status(400).json({ message: "Cannot chat with yourself" });
    }

    /* Find ANY existing chat between these two users (even if deleted by currentUser) */
    const existingRaw = await Chat.findOne({
      isGroup: false,
      participants: { $all: [currentUserId, userId] },
    });

    if (existingRaw) {
      /* If current user had deleted it, restore it for them */
      const wasDeleted = existingRaw.deletedFor.some(
        (id) => id.toString() === currentUserId.toString()
      );
      if (wasDeleted) {
        existingRaw.deletedFor = existingRaw.deletedFor.filter(
          (id) => id.toString() !== currentUserId.toString()
        ) as any;
        await existingRaw.save();
      }
      const populated = await Chat.findById(existingRaw._id)
        .populate("participants", "name image isOnline lastSeen")
        .populate("lastMessage", "content type createdAt");
      return res.json(populated);
    }

    /* Create new chat */
    const chat = await Chat.create({
      isGroup: false,
      participants: [currentUserId, userId],
      createdBy: currentUserId,
    });

    const populatedChat = await Chat.findById(chat._id)
      .populate("participants", "name image isOnline lastSeen")
      .populate("lastMessage", "content type createdAt");

    /* Let other user's sockets join the room now so they're ready for the first message */
    io.in(userId.toString()).socketsJoin(chat._id.toString());

    res.status(201).json(populatedChat);
  } catch (error) {
    console.error("Create direct chat error:", error);
    res.status(500).json({ message: "Failed to create chat" });
  }
});

router.get("/", async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!._id;

    const chats = await Chat.aggregate([
      // 1. Match chats the user is in, hasn't deleted, and has messages (or created themselves)
      {
        $match: {
          participants: userId,
          deletedFor: { $nin: [userId] },
          $or: [
            { lastMessage: { $exists: true, $ne: null } },
            { createdBy: userId },
          ],
        },
      },

      // 2. Compute userClearedAt from the clearedFor Map
      {
        $addFields: {
          userClearedAt: {
            $let: {
              vars: {
                entries: { $objectToArray: { $ifNull: ["$clearedFor", {}] } },
              },
              in: {
                $reduce: {
                  input: "$$entries",
                  initialValue: null,
                  in: {
                    $cond: [
                      { $eq: ["$$this.k", userId.toString()] },
                      "$$this.v",
                      "$$value",
                    ],
                  },
                },
              },
            },
          },
        },
      },

      // 3. Lookup unread messages (respecting clearedAt)
      {
        $lookup: {
          from: "messages",
          let: { chatId: "$_id", clearedAt: "$userClearedAt" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$chatId", "$$chatId"] },
                    { $ne: ["$sender", userId] },
                    { $not: [{ $in: [userId, "$readBy"] }] },
                    {
                      $or: [
                        { $eq: ["$$clearedAt", null] },
                        { $gt: ["$createdAt", "$$clearedAt"] },
                      ],
                    },
                  ],
                },
              },
            },
          ],
          as: "unreadMessages",
        },
      },

      // 4. Add unreadCount + mutedByMe
      {
        $addFields: {
          unreadCount: { $size: "$unreadMessages" },
          mutedByMe: {
            $in: [userId, { $ifNull: ["$mutedBy", []] }],
          },
        },
      },

      // 5. Populate lastMessage
      {
        $lookup: {
          from: "messages",
          localField: "lastMessage",
          foreignField: "_id",
          as: "lastMessage",
        },
      },
      { $unwind: { path: "$lastMessage", preserveNullAndEmptyArrays: true } },

      // 6. Null out lastMessage if it's at or before userClearedAt
      {
        $addFields: {
          lastMessage: {
            $cond: {
              if: {
                $and: [
                  { $ne: ["$userClearedAt", null] },
                  { $ne: ["$lastMessage", null] },
                  { $lte: ["$lastMessage.createdAt", "$userClearedAt"] },
                ],
              },
              then: null,
              else: "$lastMessage",
            },
          },
        },
      },

      // 7. Populate participants — explicit projection so we expose only
      //    publicly-safe fields (name, email, image, presence, profile bits)
      //    and never leak notificationSettings, privacy, or auth-internal data.
      {
        $lookup: {
          from: "users",
          let: { ids: "$participants" },
          pipeline: [
            { $match: { $expr: { $in: ["$_id", "$$ids"] } } },
            {
              $project: {
                _id: 1,
                name: 1,
                email: 1,
                emailVerified: 1,
                image: 1,
                isOnline: 1,
                lastSeen: 1,
                about: 1,
                phone: 1,
                location: 1,
                dob: 1,
                createdAt: 1,
                /* Keep `privacy` only so the route's post-processing can
                   apply the mutual rule. It gets stripped below. */
                privacy: 1,
              },
            },
          ],
          as: "participants",
        },
      },

      // 8. Sort by last activity
      {
        $sort: { updatedAt: -1 },
      },

      // 9. Cleanup temp fields
      {
        $project: {
          unreadMessages: 0,
          userClearedAt: 0,
        },
      },
    ]);

    /* Apply the mutual privacy rule to each participant's online/lastSeen:
       - If a participant hid their own showOnline → force isOnline=false.
       - If a participant hid their own lastSeen → force lastSeen=null.
       - If the REQUESTER hid showOnline → they see everyone as offline.
       - If the REQUESTER hid lastSeen → they see no lastSeen at all.
       This makes turning a toggle off symmetrically lose visibility. */
    const requesterPrivacy = await getUserPrivacy(userId.toString());
    const requesterShowOnlineOff = !requesterPrivacy.showOnline;
    const requesterLastSeenOff = requesterPrivacy.lastSeen !== "everyone";

    for (const chat of chats) {
      if (!chat.participants) continue;
      for (const p of chat.participants) {
        if (!p) continue;
        const isSelf = p._id?.toString() === userId.toString();

        if (!isSelf) {
          const pp = p.privacy ?? {};
          const subjectShowOnlineOff = pp.showOnline === false;
          const subjectLastSeenOff = pp.lastSeen === "nobody";

          if (subjectShowOnlineOff || requesterShowOnlineOff) {
            p.isOnline = false;
          }
          if (subjectLastSeenOff || requesterLastSeenOff) {
            p.lastSeen = null;
          }
        }

        /* Never expose other users' privacy preferences to the client. */
        delete p.privacy;
      }
    }

    res.json(chats);
  } catch (err) {
    console.error("Fetch chats error:", err);
    res.status(500).json({ message: "Failed to fetch chats" });
  }
});

/* DELETE /api/chat/:chatId/messages — clear chat for this user only */
router.delete("/:chatId/messages", async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!._id;
    const { chatId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(chatId)) {
      return res.status(400).json({ message: "Invalid chatId" });
    }

    const chat = await Chat.findById(chatId);
    if (!chat) return res.status(404).json({ message: "Chat not found" });

    const isParticipant = chat.participants.some(
      (id) => id.toString() === userId.toString()
    );
    if (!isParticipant) return res.status(403).json({ message: "Not authorized" });

    /* Record when this user cleared — don't touch the other user's view */
    chat.clearedFor.set(userId.toString(), new Date());
    chat.markModified("clearedFor");
    await chat.save();

    /* Emit only to the requesting user's personal socket room */
    io.to(userId.toString()).emit("chat:cleared", { chatId });
    res.json({ message: "Chat cleared" });
  } catch (error) {
    console.error("Clear chat error:", error);
    res.status(500).json({ message: "Failed to clear chat" });
  }
});

/* DELETE /api/chat/:chatId — delete chat for this user only */
router.delete("/:chatId", async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!._id;
    const { chatId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(chatId)) {
      return res.status(400).json({ message: "Invalid chatId" });
    }

    const chat = await Chat.findById(chatId);
    if (!chat) return res.status(404).json({ message: "Chat not found" });

    const isParticipant = chat.participants.some(
      (id) => id.toString() === userId.toString()
    );
    if (!isParticipant) return res.status(403).json({ message: "Not authorized" });

    const alreadyDeleted = chat.deletedFor.some(
      (id) => id.toString() === userId.toString()
    );
    if (!alreadyDeleted) {
      (chat.deletedFor as any[]).push(userId);
      /* Record deletion time so if restored later, messages before this stay hidden */
      chat.clearedFor.set(userId.toString(), new Date());
      chat.markModified("clearedFor");
    }

    /* Physically remove only when all participants have deleted */
    if (chat.deletedFor.length >= chat.participants.length) {
      await Message.deleteMany({ chatId });
      await Chat.findByIdAndDelete(chatId);
    } else {
      await chat.save();
    }

    /* Emit only to the requesting user's personal socket room */
    io.to(userId.toString()).emit("chat:deleted", { chatId });
    res.json({ message: "Chat deleted" });
  } catch (error) {
    console.error("Delete chat error:", error);
    res.status(500).json({ message: "Failed to delete chat" });
  }
});

/* PUT /api/chat/:chatId/mute  body: { muted: boolean }
   Sync per-user mute state. Server is the source of truth so it persists
   across devices and so push notifications can honor it. */
router.put("/:chatId/mute", async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!._id;
    const { chatId } = req.params;
    const { muted } = req.body as { muted: boolean };

    if (!mongoose.Types.ObjectId.isValid(chatId)) {
      return res.status(400).json({ message: "Invalid chatId" });
    }
    if (typeof muted !== "boolean") {
      return res.status(400).json({ message: "muted must be boolean" });
    }

    const chat = await Chat.findById(chatId);
    if (!chat) return res.status(404).json({ message: "Chat not found" });

    const isParticipant = chat.participants.some(
      (id) => id.toString() === userId.toString()
    );
    if (!isParticipant) return res.status(403).json({ message: "Not authorized" });

    await Chat.updateOne(
      { _id: chatId },
      muted
        ? { $addToSet: { mutedBy: userId } }
        : { $pull: { mutedBy: userId } }
    );

    res.json({ muted });
  } catch (err) {
    console.error("Toggle mute error:", err);
    res.status(500).json({ message: "Failed to toggle mute" });
  }
});

router.get("/:chatId/read", async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!._id;
    const { chatId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(chatId)) {
      return res.status(400).json({ message: "Invalid chatId" });
    }

    /* Always update readBy locally so the user's own unread-badge math stays
       correct — but if they've turned off read receipts, skip the socket
       emit so senders don't learn that they read. The mutual rule's reverse
       direction (this user not seeing OTHERS' read state) is enforced in the
       GET /messages handler by filtering readBy on response. */
    const result = await Message.updateMany(
      {
        chatId,
        sender: { $ne: userId },
        readBy: { $nin: [userId] },
      },
      { $addToSet: { readBy: userId } }
    );

    const privacy = await getUserPrivacy(userId.toString());
    if (privacy.readReceipts) {
      io.to(chatId).emit("messages:read", {
        chatId,
        readerId: userId,
      });
    }

    res.json({ updated: result.modifiedCount });
  } catch (error) {
    console.error("Mark messages as read error:", error);
    res.status(500).json({ message: "Failed to mark messages as read" });
  }
});


export default router;
