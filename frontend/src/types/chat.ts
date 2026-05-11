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

  /* True when the current user has muted this chat (computed server-side from
     mutedBy). Drives the bell icon in the header and skips push notifications. */
  mutedByMe?: boolean;

  createdAt?: string;
  updatedAt: string;
};

export type ChatUser = {
  _id: string;
  name: string;
  email?: string;
  emailVerified?: boolean;
  image?: string;
  isOnline?: boolean;
  lastSeen?: string | null;
  about?: string;
  phone?: string;
  location?: string;
  dob?: string | null;
  createdAt?: string;
};
