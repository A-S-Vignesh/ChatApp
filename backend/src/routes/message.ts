import { Router, Response } from "express";
import Message from "../models/Message.js";
import Chat from "../models/Chat.js";
import mongoose from "mongoose";
import {
  protectRoute,
  AuthenticatedRequest,
} from "../middleware/protectRoute.js";
import { io } from "../server.js";

const router = Router();

router.post(
  "/",
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user!._id; // ✅ now TS is happy

      const { chatId, content, type = "text" } = req.body;

      if (!chatId || !content) {
        return res.status(400).json({ message: "Invalid data" });
      }

      if (!mongoose.Types.ObjectId.isValid(chatId)) {
        return res.status(400).json({ message: "Invalid chatId" });
      }

      const chat = await Chat.findById(chatId);
      if (!chat) {
        return res.status(404).json({ message: "Chat not found" });
      }

      /* -------- Authorization -------- */
      const isParticipant = chat.participants.some(
        (id) => id.toString() === userId.toString()
      );

      if (!isParticipant) {
        return res.status(403).json({ message: "Not a chat participant" });
      }

      /* -------- Create Message -------- */
      /* -------- Create Message -------- */
      const message = await Message.create({
        chatId: chat._id,
        sender: userId,
        content,
        type,
        readBy: [userId],
      });

      /* -------- Update Chat -------- */
      chat.lastMessage = message._id;
      await chat.save();

      /* -------- Populate once -------- */
      const populatedMessage = await message.populate("sender", "name image");
      console.log("socket line reached")
      /* -------- Emit socket event -------- */
      io.to(chat.participants.map((p) => p.toString())).emit("message:new", {
        message: populatedMessage,
        chatId: chat._id,
      });
      console.log("socket line passed");

      /* -------- REST response -------- */
      res.status(201).json(populatedMessage);
    } catch (error) {
      console.error("Send message error:", error);
      res.status(500).json({ message: "Failed to send message" });
    }
  }
);


router.get(
  "/:chatId",
  protectRoute,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user!._id;
      const { chatId } = req.params;

      const limit = Math.min(Number(req.query.limit) || 30, 100);
      const cursor = req.query.cursor as string | undefined;

      /* ---------------- Validation ---------------- */
      if (!mongoose.Types.ObjectId.isValid(chatId)) {
        return res.status(400).json({ message: "Invalid chatId" });
      }

      const chat = await Chat.findById(chatId);
      if (!chat) {
        return res.status(404).json({ message: "Chat not found" });
      }

      /* -------- Authorization -------- */
      const isParticipant = chat.participants.some(
        (id) => id.toString() === userId.toString()
      );

      if (!isParticipant) {
        return res.status(403).json({ message: "Not authorized" });
      }

      /* ---------------- Query ---------------- */
      const query: any = { chatId };

      // Cursor pagination (load older messages)
      if (cursor && mongoose.Types.ObjectId.isValid(cursor)) {
        query._id = { $lt: cursor };
      }

      const messages = await Message.find(query)
        .sort({ _id: -1 }) // newest first
        .limit(limit)
        .populate("sender", "name image")
        .lean();

      // reverse for UI (oldest → newest)
      messages.reverse();

      res.json({
        messages,
        nextCursor: messages.length > 0 ? messages[0]._id : null,
      });
    } catch (error) {
      console.error("Fetch messages error:", error);
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  }
);




export default router;
