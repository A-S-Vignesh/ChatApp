import React, { useState, useRef, useEffect } from "react";

import {
  Search,
  MessageSquarePlus,
  Menu,
  User,
  Settings,
  HelpCircle,
  LogOut,
} from "lucide-react";
import Avatar from "./Avatar";
import { useChats } from "../hooks/useChats";
import { ChatType } from "../types/chat";
import { getChatDisplayUser, getLastMessage } from "../utils/chatHelpers";

interface SidebarProps {
  activeChatId: string | null;
  isLoading: boolean;
  isError: boolean;
  chats: ChatType[];
  currentUserId: string;
  onSelectChat: (chatId: string) => void;
  onShowMyProfile: () => void;
  onShowSettings: () => void;
  onShowHelp: () => void;
  onLogout: () => void;
  onShowAddNewChat: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  activeChatId,
  isLoading,
  isError,
  chats,
  onSelectChat,
  currentUserId,
  onShowMyProfile,
  onShowSettings,
  onShowHelp,
  onLogout,
  onShowAddNewChat,
}:SidebarProps) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  console.log("Chats", chats);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  if (isLoading) {
    return (
      <aside className="w-full md:w-95 flex items-center justify-center">
        Loading chats…
      </aside>
    );
  }

  if (isError || !chats) {
    return (
      <aside className="w-full md:w-95 flex items-center justify-center text-red-500">
        Failed to load chats
      </aside>
    );
  }

  return (
    <aside className="w-full md:w-95 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 flex flex-col h-full">
      {/* Header */}
      <header className="p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-800 shrink-0">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-blue-500 rounded-lg text-white">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">
            AetherChat
          </h1>
        </div>
        <div className="relative flex items-center" ref={menuRef}>
          <button
            onClick={onShowAddNewChat}
            aria-label="Start new chat"
            className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400"
          >
            <MessageSquarePlus size={20} />
          </button>
          <button
            onClick={() => setIsMenuOpen((prev) => !prev)}
            className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400"
            aria-label="Open menu"
            aria-haspopup="true"
            aria-expanded={isMenuOpen}
          >
            <Menu size={20} />
          </button>

          {isMenuOpen && (
            <div className="absolute top-full right-0 mt-2 w-56 bg-white dark:bg-slate-900 rounded-md shadow-lg border border-slate-200 dark:border-slate-700 z-10 p-2">
              <ul className="text-slate-700 dark:text-slate-300 space-y-1">
                <li>
                  <button
                    onClick={() => {
                      onShowMyProfile();
                      setIsMenuOpen(false);
                    }}
                    className="w-full text-left flex items-center gap-3 px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md"
                  >
                    <User
                      size={16}
                      className="text-slate-500 dark:text-slate-400"
                    />
                    <span>Profile</span>
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => {
                      onShowSettings();
                      setIsMenuOpen(false);
                    }}
                    className="w-full text-left flex items-center gap-3 px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md"
                  >
                    <Settings
                      size={16}
                      className="text-slate-500 dark:text-slate-400"
                    />
                    <span>Settings</span>
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => {
                      onShowHelp();
                      setIsMenuOpen(false);
                    }}
                    className="w-full text-left flex items-center gap-3 px-3 py-2 text-sm hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md"
                  >
                    <HelpCircle
                      size={16}
                      className="text-slate-500 dark:text-slate-400"
                    />
                    <span>Help</span>
                  </button>
                </li>
                <hr className="my-1 border-t border-slate-100 dark:border-slate-700" />
                <li>
                  <button
                    onClick={onLogout}
                    className="w-full text-left flex items-center gap-3 px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md font-medium"
                  >
                    <LogOut size={16} />
                    <span>Logout</span>
                  </button>
                </li>
              </ul>
            </div>
          )}
        </div>
      </header>

      {/* Search Bar */}
      <div className="p-4 shrink-0">
        <div className="relative">
          <Search
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            type="text"
            placeholder="Search chats..."
            className="w-full pl-10 pr-4 py-2 rounded-full bg-slate-100 dark:bg-slate-700 border border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-slate-800 dark:text-slate-200"
          />
        </div>
      </div>

      {/* Chat List */}
      <div className="grow overflow-y-auto">
        <ul className="space-y-1 p-2">
          {chats.map((chat) => {
            const displayUser = getChatDisplayUser(chat, currentUserId);
            const lastMsg = getLastMessage(chat);

            console.log("displayUser", displayUser);

            return (
              <li key={chat._id}>
                <button
                  onClick={() => onSelectChat(chat._id)}
                  className={`w-full flex items-center p-3 rounded-lg text-left transition-colors duration-200 ${
                    activeChatId === chat._id
                      ? "bg-blue-500 text-white"
                      : "hover:bg-slate-100 dark:hover:bg-slate-700"
                  }`}
                >
                  <Avatar
                    src={displayUser.image}
                    alt={displayUser.name}
                    isOnline={displayUser.isOnline}
                  />

                  <div className="grow ml-4 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3
                        className={`font-semibold truncate ${
                          activeChatId === chat._id
                            ? "text-white"
                            : "text-slate-800 dark:text-slate-100"
                        }`}
                      >
                        {displayUser.name}
                      </h3>

                      {lastMsg && (
                        <span
                          className={`text-xs whitespace-nowrap ${
                            activeChatId === chat._id
                              ? "text-blue-200"
                              : "text-slate-500 dark:text-slate-400"
                          }`}
                        >
                          {lastMsg.timestamp}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <p
                        className={`text-sm truncate ${
                          activeChatId === chat._id
                            ? "text-blue-100"
                            : "text-slate-500 dark:text-slate-400"
                        }`}
                      >
                        {lastMsg?.text ?? "No messages yet"}
                      </p>
                      {chat.unreadCount > 0 && (
                        <span className="bg-blue-500 text-white text-xs px-2 rounded-full">
                          {chat.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </aside>
  );
};

export default Sidebar;
