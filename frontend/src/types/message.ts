// types/message.ts
export type MessageType = {
  _id: string;
  chatId: string;
  sender: string; // userId
  content: string;
  type: "text" | "image" | "file";
  readBy: string[];
  createdAt: string;
};

export type MessageViewType = MessageType & {
  timestamp: string;
};



export type PopulatedMessageType = MessageType & {
  sender: {
    _id: string;
    name: string;
  };
};


// types/message.ts
export type MessagesResponse = {
  messages: PopulatedMessageType[];
  nextCursor: string | null;
};
