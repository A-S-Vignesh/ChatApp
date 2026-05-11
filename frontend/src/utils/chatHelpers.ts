import { ChatType, ChatUser } from "../types/chat";

/* Returns the "display user" for a chat — the other participant in a 1:1 chat,
   or a synthetic placeholder for a group. We pass through every public profile
   field so views like UserProfileModal can show bio/email/phone/etc. without a
   second fetch. */
export function getChatDisplayUser(
  chat: ChatType,
  currentUserId: string
): ChatUser {
  if (chat.isGroup) {
    return {
      _id: "",
      name: chat.name || "Group Chat",
      image: undefined,
      isOnline: false,
      lastSeen: null,
    };
  }

  const otherUser = chat.participants.find((u) => u._id !== currentUserId);
  if (!otherUser) {
    return { _id: "", name: "Unknown" };
  }

  return {
    ...otherUser,
    /* lastSeen is meaningless while they're online — null it out so the UI
       shows "Online" instead of a stale timestamp. */
    lastSeen: otherUser.isOnline ? null : otherUser.lastSeen ?? null,
  };
}

export function getLastMessage(chat: ChatType) {
  if (!chat.lastMessage) return null;

  return {
    text: chat.lastMessage.content,
    timestamp: new Date(chat.lastMessage.createdAt).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    }),
  };
}
