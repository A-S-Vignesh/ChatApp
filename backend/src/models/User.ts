import { Schema, model, InferSchemaType, Types } from "mongoose";

const userSchema = new Schema(
  {
    _id: {
      type: Schema.Types.ObjectId, // ✅ CORRECT
      required: true,
    },
    isOnline: {
      type: Boolean,
      default: false,
    },
    lastSeen: {
      type: Date,
    },
    status: {
      type: String, // "Online" | "Busy" | "Away"
    },
    /* Per-user notification settings. Persisted server-side so they apply
       across devices and so push notifications can honor `previews`. */
    notificationSettings: {
      previews: { type: Boolean, default: true },
      sounds: { type: Boolean, default: true },
    },

    /* Privacy preferences. Honored by socket emits and API responses so
       turning a toggle off is enforced server-side, not just hidden in the UI. */
    privacy: {
      /* When false: this user is not added to readBy on /read, no messages:read
         emit, and the user is filtered from readBy in fetched message responses. */
      readReceipts: { type: Boolean, default: true },
      /* When false: never emit typing:start/typing:stop on this user's behalf. */
      typingIndicator: { type: Boolean, default: true },
      /* When false: lastSeen is hidden in API responses (set to null). */
      lastSeen: {
        type: String,
        enum: ["everyone", "nobody"],
        default: "everyone",
      },
      /* When false: isOnline is forced to false in API responses, and no
         user:online/user:offline events broadcast. */
      showOnline: { type: Boolean, default: true },
    },
  },
  {
    timestamps: true,
    strict: false, // ✅ keep this
  }
);

export type User = InferSchemaType<typeof userSchema>;

export default model<User>("User", userSchema);
