import React, { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar";
import ChatWindow from "../components/ChatWindow";
import UserProfile from "../components/UserProfileModal";
import MyProfile from "../components/MyProfile";
import Settings from "../components/Settings";
import Help from "../components/Help";
import LogoutConfirmationModal from "../components/LogoutConfirmationModal";
import { useChats } from "../hooks/useChats";

import type {
  Chat,
  Message,
  User,
  Theme,
  NotificationSettings,
  Reaction,
} from "../../types";
import { MessageStatus } from "../../types";
import {
  currentUser as me,
  users as allUsers,
} from "../../constants";

import AuthContainer from "./AuthContainer";
import { authClient } from "../lib/authClient";
import { socket } from "../lib/socket";
import { useQueryClient } from "@tanstack/react-query";
import { MessagesResponse } from "../types/message";
import AddNewChatModal from "../components/AddNewChatModal";
const { useSession } = authClient;

const ChatPage: React.FC = () => {
  //   const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const { data: chats = [], isLoading:chatLoading, isError:chatError } = useChats();

  const {
    data: session,
    isPending: loading, //loading state
    error, //error object
    refetch, //refetch the session
  } = useSession();
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [profileUser, setProfileUser] = useState<User | null>(null);
  const [showMyProfile, setShowMyProfile] = useState<boolean>(false);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [showHelp, setShowHelp] = useState<boolean>(false);
  const queryClient = useQueryClient();
  const [showLogoutModal, setShowLogoutModal] = useState<boolean>(false);
  const [showAddNewChatModal, setShowAddNewChatModal] =
    useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState<User>(me);

  // Settings State
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("theme") as "light" | "dark") || "light";
    }
    return "light";
  });
  const [notifications, setNotifications] = useState<NotificationSettings>({
    previews: true,
    sounds: false,
  });

  useEffect(() => {
    // Apply theme to root element
    const root = window.document.documentElement;
    
    root.classList.remove("light", "dark");
    root.classList.add(theme);

    localStorage.setItem("theme", theme);
  }, [theme]);

    useEffect(() => {
      if (session?.user) {
        socket.connect();
      }

      return () => {
        socket.disconnect();
      };
    }, [session?.user]);
  
  useEffect(() => {
    const handler = ({ message, chatId: incomingChatId }: any) => {
      // ❌ Ignore my own socket echo
      if (message.sender._id === session.user.id) return;

      /* 1️⃣ Update messages cache (if opened later) */
      queryClient.setQueryData(
        ["messages", incomingChatId],
        (old: MessagesResponse | undefined) => {
          if (!old) {
            return { messages: [message], nextCursor: null };
          }

          return {
            ...old,
            messages: [...old.messages, message],
          };
        }
      );

      /* 2️⃣ Update sidebar preview + move chat to top */
      queryClient.setQueryData(["chats"], (old: any[] = []) => {
        const updated = old.map((chat) =>
          chat._id === incomingChatId
            ? {
                ...chat,
                lastMessage: {
                  _id: message._id,
                  content: message.content,
                  type: message.type,
                  createdAt: message.createdAt,
                  sender: message.sender,
                },
                updatedAt: message.createdAt,
              }
            : chat
        );

        return [
          ...updated.filter((c) => c._id === incomingChatId),
          ...updated.filter((c) => c._id !== incomingChatId),
        ];
      });
    };

    socket.on("message:new", handler);

    return () => {
      socket.off("message:new", handler);
    };
  }, [queryClient, session?.user?.id]);
  
  useEffect(() => {
    const onlineHandler = ({ userId }: any) => {
      queryClient.setQueryData(["chats"], (old: any[]) =>
        old?.map((chat) => ({
          ...chat,
          participants: chat.participants.map((p: any) =>
            p._id === userId ? { ...p, isOnline: true } : p
          ),
        }))
      );
    };

    const offlineHandler = ({ userId, lastSeen }: any) => {
      queryClient.setQueryData(["chats"], (old: any[]) =>
        old?.map((chat) => ({
          ...chat,
          participants: chat.participants.map((p: any) =>
            p._id === userId ? { ...p, isOnline: false, lastSeen } : p
          ),
        }))
      );
    };

    socket.on("user:online", onlineHandler);
    socket.on("user:offline", offlineHandler);

    return () => {
      socket.off("user:online", onlineHandler);
      socket.off("user:offline", offlineHandler);
    };
  }, []);

  useEffect(() => {
    const handler = ({ chatId, readerId }: any) => {
      queryClient.setQueryData(["messages", chatId], (old: any) => {
        if (!old) return old;

        return {
          ...old,
          messages: old.messages.map((msg: any) => ({
            ...msg,
            readBy: msg.readBy.includes(readerId)
              ? msg.readBy
              : [...msg.readBy, readerId],
          })),
        };
      });
    };

    socket.on("messages:read", handler);

    return () => {
      socket.off("messages:read", handler);
    };
  }, []);




  const activeChat = chats.find((chat) => chat._id === activeChatId);
  const showProfile = !!profileUser;

  const handleSelectChat = (chatId: string) => {
    setActiveChatId(chatId);
    setProfileUser(null);
    setShowMyProfile(false);
    setShowSettings(false);
    setShowHelp(false);
  };

  const handleSendMessage = (messageText: string) => {
    if (!activeChatId) return;

    const newMessage: Message = {
      id: `msg${Date.now()}`,
      text: messageText,
      timestamp: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
      sender: "me",
      status: MessageStatus.SENT,
    };

    // setChats((prevChats) =>
    //   prevChats.map((chat) =>
    //     chat.id === activeChatId
    //       ? { ...chat, messages: [...chat.messages, newMessage] }
    //       : chat
    //   )
    // );
  };



  const handleToggleReaction = (
    chatId: string,
    messageId: string,
    emoji: string
  ) => {
    // setChats((prevChats) => {
    //   const newChats = JSON.parse(JSON.stringify(prevChats));
    //   const chat = newChats.find((c: Chat) => c.id === chatId);
    //   if (!chat) return prevChats;

    //   const message = chat.messages.find((m: Message) => m.id === messageId);
    //   if (!message) return prevChats;

    //   if (!message.reactions) {
    //     message.reactions = [];
    //   }

    //   const userReaction = message.reactions.find((r: Reaction) =>
    //     r.users.includes(currentUser.id)
    //   );

    //   if (userReaction) {
    //     userReaction.users = userReaction.users.filter(
    //       (id: string) => id !== currentUser.id
    //     );
    //   }

    //   if (!userReaction || userReaction.emoji !== emoji) {
    //     const targetReaction = message.reactions.find(
    //       (r: Reaction) => r.emoji === emoji
    //     );
    //     if (targetReaction) {
    //       targetReaction.users.push(currentUser.id);
    //     } else {
    //       message.reactions.push({ emoji, users: [currentUser.id] });
    //     }
    //   }

    //   message.reactions = message.reactions.filter(
    //     (r: Reaction) => r.users.length > 0
    //   );

    //   return newChats;
    // });
  };

  const handleViewProfile = (user: User) => {
    setProfileUser(user);
    setShowMyProfile(false);
    setShowSettings(false);
    setShowHelp(false);
  };

  const handleCloseProfile = () => {
    setProfileUser(null);
  };

  const handleShowMyProfile = () => {
    setProfileUser(null);
    setShowSettings(false);
    setShowHelp(false);
    if (window.innerWidth < 1024) {
      setActiveChatId(null);
    }
    setShowMyProfile(true);
  };

  const handleCloseMyProfile = () => {
    setShowMyProfile(false);
  };

  const handleUpdateProfile = (updatedUser: User) => {
    setCurrentUser(updatedUser);
  };

  const handleShowSettings = () => {
    setProfileUser(null);
    setShowMyProfile(false);
    setShowHelp(false);
    if (window.innerWidth < 1024) {
      setActiveChatId(null);
    }
    setShowSettings(true);
  };

  const handleCloseSettings = () => {
    setShowSettings(false);
  };

  const handleShowHelp = () => {
    setProfileUser(null);
    setShowMyProfile(false);
    setShowSettings(false);
    if (window.innerWidth < 1024) {
      setActiveChatId(null);
    }
    setShowHelp(true);
  };

  const handleCloseHelp = () => {
    setShowHelp(false);
  };

  const handleBackToChatList = () => {
    setActiveChatId(null);
  };

  const handleOpenLogoutModal = () => {
    setShowLogoutModal(true);
  };

  const handleCloseLogoutModal = () => {
    setShowLogoutModal(false);
  };

  const handleLogout = async () => {
    // Reset state on logout
    setActiveChatId(null);
    setProfileUser(null);
    setShowMyProfile(false);
    setShowSettings(false);
    setShowHelp(false);
    setShowLogoutModal(false);
    await authClient.signOut();
    window.location.reload();
  };

  const handleShowAddNewChatModal = () => {
    setShowAddNewChatModal(true);
  };

  const handleCloseAddNewChatModal = () => {
    setShowAddNewChatModal(false);
  };

  const handleCreateNewChat = (user: User) => {
    // const chatExists = chats.some((chat) => chat.user.id === user.id);
    // if (chatExists) {
    //   // const existingChat = chats.find((chat) => chat.user.id === user.id);
    //   // if (existingChat) {
    //   //   setActiveChatId(existingChat.id);
    //   // }
    // } else {
    //   const newChat: Chat = {
    //     id: `chat${Date.now()}`,
    //     user: user,
    //     messages: [],
    //   };
    //   // setChats((prevChats) => [newChat, ...prevChats]);
    //   setActiveChatId(newChat.id);
    // }
    handleCloseAddNewChatModal();
  };

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center">
        Connecting…
      </div>
    );
  }
  console.log("session:", session);
  if (!session?.user) {
    return <AuthContainer />;
  }

  const anySidePanelOpen =
    showProfile || showMyProfile || showSettings || showHelp;

  return (
    <div className="h-screen w-screen bg-slate-200 dark:bg-slate-950 flex items-center justify-center p-0">
      <div
        className={`h-full w-full md:max-w-450 flex antialiased text-slate-800 bg-slate-100 dark:bg-slate-900 dark:text-slate-200 overflow-hidden shadow-xl md:rounded-2xl`}
      >
        <div className="h-full w-full flex">
          {/* Sidebar */}
          <div
            className={`
            ${activeChatId || anySidePanelOpen ? "hidden" : "flex"}
            lg:flex flex-col h-full w-full lg:w-95 shrink-0
          `}
          >
            <Sidebar
              activeChatId={activeChatId}
              chats={chats}
              isLoading={chatLoading}
              isError={chatError}
              currentUserId={session.user.id}
              onSelectChat={handleSelectChat}
              onShowMyProfile={handleShowMyProfile}
              onShowSettings={handleShowSettings}
              onShowHelp={handleShowHelp}
              onLogout={handleOpenLogoutModal}
              onShowAddNewChat={handleShowAddNewChatModal}
            />
          </div>

          {/* Chat Window */}
          <div
            className={`
            ${activeChatId && !anySidePanelOpen ? "flex" : "hidden"}
            lg:flex flex-col grow h-full
            ${anySidePanelOpen ? "hidden lg:flex" : ""}
          `}
          >
            <ChatWindow
              chatId={activeChatId}
              chat={activeChat}
              currentUserId={session.user.id}
              onSendMessage={handleSendMessage}
              onBack={handleBackToChatList}
              onViewProfile={handleViewProfile}
              onToggleReaction={handleToggleReaction}
            />
          </div>

          {/* Contact Profile */}
          <div
            className={`
            ${showProfile ? "flex" : "hidden"}
            flex-col h-full w-full lg:w-95 shrink-0 lg:border-l lg:border-slate-200 dark:lg:border-slate-700
          `}
          >
            {profileUser && (
              <UserProfile user={profileUser} onClose={handleCloseProfile} />
            )}
          </div>

          {/* My Profile */}
          <div
            className={`
            ${showMyProfile ? "flex" : "hidden"}
            flex-col h-full w-full lg:w-95 shrink-0 lg:border-l lg:border-slate-200 dark:lg:border-slate-700
          `}
          >
            {currentUser && (
              <MyProfile
                user={session.user}
                onClose={handleCloseMyProfile}
                onUpdateProfile={handleUpdateProfile}
              />
            )}
          </div>

          {/* Settings */}
          <div
            className={`
            ${showSettings ? "flex" : "hidden"}
            flex-col h-full w-full lg:w-95 shrink-0 lg:border-l lg:border-slate-200 dark:lg:border-slate-700
          `}
          >
            <Settings
              onClose={handleCloseSettings}
              theme={theme}
              onThemeChange={setTheme}
              notificationSettings={notifications}
              onNotificationChange={setNotifications}
            />
          </div>

          {/* Help */}
          <div
            className={`
            ${showHelp ? "flex" : "hidden"}
            flex-col h-full w-full lg:w-95 shrink-0 lg:border-l lg:border-slate-200 dark:lg:border-slate-700
          `}
          >
            <Help onClose={handleCloseHelp} />
          </div>
        </div>
        <LogoutConfirmationModal
          isOpen={showLogoutModal}
          onClose={handleCloseLogoutModal}
          onConfirm={handleLogout}
        />
        <AddNewChatModal
          isOpen={showAddNewChatModal}
          onClose={handleCloseAddNewChatModal}
          setShowModel={setShowAddNewChatModal}
          onCreateChat={handleCreateNewChat}
          setActiveChatId={setActiveChatId}
        />
      </div>
    </div>
  );
};

export default ChatPage;
