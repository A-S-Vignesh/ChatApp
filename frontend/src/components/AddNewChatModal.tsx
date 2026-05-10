import React, { useState } from "react";
import { X, Mail, Users, Plus, Trash2 } from "lucide-react";
import { useCreateChat } from "../hooks/useCreateChat";
import { useCreateGroup } from "../hooks/useGroupChat";

interface AddNewChatModalProps {
  isOpen: boolean;
  setShowModel: (isOpen: boolean) => void;
  onClose: () => void;
  setActiveChatId: (chatId: string) => void;
}

const isValidEmail = (value: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

const AddNewChatModal: React.FC<AddNewChatModalProps> = ({
  isOpen,
  onClose,
  setShowModel,
  setActiveChatId,
}: AddNewChatModalProps) => {
  const [tab, setTab] = useState<"direct" | "group">("direct");

  /* direct chat form */
  const [email, setEmail] = useState("");

  /* group chat form */
  const [groupName, setGroupName] = useState("");
  const [memberEmail, setMemberEmail] = useState("");
  const [memberEmails, setMemberEmails] = useState<string[]>([]);

  const [error, setError] = useState("");
  const { onCreateChatByEmail } = useCreateChat();
  const { mutateAsync: createGroup, isPending: creatingGroup } =
    useCreateGroup();

  if (!isOpen) return null;

  const reset = () => {
    setEmail("");
    setGroupName("");
    setMemberEmail("");
    setMemberEmails([]);
    setError("");
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleStartDirect = async () => {
    if (!isValidEmail(email)) {
      setError("Please enter a valid email address");
      return;
    }
    setError("");
    try {
      const chat = await onCreateChatByEmail(email.trim().toLowerCase());
      setActiveChatId(chat._id);
      reset();
      setShowModel(false);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleAddMemberEmail = () => {
    const trimmed = memberEmail.trim().toLowerCase();
    if (!isValidEmail(trimmed)) {
      setError("Enter a valid email to add");
      return;
    }
    if (memberEmails.includes(trimmed)) {
      setError("Already added");
      return;
    }
    setMemberEmails((prev) => [...prev, trimmed]);
    setMemberEmail("");
    setError("");
  };

  const handleRemoveMember = (e: string) => {
    setMemberEmails((prev) => prev.filter((x) => x !== e));
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      setError("Group name is required");
      return;
    }
    if (memberEmails.length === 0) {
      setError("Add at least one member");
      return;
    }
    setError("");
    try {
      const chat = await createGroup({
        name: groupName.trim(),
        memberEmails,
      });
      setActiveChatId(chat._id);
      reset();
      setShowModel(false);
    } catch (err: any) {
      setError(
        err?.response?.data?.message ?? err.message ?? "Failed to create group"
      );
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={handleClose}
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
            New conversation
          </h3>
          <button
            onClick={handleClose}
            className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </header>

        {/* Tabs */}
        <div className="flex border-b border-slate-200 dark:border-slate-700">
          <button
            onClick={() => {
              setTab("direct");
              setError("");
            }}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              tab === "direct"
                ? "text-blue-500 border-b-2 border-blue-500"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            <Mail size={14} className="inline mr-2" />
            Direct
          </button>
          <button
            onClick={() => {
              setTab("group");
              setError("");
            }}
            className={`flex-1 py-3 text-sm font-medium transition-colors ${
              tab === "group"
                ? "text-blue-500 border-b-2 border-blue-500"
                : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            <Users size={14} className="inline mr-2" />
            New group
          </button>
        </div>

        {/* Body */}
        <div className="p-4 space-y-4">
          {tab === "direct" ? (
            <>
              <div className="relative">
                <Mail
                  size={18}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleStartDirect();
                    }
                  }}
                  placeholder="Enter full email address"
                  autoFocus
                  className="w-full pl-10 pr-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200 border border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {error && <p className="text-sm text-red-500">{error}</p>}

              <button
                onClick={handleStartDirect}
                disabled={!email}
                className="w-full py-2 rounded-lg bg-blue-500 text-white font-medium hover:bg-blue-600 disabled:opacity-50 transition"
              >
                Start chat
              </button>
            </>
          ) : (
            <>
              <input
                type="text"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="Group name"
                autoFocus
                maxLength={80}
                className="w-full px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200 border border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
              />

              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Mail
                    size={18}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                  <input
                    type="email"
                    value={memberEmail}
                    onChange={(e) => setMemberEmail(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddMemberEmail();
                      }
                    }}
                    placeholder="Add member by email"
                    className="w-full pl-10 pr-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200 border border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleAddMemberEmail}
                  className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300"
                  aria-label="Add member"
                >
                  <Plus size={20} />
                </button>
              </div>

              {memberEmails.length > 0 && (
                <ul className="max-h-40 overflow-y-auto space-y-1">
                  {memberEmails.map((m) => (
                    <li
                      key={m}
                      className="flex items-center justify-between bg-slate-50 dark:bg-slate-700/50 rounded-lg px-3 py-2 text-sm text-slate-700 dark:text-slate-200"
                    >
                      <span className="truncate">{m}</span>
                      <button
                        onClick={() => handleRemoveMember(m)}
                        className="p-1 rounded text-slate-400 hover:text-red-500"
                        aria-label={`Remove ${m}`}
                      >
                        <Trash2 size={14} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              {error && <p className="text-sm text-red-500">{error}</p>}

              <button
                onClick={handleCreateGroup}
                disabled={creatingGroup || !groupName.trim() || memberEmails.length === 0}
                className="w-full py-2 rounded-lg bg-blue-500 text-white font-medium hover:bg-blue-600 disabled:opacity-50 transition"
              >
                {creatingGroup ? "Creating…" : "Create group"}
              </button>

              <p className="text-xs text-slate-500 dark:text-slate-400 text-center">
                You'll be added automatically as the admin.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default AddNewChatModal;
