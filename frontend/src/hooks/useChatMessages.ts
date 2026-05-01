import { useInfiniteQuery } from "@tanstack/react-query";
import axios from "axios";

const PAGE_SIZE = 30;

export function useChatMessages(chatId: string) {
  return useInfiniteQuery({
    queryKey: ["messages", chatId],
    queryFn: async ({ pageParam }) => {
      const res = await axios.get(`/api/messages/${chatId}`, {
        params: {
          limit: PAGE_SIZE,
          cursor: pageParam,
        },
        withCredentials: true,
      });
      return res.data;
    },
    initialPageParam: undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,

    // 🔑 PERFORMANCE SETTINGS
    staleTime: Infinity, // never auto refetch
    gcTime: 1000 * 60 * 30, // keep cache 30 mins
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
}
