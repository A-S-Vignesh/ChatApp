import React, { useState } from "react";
import { X, Mail } from "lucide-react";
import { ChatType } from "../types/chat";
import { api } from "../lib/api";
import { useCreateChat } from "../hooks/useCreateChat";

interface AddNewChatModalProps {
  isOpen: boolean;
  setShowModel: (isOpen: boolean) => void;
  onClose: () => void;
  setActiveChatId: (chatId: string) => void;
}

const AddNewChatModal: React.FC<AddNewChatModalProps> = ({
  isOpen,
  onClose,
  setShowModel,
  setActiveChatId,
}: AddNewChatModalProps) => {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const { onCreateChatByEmail } = useCreateChat();

  if (!isOpen) return null;

  const isValidEmail = (value: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

  const handleStartChat = async () => {
    if (!isValidEmail(email)) {
      setError("Please enter a valid email address");
      return;
    }

    setError("");
    try {
      const chat = await onCreateChatByEmail(email.trim().toLowerCase());

      console.log("Testing", chat);
      setActiveChatId(chat._id);
      setEmail("");
      setShowModel(false);
    } catch (error: any) {
      setError(error.message);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleStartChat();
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <header className="p-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            Start a New Chat
          </h3>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700"
          >
            <X size={20} />
          </button>
        </header>

        {/* Body */}
        <div className="p-4 space-y-4">
          <div className="relative">
            <Mail
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Enter full email address"
              autoFocus
              className="
                w-full pl-10 pr-4 py-2 rounded-lg
                bg-slate-100 dark:bg-slate-700
                text-slate-800 dark:text-slate-200
                border border-transparent
                focus:outline-none focus:ring-2 focus:ring-blue-500
              "
            />
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <button
            onClick={handleStartChat}
            disabled={!email}
            className="
              w-full py-2 rounded-lg
              bg-blue-500 text-white font-medium
              hover:bg-blue-600 disabled:opacity-50
              transition
            "
          >
            Start Chat
          </button>

          <p className="text-xs text-slate-500 dark:text-slate-400 text-center">
            Enter the full email to start a private chat.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AddNewChatModal;
