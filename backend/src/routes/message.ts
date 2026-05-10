import { Router, Response } from "express";
import mongoose from "mongoose";
import { z } from "zod";

import Message from "../models/Message.js";
import Chat from "../models/Chat.js";
import { AuthenticatedRequest } from "../middleware/protectRoute.js";
import { validateBody } from "../middleware/validate.js";
import {
  sendMessageLimiter,
  reactionLimiter,
} from "../middleware/rateLimit.js";
import { io } from "../server.js";
import { isUserOnline } from "../socket.js";
import { logger } from "../lib/logger.js";

const router = Router();

const SendMessageBody = z.object({
  chatId: z.string().refine((s) => mongoose.Types.ObjectId.isValid(s), {
    message: "must be a valid id",
  }),
  content: z.string().trim().min(1).max(4000),
  type: z.enum(["text", "image", "file"]).default("text"),
});

router.post(
  "/",
  sendMessageLimiter,
  validateBody(SendMessageBody),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user!._id;
      const { chatId, content, type } = req.body as z.infer<typeof SendMessageBody>;

      const chat = await Chat.findById(chatId);
      if (!chat) {
        return res.status(404).json({ message: "Chat not found" });
      }

      const isParticipant = chat.participants.some(
        (id) => id.toString() === userId.toString()
      );
      if (!isParticipant) {
        return res.status(403).json({ message: "Not a chat participant" });
      }

      /* Mark online recipients as delivered immediately */
      const onlineRecipients = chat.participants
        .filter((p) => p.toString() !== userId.toString())
        .filter((p) => isUserOnline(p.toString()));

      const message = await Message.create({
        chatId: chat._id,
        sender: userId,
        content,
        type,
        readBy: [userId],
        deliveredTo: onlineRecipients,
      });

      chat.lastMessage = message._id;
      await chat.save();

      const populatedMessage = await message.populate("sender", "name image");

      io.to(chat.participants.map((p) => p.toString())).emit("message:new", {
        message: populatedMessage,
        chatId: chat._id,
      });

      res.status(201).json(populatedMessage);
    } catch (err) {
      logger.error({ err }, "send message failed");
      res.status(500).json({ message: "Failed to send message" });
    }
  }
);

const ReactionBody = z.object({
  emoji: z.string().min(1).max(16),
});

router.post(
  "/:messageId/reactions",
  reactionLimiter,
  validateBody(ReactionBody),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user!._id;
      const { messageId } = req.params;
      const { emoji } = req.body as z.infer<typeof ReactionBody>;

      if (!mongoose.Types.ObjectId.isValid(messageId)) {
        return res.status(400).json({ message: "Invalid messageId" });
      }

      const message = await Message.findById(messageId);
      if (!message) return res.status(404).json({ message: "Message not found" });

      const chat = await Chat.findById(message.chatId);
      if (!chat) return res.status(404).json({ message: "Chat not found" });

      const isParticipant = chat.participants.some(
        (id) => id.toString() === userId.toString()
      );
      if (!isParticipant) {
        return res.status(403).json({ message: "Not a chat participant" });
      }

      /* Same toggle algorithm as the optimistic client update:
         - drop the user from any existing reaction
         - if they didn't already have this emoji, add it */
      message.reactions.forEach((r) => {
        r.users = r.users.filter((u) => u.toString() !== userId.toString());
      });

      const existing = message.reactions.find((r) => r.emoji === emoji);
      const alreadyHadThis = existing?.users.some(
        (u) => u.toString() === userId.toString()
      );

      if (!alreadyHadThis) {
        if (existing) {
          existing.users.push(userId);
        } else {
          message.reactions.push({ emoji, users: [userId] });
        }
      }

      message.reactions = message.reactions.filter((r) => r.users.length > 0);
      await message.save();

      io.to(message.chatId.toString()).emit("message:reaction", {
        chatId: message.chatId.toString(),
        messageId: message._id.toString(),
        reactions: message.reactions,
      });

      res.json({ reactions: message.reactions });
    } catch (err) {
      logger.error({ err }, "toggle reaction failed");
      res.status(500).json({ message: "Failed to toggle reaction" });
    }
  }
);

router.get(
  "/:chatId",
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user!._id;
      const { chatId } = req.params;

      const limit = Math.min(Number(req.query.limit) || 30, 100);
      const cursor = req.query.cursor as string | undefined;

      if (!mongoose.Types.ObjectId.isValid(chatId)) {
        return res.status(400).json({ message: "Invalid chatId" });
      }

      const chat = await Chat.findById(chatId);
      if (!chat) {
        return res.status(404).json({ message: "Chat not found" });
      }

      const isParticipant = chat.participants.some(
        (id) => id.toString() === userId.toString()
      );
      if (!isParticipant) {
        return res.status(403).json({ message: "Not authorized" });
      }

      const query: Record<string, unknown> = { chatId };
      if (cursor && mongoose.Types.ObjectId.isValid(cursor)) {
        query._id = { $lt: cursor };
      }

      const messages = await Message.find(query)
        .sort({ _id: -1 })
        .limit(limit)
        .populate("sender", "name image")
        .lean();

      messages.reverse();

      res.json({
        messages,
        nextCursor: messages.length > 0 ? messages[0]._id : null,
      });
    } catch (err) {
      logger.error({ err }, "fetch messages failed");
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  }
);

export default router;
