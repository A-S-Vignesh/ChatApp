import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { MessagesResponse, MessageType } from "../types/message";

export function useSendMessage(chatId: string, currentUserId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (content: string) => {
      const res = await api.post("/messages", {
        chatId,
        content,
      });
      return res.data as MessageType;
    },

    /* 🚀 Optimistic update */
    onMutate: async (content) => {
      await queryClient.cancelQueries({ queryKey: ["messages", chatId] });

      const previousMessages =
        queryClient.getQueryData<MessageType[]>(["messages", chatId]) ?? [];

      const optimisticMessage: MessageType = {
        _id: `temp-${Date.now()}`,
        chatId,
        type: "text",
        content,
        sender: currentUserId,
        readBy: [],
        createdAt: new Date().toISOString(),
      };

      queryClient.setQueryData(
        ["messages", chatId],
        (old: MessagesResponse | undefined) => {
          if (!old) {
            return { messages: [optimisticMessage], nextCursor: null };
          }

          return {
            ...old,
            messages: [...old.messages, optimisticMessage],
          };
        }
      );


      return { previousMessages };
    },

    /* ❌ Rollback if error */
    onError: (_err, _content, context) => {
      if (context?.previousMessages) {
        queryClient.setQueryData(
          ["messages", chatId],
          context.previousMessages
        );
      }
    },

    /* ✅ Replace temp message with real one */
    onSuccess: (newMessage) => {
      queryClient.setQueryData(
        ["messages", chatId],
        (old: MessagesResponse | undefined) => {
          if (!old) return old;

          return {
            ...old,
            messages: old.messages.map((msg) =>
              msg._id.startsWith("temp-") ? newMessage : msg
            ),
          };
        }
      );


      // Update chat list preview
      queryClient.invalidateQueries({ queryKey: ["chats"] });
    },
  });
}
