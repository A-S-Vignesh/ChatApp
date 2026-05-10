import React, {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { MessagesSquare, Loader2 } from "lucide-react";
import { useSendMessage } from "../hooks/useSendMessage";

import Message from "./Message";
import ChatInput from "./ChatInput";
import Header from "./Header";
import { socket } from "../lib/socket";

import { useMessages } from "../hooks/useMessages";
import { ChatType } from "../types/chat";
import { UserType } from "../types/user";
import { getChatDisplayUser } from "../utils/chatHelpers";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { MessageType } from "../types/message";

interface ChatWindowProps {
  chatId: string | null;
  chat?: ChatType;
  currentUser: { id: string; name?: string; image?: string };
  onBack: () => void;
  onViewProfile: (user: UserType) => void;
  onShowGroupInfo?: () => void;
}

const SCROLL_LOAD_THRESHOLD_PX = 80;

const ChatWindow: React.FC<ChatWindowProps> = ({
  chatId,
  chat,
  currentUser,
  onBack,
  onViewProfile,
  onShowGroupInfo,
}: ChatWindowProps) => {
  const {
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useMessages(chatId);

  /* Flatten pages → oldest at top, newest at bottom.
     Server returns each page sorted oldest→newest.
     Pages are fetched newest→older, so reverse the page order. */
  const messages = useMemo<MessageType[]>(() => {
    if (!data) return [];
    return [...data.pages].reverse().flatMap((p) => p.messages);
  }, [data]);

  const { mutate: sendMessage, isPending } = useSendMessage(
    chatId ?? "",
    currentUser
  );

  const handleSendMessage = (text: string) => {
    if (!chatId || !text.trim()) return;
    sendMessage(text);
  };

  const containerRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  /* who's typing in this chat */
  const [typingUserIds, setTypingUserIds] = useState<string[]>([]);

  /* scroll bookkeeping */
  const lastMessageIdRef = useRef<string | null>(null);
  const prevScrollHeightRef = useRef<number | null>(null);
  const didInitialScrollRef = useRef(false);

  /* mark messages read on chat open */
  useEffect(() => {
    if (!chatId) return;

    api.get(`/chat/${chatId}/read`).then(() => {
      queryClient.setQueryData(["chats"], (old: any[]) =>
        old?.map((c) =>
          c._id === chatId ? { ...c, unreadCount: 0 } : c
        )
      );
    });
  }, [chatId, queryClient]);

  /* reset scroll bookkeeping on chat switch */
  useEffect(() => {
    lastMessageIdRef.current = null;
    prevScrollHeightRef.current = null;
    didInitialScrollRef.current = false;
    setTypingUserIds([]);
  }, [chatId]);

  /* listen for typing events */
  useEffect(() => {
    if (!chatId) return;

    const onStart = ({
      chatId: incomingId,
      userId,
    }: {
      chatId: string;
      userId: string;
    }) => {
      if (incomingId !== chatId) return;
      setTypingUserIds((prev) =>
        prev.includes(userId) ? prev : [...prev, userId]
      );
    };
    const onStop = ({
      chatId: incomingId,
      userId,
    }: {
      chatId: string;
      userId: string;
    }) => {
      if (incomingId !== chatId) return;
      setTypingUserIds((prev) => prev.filter((id) => id !== userId));
    };

    socket.on("typing:start", onStart);
    socket.on("typing:stop", onStop);

    return () => {
      socket.off("typing:start", onStart);
      socket.off("typing:stop", onStop);
    };
  }, [chatId]);

  /* scroll positioning — runs synchronously after DOM mutation */
  useLayoutEffect(() => {
    const el = containerRef.current;
    if (!el || messages.length === 0) return;

    const lastId = messages[messages.length - 1]?._id ?? null;

    if (prevScrollHeightRef.current !== null) {
      /* just prepended older messages — keep the same content under the user's eyes */
      el.scrollTop = el.scrollHeight - prevScrollHeightRef.current;
      prevScrollHeightRef.current = null;
    } else if (!didInitialScrollRef.current) {
      /* first paint of this chat */
      el.scrollTop = el.scrollHeight;
      didInitialScrollRef.current = true;
    } else if (lastId !== lastMessageIdRef.current) {
      /* a new message arrived/sent — only auto-scroll if user is near bottom */
      const distanceFromBottom =
        el.scrollHeight - el.scrollTop - el.clientHeight;
      if (distanceFromBottom < 200) {
        el.scrollTop = el.scrollHeight;
      }
    }

    lastMessageIdRef.current = lastId;
  }, [messages]);

  /* infinite scroll trigger */
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    if (
      el.scrollTop < SCROLL_LOAD_THRESHOLD_PX &&
      hasNextPage &&
      !isFetchingNextPage
    ) {
      prevScrollHeightRef.current = el.scrollHeight;
      fetchNextPage();
    }
  };

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

  const otherUser = getChatDisplayUser(chat, currentUser.id);

  /* typing indicator: in 1:1 just show "typing…", in groups show name(s) */
  const typingNames = typingUserIds
    .map((uid) => {
      const p = chat.participants.find((u) => u._id === uid);
      return p?.name;
    })
    .filter((n): n is string => !!n);

  let typingLabel: string | null = null;
  if (typingUserIds.length > 0) {
    if (chat.isGroup) {
      if (typingNames.length === 1) typingLabel = `${typingNames[0]} is typing…`;
      else if (typingNames.length === 2)
        typingLabel = `${typingNames[0]} and ${typingNames[1]} are typing…`;
      else if (typingNames.length > 2)
        typingLabel = `${typingNames[0]} and ${typingNames.length - 1} others are typing…`;
      else typingLabel = "typing…";
    } else {
      typingLabel = "typing…";
    }
  }

  /* show sender name above message in group chats only */
  const showSenderName = chat.isGroup;

  return (
    <main className="grow h-full flex flex-col">
      {/* Header */}
      <Header
        user={otherUser}
        isGroup={chat.isGroup}
        participantCount={chat.participants.length}
        typingLabel={typingLabel}
        onBack={onBack}
        onViewProfile={onViewProfile}
        onShowGroupInfo={onShowGroupInfo}
      />

      {/* Messages */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="grow p-6 overflow-y-auto bg-slate-100 dark:bg-slate-900 chat-bg custom-scroll"
      >
        {isLoading ? (
          <p className="text-center text-slate-500">Loading messages…</p>
        ) : (
          <div className="space-y-4">
            {isFetchingNextPage && (
              <div className="flex justify-center py-2 text-slate-500">
                <Loader2 size={18} className="animate-spin" />
              </div>
            )}
            {!hasNextPage && messages.length > 0 && (
              <p className="text-center text-xs text-slate-400 py-2">
                Beginning of conversation
              </p>
            )}
            {messages.map((msg, idx) => {
              const isMe = msg.sender._id === currentUser.id;
              const prev = idx > 0 ? messages[idx - 1] : null;
              const showName =
                showSenderName &&
                !isMe &&
                (!prev || prev.sender._id !== msg.sender._id);

              return (
                <Message
                  key={msg._id}
                  message={{
                    ...msg,
                    timestamp: new Date(msg.createdAt).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    }),
                  }}
                  isMe={isMe}
                  showSenderName={showName}
                  participantCount={chat.participants.length}
                  currentUserId={currentUser.id}
                  chatId={chat._id}
                />
              );
            })}
          </div>
        )}
      </div>

      {/* Input */}
      <ChatInput
        chatId={chatId}
        onSendMessage={handleSendMessage}
        disabled={isPending}
      />
    </main>
  );
};

export default ChatWindow;
