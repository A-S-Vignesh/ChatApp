import React, { useState, useRef, useEffect } from "react";
import { Check, CheckCheck, Clock, SmilePlus } from "lucide-react";
import Avatar from "./Avatar";
import { MessageViewType } from "../types/message";
import { useToggleReaction } from "../hooks/useToggleReaction";

interface MessageProps {
  message: MessageViewType;
  isMe: boolean;
  showSenderName: boolean;
  participantCount: number;
  currentUserId: string;
  chatId: string;
}

const EMOJIS = ["👍", "❤️", "😂", "😮", "😢", "🙏"];

const ReactionPicker: React.FC<{
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
    return () => document.removeEventListener("mousedown", handleClickOutside);
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
  isMe,
  showSenderName,
  participantCount,
  currentUserId,
  chatId,
}: MessageProps) => {
  const [showPicker, setShowPicker] = useState(false);
  const { mutate: toggleReaction } = useToggleReaction(chatId, currentUserId);

  const renderStatusIcon = () => {
    if (message._id.startsWith("temp-")) {
      return <Clock size={14} className="text-blue-200" />;
    }

    /* Read: in 1:1 → readBy.length > 1; in groups → all recipients have read */
    const recipientsRead = message.readBy.filter((id) => id !== message.sender._id).length;
    const recipientCount = participantCount - 1;

    if (recipientCount > 0 && recipientsRead >= recipientCount) {
      return <CheckCheck size={16} className="text-white" />;
    }

    /* Delivered: in groups, all recipients delivered; in 1:1, anyone delivered */
    const recipientsDelivered = message.deliveredTo.filter(
      (id) => id !== message.sender._id
    ).length;

    if (recipientCount > 0 && recipientsDelivered >= recipientCount) {
      return <CheckCheck size={16} className="text-blue-200" />;
    }
    if (recipientsDelivered > 0) {
      return <CheckCheck size={16} className="text-blue-200 opacity-70" />;
    }

    return <Check size={16} className="text-blue-200" />;
  };

  const handleSelectEmoji = (emoji: string) => {
    toggleReaction({ messageId: message._id, emoji });
    setShowPicker(false);
  };

  const isTemp = message._id.startsWith("temp-");

  return (
    <div className={`flex items-start gap-3 ${isMe ? "flex-row-reverse" : ""}`}>
      {!isMe && (
        <div className="shrink-0">
          <Avatar
            src={message.sender.image}
            alt={message.sender.name || "user"}
            size="sm"
          />
        </div>
      )}
      <div className="flex flex-col">
        {showSenderName && (
          <span className="text-xs font-semibold text-blue-500 dark:text-blue-300 ml-1 mb-1">
            {message.sender.name || "Unknown"}
          </span>
        )}

        <div className="group relative">
          {showPicker && (
            <ReactionPicker
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

          {!isTemp && (
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
          )}
        </div>

        {message.reactions && message.reactions.length > 0 && (
          <div
            className={`flex flex-wrap gap-1 mt-1 z-10 relative ${
              isMe ? "justify-end pr-2" : "pl-2"
            }`}
          >
            {message.reactions.map((reaction) => {
              const hasReacted = reaction.users.includes(currentUserId);
              return (
                <button
                  key={reaction.emoji}
                  onClick={() =>
                    toggleReaction({
                      messageId: message._id,
                      emoji: reaction.emoji,
                    })
                  }
                  className={`px-2 py-0.5 text-xs rounded-full border flex items-center gap-1 transition-colors ${
                    hasReacted
                      ? "bg-blue-100 dark:bg-blue-900/50 border-blue-300 dark:border-blue-700"
                      : "bg-slate-100 dark:bg-slate-700/50 border-slate-200 dark:border-slate-600 hover:bg-slate-200 dark:hover:bg-slate-600/50"
                  }`}
                  aria-label={`React with ${reaction.emoji}`}
                >
                  <span className="text-base leading-none">
                    {reaction.emoji}
                  </span>
                  <span
                    className={`font-semibold ${
                      hasReacted
                        ? "text-blue-600 dark:text-blue-300"
                        : "text-slate-600 dark:text-slate-400"
                    }`}
                  >
                    {reaction.users.length}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Message;
