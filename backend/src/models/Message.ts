import { Schema, model, Types, Document } from "mongoose";

export interface IMessage extends Document {
  chatId: Types.ObjectId;
  sender: Types.ObjectId;
  content: string;
  type: "text" | "image" | "file";
  readBy: Types.ObjectId[];
}

const messageSchema = new Schema<IMessage>(
  {
    chatId: {
      type: Schema.Types.ObjectId,
      ref: "Chat",
      required: true,
      index: true,
    },

    sender: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    content: {
      type: String,
      required: true,
    },

    type: {
      type: String,
      enum: ["text", "image", "file"],
      default: "text",
    },

    readBy: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],
  },
  { timestamps: true }
);

messageSchema.index({ chatId: 1, createdAt: -1 });


export default model<IMessage>("Message", messageSchema);
