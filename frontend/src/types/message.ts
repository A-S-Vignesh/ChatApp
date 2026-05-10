export type MessageType = {
  _id: string;
  chatId: string;
  sender: string;
  content: string;
  type: "text" | "image" | "file";
  readBy: string[];
  deliveredTo: string[];
  createdAt: string;
  clientId?: string;
  /* Client-only: mirrors the outbox entry's status for rendering. Never sent
     by the server. `pending` = still trying, `failed` = retries exhausted. */
  _outboxStatus?: "pending" | "failed";
};

export type MessageViewType = MessageType & {
  sender: "me" | "other";
  timestamp: string;
};

export type PopulatedMessageType = Omit<MessageType, "sender"> & {
  sender: {
    _id: string;
    name: string;
    image?: string;
  };
};

export type MessagesResponse = {
  messages: PopulatedMessageType[];
  nextCursor: string | null;
};
