import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import { MessagesResponse } from "../types/message";

export function useMessages(chatId?: string) {
  return useQuery<MessagesResponse>({
    queryKey: ["messages", chatId],
    queryFn: async () => {
      if (!chatId) return [];
      const res = await api.get(`/messages/${chatId}`);
      return res.data;
    },
    enabled: !!chatId, // 🔑 only fetch when chat selected
    staleTime: 1000 * 30, // 30s is perfect for chat history
    refetchOnWindowFocus: false,
    retry: false,
  });
}
