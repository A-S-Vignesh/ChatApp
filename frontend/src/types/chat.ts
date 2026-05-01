export type ChatType = {
  _id: string;
  isGroup: boolean;

  // Group chat only
  name?: string;

  // Populated users
  participants: ChatUser[];

  // Last message preview (sidebar)
  lastMessage?: {
    _id: string;
    content: string;
    type: "text" | "image" | "file";
    createdAt: string;
    sender?: {
      _id: string;
      name: string;
    };
  };

  // 🔥 WhatsApp-style unread badge
  unreadCount: number;

  createdAt?: string;
  updatedAt: string;
};

export type ChatUser = {
  _id: string;
  name: string;
  image?: string;
  isOnline?: boolean;
  lastSeen?: string;
};
