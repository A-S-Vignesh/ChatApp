import { useInfiniteQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import { MessagesResponse } from "../types/message";

const PAGE_SIZE = 30;

export function useMessages(chatId: string | null) {
  return useInfiniteQuery<MessagesResponse>({
    queryKey: ["messages", chatId],
    queryFn: async ({ pageParam }) => {
      const res = await api.get(`/messages/${chatId}`, {
        params: { limit: PAGE_SIZE, cursor: pageParam ?? undefined },
      });
      return res.data;
    },
    enabled: !!chatId,
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    staleTime: 1000 * 30,
    refetchOnWindowFocus: false,
    retry: false,
  });
}
