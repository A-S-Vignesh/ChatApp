import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { MessagesSquare, Loader2 } from "lucide-react";
import { useSendMessage, makeClientId } from "../hooks/useSendMessage";

import Message from "./Message";
import ChatInput from "./ChatInput";
import Header from "./Header";

import { useMessages } from "../hooks/useMessages";
import { ChatType } from "../types/chat";
import { UserType } from "../types/user";
import { getChatDisplayUser } from "../utils/chatHelpers";
import { MessagesResponse, PopulatedMessageType } from "../types/message";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";

/* How many older messages to pull per "load older" page. Matches the server's
   default limit so a short final page reliably signals "no more history". */
const PAGE_SIZE = 30;

interface ChatWindowProps {
  chatId: string | null;
  chat?: ChatType;
  currentUserId: string;
  onSendMessage: (messageText: string) => void;
  onBack: () => void;
  onViewProfile: (user: UserType) => void;
  onToggleReaction: (chatId: string, messageId: string, emoji: string) => void;
  typingUserIds?: string[];
  isMuted?: boolean;
  onToggleMute?: () => void;
  onClearChat?: () => void;
  onDeleteChat?: () => void;
}

const ChatWindow: React.FC<ChatWindowProps> = ({
  chatId,
  chat,
  currentUserId,
  onSendMessage,
  onBack,
  onViewProfile,
  onToggleReaction,
  typingUserIds = [],
  isMuted = false,
  onToggleMute,
  onClearChat,
  onDeleteChat,
}: ChatWindowProps) => {
  const { data: messageData, isLoading } = useMessages(chatId);
  const [searchQuery, setSearchQuery] = useState("");

  const messages = messageData?.messages ?? [];

  const displayedMessages = searchQuery.trim()
    ? messages.filter((msg) =>
        msg.content?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : messages;

  const { mutate: sendMessage, isPending } = useSendMessage(
    chatId!,
    currentUserId
  );

  const handleSendMessage = (text: string) => {
    if (!chatId || !text.trim()) return;
    sendMessage({ content: text, clientId: makeClientId() });
  };

  const queryClient = useQueryClient();

  /* --- Scroll + pagination bookkeeping --- */
  const scrollRef = useRef<HTMLDivElement>(null);
  const atBottomRef = useRef(true);
  const prevScrollHeightRef = useRef<number | null>(null);
  const prevLenRef = useRef(0);
  const scrollChatIdRef = useRef<string | null>(null);
  const isLoadingOlderRef = useRef(false);
  const [isLoadingOlder, setIsLoadingOlder] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    if (!chatId) return;

    api.get(`/chat/${chatId}/read`).then(() => {
      queryClient.setQueryData(["chats"], (old: any[]) =>
        old?.map((chat) =>
          chat._id === chatId ? { ...chat, unreadCount: 0 } : chat
        )
      );
    });
  }, [chatId]);

  /* Reset search when switching chats */
  const prevChatIdRef = useRef(chatId);
  useEffect(() => {
    if (prevChatIdRef.current !== chatId) {
      prevChatIdRef.current = chatId;
      setSearchQuery("");
    }
  }, [chatId]);

  /* Reset pagination bookkeeping on chat switch */
  useEffect(() => {
    setHasMore(true);
    setIsLoadingOlder(false);
    isLoadingOlderRef.current = false;
    prevScrollHeightRef.current = null;
    atBottomRef.current = true;
  }, [chatId]);

  /* Fetch a page of OLDER messages and prepend them to the flat cache. We keep
     the existing { messages, nextCursor } cache shape so every socket and
     optimistic handler keeps working untouched — we only grow the array at the
     top. The server's GET supports `cursor` (load messages with _id < cursor). */
  const loadOlder = useCallback(async () => {
    if (!chatId || isLoadingOlderRef.current || !hasMore) return;

    const current = queryClient.getQueryData<MessagesResponse>([
      "messages",
      chatId,
    ]);
    const msgs = current?.messages ?? [];
    /* Oldest real (non-optimistic) message; temps are always the newest. */
    const oldest = msgs.find((m) => !m._id.startsWith("temp-"));
    if (!oldest) return;

    isLoadingOlderRef.current = true;
    setIsLoadingOlder(true);
    /* Anchor: remember height so we can hold the viewport steady after prepend. */
    prevScrollHeightRef.current = scrollRef.current?.scrollHeight ?? null;

    try {
      const res = await api.get(`/messages/${chatId}`, {
        params: { cursor: oldest._id, limit: PAGE_SIZE },
      });
      const older: PopulatedMessageType[] = res.data?.messages ?? [];

      if (older.length < PAGE_SIZE) setHasMore(false);

      if (older.length > 0) {
        queryClient.setQueryData<MessagesResponse>(
          ["messages", chatId],
          (old) => {
            const base = old ?? { messages: [], nextCursor: null };
            const existing = new Set(base.messages.map((m) => m._id));
            const deduped = older.filter((m) => !existing.has(m._id));
            if (deduped.length === 0) {
              prevScrollHeightRef.current = null;
              return base;
            }
            return { ...base, messages: [...deduped, ...base.messages] };
          }
        );
      } else {
        prevScrollHeightRef.current = null;
      }
    } catch {
      prevScrollHeightRef.current = null;
    } finally {
      isLoadingOlderRef.current = false;
      setIsLoadingOlder(false);
    }
  }, [chatId, hasMore, queryClient]);

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    atBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
    if (!searchQuery.trim() && el.scrollTop < 80) {
      loadOlder();
    }
  };

  /* Scroll manager: pin to bottom on chat switch & first load, preserve the
     anchor when older messages are prepended, and follow new messages only when
     the user is already near the bottom (so reading history isn't interrupted). */
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    // Chat switched (or first paint of this chat) → pin to bottom
    if (scrollChatIdRef.current !== chatId) {
      scrollChatIdRef.current = chatId;
      el.scrollTop = el.scrollHeight;
      atBottomRef.current = true;
      prevLenRef.current = messages.length;
      return;
    }

    // Older page prepended → keep the same message under the user's eyes
    if (prevScrollHeightRef.current != null) {
      el.scrollTop += el.scrollHeight - prevScrollHeightRef.current;
      prevScrollHeightRef.current = null;
      prevLenRef.current = messages.length;
      return;
    }

    // New message appended → follow only if the user was at the bottom
    if (
      messages.length > prevLenRef.current &&
      atBottomRef.current &&
      !searchQuery.trim()
    ) {
      el.scrollTop = el.scrollHeight;
    }
    prevLenRef.current = messages.length;
  }, [messages, chatId, searchQuery]);

  /* Empty state */
  if (!chatId || !chat) {
    return (
      <div className="grow h-full flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-800">
        <MessagesSquare size={64} className="text-blue-300 mb-4" />
        <h2 className="text-2xl font-semibold text-slate-600">
          Welcome to AetherChat
        </h2>
        <p className="text-slate-500">Select a chat to start messaging</p>
      </div>
    );
  }

  const otherUser = getChatDisplayUser(chat, currentUserId);
  const isTyping = typingUserIds.includes(otherUser._id);

  return (
    <main className="grow h-full flex flex-col">
      <Header
        user={otherUser as unknown as UserType}
        onBack={onBack}
        onViewProfile={onViewProfile}
        isTyping={isTyping}
        isMuted={isMuted}
        onToggleMute={onToggleMute}
        onClearChat={onClearChat}
        onDeleteChat={onDeleteChat}
        onSearchChange={setSearchQuery}
      />

      {/* Search results banner */}
      {searchQuery.trim() && (
        <div className="shrink-0 px-4 py-1.5 bg-blue-50 dark:bg-blue-900/20 border-b border-blue-100 dark:border-blue-800/50 flex items-center justify-between text-xs">
          <span className="text-blue-600 dark:text-blue-400 font-medium">
            {displayedMessages.length} result{displayedMessages.length !== 1 ? "s" : ""} for &ldquo;{searchQuery}&rdquo;
          </span>
          {displayedMessages.length === 0 && (
            <span className="text-slate-400 dark:text-slate-500">No messages match</span>
          )}
        </div>
      )}

      {/* Messages */}
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="grow p-6 overflow-y-auto bg-slate-100 dark:bg-slate-900 chat-bg custom-scroll"
      >
        {isLoading ? (
          <p className="text-center text-slate-500">Loading messages…</p>
        ) : displayedMessages.length === 0 && !searchQuery.trim() ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-6">
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-full mb-4">
              <MessagesSquare size={40} className="text-blue-300 dark:text-blue-400" />
            </div>
            <h3 className="text-base font-semibold text-slate-700 dark:text-slate-200">
              No messages yet
            </h3>
            <p className="mt-1 text-sm text-slate-400 dark:text-slate-500 leading-relaxed">
              Say hello! Send your first message to start the conversation.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Older-history loader (top) */}
            {!searchQuery.trim() && isLoadingOlder && (
              <div className="flex justify-center py-1">
                <Loader2 size={18} className="animate-spin text-slate-400" />
              </div>
            )}

            {displayedMessages.map((msg) => {
              const isMe = msg.sender._id === currentUserId;

              return (
                <Message
                  key={msg._id}
                  message={{
                    ...msg,
                    sender: isMe ? "me" : "other",
                    timestamp: new Date(msg.createdAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    }),
                  }}
                  userAvatar={otherUser.image ?? ""}
                  userName={otherUser.name}
                  highlight={searchQuery}
                  onToggleReaction={(emoji: string) =>
                    onToggleReaction(chat._id, msg._id, emoji)
                  }
                />
              );
            })}
          </div>
        )}
      </div>

      <ChatInput onSendMessage={handleSendMessage} chatId={chatId!} disabled={isPending} />
    </main>
  );
};

export default ChatWindow;
