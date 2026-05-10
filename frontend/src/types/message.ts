// types/message.ts
export type MessageSender = {
  _id: string;
  name: string;
  image?: string;
};

export type ReactionType = {
  emoji: string;
  users: string[]; // user ids
};

export type MessageType = {
  _id: string;
  chatId: string;
  sender: MessageSender;
  content: string;
  type: "text" | "image" | "file";
  readBy: string[];
  deliveredTo: string[];
  reactions: ReactionType[];
  createdAt: string;
};

export type MessageViewType = MessageType & {
  timestamp: string;
};

export type MessagesResponse = {
  messages: MessageType[];
  nextCursor: string | null;
};
