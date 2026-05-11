import { Router, Response } from "express";
import Message from "../models/Message.js";
import Chat from "../models/Chat.js";
import User from "../models/User.js";
import mongoose from "mongoose";
import {
  protectRoute,
  AuthenticatedRequest,
} from "../middleware/protectRoute.js";
import { io } from "../server.js";
import { isUserOnline, isUserFocusedOn, getUserPrivacy } from "../socket.js";
import { sendPushToUser } from "../lib/pushService.js";

const router = Router();

/* Per-user token-bucket rate limiter for sends.
 * 30 messages per 10 seconds, sustained ~3 msg/sec — matches normal typing speed. */
const SEND_BUCKET_MAX = 30;
const SEND_BUCKET_REFILL_MS = 10_000;
const sendBuckets = new Map<string, { tokens: number; lastRefill: number }>();

function consumeSendToken(userId: string): boolean {
  const now = Date.now();
  let bucket = sendBuckets.get(userId);
  if (!bucket) {
    bucket = { tokens: SEND_BUCKET_MAX, lastRefill: now };
    sendBuckets.set(userId, bucket);
  }
  const elapsed = now - bucket.lastRefill;
  if (elapsed > 0) {
    const refill = (elapsed / SEND_BUCKET_REFILL_MS) * SEND_BUCKET_MAX;
    bucket.tokens = Math.min(SEND_BUCKET_MAX, bucket.tokens + refill);
    bucket.lastRefill = now;
  }
  if (bucket.tokens < 1) return false;
  bucket.tokens -= 1;
  return true;
}

const MAX_CONTENT_LENGTH = 10_000;

