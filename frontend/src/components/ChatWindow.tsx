import React, { useEffect, useRef } from "react";
import { MessagesSquare } from "lucide-react";
import { useSendMessage } from "../hooks/useSendMessage";

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
}

const ChatWindow: React.FC<ChatWindowProps> = ({
  chatId,
  chat,
  currentUserId,
  onSendMessage,
  onBack,
  onViewProfile,
  onToggleReaction,
}: ChatWindowProps) => {
  const { data: messageData, isLoading } = useMessages(chatId);

  const messages = messageData?.messages ?? [];

  const { mutate: sendMessage, isPending } = useSendMessage(
    chatId!,
    currentUserId
  );

  const handleSendMessage = (text: string) => {
    console.log("text", text);
    if (!chatId || !text.trim()) return;
    console.log("Successfull came here");
    sendMessage(text);
  };

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!chatId) return;

    api.get(`/chat/${chatId}/read`).then(() => {
      // reset unread count immediately
      queryClient.setQueryData(["chats"], (old: any[]) =>
        old?.map((chat) =>
          chat._id === chatId ? { ...chat, unreadCount: 0 } : chat
        )
      );
    });
  }, [chatId]);


  /* Auto scroll */
  useEffect(() => {
    if (messages.length) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

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

  console.log("Chat in chat window", chat);
  console.log("Message in chat window", messages);
  console.log("current user Id in chat window", currentUserId);
  const otherUser = getChatDisplayUser(chat, currentUserId);

  return (
    <main className="grow h-full flex flex-col">
      {/* Header */}
      <Header user={otherUser} onBack={onBack} onViewProfile={onViewProfile} />

      {/* Messages */}
      <div
        className="grow p-6 overflow-y-auto bg-slate-100 dark:bg-slate-900 chat-bg custom-scroll"
        // style={{
        //   backgroundImage:
        //     "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23d4e3ff' fill-opacity='0.4'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
        // }}
      >
        {isLoading ? (
          <p className="text-center text-slate-500">Loading messages…</p>
        ) : (
          <div className="space-y-4">
            {messages.map((msg) => {
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
                  userAvatar={otherUser.image}
                  onToggleReaction={(emoji) =>
                    onToggleReaction(chat._id, msg._id, emoji)
                  }
                />
              );
            })}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <ChatInput onSendMessage={handleSendMessage} disabled={isPending} />
    </main>
  );
};

export default ChatWindow;
