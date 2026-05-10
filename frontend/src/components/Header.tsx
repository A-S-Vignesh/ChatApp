import React, { useState, useRef, useEffect } from "react";
import Avatar from "./Avatar";
import {
  ArrowLeft,
  MoreVertical,
  Search,
  X,
  XCircle,
  Bell,
  BellOff,
  Trash2,
  UserCircle2,
  MessageSquareOff,
  AlertTriangle,
} from "lucide-react";
import { formatLastSeen } from "../utils/formatLastSeen";
import { UserType } from "../types/user";

interface HeaderProps {
  user: UserType;
  onBack: () => void;
  onViewProfile: (user: UserType) => void;
  isTyping?: boolean;
  isMuted?: boolean;
  onToggleMute?: () => void;
  onClearChat?: () => void;
  onDeleteChat?: () => void;
  onSearchChange?: (query: string) => void;
}

type ConfirmType = "clear" | "delete" | null;

const Header: React.FC<HeaderProps> = ({
  user,
  onBack,
  onViewProfile,
  isTyping = false,
  isMuted = false,
  onToggleMute,
  onClearChat,
  onDeleteChat,
  onSearchChange,
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [confirmType, setConfirmType] = useState<ConfirmType>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const userId = (user as any)._id ?? user.id ?? "";
  const prevUserIdRef = useRef(userId);

  const statusText = isTyping
    ? "typing..."
    : user.isOnline
    ? "Online"
    : formatLastSeen(user.lastSeen);

  /* Close menu on outside click */
  useEffect(() => {
    if (!menuOpen) return;
    const onOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, [menuOpen]);

  /* Focus input when search opens */
  useEffect(() => {
    if (showSearch) searchInputRef.current?.focus();
  }, [showSearch]);

  /* Reset search when active chat changes */
  useEffect(() => {
    const newId = (user as any)._id ?? user.id ?? "";
    if (prevUserIdRef.current !== newId) {
      prevUserIdRef.current = newId;
      setShowSearch(false);
      setSearchQuery("");
      onSearchChange?.("");
    }
  });

  const handleSearchChange = (q: string) => {
    setSearchQuery(q);
    onSearchChange?.(q);
  };

  const closeSearch = () => {
    setShowSearch(false);
    handleSearchChange("");
  };

  const handleConfirm = () => {
    if (confirmType === "clear") onClearChat?.();
    else if (confirmType === "delete") onDeleteChat?.();
    setConfirmType(null);
  };

  return (
    <>
      <header className="shrink-0 border-b border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
        <div className="flex items-center justify-between px-3 py-2.5 h-[60px]">

          {/* ── Search mode ─────────────────────────────────── */}
          {showSearch ? (
            <div className="flex items-center flex-1 gap-2">
              <button
                onClick={closeSearch}
                className="shrink-0 p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 transition-colors"
                aria-label="Close search"
              >
                <ArrowLeft size={20} />
              </button>
              <div className="flex-1 relative">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search in conversation…"
                  value={searchQuery}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="w-full pl-9 pr-8 py-2 text-sm rounded-full bg-slate-100 dark:bg-slate-700 outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 dark:text-slate-200 placeholder-slate-400 transition"
                />
                {searchQuery && (
                  <button
                    onClick={() => handleSearchChange("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    aria-label="Clear search"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
            </div>

          ) : (
            /* ── Normal mode ──────────────────────────────────── */
            <>
              <div className="flex items-center gap-1 min-w-0">
                <button
                  onClick={onBack}
                  className="shrink-0 p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 lg:hidden transition-colors"
                  aria-label="Back"
                >
                  <ArrowLeft size={20} />
                </button>

                <button
                  onClick={() => onViewProfile(user)}
                  className="flex items-center gap-3 px-2 py-1 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors min-w-0"
                  aria-label={`View ${user.name}'s profile`}
                >
                  <Avatar src={user.image} alt={user.name} isOnline={user.isOnline} />
                  <div className="min-w-0">
                    <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate leading-tight">
                      {user.name}
                    </h2>
                    <p className={`text-xs leading-tight truncate ${
                      isTyping
                        ? "text-blue-500 dark:text-blue-400 italic"
                        : "text-slate-500 dark:text-slate-400"
                    }`}>
                      {statusText}
                    </p>
                  </div>
                </button>
              </div>

              {/* ── Action buttons ── */}
              <div className="flex items-center gap-0.5 shrink-0 relative" ref={menuRef}>
                {isMuted && (
                  <span className="p-2 text-slate-400 dark:text-slate-500" title="Notifications muted">
                    <BellOff size={16} />
                  </span>
                )}

                <button
                  onClick={() => setMenuOpen((o: boolean) => !o)}
                  className={`p-2 rounded-full transition-colors ${
                    menuOpen
                      ? "bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
                      : "hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400"
                  }`}
                  aria-label="Chat options"
                  aria-expanded={menuOpen}
                  aria-haspopup="menu"
                >
                  <MoreVertical size={20} />
                </button>

                {/* ── Dropdown ── */}
                {menuOpen && (
                  <div
                    role="menu"
                    className="absolute right-0 top-[calc(100%+6px)] bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden z-50"
                    style={{ minWidth: "220px" }}
                  >
                    <MenuItem
                      icon={<UserCircle2 size={16} />}
                      label="View Contact"
                      onClick={() => { onViewProfile(user); setMenuOpen(false); }}
                    />
                    <MenuItem
                      icon={<Search size={16} />}
                      label="Search in Chat"
                      onClick={() => { setShowSearch(true); setMenuOpen(false); }}
                    />
                    <MenuItem
                      icon={isMuted ? <Bell size={16} /> : <BellOff size={16} />}
                      label={isMuted ? "Unmute Notifications" : "Mute Notifications"}
                      onClick={() => { onToggleMute?.(); setMenuOpen(false); }}
                    />
                    <MenuItem
                      icon={<XCircle size={16} />}
                      label="Close Chat"
                      onClick={() => { onBack(); setMenuOpen(false); }}
                    />

                    <div className="h-px bg-slate-100 dark:bg-slate-700 mx-3 my-1" />

                    <MenuItem
                      icon={<MessageSquareOff size={16} />}
                      label="Clear Chat"
                      onClick={() => { setConfirmType("clear"); setMenuOpen(false); }}
                      danger="warn"
                    />
                    <MenuItem
                      icon={<Trash2 size={16} />}
                      label="Delete Chat"
                      onClick={() => { setConfirmType("delete"); setMenuOpen(false); }}
                      danger="critical"
                    />
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </header>

      {/* ── Confirm Dialog ──────────────────────────────────────── */}
      {confirmType && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          onClick={(e: React.MouseEvent<HTMLDivElement>) => e.target === e.currentTarget && setConfirmType(null)}
        >
          <div className="w-full max-w-sm bg-white dark:bg-slate-800 rounded-2xl shadow-2xl overflow-hidden">
            <div className="p-6 space-y-3">
              <div className="flex items-start gap-4">
                <div className={`shrink-0 p-3 rounded-xl ${
                  confirmType === "delete"
                    ? "bg-red-100 dark:bg-red-900/30"
                    : "bg-amber-100 dark:bg-amber-900/30"
                }`}>
                  <AlertTriangle
                    size={22}
                    className={confirmType === "delete"
                      ? "text-red-600 dark:text-red-400"
                      : "text-amber-600 dark:text-amber-400"}
                  />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-slate-900 dark:text-white">
                    {confirmType === "delete" ? "Delete Conversation?" : "Clear Conversation?"}
                  </h3>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                    {confirmType === "delete"
                      ? `Permanently delete your chat with ${user.name} and all its messages.`
                      : `Permanently delete all messages in your chat with ${user.name}.`}
                  </p>
                </div>
              </div>
              <p className="text-xs text-slate-400 dark:text-slate-500">
                This action cannot be undone.
              </p>
            </div>
            <div className="flex gap-3 px-6 pb-5">
              <button
                onClick={() => setConfirmType(null)}
                className="flex-1 py-2.5 text-sm font-semibold rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                className={`flex-1 py-2.5 text-sm font-semibold rounded-xl text-white transition-colors ${
                  confirmType === "delete"
                    ? "bg-red-600 hover:bg-red-700 active:bg-red-800"
                    : "bg-amber-500 hover:bg-amber-600 active:bg-amber-700"
                }`}
              >
                {confirmType === "delete" ? "Delete" : "Clear"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

/* ── Helper sub-component ─────────────────────────────── */
const MenuItem: React.FC<{
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  danger?: "warn" | "critical";
}> = ({ icon, label, onClick, danger }) => {
  const colorClass = danger === "critical"
    ? "text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
    : danger === "warn"
    ? "text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20"
    : "text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/60";

  return (
    <button
      role="menuitem"
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium transition-colors ${colorClass}`}
    >
      {icon}
      {label}
    </button>
  );
};

export default Header;