router.post(
  "/",
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const userId = req.user!._id;

      const { chatId, content, type = "text", clientId } = req.body;

      if (!chatId || typeof content !== "string" || !content.trim()) {
        return res.status(400).json({ message: "Invalid data" });
      }

      if (content.length > MAX_CONTENT_LENGTH) {
        return res.status(400).json({ message: "Message too long" });
      }

      if (!mongoose.Types.ObjectId.isValid(chatId)) {
        return res.status(400).json({ message: "Invalid chatId" });
      }

      if (clientId !== undefined && (typeof clientId !== "string" || clientId.length > 64)) {
        return res.status(400).json({ message: "Invalid clientId" });
      }

      if (!consumeSendToken(userId.toString())) {
        return res.status(429).json({ message: "Too many messages, slow down" });
      }

      /* -------- Idempotency: short-circuit if this clientId already saved -------- */
      if (clientId) {
        const existing = await Message.findOne({ sender: userId, clientId });
        if (existing) {
          const populated = await existing.populate("sender", "name image");
          return res.status(200).json(populated);
        }
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

      /* -------- First-message flag (checked before message is created) -------- */
      const isFirstMessage = !chat.lastMessage;

      /* -------- Restore chat for participants who had deleted it -------- */
      const restoredParticipantIds: string[] = [];
      if (chat.deletedFor && chat.deletedFor.length > 0) {
        const deletedByOthers = chat.deletedFor
          .map((id) => id.toString())
          .filter((id) => id !== userId.toString());
        if (deletedByOthers.length > 0) {
          chat.deletedFor = chat.deletedFor.filter(
            (id) => !deletedByOthers.includes(id.toString())
          ) as any;
          restoredParticipantIds.push(...deletedByOthers);
        }
      }

      /* -------- Create Message -------- */
      const otherParticipants = chat.participants
        .map((p) => p.toString())
        .filter((id) => id !== userId.toString());

      const onlineRecipients = otherParticipants
        .filter((id) => isUserOnline(id))
        .map((id) => new mongoose.Types.ObjectId(id));

      let message;
      try {
        message = await Message.create({
          chatId: chat._id,
          sender: userId,
          content,
          type,
          clientId,
          readBy: [userId],
          deliveredTo: [userId, ...onlineRecipients],
        });
      } catch (err: any) {
        /* Race: a concurrent retry won the unique-index check. Return the winner. */
        if (err?.code === 11000 && clientId) {
          const winner = await Message.findOne({ sender: userId, clientId });
          if (winner) {
            const populated = await winner.populate("sender", "name image");
            return res.status(200).json(populated);
          }
        }
        throw err;
      }

      /* -------- Update Chat (best-effort: message is already persisted) -------- */
      chat.lastMessage = message._id;
      try {
        await chat.save();
      } catch (chatErr) {
        console.error("Chat lastMessage update failed (message persisted):", chatErr);
      }

      /* -------- Populate once -------- */
      const populatedMessage = await message.populate("sender", "name image");

      /* -------- Notify participants who don't have this chat yet (before message:new) -------- */
      const needsChatNew = new Set<string>([
        ...restoredParticipantIds,
        ...(isFirstMessage ? otherParticipants : []),
      ]);
      if (needsChatNew.size > 0) {
        const chatForNew = await Chat.findById(chat._id)
          .populate("participants", "name image isOnline lastSeen")
          .populate("lastMessage", "content type createdAt");
        for (const pid of needsChatNew) {
          io.to(pid).emit("chat:new", chatForNew);
        }
      }

      /* -------- Emit socket event -------- */
      io.to(chat.participants.map((p) => p.toString())).emit("message:new", {
        message: populatedMessage,
        chatId: chat._id,
      });

      /* -------- Push notifications --------
         Send to anyone who isn't actively looking at this chat right now.
         "Actively looking" = at least one of their sockets has the chat open
         AND the page is visible. Skip recipients who muted the chat.
         Honor each recipient's `previews` setting for the body text. */
      const mutedSet = new Set((chat.mutedBy ?? []).map((id) => id.toString()));
      const pushRecipients = otherParticipants.filter(
        (id) => !mutedSet.has(id) && !isUserFocusedOn(id, chat._id.toString())
      );

      if (pushRecipients.length > 0) {
        const sender = (await User.findById(userId).select("name").lean()) as any;
        const senderName: string = sender?.name ?? "Someone";
        const fullPreview = content.length > 60 ? content.slice(0, 60) + "…" : content;

        const recipientUsers = (await User.find({ _id: { $in: pushRecipients } })
          .select("_id notificationSettings")
          .lean()) as Array<{ _id: any; notificationSettings?: { previews?: boolean } }>;

        const previewsByUser = new Map<string, boolean>();
        for (const u of recipientUsers) {
          previewsByUser.set(u._id.toString(), u.notificationSettings?.previews !== false);
        }

        pushRecipients.forEach((recipientId) => {
          const wantsPreview = previewsByUser.get(recipientId) ?? true;
          sendPushToUser(recipientId, {
            title: senderName,
            body: wantsPreview ? fullPreview : "New message",
            chatId: chat._id.toString(),
            url: "/",
          }).catch(() => {});
        });
      }

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

      // Only show messages after the user's clear timestamp
      const clearedAt = chat.clearedFor?.get(userId.toString());
      if (clearedAt) {
        query.createdAt = { $gt: clearedAt };
      }

      const messages = await Message.find(query)
        .sort({ _id: -1 }) // newest first
        .limit(limit)
        .populate("sender", "name image")
        .lean();

      // reverse for UI (oldest → newest)
      messages.reverse();

      /* Filter readBy per the mutual read-receipts rule:
         - If the requester (current user) has readReceipts off, they don't get
           to see anyone else's read state (just their own self-entry).
         - For readers other than self, drop them from readBy if THEIR
           readReceipts is off (so senders don't learn they read). */
      const requesterPrivacy = await getUserPrivacy(userId.toString());
      const requesterIdStr = userId.toString();

      const readerIdSet = new Set<string>();
      for (const m of messages) {
        for (const r of (m.readBy ?? []) as any[]) {
          readerIdSet.add(r.toString());
        }
      }
      readerIdSet.delete(requesterIdStr);

      const readersPrivacy = new Map<string, boolean>();
      if (readerIdSet.size > 0) {
        const others = await User.find({ _id: { $in: Array.from(readerIdSet) } })
          .select("_id privacy.readReceipts")
          .lean<Array<{ _id: any; privacy?: { readReceipts?: boolean } }>>();
        for (const u of others) {
          readersPrivacy.set(u._id.toString(), u.privacy?.readReceipts !== false);
        }
      }

      const filteredMessages = messages.map((m) => ({
        ...m,
        readBy: (m.readBy ?? []).filter((r: any) => {
          const rid = r.toString();
          if (rid === requesterIdStr) return true; // always show your own
          if (!requesterPrivacy.readReceipts) return false; // mutual: you opted out
          return readersPrivacy.get(rid) !== false; // hide opted-out readers
        }),
      }));

      res.json({
        messages: filteredMessages,
        nextCursor: filteredMessages.length > 0 ? filteredMessages[0]._id : null,
      });
    } catch (error) {
      console.error("Fetch messages error:", error);
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  }
);




export default router;
