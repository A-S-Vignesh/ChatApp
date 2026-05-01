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

    /* ---------------- Validation ---------------- */

    if (userId.equals(currentUserId)) {
      return res.status(400).json({ message: "Cannot chat with yourself" });
    }

    /* ---------------- Find Existing Chat ---------------- */
    const existingChat = await Chat.findOne({
      isGroup: false,
      participants: {
        $all: [currentUserId, userId],
      },
    })
      .populate("participants", "name image isOnline lastSeen")
      .populate("lastMessage", "content type createdAt");

    if (existingChat) {
      return res.json(existingChat);
    }

    /* ---------------- Create New Chat ---------------- */
    const chat = await Chat.create({
      isGroup: false,
      participants: [currentUserId, userId],
      createdBy: currentUserId,
    });

    const populatedChat = await Chat.findById(chat._id)
      .populate("participants", "name image isOnline lastSeen")
      .populate("lastMessage", "content type createdAt");

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
      // 1️⃣ Only chats where user is a participant
      {
        $match: {
          participants: userId,
        },
      },

      // 2️⃣ Lookup unread messages
      {
        $lookup: {
          from: "messages",
          let: { chatId: "$_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$chatId", "$$chatId"] },
                    { $ne: ["$sender", userId] },
                    { $not: [{ $in: [userId, "$readBy"] }] },
                  ],
                },
              },
            },
          ],
          as: "unreadMessages",
        },
      },

      // 3️⃣ Add unreadCount
      {
        $addFields: {
          unreadCount: { $size: "$unreadMessages" },
        },
      },

      // 4️⃣ Populate lastMessage
      {
        $lookup: {
          from: "messages",
          localField: "lastMessage",
          foreignField: "_id",
          as: "lastMessage",
        },
      },
      { $unwind: { path: "$lastMessage", preserveNullAndEmptyArrays: true } },

      // 5️⃣ Populate participants
      {
        $lookup: {
          from: "users",
          localField: "participants",
          foreignField: "_id",
          as: "participants",
        },
      },

      // 6️⃣ Sort chats
      {
        $sort: { updatedAt: -1 },
      },

      // 7️⃣ Cleanup
      {
        $project: {
          unreadMessages: 0, // don’t send raw messages
        },
      },
    ]);

    res.json(chats);
  } catch (err) {
    console.error("Fetch chats error:", err);
    res.status(500).json({ message: "Failed to fetch chats" });
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

    // 🔔 Notify other participants (blue tick)
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
