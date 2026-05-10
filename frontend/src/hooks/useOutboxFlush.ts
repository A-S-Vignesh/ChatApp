import { useEffect } from "react";
import { useQueryClient, type QueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { socket } from "../lib/socket";
import * as outbox from "../lib/outbox";
import type { MessagesResponse, PopulatedMessageType } from "../types/message";

/* Per-chat optimistic-message hydration. Run when we see entries in the outbox
   for a chat that's already in the messages cache, so the user sees their pending
   message immediately on reload. */
function hydrateChatCache(
  queryClient: QueryClient,
  chatId: string,
  entries: outbox.OutboxEntry[],
  currentUserId: string
) {
  queryClient.setQueryData(
    ["messages", chatId],
    (old: MessagesResponse | undefined) => {
      const base = old ?? { messages: [], nextCursor: null };

      const existingClientIds = new Set(
        base.messages.map((m) => m.clientId).filter(Boolean) as string[]
      );

      const toAdd: PopulatedMessageType[] = entries
        .filter((e) => !existingClientIds.has(e.clientId))
        .map((e) => ({
          _id: `temp-${e.clientId}`,
          clientId: e.clientId,
          chatId: e.chatId,
          type: e.type,
          content: e.content,
          sender: { _id: currentUserId, name: "" },
          readBy: [],
          deliveredTo: [],
          createdAt: new Date(e.createdAt).toISOString(),
          _outboxStatus: e.status,
        }));

      if (toAdd.length === 0) return base;
      return { ...base, messages: [...base.messages, ...toAdd] };
    }
  );
}

/* Singleton mutex: never run two flush passes concurrently — that would let the
   same outbox entry be sent twice in parallel. The server's clientId index
   would catch the dup, but it wastes a request and risks UI flicker. */
let flushing = false;

async function flushOnce(queryClient: QueryClient): Promise<void> {
  if (flushing) return;
  if (typeof navigator !== "undefined" && navigator.onLine === false) return;

  flushing = true;
  try {
    const entries = await outbox.getAll();
    if (entries.length === 0) return;

    for (const entry of entries) {
      if (entry.status === "failed") continue;

      try {
        const res = await api.post("/messages", {
          chatId: entry.chatId,
          content: entry.content,
          clientId: entry.clientId,
        });
        const newMessage = res.data as PopulatedMessageType;

        await outbox.remove(entry.clientId);

        queryClient.setQueryData(
          ["messages", entry.chatId],
          (old: MessagesResponse | undefined) => {
            if (!old) return old;

            let replaced = false;
            const next = old.messages.map((m) => {
              if (
                m.clientId === entry.clientId ||
                m._id === `temp-${entry.clientId}` ||
                m._id === newMessage._id
              ) {
                replaced = true;
                return newMessage;
              }
              return m;
            });
            if (!replaced && !next.some((m) => m._id === newMessage._id)) {
              next.push(newMessage);
            }
            return { ...old, messages: next };
          }
        );

        queryClient.invalidateQueries({ queryKey: ["chats"] });
      } catch (err: any) {
        const status = err?.response?.status;
        const nextAttempts = (entry.attempts ?? 0) + 1;

        /* 4xx = permanent failure (bad request, forbidden chat, payload too large).
           Mark failed so the user can decide what to do; don't keep hammering. */
        const permanent = typeof status === "number" && status >= 400 && status < 500 && status !== 429;
        const nextStatus: "pending" | "failed" =
          permanent || nextAttempts >= outbox.MAX_AUTO_ATTEMPTS ? "failed" : "pending";

        await outbox.update(entry.clientId, {
          attempts: nextAttempts,
          lastError: err?.message ?? String(err),
          status: nextStatus,
        });

        /* Mirror the new status onto the cached optimistic message so the UI
           can switch from "sending" clock to "failed" alert. */
        if (nextStatus === "failed") {
          queryClient.setQueryData(
            ["messages", entry.chatId],
            (old: MessagesResponse | undefined) => {
              if (!old) return old;
              return {
                ...old,
                messages: old.messages.map((m) =>
                  m.clientId === entry.clientId || m._id === `temp-${entry.clientId}`
                    ? { ...m, _outboxStatus: "failed" as const }
                    : m
                ),
              };
            }
          );
        }

        /* If this looks like a network error, stop the loop — subsequent entries
           will fail too, and we'd rather wait for the next `online`/connect event. */
        if (!status) break;
      }
    }
  } finally {
    flushing = false;
  }
}

/**
 * Hook that wires up:
 *  - hydration of pending outbox entries into the messages cache on mount
 *  - automatic flush on mount, on `window.online`, and on socket `connect`
 *
 * Mount this once at the app top level (e.g. in ChatPage when the user is
 * authenticated).
 */
export function useOutboxFlush(currentUserId: string | undefined) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!currentUserId) return;

    let cancelled = false;

    /* Hydrate first so the user sees pending messages instantly, even before
       the server responds — then attempt a flush. */
    (async () => {
      const entries = await outbox.getAll();
      if (cancelled || entries.length === 0) return;

      const byChat = new Map<string, outbox.OutboxEntry[]>();
      for (const e of entries) {
        const arr = byChat.get(e.chatId) ?? [];
        arr.push(e);
        byChat.set(e.chatId, arr);
      }
      for (const [chatId, list] of byChat) {
        hydrateChatCache(queryClient, chatId, list, currentUserId);
      }

      flushOnce(queryClient);
    })();

    const onOnline = () => flushOnce(queryClient);
    const onConnect = () => flushOnce(queryClient);

    window.addEventListener("online", onOnline);
    socket.on("connect", onConnect);

    return () => {
      cancelled = true;
      window.removeEventListener("online", onOnline);
      socket.off("connect", onConnect);
    };
  }, [queryClient, currentUserId]);
}

/* Exported for tests / manual triggers. */
export { flushOnce };
