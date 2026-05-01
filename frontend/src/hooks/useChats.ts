import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import { ChatType } from "../types/chat";

export function useChats() {
  return useQuery<ChatType[]>({
    queryKey: ["chats"],
    queryFn: async () => {
      const res = await api.get("/chat");
      return res.data;
    },
    staleTime: 1000 * 60, // ✅ 1 minute (WhatsApp-like)
    refetchOnWindowFocus: false, // ❌ don’t refetch on tab switch
  });
}
