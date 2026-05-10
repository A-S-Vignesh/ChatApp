import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { MessagesResponse, PopulatedMessageType } from "../types/message";
import * as outbox from "../lib/outbox";

function makeClientId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function useSendMessage(chatId: string, currentUserId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ content, clientId }: { content: string; clientId: string }) => {
      const res = await api.post("/messages", { chatId, content, clientId });
      return res.data as PopulatedMessageType;
    },

    /* No retry here — the outbox flusher owns retry policy. A single attempt
       keeps the UI responsive; if it fails (network, 5xx), the entry stays in
       the outbox and will be flushed on `online` / socket reconnect. */
    retry: false,

    /* Optimistic insert + persistent outbox enqueue. The optimistic message uses
       `temp-${clientId}` as its _id so the cache-merge logic in ChatPage and the
       success handler below can swap it for the real message reliably. */
    onMutate: async ({ content, clientId }) => {
      await queryClient.cancelQueries({ queryKey: ["messages", chatId] });

      const previousData = queryClient.getQueryData<MessagesResponse>(["messages", chatId]);

      const optimisticMessage: PopulatedMessageType = {
        _id: `temp-${clientId}`,
        clientId,
        chatId,
        type: "text",
        content,
        sender: { _id: currentUserId, name: "" },
        readBy: [],
        deliveredTo: [],
        createdAt: new Date().toISOString(),
        _outboxStatus: "pending",
      };

      queryClient.setQueryData(
        ["messages", chatId],
        (old: MessagesResponse | undefined) => {
          if (!old) return { messages: [optimisticMessage], nextCursor: null };
          /* Avoid duplicate optimistic insert if the same clientId is already present
             (e.g. user double-tapped send). */
          if (old.messages.some((m) => m.clientId === clientId)) return old;
          return { ...old, messages: [...old.messages, optimisticMessage] };
        }
      );

      /* Persist to IDB so the message survives reload / browser restart. */
      await outbox.enqueue({
        clientId,
        chatId,
        content,
        type: "text",
        createdAt: Date.now(),
        attempts: 1,
        status: "pending",
      });

      return { previousData, clientId };
    },

    /* On a single-attempt failure: keep the optimistic message visible and leave
       the entry in the outbox. The flusher will retry it. We do NOT roll back the
       cache — that would lose the user's text. */
    onError: async (err: any, _vars, context) => {
      const clientId = context?.clientId;
      if (!clientId) return;
      await outbox.update(clientId, {
        attempts: (await outbox.getAll()).find((e) => e.clientId === clientId)?.attempts ?? 1,
        lastError: err?.message ?? String(err),
      });
    },

    /* Replace temp message with the real one. Match by clientId, fall back to temp- prefix. */
    onSuccess: async (newMessage, _vars, context) => {
      const clientId = context?.clientId;

      if (clientId) await outbox.remove(clientId);

      queryClient.setQueryData(
        ["messages", chatId],
        (old: MessagesResponse | undefined) => {
          if (!old) return old;

          let replaced = false;
          const next = old.messages.map((msg) => {
            const isMatch =
              (clientId && (msg.clientId === clientId || msg._id === `temp-${clientId}`)) ||
              msg._id === newMessage._id;
            if (isMatch) {
              replaced = true;
              return newMessage;
            }
            return msg;
          });

          if (!replaced && !next.some((m) => m._id === newMessage._id)) {
            next.push(newMessage);
          }

          return { ...old, messages: next };
        }
      );

      queryClient.invalidateQueries({ queryKey: ["chats"] });
    },
  });
}

export { makeClientId };
