import webpush from "web-push";
import { Types } from "mongoose";
import PushSubscription from "../models/PushSubscription.js";

webpush.setVapidDetails(
  process.env.VAPID_EMAIL!,
  process.env.VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

interface PushPayload {
  title: string;
  body: string;
  chatId?: string;
  url?: string;
}

export async function sendPushToUser(
  userId: Types.ObjectId | string,
  payload: PushPayload
): Promise<void> {
  const subs = await PushSubscription.find({ userId }).lean();
  if (subs.length === 0) return;

  const results = subs.map(async (sub) => {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: sub.keys as { p256dh: string; auth: string } },
        JSON.stringify(payload)
      );
    } catch (err: any) {
      /* 410 Gone / 404 = subscription is no longer valid — clean it up */
      if (err.statusCode === 410 || err.statusCode === 404) {
        await PushSubscription.deleteOne({ _id: sub._id });
      }
    }
  });

  await Promise.allSettled(results);
}
