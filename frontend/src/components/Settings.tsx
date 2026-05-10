import React from "react";
import type { Theme, NotificationSettings } from "../../types";
import { X, Sun, Moon, Monitor, Bell, BellOff, BellRing, Send } from "lucide-react";
import ToggleSwitch from "./ToggleSwitch";
import { usePushNotifications } from "../hooks/usePushNotifications";

interface SettingsProps {
  onClose: () => void;
  theme: Theme;
  onThemeChange: (theme: Theme) => void;
  notificationSettings: NotificationSettings;
  onNotificationChange: (settings: NotificationSettings) => void;
}

const Settings: React.FC<SettingsProps> = ({
  onClose,
  theme,
  onThemeChange,
  notificationSettings,
  onNotificationChange,
}) => {
  const { isSupported, permission, isSubscribed, subscribe, unsubscribe } =
    usePushNotifications();

  const handleNotificationToggle = (key: keyof NotificationSettings) => {
    onNotificationChange({
      ...notificationSettings,
      [key]: !notificationSettings[key],
    });
  };

  const sendTestNotification = async () => {
    if (!("serviceWorker" in navigator)) return;
    try {
      const reg = await navigator.serviceWorker.ready;
      reg.showNotification("AetherChat", {
        body: "Notifications are working 🎉",
        icon: "/icons/icon-192.png",
        badge: "/icons/icon-192.png",
        tag: "aetherchat-test",
      });
    } catch (err) {
      console.error("Test notification failed:", err);
    }
  };

  /* Resolve the human-readable status. `permission === "granted"` means the
     OS will accept notifications; `isSubscribed` means we also have a valid
     push subscription so the server can reach this device. */
  const notifReady = isSupported && permission === "granted" && isSubscribed;

  return (
    <aside
      className="bg-white dark:bg-slate-800 w-full h-full flex flex-col"
      role="complementary"
      aria-labelledby="settings-heading"
    >
      {/* Header */}
      <header className="shrink-0 p-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between bg-slate-50 dark:bg-slate-800">
        <div className="flex items-center space-x-4">
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400"
            aria-label="Close settings"
          >
            <X size={20} />
          </button>
          <h2
            id="settings-heading"
            className="text-lg font-bold text-slate-800 dark:text-slate-100"
          >
            Settings
          </h2>
        </div>
      </header>

      {/* Settings Content */}
      <div className="grow overflow-y-auto p-6 space-y-8">
        {/* Appearance Section */}
        <div>
          <h3 className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-4">
            Appearance
          </h3>
          <div className="space-y-2">
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Theme
            </p>
            <div className="flex gap-1 p-1 bg-slate-100 dark:bg-slate-700 rounded-lg">
              <ThemeButton
                active={theme === "light"}
                onClick={() => onThemeChange("light")}
                icon={<Sun size={16} />}
                label="Light"
                activeClasses="bg-white shadow-sm text-blue-600"
              />
              <ThemeButton
                active={theme === "dark"}
                onClick={() => onThemeChange("dark")}
                icon={<Moon size={16} />}
                label="Dark"
                activeClasses="bg-slate-900 shadow-sm text-blue-500"
              />
              <ThemeButton
                active={theme === "system"}
                onClick={() => onThemeChange("system")}
                icon={<Monitor size={16} />}
                label="System"
                activeClasses="bg-white dark:bg-slate-900 shadow-sm text-blue-600 dark:text-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Notifications Section */}
        <div>
          <h3 className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-4">
            Notifications
          </h3>

          <div className="space-y-4">
            {/* Permission status card */}
            <PermissionCard
              isSupported={isSupported}
              permission={permission}
              isSubscribed={isSubscribed}
              ready={notifReady}
              onEnable={subscribe}
              onDisable={unsubscribe}
              onTest={sendTestNotification}
            />

            {/* Detailed toggles */}
            <ToggleSwitch
              label="Show message previews"
              enabled={notificationSettings.previews}
              onChange={() => handleNotificationToggle("previews")}
            />
            <ToggleSwitch
              label="Play notification sounds"
              enabled={notificationSettings.sounds}
              onChange={() => handleNotificationToggle("sounds")}
            />
          </div>
        </div>
      </div>
    </aside>
  );
};

