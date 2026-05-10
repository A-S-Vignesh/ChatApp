import React, { useState, useRef, useEffect } from "react";
import { Smile, Paperclip, Mic, Send } from "lucide-react";
import EmojiPicker, { EmojiClickData, Theme } from "emoji-picker-react";
import { socket } from "../lib/socket";


interface ChatInputProps {
  chatId: string | null;
  onSendMessage: (messageText: string) => void;
  disabled?: boolean;
}

const TYPING_STOP_DELAY_MS = 2000;

const ChatInput: React.FC<ChatInputProps> = ({ chatId, onSendMessage, disabled }) => {
  const [inputText, setInputText] = useState("");
  const [showEmoji, setShowEmoji] = useState(false);
  const emojiRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  /* typing emit state */
  const isTypingRef = useRef(false);
  const typingTimeoutRef = useRef<number | null>(null);

  const emitTypingStop = () => {
    if (typingTimeoutRef.current !== null) {
      clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = null;
    }
    if (isTypingRef.current && chatId) {
      socket.emit("typing:stop", { chatId });
    }
    isTypingRef.current = false;
  };

  const emitTypingStart = () => {
    if (!chatId) return;
    if (!isTypingRef.current) {
      socket.emit("typing:start", { chatId });
      isTypingRef.current = true;
    }
    if (typingTimeoutRef.current !== null) {
      clearTimeout(typingTimeoutRef.current);
    }
    typingTimeoutRef.current = window.setTimeout(emitTypingStop, TYPING_STOP_DELAY_MS);
  };

  /* clean up on chat switch / unmount */
  useEffect(() => {
    return () => emitTypingStop();
  }, [chatId]);

  // Auto-resize textarea based on content
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    textarea.style.height = "auto";

    const scrollHeight = textarea.scrollHeight;
    const maxHeight = 120;

    if (scrollHeight > maxHeight) {
      textarea.style.height = `${maxHeight}px`;
      textarea.style.overflowY = "auto";
    } else {
      textarea.style.height = `${scrollHeight}px`;
      textarea.style.overflowY = "hidden";
    }
  }, [inputText]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (emojiRef.current && !emojiRef.current.contains(e.target as Node)) {
        setShowEmoji(false);
      }
    };

    if (showEmoji) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showEmoji]);



  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (disabled) return;

    const trimmedText = inputText.trim();
    if (trimmedText) {
      emitTypingStop();
      onSendMessage(trimmedText);
      setInputText("");
    }
  };

  const insertAtCursor = (emoji: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;

    setInputText((prev) => {
      const updated = prev.substring(0, start) + emoji + prev.substring(end);

      // Restore cursor AFTER state update
      requestAnimationFrame(() => {
        textarea.selectionStart = textarea.selectionEnd = start + emoji.length;
        textarea.focus();
      });

      return updated;
    });
  };

  const handleEmojiClick = (emojiData: EmojiClickData) => {
    insertAtCursor(emojiData.emoji);
  };



  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Send message on Enter, but allow new line with Shift+Enter
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const storedTheme =
    (localStorage.getItem("theme") as "light" | "dark") || "light";

  const emojiTheme = storedTheme === "dark" ? Theme.DARK : Theme.LIGHT;

  return (
    <div className="relative shrink-0 p-4 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700">
      <form
        onSubmit={handleSubmit}
        className="flex items-end space-x-2 sm:space-x-4"
      >
        {/* Left-side action buttons */}
        <button
          type="button"
          onClick={() => setShowEmoji((p) => !p)}
          className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700
             text-slate-500 dark:text-slate-400 mb-1"
        >
          <Smile size={22} />
        </button>
        <button
          type="button"
          className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 mb-1"
        >
          <Paperclip size={22} />
        </button>
        {showEmoji && (
          <div ref={emojiRef} className="absolute bottom-16 left-4 z-50">
            <EmojiPicker
              onEmojiClick={handleEmojiClick}
              theme={emojiTheme}
              className="bg-slate-200 dark:bg-slate-950"
              height={400}
              width={300}
            />
          </div>
        )}

        {/* Text input area */}
        <textarea
          ref={textareaRef}
          value={inputText}
          onChange={(e) => {
            const val = e.target.value;
            setInputText(val);
            if (val.trim().length > 0) {
              emitTypingStart();
            } else {
              emitTypingStop();
            }
          }}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          rows={1}
          disabled={disabled}
          className="
            grow w-full px-4 py-2 rounded-xl
            bg-slate-100 dark:bg-slate-700
            text-slate-800 dark:text-slate-200
            border border-transparent
            resize-none
            overflow-y-hidden
            focus:outline-none focus:ring-2 focus:ring-blue-500
            transition-height duration-150
            disabled:opacity-60
  "
          style={{ maxHeight: "120px" }}
        />

        {/* Send/Mic button */}
        <button
          type="submit"
          className="p-3 rounded-full bg-blue-500 text-white hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-transform duration-150 transform active:scale-95"
          aria-label={
            inputText.trim() ? "Send message" : "Record voice message"
          }
        >
          {inputText.trim() ? <Send size={20} /> : <Mic size={20} />}
        </button>
      </form>
    </div>
  );
};

export default ChatInput;
