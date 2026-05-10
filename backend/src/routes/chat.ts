import { Router, Response } from "express";
import mongoose from "mongoose";
import { z } from "zod";

import Chat from "../models/Chat.js";
import User from "../models/User.js";
import Message from "../models/Message.js";
import { AuthenticatedRequest } from "../middleware/protectRoute.js";
import { validateBody } from "../middleware/validate.js";
import { groupMutationLimiter } from "../middleware/rateLimit.js";
import { io } from "../server.js";
import { logger } from "../lib/logger.js";

const router = Router();

const isObjectId = (s: string) => mongoose.Types.ObjectId.isValid(s);

/* ---------------- DIRECT CHAT ---------------- */

const DirectChatBody = z.object({
  email: z.string().email(),
});

router.post(
  "/direct",
  validateBody(DirectChatBody),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const currentUserId = req.user!._id;
      const { email } = req.body as z.infer<typeof DirectChatBody>;

      const user = await User.findOne({ email });
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const userId = user._id;
      if (userId.equals(currentUserId)) {
        return res.status(400).json({ message: "Cannot chat with yourself" });
      }

      const existingChat = await Chat.findOne({
        isGroup: false,
        participants: { $all: [currentUserId, userId] },
      })
        .populate("participants", "name image isOnline lastSeen")
        .populate("lastMessage", "content type createdAt");

      if (existingChat) {
        return res.json(existingChat);
      }

      const chat = await Chat.create({
        isGroup: false,
        participants: [currentUserId, userId],
        createdBy: currentUserId,
      });

      const populatedChat = await Chat.findById(chat._id)
        .populate("participants", "name image isOnline lastSeen")
        .populate("lastMessage", "content type createdAt");

      res.status(201).json(populatedChat);
    } catch (err) {
      logger.error({ err }, "create direct chat failed");
      res.status(500).json({ message: "Failed to create chat" });
    }
  }
);

router.get("/", async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!._id;

    const chats = await Chat.aggregate([
      { $match: { participants: userId } },
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
      { $addFields: { unreadCount: { $size: "$unreadMessages" } } },
      {
        $lookup: {
          from: "messages",
          localField: "lastMessage",
          foreignField: "_id",
          as: "lastMessage",
        },
      },
      { $unwind: { path: "$lastMessage", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "users",
          localField: "participants",
          foreignField: "_id",
          as: "participants",
        },
      },
      { $sort: { updatedAt: -1 } },
      { $project: { unreadMessages: 0 } },
    ]);

    res.json(chats);
  } catch (err) {
    logger.error({ err }, "fetch chats failed");
    res.status(500).json({ message: "Failed to fetch chats" });
  }
});

/* ---------------- GROUP CHATS ---------------- */

const CreateGroupBody = z.object({
  name: z.string().trim().min(1).max(80),
  memberEmails: z.array(z.string().email()).min(1).max(100),
});

router.post(
  "/group",
  groupMutationLimiter,
  validateBody(CreateGroupBody),
  async (req: AuthenticatedRequest, res) => {
    try {
      const currentUserId = req.user!._id;
      const { name, memberEmails } = req.body as z.infer<typeof CreateGroupBody>;

      const uniqueEmails = [
        ...new Set(memberEmails.map((e) => e.toLowerCase().trim())),
      ];

      const users = await User.find({ email: { $in: uniqueEmails } })
        .select("_id email")
        .lean<{ _id: mongoose.Types.ObjectId; email: string }[]>();

      if (users.length !== uniqueEmails.length) {
        const found = new Set(users.map((u) => u.email));
        const missing = uniqueEmails.filter((e) => !found.has(e));
        return res.status(404).json({
          message: `User(s) not found: ${missing.join(", ")}`,
        });
      }

      const memberIds = users.map((u) => u._id);
      const participants = [
        currentUserId,
        ...memberIds.filter((id) => !id.equals(currentUserId)),
      ];

      if (participants.length < 2) {
        return res
          .status(400)
          .json({ message: "Group needs at least 2 distinct members" });
      }

      const chat = await Chat.create({
        isGroup: true,
        name,
        participants,
        createdBy: currentUserId,
      });

      participants.forEach((uid) => {
        io.in(uid.toString()).socketsJoin(chat._id.toString());
      });

      const populated = await Chat.findById(chat._id)
        .populate("participants", "name image isOnline lastSeen email")
        .populate("lastMessage", "content type createdAt");

      io.to(participants.map((p) => p.toString())).emit("chat:created", populated);

      res.status(201).json(populated);
    } catch (err) {
      logger.error({ err }, "create group failed");
      res.status(500).json({ message: "Failed to create group" });
    }
  }
);

const RenameGroupBody = z.object({
  name: z.string().trim().min(1).max(80),
});

