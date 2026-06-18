import React from "react";
import {
  X,
  Mail,
  Phone,
  MapPin,
  CalendarDays,
  UserRound,
  MessageSquare,
  ShieldCheck,
} from "lucide-react";
import { UserType } from "../types/user";
import { formatLastSeen } from "../utils/formatLastSeen";
import Avatar from "./Avatar";

interface UserProfileProps {
  user: UserType;
  onClose: () => void;
}

const UserProfile: React.FC<UserProfileProps> = ({ user, onClose }) => {
  if (!user) return null;

  const statusText = user.isOnline ? "Online" : formatLastSeen(user.lastSeen);

  return (
    <div className="h-full flex flex-col bg-white dark:bg-slate-800">
      {/* Top bar */}
      <header className="shrink-0 flex items-center gap-3 px-4 py-3 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
        <button
          onClick={onClose}
          className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 transition-colors"
          aria-label="Close profile"
        >
          <X size={18} />
        </button>
        <h2 className="text-base font-semibold text-slate-800 dark:text-slate-100">
          Contact Info
        </h2>
      </header>

      <div className="flex-1 overflow-y-auto">
        {/* Hero banner */}
        <div className="relative">
          <div className="h-28 bg-linear-to-br from-blue-600 via-blue-700 to-indigo-700" />

          {/* Avatar straddling banner */}
          <div className="absolute left-1/2 -translate-x-1/2 bottom-0 translate-y-1/2">
            <Avatar
              src={user.image}
              alt={user.name}
              isOnline={user.isOnline}
              size="lg"
              className="ring-4 ring-white dark:ring-slate-800 shadow-xl"
            />
          </div>
        </div>

        {/* Identity block */}
        <div className="pt-16 pb-6 px-6 text-center border-b border-slate-100 dark:border-slate-700">
          <h3 className="text-xl font-bold text-slate-900 dark:text-white">
            {user.name}
          </h3>

          <div className="mt-2 flex items-center justify-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                user.isOnline
                  ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                  : "bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400"
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  user.isOnline ? "bg-green-500" : "bg-slate-400"
                }`}
              />
              {statusText}
            </span>
          </div>
        </div>

        {/* Info sections */}
        <div className="px-4 py-5 space-y-2">

          {/* About */}
          <div className="bg-slate-50 dark:bg-slate-700/30 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-3">
              <UserRound size={15} className="text-blue-500" />
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                About
              </span>
            </div>
            <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
              {user.about || (
                <span className="text-slate-400 italic">No bio yet</span>
              )}
            </p>
          </div>

          {/* Email */}
          <InfoRow
            icon={<Mail size={15} className="text-blue-500" />}
            label="Email"
            bg="bg-blue-50 dark:bg-blue-900/20"
          >
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">
                {user.email}
              </span>
              {user.emailVerified && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full text-xs font-medium shrink-0">
                  <ShieldCheck size={10} />
                  Verified
                </span>
              )}
            </div>
          </InfoRow>

          {/* Phone */}
          {user.phone && (
            <InfoRow
              icon={<Phone size={15} className="text-emerald-500" />}
              label="Phone"
              bg="bg-emerald-50 dark:bg-emerald-900/20"
            >
              <span className="text-sm font-medium text-slate-800 dark:text-slate-200">
                {user.phone}
              </span>
            </InfoRow>
          )}

          {/* Location */}
          {user.location && (
            <InfoRow
              icon={<MapPin size={15} className="text-purple-500" />}
              label="Location"
              bg="bg-purple-50 dark:bg-purple-900/20"
            >
              <span className="text-sm font-medium text-slate-800 dark:text-slate-200">
                {user.location}
              </span>
            </InfoRow>
          )}

          {/* Member since */}
          {user.createdAt && (
            <InfoRow
              icon={<CalendarDays size={15} className="text-slate-500" />}
              label="Member since"
              bg="bg-slate-100 dark:bg-slate-700/40"
            >
              <span className="text-sm font-medium text-slate-800 dark:text-slate-200">
                {new Date(user.createdAt).toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>
            </InfoRow>
          )}
        </div>
      </div>

      {/* Footer — returns to the open conversation so the user can type. */}
      <footer className="shrink-0 px-4 py-3 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
        <button
          onClick={onClose}
          className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-semibold rounded-xl bg-blue-600 hover:bg-blue-700 text-white transition-colors shadow-sm shadow-blue-500/30"
        >
          <MessageSquare size={16} />
          Send Message
        </button>
      </footer>
    </div>
  );
};

const InfoRow: React.FC<{
  icon: React.ReactNode;
  label: string;
  bg: string;
  children: React.ReactNode;
}> = ({ icon, label, bg, children }) => (
  <div className="flex items-center gap-3 px-4 py-3 bg-slate-50 dark:bg-slate-700/30 rounded-xl">
    <div className={`p-2 rounded-lg ${bg} shrink-0`}>
      {icon}
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-xs text-slate-400 dark:text-slate-500 mb-0.5">{label}</p>
      {children}
    </div>
  </div>
);

export default UserProfile;
