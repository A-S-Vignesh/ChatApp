import { useMutation, useQueryClient, InfiniteData } from "@tanstack/react-query";
import { api } from "../lib/api";
import { toastError } from "../lib/toast";
import { MessagesResponse, ReactionType } from "../types/message";

export function useToggleReaction(chatId: string, currentUserId: string) {
  const queryClient = useQueryClient();
  const queryKey = ["messages", chatId];

  return useMutation({
    mutationFn: async ({
      messageId,
      emoji,
    }: {
      messageId: string;
      emoji: string;
    }) => {
      const res = await api.post(`/messages/${messageId}/reactions`, { emoji });
      return res.data as { reactions: ReactionType[] };
    },

    /* Optimistic toggle so reactions feel instant */
    onMutate: async ({ messageId, emoji }) => {
      await queryClient.cancelQueries({ queryKey });
      const previous =
        queryClient.getQueryData<InfiniteData<MessagesResponse>>(queryKey);

      queryClient.setQueryData<InfiniteData<MessagesResponse>>(queryKey, (old) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map((page) => ({
            ...page,
            messages: page.messages.map((msg) => {
              if (msg._id !== messageId) return msg;

              /* same toggle algorithm as the server */
              const stripped = msg.reactions.map((r) => ({
                ...r,
                users: r.users.filter((u) => u !== currentUserId),
              }));

              const existing = stripped.find((r) => r.emoji === emoji);
              const hadThisBefore = msg.reactions
                .find((r) => r.emoji === emoji)
                ?.users.includes(currentUserId);

              let next = stripped;
              if (!hadThisBefore) {
                if (existing) {
                  next = stripped.map((r) =>
                    r.emoji === emoji ? { ...r, users: [...r.users, currentUserId] } : r
                  );
                } else {
                  next = [...stripped, { emoji, users: [currentUserId] }];
                }
              }
              next = next.filter((r) => r.users.length > 0);

              return { ...msg, reactions: next };
            }),
          })),
        };
      });

      return { previous };
    },

    onError: (err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKey, context.previous);
      }
      toastError(err, "Failed to react");
    },
    /* socket event from server will reconcile final state */
  });
}
