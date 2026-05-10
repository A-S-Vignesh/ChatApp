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
  },
  {
    timestamps: true,
    strict: false, // ✅ keep this
  }
);

export type User = InferSchemaType<typeof userSchema>;

export default model<User>("User", userSchema);
