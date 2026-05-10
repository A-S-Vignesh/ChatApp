import React, { useState, useRef, useEffect } from "react";
import { Clock, Check, CheckCheck, SmilePlus, AlertCircle } from "lucide-react";
import Avatar from "./Avatar";
import { MessageViewType } from "../types/message";

interface MessageProps {
  message: MessageViewType;
  userAvatar: string;
  userName?: string;
  onToggleReaction: (emoji: string) => void;
  highlight?: string;
}

function highlightText(text: string, query: string): React.ReactNode {
  if (!query.trim()) return text;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const parts = text.split(new RegExp(`(${escaped})`, "gi"));
  return parts.map((part, i) =>
    part.toLowerCase() === query.toLowerCase() ? (
      <mark key={i} className="bg-yellow-200 dark:bg-yellow-500/40 text-current rounded px-0.5">
        {part}
      </mark>
    ) : (
      <React.Fragment key={i}>{part}</React.Fragment>
    )
  );
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
  userName = "User",
  onToggleReaction,
  highlight = "",
}: MessageProps) => {
  const isMe = message.sender === "me";
  const [showPicker, setShowPicker] = useState(false);

  const renderStatusIcon = () => {
    if (!isMe) return null;

    /* Optimistic / still sending — distinguish "failed" so the user can see
       that the outbox gave up after retries. */
    if (message._id.startsWith("temp-")) {
      if (message._outboxStatus === "failed") {
        return (
          <AlertCircle
            size={14}
            className="text-red-300"
            aria-label="Failed to send"
          />
        );
      }
      return <Clock size={14} className="text-blue-200 opacity-70" />;
    }

    /* Read — other party has opened the chat */
    if (message.readBy && message.readBy.length > 1) {
      return <CheckCheck size={16} className="text-white" />;
    }

    /* Delivered — other party's device received it */
    if (message.deliveredTo && message.deliveredTo.length > 1) {
      return <CheckCheck size={16} className="text-blue-200" />;
    }

    /* Sent — saved to server */
    return <Check size={16} className="text-blue-200" />;
  };

  const handleSelectEmoji = (emoji: string) => {
    onToggleReaction(emoji);
    setShowPicker(false);
  };

  return (
    <div className={`flex items-start gap-3 ${isMe ? "flex-row-reverse" : ""}`}>
      {!isMe && (
        <div className="shrink-0">
          <Avatar src={userAvatar} alt={userName} size="sm" />
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
              {highlight ? highlightText(message.content, highlight) : message.content}
            </p>
            <div
              className={`flex items-center gap-1 mt-1 ${
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
              {renderStatusIcon()}
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
      </div>
    </div>
  );
};

export default Message;
