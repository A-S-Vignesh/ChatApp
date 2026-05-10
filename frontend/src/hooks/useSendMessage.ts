import { useMutation, useQueryClient, InfiniteData } from "@tanstack/react-query";
import { api } from "../lib/api";
import { toastError } from "../lib/toast";
import { MessagesResponse, MessageType } from "../types/message";

type CurrentUser = {
  id: string;
  name?: string;
  image?: string;
};

export function useSendMessage(chatId: string, currentUser: CurrentUser) {
  const queryClient = useQueryClient();
  const queryKey = ["messages", chatId];

  return useMutation({
    mutationFn: async (content: string) => {
      const res = await api.post("/messages", { chatId, content });
      return res.data as MessageType;
    },

    /* 🚀 Optimistic update — append to the newest page */
    onMutate: async (content) => {
      await queryClient.cancelQueries({ queryKey });

      const previous =
        queryClient.getQueryData<InfiniteData<MessagesResponse>>(queryKey);

      const optimisticMessage: MessageType = {
        _id: `temp-${Date.now()}`,
        chatId,
        type: "text",
        content,
        sender: {
          _id: currentUser.id,
          name: currentUser.name ?? "",
          image: currentUser.image,
        },
        readBy: [currentUser.id],
        deliveredTo: [],
        reactions: [],
        createdAt: new Date().toISOString(),
      };

      queryClient.setQueryData<InfiniteData<MessagesResponse>>(queryKey, (old) => {
        if (!old || old.pages.length === 0) {
          return {
            pages: [{ messages: [optimisticMessage], nextCursor: null }],
            pageParams: [undefined],
          };
        }
        const [first, ...rest] = old.pages;
        return {
          ...old,
          pages: [
            { ...first, messages: [...first.messages, optimisticMessage] },
            ...rest,
          ],
        };
      });

      return { previous, optimisticId: optimisticMessage._id };
    },

    /* ❌ Rollback on error */
    onError: (err, _content, context) => {
      if (context?.previous) {
        queryClient.setQueryData(queryKey, context.previous);
      }
      toastError(err, "Failed to send message");
    },

    /* ✅ Replace temp message with the real one */
    onSuccess: (real, _content, context) => {
      const tempId = context?.optimisticId;
      queryClient.setQueryData<InfiniteData<MessagesResponse>>(queryKey, (old) => {
        if (!old) return old;
        return {
          ...old,
          pages: old.pages.map((page) => ({
            ...page,
            messages: page.messages.map((m) =>
              m._id === tempId ? real : m
            ),
          })),
        };
      });

      // refresh sidebar preview
      queryClient.invalidateQueries({ queryKey: ["chats"] });
    },
  });
}
