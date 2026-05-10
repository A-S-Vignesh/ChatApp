import { Schema, model, Types, Document } from "mongoose";

export interface IChat extends Document {
  isGroup: boolean;
  name?: string;
  participants: Types.ObjectId[];
  lastMessage?: Types.ObjectId;
  createdBy?: Types.ObjectId;
  clearedFor: Map<string, Date>;
  deletedFor: Types.ObjectId[];
  mutedBy: Types.ObjectId[];
}

const chatSchema = new Schema<IChat>(
  {
    isGroup: {
      type: Boolean,
      default: false,
    },

    name: {
      type: String,
      trim: true,
    },

    participants: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
      },
    ],

    lastMessage: {
      type: Schema.Types.ObjectId,
      ref: "Message",
    },

    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },

    clearedFor: {
      type: Map,
      of: Date,
      default: {},
    },

    deletedFor: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    /* Users who have muted this chat. Push notifications skip them. */
    mutedBy: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],
  },
  { timestamps: true }
);

chatSchema.index({ participants: 1 });


export default model<IChat>("Chat", chatSchema);