const ThemeButton: React.FC<{
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  activeClasses: string;
}> = ({ active, onClick, icon, label, activeClasses }) => (
  <button
    onClick={onClick}
    aria-pressed={active}
    className={`w-full flex items-center justify-center gap-2 px-3 py-1.5 rounded-md text-sm font-semibold transition-colors ${
      active
        ? activeClasses
        : "text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600"
    }`}
  >
    {icon}
    {label}
  </button>
);

/* Permission card explains the current state in plain language and offers
   the right action (enable / disable / test). */
const PermissionCard: React.FC<{
  isSupported: boolean;
  permission: NotificationPermission;
  isSubscribed: boolean;
  ready: boolean;
  onEnable: () => void;
  onDisable: () => void;
  onTest: () => void;
}> = ({ isSupported, permission, isSubscribed, ready, onEnable, onDisable, onTest }) => {
  if (!isSupported) {
    return (
      <Card icon={<BellOff size={18} />} tone="muted">
        <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
          Push notifications aren't supported on this device.
        </p>
      </Card>
    );
  }

  if (permission === "denied") {
    return (
      <Card icon={<BellOff size={18} />} tone="warn">
        <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
          Notifications blocked
        </p>
        <p className="mt-1 text-xs text-amber-700 dark:text-amber-300/80 leading-relaxed">
          You blocked notifications for this site. Enable them from your
          browser's site settings (lock icon → Permissions).
        </p>
      </Card>
    );
  }

  if (ready) {
    return (
      <Card icon={<BellRing size={18} />} tone="ok">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <p className="text-sm font-medium text-emerald-800 dark:text-emerald-200">
              Notifications are on
            </p>
            <p className="mt-0.5 text-xs text-emerald-700/80 dark:text-emerald-300/70">
              You'll be notified for messages when this tab isn't focused.
            </p>
          </div>
          <button
            onClick={onDisable}
            className="shrink-0 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
          >
            Turn off
          </button>
        </div>
        <button
          onClick={onTest}
          className="mt-3 inline-flex items-center gap-2 text-xs font-semibold text-emerald-700 dark:text-emerald-300 hover:underline"
        >
          <Send size={12} />
          Send test notification
        </button>
      </Card>
    );
  }

  /* Default / not yet asked / asked but no subscription yet */
  const isPending = permission === "granted" && !isSubscribed;
  return (
    <Card icon={<Bell size={18} />} tone="info">
      <p className="text-sm font-medium text-slate-800 dark:text-slate-100">
        Get notified about new messages
      </p>
      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
        We'll only notify you when this tab isn't focused, so you won't get
        double-pinged.
      </p>
      <button
        onClick={onEnable}
        disabled={isPending}
        className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60 transition-colors"
      >
        <Bell size={12} />
        {isPending ? "Enabling…" : "Enable notifications"}
      </button>
    </Card>
  );
};

const Card: React.FC<{
  icon: React.ReactNode;
  tone: "ok" | "warn" | "info" | "muted";
  children: React.ReactNode;
}> = ({ icon, tone, children }) => {
  const toneClass = {
    ok: "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800/50 text-emerald-600 dark:text-emerald-400",
    warn: "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800/50 text-amber-600 dark:text-amber-400",
    info: "bg-slate-50 dark:bg-slate-700/40 border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-400",
    muted: "bg-slate-50 dark:bg-slate-700/40 border-slate-200 dark:border-slate-600 text-slate-400 dark:text-slate-500",
  }[tone];

  return (
    <div className={`p-3 rounded-xl border ${toneClass}`}>
      <div className="flex gap-3">
        <div className="shrink-0 mt-0.5">{icon}</div>
        <div className="flex-1 min-w-0">{children}</div>
      </div>
    </div>
  );
};

export default Settings;
