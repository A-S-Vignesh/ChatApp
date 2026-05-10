import { Router, Response } from "express";
import Chat from "../models/Chat.js";
import mongoose from "mongoose";
import { AuthenticatedRequest } from "../middleware/protectRoute.js";
import User from "../models/User.js";
import Message from "../models/Message.js";
import { io } from "../server.js";

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

      // 7. Populate participants
      {
        $lookup: {
          from: "users",
          localField: "participants",
          foreignField: "_id",
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

    const result = await Message.updateMany(
      {
        chatId,
        sender: { $ne: userId },
        readBy: { $nin: [userId] },
      },
      { $addToSet: { readBy: userId } }
    );

    io.to(chatId).emit("messages:read", {
      chatId,
      readerId: userId,
    });

    res.json({ updated: result.modifiedCount });
  } catch (error) {
    console.error("Mark messages as read error:", error);
    res.status(500).json({ message: "Failed to mark messages as read" });
  }
});


export default router;
