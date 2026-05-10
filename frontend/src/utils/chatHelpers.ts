import { ChatType } from "../types/chat";

export function getChatDisplayUser(chat: ChatType, currentUserId: string) {
  if (chat.isGroup) {
    return {
      name: chat.name || "Group Chat",
      image: undefined,
      isOnline: false,
      lastSeen: undefined,
    };
  }

  /* direct chat → show the OTHER user */
  const otherUser = chat.participants.find((u) => u._id !== currentUserId);

  return {
    name: otherUser?.name ?? "Unknown",
    image: otherUser?.image,
    isOnline: otherUser?.isOnline,
    lastSeen: otherUser?.isOnline ? undefined : otherUser?.lastSeen,
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
