import React, { useState } from "react";
import { X, Mail, UserPlus, Copy, Check, Loader2, Send } from "lucide-react";
import { useCreateChat } from "../hooks/useCreateChat";
import { authClient } from "../lib/authClient";
import InviteFriend from "./InviteFriend";

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
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const { onCreateChatByEmail } = useCreateChat();
  const { data: session } = authClient.useSession();

  if (!isOpen) return null;

  const myEmail = session?.user?.email ?? "";
  const appLink = import.meta.env.VITE_BASE_URL || window.location.origin;

  const isValidEmail = (value: string) =>
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

  /* mailto: invite addressed to the person who isn't on AetherChat yet. */
  const inviteMailto = () => {
    const subject = encodeURIComponent("Join me on AetherChat");
    const lines = [
      "Hi,",
      "",
      "Let's chat on AetherChat — sign in with Google here:",
      appLink,
      "",
      myEmail ? `Then add me (${myEmail}) to start a conversation.` : "",
      "",
      "See you there!",
    ].filter((l) => l !== undefined);
    return `mailto:${encodeURIComponent(email.trim())}?subject=${subject}&body=${encodeURIComponent(
      lines.join("\n")
    )}`;
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(appLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Couldn't copy — please copy the link manually.");
    }
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
    if (error) setError("");
    if (notFound) setNotFound(false);
  };

  const handleStartChat = async () => {
    if (!isValidEmail(email)) {
      setError("Please enter a valid email address");
      return;
    }

    setError("");
    setNotFound(false);
    setLoading(true);
    try {
      const chat = await onCreateChatByEmail(email.trim().toLowerCase());
      setActiveChatId(chat._id);
      setEmail("");
      setShowModel(false);
    } catch (err: any) {
      const message: string = err?.message ?? "Failed to start chat";
      if (/no aetherchat user|not found/i.test(message)) {
        setNotFound(true);
      } else if (/yourself/i.test(message)) {
        setError("That's your own email — enter someone else's.");
      } else {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !loading) {
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
            aria-label="Close"
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
              onChange={handleEmailChange}
              onKeyDown={handleKeyDown}
              placeholder="Enter their email address"
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

          {/* Not-found → actionable invite panel instead of a dead end */}
          {notFound ? (
            <div className="rounded-xl border border-amber-200 dark:border-amber-800/50 bg-amber-50 dark:bg-amber-900/15 p-4 space-y-3">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-800/30 shrink-0">
                  <UserPlus size={18} className="text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                    Nobody's on AetherChat with that email yet
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    Double-check the address, or invite them to join — you'll be
                    able to chat as soon as they sign in.
                  </p>
                </div>
              </div>

              <div className="flex gap-2">
                <a
                  href={inviteMailto()}
                  className="flex-1 inline-flex items-center justify-center gap-2 py-2 rounded-lg bg-blue-500 text-white text-sm font-medium hover:bg-blue-600 transition"
                >
                  <Send size={15} />
                  Send invite
                </a>
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="flex-1 inline-flex items-center justify-center gap-2 py-2 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 text-sm font-medium hover:bg-slate-100 dark:hover:bg-slate-700 transition"
                >
                  {copied ? <Check size={15} className="text-green-500" /> : <Copy size={15} />}
                  {copied ? "Copied!" : "Copy link"}
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={handleStartChat}
              disabled={!email || loading}
              className="
                w-full inline-flex items-center justify-center gap-2 py-2 rounded-lg
                bg-blue-500 text-white font-medium
                hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed
                transition
              "
            >
              {loading && <Loader2 size={16} className="animate-spin" />}
              {loading ? "Starting…" : "Start Chat"}
            </button>
          )}

          <p className="text-xs text-slate-500 dark:text-slate-400 text-center">
            Enter the email of the person you want to message.
          </p>

          {/* Always-available escape hatch: invite someone who isn't here yet. */}
          {!notFound && (
            <div className="pt-3 border-t border-slate-200 dark:border-slate-700">
              <p className="text-xs text-slate-500 dark:text-slate-400 text-center mb-2.5">
                Not on AetherChat yet? Invite them over.
              </p>
              <InviteFriend />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AddNewChatModal;
