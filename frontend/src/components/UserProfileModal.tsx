import React from "react";
import { X, Phone, Mail, MessageSquare } from "lucide-react";
import { createAuthClient } from "better-auth/react";
import { UserType } from "../types/user";

interface UserProfileProps {
  user: UserType;
  onClose: () => void;
}

const UserProfile: React.FC<UserProfileProps> = ({ user, onClose }: UserProfileProps) => {
  if (!user) return null;
  return (
    <aside
      className="bg-white dark:bg-slate-800 w-full h-full flex flex-col"
      role="complementary"
      aria-labelledby="user-profile-heading"
    >
      {/* Header */}
      <header className="shrink-0 p-4 border-b border-slate-200 dark:border-slate-700 flex items-center bg-slate-50 dark:bg-slate-800 space-x-4">
        <button
          onClick={onClose}
          className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400"
          aria-label="Close profile"
        >
          <X size={20} />
        </button>
        <h2
          id="user-profile-heading"
          className="text-lg font-bold text-slate-800 dark:text-slate-100"
        >
          Contact Info
        </h2>
      </header>

      {/* Profile Content */}
      <div className="grow overflow-y-auto">
        <div className="p-6 flex flex-col items-center border-b border-slate-200 dark:border-slate-700">
          <div className="relative">
            <img
              className="w-24 h-24 rounded-full object-cover shadow-lg"
              src={user.image}
              alt={user.name}
            />
            {user.isOnline && (
              <span className="absolute bottom-1 right-1 block w-5 h-5 bg-green-500 rounded-full border-2 border-white dark:border-slate-800"></span>
            )}
          </div>

          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mt-4">
            {user.name}
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {user.isOnline ? "Online" : `Last seen ${user.lastSeen}`}
          </p>
        </div>

        <div className="p-6 space-y-6">
          <div>
            <h3 className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">
              About
            </h3>
            <p className="text-slate-700 dark:text-slate-300 text-sm">
              Crafting beautiful web experiences. Passionate about design and
              technology.
            </p>
          </div>
          <div>
            <h3 className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">
              Contact
            </h3>
            <div className="space-y-2">
              <div className="flex items-center space-x-3 text-sm text-slate-700 dark:text-slate-300">
                <Mail
                  size={16}
                  className="text-slate-400 dark:text-slate-500"
                />
                <span className="text-blue-500 hover:underline cursor-pointer">
                  {user.email}
                </span>
              </div>
              <div className="flex items-center space-x-3 text-sm text-slate-700 dark:text-slate-300">
                <Phone
                  size={16}
                  className="text-slate-400 dark:text-slate-500"
                />
                <span>+1 234 567 8900</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Actions Footer */}
      <footer className="p-4 border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 shrink-0">
        <button className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-blue-500 text-white font-semibold hover:bg-blue-600 transition-colors">
          <MessageSquare size={18} />
          <span>Send Message</span>
        </button>
      </footer>
    </aside>
  );
};

export default UserProfile;
