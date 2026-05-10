import React from "react";

import Avatar from "./Avatar";
import { Phone, Video, MoreVertical, ArrowLeft, Users } from "lucide-react";
import { formatLastSeen } from "../utils/formatLastSeen";
import { UserType } from "../types/user";

type HeaderUser = {
  name: string;
  image?: string;
  isOnline?: boolean;
  lastSeen?: string;
};

interface HeaderProps {
  user: HeaderUser;
  isGroup?: boolean;
  participantCount?: number;
  typingLabel?: string | null;
  onBack: () => void;
  onViewProfile: (user: UserType) => void;
  onShowGroupInfo?: () => void;
}

const Header: React.FC<HeaderProps> = ({
  user,
  isGroup,
  participantCount,
  typingLabel,
  onBack,
  onViewProfile,
  onShowGroupInfo,
}: HeaderProps) => {
  const handleClick = () => {
    if (isGroup && onShowGroupInfo) {
      onShowGroupInfo();
    } else if (!isGroup) {
      onViewProfile(user as UserType);
    }
  };

  /* Subtitle: typing > online status (1:1) > member count (group) */
  let subtitle: React.ReactNode = null;
  if (typingLabel) {
    subtitle = (
      <p className="text-sm italic text-blue-500 dark:text-blue-400">
        {typingLabel}
      </p>
    );
  } else if (isGroup) {
    subtitle = (
      <p className="text-sm text-slate-500 dark:text-slate-400">
        {participantCount ?? 0} members
      </p>
    );
  } else {
    subtitle = (
      <p className="text-sm text-slate-500 dark:text-slate-400">
        {user.isOnline ? "Online" : formatLastSeen(user.lastSeen)}
      </p>
    );
  }

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
          onClick={handleClick}
          className="flex items-center space-x-2 md:space-x-4 text-left p-1 -m-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          aria-label={isGroup ? `View group info for ${user.name}` : `View profile for ${user.name}`}
        >
          {isGroup ? (
            <div className="w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center text-white shrink-0">
              <Users size={22} />
            </div>
          ) : (
            <Avatar
              src={user.image}
              alt={user.name}
              isOnline={user.isOnline}
            />
          )}
          <div>
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">
              {user.name}
            </h2>
            {subtitle}
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
