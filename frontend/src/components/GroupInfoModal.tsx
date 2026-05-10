import React, { useState } from "react";
import {
  X,
  Users,
  Edit3,
  Save,
  Plus,
  LogOut,
  Trash2,
  Crown,
  Mail,
} from "lucide-react";
import Avatar from "./Avatar";
import { ChatType } from "../types/chat";
import {
  useAddGroupMember,
  useRemoveGroupMember,
  useRenameGroup,
} from "../hooks/useGroupChat";

interface GroupInfoModalProps {
  chat: ChatType;
  currentUserId: string;
  onClose: () => void;
}

function getCreatorId(chat: ChatType): string | undefined {
  const c = chat.createdBy;
  if (!c) return undefined;
  return typeof c === "string" ? c : c._id;
}

const GroupInfoModal: React.FC<GroupInfoModalProps> = ({
  chat,
  currentUserId,
  onClose,
}: GroupInfoModalProps) => {
  const creatorId = getCreatorId(chat);
  const isAdmin = creatorId === currentUserId;

  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(chat.name ?? "");
  const [addEmail, setAddEmail] = useState("");
  const [error, setError] = useState<string | null>(null);

  const { mutate: renameGroup, isPending: renaming } = useRenameGroup(chat._id);
  const { mutateAsync: addMember, isPending: adding } =
    useAddGroupMember(chat._id);
  const { mutate: removeMember } = useRemoveGroupMember(chat._id);

  const handleRename = () => {
    if (!nameDraft.trim() || nameDraft.trim() === chat.name) {
      setEditingName(false);
      return;
    }
    renameGroup(
      { name: nameDraft.trim() },
      {
        onSuccess: () => setEditingName(false),
        onError: (err: any) =>
          setError(err?.response?.data?.message ?? "Failed to rename"),
      }
    );
  };

  const handleAddMember = async () => {
    setError(null);
    const trimmed = addEmail.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError("Enter a valid email");
      return;
    }
    try {
      await addMember({ email: trimmed });
      setAddEmail("");
    } catch (err: any) {
      setError(err?.response?.data?.message ?? "Failed to add member");
    }
  };

  const handleRemoveMember = (userId: string) => {
    setError(null);
    removeMember(
      { userId },
      {
        onError: (err: any) =>
          setError(err?.response?.data?.message ?? "Failed to remove member"),
      }
    );
  };

  const handleLeave = () => {
    if (!confirm("Leave this group?")) return;
    removeMember(
      { userId: currentUserId, isSelf: true },
      {
        onSuccess: () => onClose(),
        onError: (err: any) =>
          setError(err?.response?.data?.message ?? "Failed to leave group"),
      }
    );
  };

  return (
    <aside
      className="bg-white dark:bg-slate-800 w-full h-full flex flex-col"
      role="complementary"
    >
      {/* Header */}
      <header className="shrink-0 p-4 border-b border-slate-200 dark:border-slate-700 flex items-center bg-slate-50 dark:bg-slate-800 space-x-4">
        <button
          onClick={onClose}
          className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400"
          aria-label="Close group info"
        >
          <X size={20} />
        </button>
        <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">
          Group info
        </h2>
      </header>

      <div className="grow overflow-y-auto">
        {/* Group identity */}
        <div className="p-6 flex flex-col items-center border-b border-slate-200 dark:border-slate-700">
          <div className="w-24 h-24 rounded-full bg-blue-500 flex items-center justify-center text-white shadow-lg">
            <Users size={40} />
          </div>

          <div className="mt-4 w-full flex items-center justify-center gap-2">
            {editingName ? (
              <>
                <input
                  type="text"
                  value={nameDraft}
                  onChange={(e) => setNameDraft(e.target.value)}
                  maxLength={80}
                  className="text-xl font-bold text-slate-800 dark:text-slate-100 bg-slate-50 dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-1 text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={handleRename}
                  disabled={renaming}
                  className="p-2 rounded-md bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50"
                  aria-label="Save name"
                >
                  <Save size={16} />
                </button>
                <button
                  onClick={() => {
                    setEditingName(false);
                    setNameDraft(chat.name ?? "");
                  }}
                  className="p-2 rounded-md text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700"
                  aria-label="Cancel"
                >
                  <X size={16} />
                </button>
              </>
            ) : (
              <>
                <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
                  {chat.name || "Group"}
                </h2>
                {isAdmin && (
                  <button
                    onClick={() => {
                      setNameDraft(chat.name ?? "");
                      setEditingName(true);
                    }}
                    className="p-1.5 rounded-md text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700"
                    aria-label="Edit name"
                  >
                    <Edit3 size={14} />
                  </button>
                )}
              </>
            )}
          </div>

          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {chat.participants.length} members
          </p>
        </div>

        {/* Members list */}
        <div className="p-4">
          <h3 className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3 px-2">
            Members
          </h3>

          {isAdmin && (
            <div className="flex gap-2 mb-3">
              <div className="relative flex-1">
                <Mail
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  type="email"
                  value={addEmail}
                  onChange={(e) => setAddEmail(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddMember();
                    }
                  }}
                  placeholder="Add member by email"
                  className="w-full pl-9 pr-3 py-2 text-sm rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200 border border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <button
                onClick={handleAddMember}
                disabled={adding || !addEmail.trim()}
                className="p-2 rounded-lg bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white"
                aria-label="Add member"
              >
                <Plus size={18} />
              </button>
            </div>
          )}

          <ul className="space-y-1">
            {chat.participants.map((p) => {
              const isMe = p._id === currentUserId;
              const isCreator = creatorId === p._id;
              return (
                <li
                  key={p._id}
                  className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50"
                >
                  <Avatar
                    src={p.image}
                    alt={p.name}
                    isOnline={p.isOnline}
                    size="sm"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">
                        {isMe ? "You" : p.name}
                      </p>
                      {isCreator && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 text-xs bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 rounded">
                          <Crown size={10} />
                          Admin
                        </span>
                      )}
                    </div>
                    {p.isOnline ? (
                      <p className="text-xs text-green-500">Online</p>
                    ) : null}
                  </div>
                  {isAdmin && !isMe && !isCreator && (
                    <button
                      onClick={() => handleRemoveMember(p._id)}
                      className="p-1.5 rounded-md text-slate-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500"
                      aria-label={`Remove ${p.name}`}
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </div>

        {error && (
          <p className="text-sm text-red-500 mx-4 my-2">{error}</p>
        )}
      </div>

      {/* Leave / delete */}
      {!isAdmin && (
        <footer className="p-4 border-t border-slate-200 dark:border-slate-700">
          <button
            onClick={handleLeave}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white font-semibold"
          >
            <LogOut size={16} />
            Leave group
          </button>
        </footer>
      )}
      {isAdmin && (
        <footer className="p-4 border-t border-slate-200 dark:border-slate-700 text-xs text-center text-slate-500 dark:text-slate-400">
          Admins can't leave the group. Transfer admin to leave.
        </footer>
      )}
    </aside>
  );
};

export default GroupInfoModal;
