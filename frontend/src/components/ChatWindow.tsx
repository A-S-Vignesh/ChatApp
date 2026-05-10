import React, { useEffect, useRef, useState } from "react";
import { MessagesSquare } from "lucide-react";
import { useSendMessage, makeClientId } from "../hooks/useSendMessage";

import Message from "./Message";
import ChatInput from "./ChatInput";
import Header from "./Header";
import { socket } from "../lib/socket";

import { useMessages } from "../hooks/useMessages";
import { ChatType } from "../types/chat";
import { UserType } from "../types/user";
import { getChatDisplayUser } from "../utils/chatHelpers";
import { MessagesResponse } from "../types/message";
import { useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";

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

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

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

  /* Auto scroll — only when not searching */
  useEffect(() => {
    if (messages.length && !searchQuery) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, searchQuery]);

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
      <div className="grow p-6 overflow-y-auto bg-slate-100 dark:bg-slate-900 chat-bg custom-scroll">
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

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      <ChatInput onSendMessage={handleSendMessage} chatId={chatId!} disabled={isPending} />
    </main>
  );
};

export default ChatWindow;
