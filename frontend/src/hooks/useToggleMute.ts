import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import type { ChatType } from "../types/chat";

/* Toggles per-chat mute on the server and optimistically flips `mutedByMe`
   in the chats cache so the bell icon updates instantly. */
export function useToggleMute() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ chatId, muted }: { chatId: string; muted: boolean }) => {
      const res = await api.put(`/chat/${chatId}/mute`, { muted });
      return res.data as { muted: boolean };
    },

    onMutate: async ({ chatId, muted }) => {
      await queryClient.cancelQueries({ queryKey: ["chats"] });
      const previous = queryClient.getQueryData<ChatType[]>(["chats"]);
      queryClient.setQueryData<ChatType[]>(["chats"], (old = []) =>
        old.map((c) => (c._id === chatId ? { ...c, mutedByMe: muted } : c))
      );
      return { previous };
    },

    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(["chats"], ctx.previous);
    },
  });
}
