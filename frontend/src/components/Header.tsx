import React from "react";

import Avatar from "./Avatar";
import { Phone, Video, MoreVertical, ArrowLeft } from "lucide-react";
import { formatLastSeen } from "../utils/formatLastSeen";
import { UserType } from "../types/user";

interface HeaderProps {
  user: UserType;
  onBack: () => void;
  onViewProfile: (user: UserType) => void;
}

const Header: React.FC<HeaderProps> = ({ user, onBack, onViewProfile }: HeaderProps) => {
  console.log("user in header", user);
  return (
    <header className="shrink-0 p-4 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center bg-white dark:bg-slate-800">
      <div className="flex items-center space-x-2 md:space-x-4">
        <button
          onClick={onBack}
          className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 lg:hidden"
          aria-label="Back to chats"
        >
          <ArrowLeft size={20} />
        </button>
        <button
          onClick={() => onViewProfile(user)}
          className="flex items-center space-x-2 md:space-x-4 text-left p-1 -m-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          aria-label={`View profile for ${user.name}`}
        >
          <Avatar
            src={user.image}
            alt={user.name}
            isOnline={user.isOnline}
          />
          <div>
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">
              {user.name}
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {user.isOnline ? "Online" : formatLastSeen(user.lastSeen)}
            </p>
          </div>
        </button>
      </div>
      <div className="flex items-center space-x-2">
        <button className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400">
          <Phone size={20} />
        </button>
        <button className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400">
          <Video size={20} />
        </button>
        <button className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400">
          <MoreVertical size={20} />
        </button>
      </div>
    </header>
  );
};

export default Header;
