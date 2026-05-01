import React, { useState, useRef, useEffect } from "react";
import { MessageStatus } from "../../types";
import { Check, CheckCheck, SmilePlus } from "lucide-react";
import Avatar from "./Avatar";
import { authClient } from "../lib/authClient";
import { MessageType, MessageViewType } from "../types/message";

interface MessageProps {
  message: MessageViewType;
  userAvatar: string;
  onToggleReaction: (emoji: string) => void;
}

const EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🙏"];

const EmojiPicker: React.FC<{
  onSelect: (emoji: string) => void;
  onClose: () => void;
  isMe: boolean;
}> = ({ onSelect, onClose, isMe }) => {
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        pickerRef.current &&
        !pickerRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [onClose]);

  return (
    <div
      ref={pickerRef}
      className={`absolute -top-10 z-20 bg-white dark:bg-slate-600 shadow-lg rounded-full flex p-1 border border-slate-200 dark:border-slate-500 ${
        isMe ? "right-0" : "left-0"
      }`}
    >
      {EMOJIS.map((emoji) => (
        <button
          key={emoji}
          onClick={() => onSelect(emoji)}
          className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-500 text-xl transition-transform transform hover:scale-125 focus:outline-none"
          aria-label={`React with ${emoji}`}
        >
          {emoji}
        </button>
      ))}
    </div>
  );
};

const Message: React.FC<MessageProps> = ({
  message,
  userAvatar,
  onToggleReaction,
}: MessageProps) => {
  const isMe = message.sender === "me";
  const [showPicker, setShowPicker] = useState(false);
  console.log("message", message);


  const renderStatusIcon = () => {
    let status = "sent";

    if (message.readBy.length > 1) {
      status = "read";
    } else if (message.readBy.length === 1) {
      status = "delivered";
    }

    console.log("status", status);
    switch (status) {
      case MessageStatus.SENT:
        return <Check size={16} className="text-white" />;
      case MessageStatus.DELIVERED:
        return <CheckCheck size={16} className="text-white" />;
      case MessageStatus.READ:
        return <CheckCheck size={16} className="text-blue-950" />;
      default:
        return null;
    }
  };

  const handleSelectEmoji = (emoji: string) => {
    onToggleReaction(emoji);
    setShowPicker(false);
  };

  return (
    <div className={`flex items-start gap-3 ${isMe ? "flex-row-reverse" : ""}`}>
      {!isMe && (
        <div className="shrink-0">
          <Avatar src={userAvatar} alt="user avatar" size="sm" />
        </div>
      )}
      <div className="flex flex-col">
        <div className="group relative">
          {showPicker && (
            <EmojiPicker
              onSelect={handleSelectEmoji}
              onClose={() => setShowPicker(false)}
              isMe={isMe}
            />
          )}

          <div
            className={`max-w-xs md:max-w-md lg:max-w-xl p-3 rounded-xl ${
              isMe
                ? "bg-blue-500 text-white rounded-br-lg"
                : "bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-bl-lg shadow-sm"
            }`}
          >
            <p className="text-sm leading-relaxed wrap-break-word whitespace-pre-wrap">
              {message.content}
            </p>
            <div
              className={`flex items-center gap-2 mt-1 ${
                isMe ? "justify-end" : "justify-start"
              }`}
            >
              <span
                className={`text-xs ${
                  isMe ? "text-blue-200" : "text-slate-400 dark:text-slate-500"
                }`}
              >
                {message.timestamp}
              </span>
              {isMe && renderStatusIcon()}
            </div>
          </div>

          <div
            className={`absolute top-1/2 -translate-y-1/2 ${
              isMe
                ? "left-0 -translate-x-full pr-1"
                : "right-0 translate-x-full pl-1"
            } opacity-0 group-hover:opacity-100 transition-opacity z-10`}
          >
            <button
              onClick={() => setShowPicker((p) => !p)}
              className="p-1.5 rounded-full bg-white dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-500 dark:text-slate-400 shadow-md"
              aria-label="Add reaction"
              aria-haspopup="true"
              aria-expanded={showPicker}
            >
              <SmilePlus size={16} />
            </button>
          </div>
        </div>

        {/* {message.reactions && message.reactions.length > 0 && (
          <div
            className={`flex gap-1 mt-1 z-10 relative ${
              isMe ? "justify-end" : ""
            } ${!isMe ? "pl-2" : "pr-2"}`}
          >
            {message.reactions.map((reaction) => {
              const hasReacted = reaction.users.includes("me");
              return (
                <button
                  key={reaction.emoji}
                  onClick={() => onToggleReaction(reaction.emoji)}
                  className={`px-2 py-0.5 text-xs rounded-full border flex items-center gap-1 transition-colors ${
                    hasReacted
                      ? "bg-blue-100 dark:bg-blue-900/50 border-blue-300 dark:border-blue-700"
                      : "bg-slate-100 dark:bg-slate-700/50 border-slate-200 dark:border-slate-600 hover:bg-slate-200 dark:hover:bg-slate-600/50"
                  }`}
                  aria-label={`You and ${
                    reaction.users.length - 1
                  } others reacted with ${reaction.emoji}`}
                >
                  <span className="text-base leading-none">
                    {reaction.emoji}
                  </span>
                  {reaction.users.length > 0 && (
                    <span
                      className={`font-semibold ${
                        hasReacted
                          ? "text-blue-600 dark:text-blue-300"
                          : "text-slate-600 dark:text-slate-400"
                      }`}
                    >
                      {reaction.users.length}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )} */}
      </div>
    </div>
  );
};

export default Message;
