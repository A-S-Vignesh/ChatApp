import React, { useState, useEffect, useRef } from "react";
import Sidebar from "../components/Sidebar";
import ChatWindow from "../components/ChatWindow";
import UserProfile from "../components/UserProfileModal";
import MyProfile from "../components/MyProfile";
import Settings from "../components/Settings";
import Help from "../components/Help";
import LogoutConfirmationModal from "../components/LogoutConfirmationModal";
import { useChats } from "../hooks/useChats";

import type { User, NotificationSettings } from "../../types";

import AuthContainer from "./AuthContainer";
import { authClient } from "../lib/authClient";
import { socket } from "../lib/socket";
import { useQueryClient, InfiniteData } from "@tanstack/react-query";
import { MessagesResponse, MessageType, ReactionType } from "../types/message";
import { ChatType } from "../types/chat";
import AddNewChatModal from "../components/AddNewChatModal";
import GroupInfoModal from "../components/GroupInfoModal";
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
  const [showGroupInfo, setShowGroupInfo] = useState<boolean>(false);
  const queryClient = useQueryClient();
  const [showLogoutModal, setShowLogoutModal] = useState<boolean>(false);
  const [showAddNewChatModal, setShowAddNewChatModal] =
    useState<boolean>(false);

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
    const handler = ({
      message,
      chatId: incomingChatId,
    }: {
      message: MessageType;
      chatId: string;
    }) => {
      // ❌ Ignore my own socket echo
      if (message.sender._id === session.user.id) return;

      /* 1️⃣ Append to the newest page of the messages cache */
      queryClient.setQueryData<InfiniteData<MessagesResponse>>(
        ["messages", incomingChatId],
        (old) => {
          if (!old || old.pages.length === 0) {
            return {
              pages: [{ messages: [message], nextCursor: null }],
              pageParams: [undefined],
            };
          }
          const [first, ...rest] = old.pages;
          return {
            ...old,
            pages: [
              { ...first, messages: [...first.messages, message] },
              ...rest,
            ],
          };
        }
      );

      /* 2️⃣ Update sidebar preview + move chat to top */
      queryClient.setQueryData<ChatType[]>(["chats"], (old = []) => {
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
                unreadCount:
                  activeChatId === incomingChatId
                    ? 0
                    : (chat.unreadCount ?? 0) + 1,
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
  }, [queryClient, session?.user?.id, activeChatId]);
  
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
    const handler = ({
      chatId,
      readerId,
    }: {
      chatId: string;
      readerId: string;
    }) => {
      queryClient.setQueryData<InfiniteData<MessagesResponse>>(
        ["messages", chatId],
        (old) => {
          if (!old) return old;
          return {
            ...old,
            pages: old.pages.map((page) => ({
              ...page,
              messages: page.messages.map((msg) =>
                msg.readBy.includes(readerId)
                  ? msg
                  : { ...msg, readBy: [...msg.readBy, readerId] }
              ),
            })),
          };
        }
      );
    };

    socket.on("messages:read", handler);

    return () => {
      socket.off("messages:read", handler);
    };
  }, [queryClient]);

  /* 📨 DELIVERY RECEIPTS — when a recipient comes online or receives a message,
     server emits this so the sender's tick goes from ✓ to ✓✓. */
  useEffect(() => {
    const handler = ({
      messageIds,
      userId,
    }: {
      messageIds: string[];
      userId: string;
    }) => {
      const ids = new Set(messageIds);
      queryClient.setQueriesData<InfiniteData<MessagesResponse>>(
        { queryKey: ["messages"] },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            pages: old.pages.map((page) => ({
              ...page,
              messages: page.messages.map((msg) =>
                ids.has(msg._id)
                  ? {
                      ...msg,
                      deliveredTo: msg.deliveredTo.includes(userId)
                        ? msg.deliveredTo
                        : [...msg.deliveredTo, userId],
                    }
                  : msg
              ),
            })),
          };
        }
      );
    };

    socket.on("messages:delivered", handler);

    return () => {
      socket.off("messages:delivered", handler);
    };
  }, [queryClient]);

  /* 👥 CHAT LIFECYCLE — created/updated/removed (groups, member changes) */
  useEffect(() => {
    const onCreated = (chat: ChatType) => {
      queryClient.setQueryData<ChatType[]>(["chats"], (old = []) => {
        if (old.some((c) => c._id === chat._id)) return old;
        return [chat, ...old];
      });
    };
    const onUpdated = (chat: ChatType) => {
      queryClient.setQueryData<ChatType[]>(["chats"], (old = []) =>
        old.map((c) => (c._id === chat._id ? { ...c, ...chat } : c))
      );
    };
    const onRemoved = ({ chatId }: { chatId: string }) => {
      queryClient.setQueryData<ChatType[]>(["chats"], (old = []) =>
        old.filter((c) => c._id !== chatId)
      );
      queryClient.removeQueries({ queryKey: ["messages", chatId] });
      setActiveChatId((prev) => (prev === chatId ? null : prev));
      setShowGroupInfo(false);
    };

    socket.on("chat:created", onCreated);
    socket.on("chat:updated", onUpdated);
    socket.on("chat:removed", onRemoved);

    return () => {
      socket.off("chat:created", onCreated);
      socket.off("chat:updated", onUpdated);
      socket.off("chat:removed", onRemoved);
    };
  }, [queryClient]);

  /* 😀 REACTIONS — sender of the reaction is anyone in the chat; everyone gets the update. */
  useEffect(() => {
    const handler = ({
      chatId,
      messageId,
      reactions,
    }: {
      chatId: string;
      messageId: string;
      reactions: ReactionType[];
    }) => {
      queryClient.setQueryData<InfiniteData<MessagesResponse>>(
        ["messages", chatId],
        (old) => {
          if (!old) return old;
          return {
            ...old,
            pages: old.pages.map((page) => ({
              ...page,
              messages: page.messages.map((msg) =>
                msg._id === messageId ? { ...msg, reactions } : msg
              ),
            })),
          };
        }
      );
    };

    socket.on("message:reaction", handler);

    return () => {
      socket.off("message:reaction", handler);
    };
  }, [queryClient]);

  /* 🔌 CONNECTION STATE — show "Reconnecting…" banner while socket is down,
     and refresh missed messages/chats once we're back. */
  const [showReconnectBanner, setShowReconnectBanner] = useState(false);
  const wasDisconnectedRef = useRef(false);

  useEffect(() => {
    const onConnect = () => {
      setShowReconnectBanner(false);
      if (wasDisconnectedRef.current) {
        queryClient.invalidateQueries({ queryKey: ["chats"] });
        queryClient.invalidateQueries({ queryKey: ["messages"] });
        wasDisconnectedRef.current = false;
      }
    };
    const onDisconnect = () => {
      wasDisconnectedRef.current = true;
      setShowReconnectBanner(true);
    };

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
    };
  }, [queryClient]);


  const activeChat = chats.find((chat) => chat._id === activeChatId);
  const showProfile = !!profileUser;

  const handleSelectChat = (chatId: string) => {
    setActiveChatId(chatId);
    setProfileUser(null);
    setShowMyProfile(false);
    setShowSettings(false);
    setShowHelp(false);
    setShowGroupInfo(false);
  };

  const handleShowGroupInfo = () => {
    setProfileUser(null);
    setShowMyProfile(false);
    setShowSettings(false);
    setShowHelp(false);
    setShowGroupInfo(true);
  };

  const handleCloseGroupInfo = () => {
    setShowGroupInfo(false);
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

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center">
        Connecting…
      </div>
    );
  }
  if (!session?.user) {
    return <AuthContainer />;
  }

  const anySidePanelOpen =
    showProfile || showMyProfile || showSettings || showHelp || showGroupInfo;

  return (
    <div className="h-screen w-screen bg-slate-200 dark:bg-slate-950 flex items-center justify-center p-0">
      {showReconnectBanner && (
        <div className="fixed top-0 left-0 right-0 bg-yellow-500 text-white text-center py-2 z-50 text-sm font-medium shadow-md">
          Reconnecting…
        </div>
      )}
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
              currentUser={{
                id: session.user.id,
                name: session.user.name,
                image: session.user.image ?? undefined,
              }}
              onBack={handleBackToChatList}
              onViewProfile={handleViewProfile}
              onShowGroupInfo={
                activeChat?.isGroup ? handleShowGroupInfo : undefined
              }
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
            <MyProfile onClose={handleCloseMyProfile} />
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

          {/* Group Info */}
          <div
            className={`
            ${showGroupInfo ? "flex" : "hidden"}
            flex-col h-full w-full lg:w-95 shrink-0 lg:border-l lg:border-slate-200 dark:lg:border-slate-700
          `}
          >
            {activeChat?.isGroup && (
              <GroupInfoModal
                chat={activeChat}
                currentUserId={session.user.id}
                onClose={handleCloseGroupInfo}
              />
            )}
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
          setActiveChatId={setActiveChatId}
        />
      </div>
    </div>
  );
};

export default ChatPage;