router.patch(
  "/group/:chatId",
  groupMutationLimiter,
  validateBody(RenameGroupBody),
  async (req: AuthenticatedRequest, res) => {
    try {
      const currentUserId = req.user!._id;
      const { chatId } = req.params;
      const { name } = req.body as z.infer<typeof RenameGroupBody>;

      if (!isObjectId(chatId)) {
        return res.status(400).json({ message: "Invalid chatId" });
      }

      const chat = await Chat.findById(chatId);
      if (!chat || !chat.isGroup) {
        return res.status(404).json({ message: "Group not found" });
      }
      if (!chat.createdBy || !chat.createdBy.equals(currentUserId)) {
        return res
          .status(403)
          .json({ message: "Only the group admin can rename" });
      }

      chat.name = name;
      await chat.save();

      const populated = await Chat.findById(chat._id)
        .populate("participants", "name image isOnline lastSeen email")
        .populate("lastMessage", "content type createdAt");

      io.to(chatId).emit("chat:updated", populated);

      res.json(populated);
    } catch (err) {
      logger.error({ err }, "rename group failed");
      res.status(500).json({ message: "Failed to rename group" });
    }
  }
);

const AddMemberBody = z.object({
  email: z.string().email(),
});

router.post(
  "/group/:chatId/members",
  groupMutationLimiter,
  validateBody(AddMemberBody),
  async (req: AuthenticatedRequest, res) => {
    try {
      const currentUserId = req.user!._id;
      const { chatId } = req.params;
      const { email } = req.body as z.infer<typeof AddMemberBody>;

      if (!isObjectId(chatId)) {
        return res.status(400).json({ message: "Invalid chatId" });
      }

      const chat = await Chat.findById(chatId);
      if (!chat || !chat.isGroup) {
        return res.status(404).json({ message: "Group not found" });
      }
      if (!chat.createdBy || !chat.createdBy.equals(currentUserId)) {
        return res
          .status(403)
          .json({ message: "Only the group admin can add members" });
      }

      const user = await User.findOne({ email: email.toLowerCase() });
      if (!user) return res.status(404).json({ message: "User not found" });

      const alreadyMember = chat.participants.some((p) => p.equals(user._id));
      if (alreadyMember) {
        return res.status(409).json({ message: "User is already in this group" });
      }

      chat.participants.push(user._id);
      await chat.save();

      io.in(user._id.toString()).socketsJoin(chatId);

      const populated = await Chat.findById(chat._id)
        .populate("participants", "name image isOnline lastSeen email")
        .populate("lastMessage", "content type createdAt");

      io.to(chatId).emit("chat:updated", populated);
      io.to(user._id.toString()).emit("chat:created", populated);

      res.json(populated);
    } catch (err) {
      logger.error({ err }, "add group member failed");
      res.status(500).json({ message: "Failed to add member" });
    }
  }
);

router.delete(
  "/group/:chatId/members/:userId",
  groupMutationLimiter,
  async (req: AuthenticatedRequest, res) => {
    try {
      const currentUserId = req.user!._id;
      const { chatId, userId } = req.params;

      if (!isObjectId(chatId) || !isObjectId(userId)) {
        return res.status(400).json({ message: "Invalid id" });
      }

      const chat = await Chat.findById(chatId);
      if (!chat || !chat.isGroup) {
        return res.status(404).json({ message: "Group not found" });
      }

      const targetId = new mongoose.Types.ObjectId(userId);
      const isSelf = targetId.equals(currentUserId);
      const isAdmin = chat.createdBy?.equals(currentUserId);

      if (!isSelf && !isAdmin) {
        return res.status(403).json({ message: "Not authorized" });
      }

      const wasMember = chat.participants.some((p) => p.equals(targetId));
      if (!wasMember) {
        return res.status(404).json({ message: "User is not a member" });
      }

      if (isSelf && chat.createdBy?.equals(targetId)) {
        return res.status(400).json({
          message:
            "Admin cannot leave; delete the group or transfer admin first",
        });
      }

      chat.participants = chat.participants.filter((p) => !p.equals(targetId));
      await chat.save();

      io.in(targetId.toString()).socketsLeave(chatId);

      const populated = await Chat.findById(chat._id)
        .populate("participants", "name image isOnline lastSeen email")
        .populate("lastMessage", "content type createdAt");

      io.to(targetId.toString()).emit("chat:removed", { chatId });
      io.to(chatId).emit("chat:updated", populated);

      res.json({ ok: true });
    } catch (err) {
      logger.error({ err }, "remove group member failed");
      res.status(500).json({ message: "Failed to remove member" });
    }
  }
);

router.get("/:chatId/read", async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!._id;
    const { chatId } = req.params;

    if (!isObjectId(chatId)) {
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
  } catch (err) {
    logger.error({ err }, "mark messages as read failed");
    res.status(500).json({ message: "Failed to mark messages as read" });
  }
});

export default router;
