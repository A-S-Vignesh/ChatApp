import React, { useState, useEffect, useRef, useCallback } from "react";
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
import { api } from "../lib/api";
import { useQueryClient } from "@tanstack/react-query";
import { MessagesResponse } from "../types/message";
import AddNewChatModal from "../components/AddNewChatModal";
import { usePushNotifications } from "../hooks/usePushNotifications";
import { useOutboxFlush } from "../hooks/useOutboxFlush";
import * as outbox from "../lib/outbox";
import { MessageSquare } from "lucide-react";
import {
  useNotificationSettings,
  useUpdateNotificationSettings,
} from "../hooks/useNotificationSettings";
import { useToggleMute } from "../hooks/useToggleMute";
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
  const [typingByChatId, setTypingByChatId] = useState<Record<string, string[]>>({});
  const [isConnected, setIsConnected] = useState(false);

  /* Muted chats — derived from server-provided `mutedByMe` on each chat. */
  const mutedChats = React.useMemo(
    () => new Set<string>(chats.filter((c) => c.mutedByMe).map((c) => c._id)),
    [chats]
  );
  const { mutate: toggleMuteOnServer } = useToggleMute();

  /* Always-current ref so socket handlers can read activeChatId without stale closures */
  const activeChatIdRef = useRef<string | null>(null);
  activeChatIdRef.current = activeChatId;

  /* Offline outbox: hydrate pending messages and flush on online/reconnect. */
  useOutboxFlush(session?.user?.id);

  /* Push notifications — auto-subscribe once user is logged in */
  const { subscribe: subscribePush } = usePushNotifications();
  useEffect(() => {
    if (!session?.user) return;
    const t = setTimeout(subscribePush, 3000);
    return () => clearTimeout(t);
  }, [session?.user, subscribePush]);

  /* Handle notification clicks from service worker → jump to that chat */
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (event.data?.type === "NOTIFICATION_CLICK" && event.data.chatId) {
        setActiveChatId(event.data.chatId);
      }
    };
    navigator.serviceWorker?.addEventListener("message", handler);
    return () => navigator.serviceWorker?.removeEventListener("message", handler);
  }, []);
  const [showAddNewChatModal, setShowAddNewChatModal] =
    useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState<User>(me);

  // Settings State
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("theme") as Theme | null;
      if (stored === "light" || stored === "dark" || stored === "system") {
        return stored;
      }
    }
    return "system";
  });
  /* Notification settings come from the server (per account, multi-device). */
  const { data: serverNotifications } = useNotificationSettings();
  const { mutate: updateNotificationSettings } = useUpdateNotificationSettings();
  const notifications: NotificationSettings = serverNotifications ?? {
    previews: true,
    sounds: true,
  };
  const setNotifications = (next: NotificationSettings) => {
    updateNotificationSettings(next);
  };

  /* Apply the theme. When `system`, mirror the OS-level preference and stay in
     sync if the user toggles it (e.g. macOS dark-mode schedule). */
  useEffect(() => {
    const root = window.document.documentElement;

    const apply = (resolved: "light" | "dark") => {
      root.classList.remove("light", "dark");
      root.classList.add(resolved);
    };

    localStorage.setItem("theme", theme);

    if (theme !== "system") {
      apply(theme);
      return;
    }

    /* system mode: follow prefers-color-scheme and react to changes */
    const mql = window.matchMedia("(prefers-color-scheme: dark)");
    apply(mql.matches ? "dark" : "light");

    const onChange = (e: MediaQueryListEvent) => apply(e.matches ? "dark" : "light");
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, [theme]);

    useEffect(() => {
      if (session?.user) {
        socket.connect();
      }

      return () => {
        socket.disconnect();
      };
    }, [session?.user]);

  /* Presence: tell the server which chat is focused and whether the page is
     visible. The server uses this to decide whether to send a push notification.
     Re-emit on: connect, chat switch, tab visibility change. */
  useEffect(() => {
    if (!session?.user) return;

    const emit = () => {
      socket.emit("presence:focus", {
        chatId: activeChatIdRef.current,
        visible: !document.hidden,
      });
    };

    emit();
    socket.on("connect", emit);
    document.addEventListener("visibilitychange", emit);

    return () => {
      socket.off("connect", emit);
      document.removeEventListener("visibilitychange", emit);
    };
  }, [session?.user, activeChatId]);

  /* One-time cleanup of pre-server-sync localStorage. Safe to remove later. */
  useEffect(() => {
    localStorage.removeItem("mutedChats");
  }, []);

  /* Connection state + refetch missed messages on reconnect */
  useEffect(() => {
    const onConnect = () => {
      setIsConnected(true);
      queryClient.invalidateQueries({ queryKey: ["messages"] });
      queryClient.invalidateQueries({ queryKey: ["chats"] });
    };
    const onDisconnect = () => setIsConnected(false);

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    setIsConnected(socket.connected);

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
    };
  }, [queryClient]);

  /* Typing indicators */
  useEffect(() => {
    const startHandler = ({ chatId, userId }: { chatId: string; userId: string }) => {
      setTypingByChatId((prev) => {
        const current = prev[chatId] ?? [];
        if (current.includes(userId)) return prev;
        return { ...prev, [chatId]: [...current, userId] };
      });
    };

    const stopHandler = ({ chatId, userId }: { chatId: string; userId: string }) => {
      setTypingByChatId((prev) => {
        const current = prev[chatId] ?? [];
        const updated = current.filter((id) => id !== userId);
        if (updated.length === 0) {
          const { [chatId]: _removed, ...rest } = prev;
          return rest;
        }
        return { ...prev, [chatId]: updated };
      });
    };

    socket.on("typing:start", startHandler);
    socket.on("typing:stop", stopHandler);

    return () => {
      socket.off("typing:start", startHandler);
      socket.off("typing:stop", stopHandler);
    };
  }, []);

  /* Delivery receipts */
  useEffect(() => {
    const handler = ({ messageIds, deliveredBy }: { messageIds: string[]; deliveredBy: string }) => {
      queryClient.setQueriesData(
        { queryKey: ["messages"] },
        (old: MessagesResponse | undefined) => {
          if (!old) return old;
          return {
            ...old,
            messages: old.messages.map((msg) => {
              if (!messageIds.includes(msg._id)) return msg;
              const already = (msg.deliveredTo ?? []).some(
                (id) => String(id) === String(deliveredBy)
              );
              return already
                ? msg
                : { ...msg, deliveredTo: [...(msg.deliveredTo ?? []), deliveredBy] };
            }),
          };
        }
      );
    };

    socket.on("messages:delivered", handler);
    return () => socket.off("messages:delivered", handler);
  }, [queryClient]);

  useEffect(() => {
    const handler = ({ message, chatId: incomingChatId }: any) => {
      const isOwn = message.sender._id === session?.user?.id;
      const isActiveChat = incomingChatId === activeChatIdRef.current;

      /* 1. Insert/replace in messages cache — dedupe by _id and clientId so that
            multi-device echoes, reconnect refetches, and own-message broadcasts
            never produce duplicates. */
      queryClient.setQueryData(
        ["messages", incomingChatId],
        (old: MessagesResponse | undefined) => {
          if (!old) return { messages: [message], nextCursor: null };

          let replaced = false;
          const next = old.messages.map((m) => {
            const matchesId = m._id === message._id;
            const matchesClient =
              !!message.clientId &&
              (m.clientId === message.clientId || m._id === `temp-${message.clientId}`);
            if (matchesId || matchesClient) {
              replaced = true;
              return message;
            }
            return m;
          });

          if (!replaced) next.push(message);
          return { ...old, messages: next };
        }
      );

      /* 2. Update sidebar: preview + reorder + unread badge.
            Own messages never bump unread for self. */
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
                unreadCount:
                  isOwn || isActiveChat ? 0 : (chat.unreadCount || 0) + 1,
              }
            : chat
        );
        return [
          ...updated.filter((c) => c._id === incomingChatId),
          ...updated.filter((c) => c._id !== incomingChatId),
        ];
      });

      /* 3. If this chat is open and the message is from someone else, mark read. */
      if (isActiveChat && !isOwn) {
        api.get(`/chat/${incomingChatId}/read`);
      }
    };

    socket.on("message:new", handler);
    return () => socket.off("message:new", handler);
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

  /* chat:new — other user started a chat with us */
  useEffect(() => {
    const handler = (newChat: any) => {
      queryClient.setQueryData(["chats"], (old: any[] = []) => {
        if (old.some((c: any) => c._id === newChat._id)) return old;
        return [newChat, ...old];
      });
    };
    socket.on("chat:new", handler);
    return () => socket.off("chat:new", handler);
  }, [queryClient]);

  /* chat:cleared — wipe message cache (only fires for the user who cleared) */
  useEffect(() => {
    const clearedHandler = ({ chatId }: { chatId: string }) => {
      queryClient.setQueryData(["messages", chatId], { messages: [], nextCursor: null });
      queryClient.setQueryData(["chats"], (old: any[] = []) =>
        old.map((c) => c._id === chatId ? { ...c, lastMessage: null, unreadCount: 0 } : c)
      );
    };

    const deletedHandler = ({ chatId }: { chatId: string }) => {
      queryClient.setQueryData(["chats"], (old: any[] = []) =>
        old.filter((c) => c._id !== chatId)
      );
      if (activeChatIdRef.current === chatId) setActiveChatId(null);
    };

    socket.on("chat:cleared", clearedHandler);
    socket.on("chat:deleted", deletedHandler);
    return () => {
      socket.off("chat:cleared", clearedHandler);
      socket.off("chat:deleted", deletedHandler);
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

  const handleToggleMute = useCallback(() => {
    if (!activeChatId) return;
    const isMuted = mutedChats.has(activeChatId);
    toggleMuteOnServer({ chatId: activeChatId, muted: !isMuted });
  }, [activeChatId, mutedChats, toggleMuteOnServer]);

  const handleClearChat = useCallback(async () => {
    if (!activeChatId) return;
    try {
      await api.delete(`/chat/${activeChatId}/messages`);
      queryClient.setQueryData(["messages", activeChatId], { messages: [], nextCursor: null });
      queryClient.setQueryData(["chats"], (old: any[] = []) =>
        old.map((c) => c._id === activeChatId ? { ...c, lastMessage: null, unreadCount: 0 } : c)
      );
    } catch (err) {
      console.error("Clear chat error:", err);
    }
  }, [activeChatId, queryClient]);

  const handleDeleteChat = useCallback(async () => {
    if (!activeChatId) return;
    try {
      await api.delete(`/chat/${activeChatId}`);
      queryClient.setQueryData(["chats"], (old: any[] = []) =>
        old.filter((c) => c._id !== activeChatId)
      );
      setActiveChatId(null);
    } catch (err) {
      console.error("Delete chat error:", err);
    }
  }, [activeChatId, queryClient]);

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
    /* Outbox is per-account; wipe it so the next user doesn't inherit unsent messages. */
    await outbox.clearAll();
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
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-100 dark:bg-slate-900 text-slate-800 dark:text-slate-200">
        <div className="flex flex-col items-center gap-6">
          <div className="relative">
            {/* Soft pulsing halo behind the logo */}
            <div className="absolute inset-0 rounded-2xl bg-blue-500/30 blur-xl animate-pulse" />
            <div className="relative p-4 bg-blue-600 rounded-2xl text-white shadow-lg shadow-blue-500/30">
              <MessageSquare size={36} strokeWidth={2.25} />
            </div>
          </div>

          <div className="flex flex-col items-center gap-1.5">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              AetherChat
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Real-time messaging
            </p>
          </div>

          {/* Three-dot bouncing loader */}
          <div className="flex items-center gap-1.5 mt-2" aria-label="Loading">
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-bounce [animation-delay:-0.3s]" />
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-bounce [animation-delay:-0.15s]" />
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-bounce" />
          </div>
        </div>
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
        className={`h-full w-full md:max-w-450 flex flex-col antialiased text-slate-800 bg-slate-100 dark:bg-slate-900 dark:text-slate-200 overflow-hidden shadow-xl md:rounded-2xl`}
      >
        {/* Reconnecting banner */}
        {session?.user && !isConnected && (
          <div className="shrink-0 bg-yellow-500 text-white text-xs text-center py-1 px-4 font-medium z-50">
            Reconnecting…
          </div>
        )}
        <div className="grow w-full flex min-h-0">
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
              typingByChatId={typingByChatId}
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
              typingUserIds={typingByChatId[activeChatId ?? ""] ?? []}
              isMuted={activeChatId ? mutedChats.has(activeChatId) : false}
              onToggleMute={handleToggleMute}
              onClearChat={handleClearChat}
              onDeleteChat={handleDeleteChat}
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
            <MyProfile
              user={session.user as any}
              onClose={handleCloseMyProfile}
            />
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
              onLogout={handleOpenLogoutModal}
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
