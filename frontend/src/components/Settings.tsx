import React, { useState } from "react";
import type { Theme, NotificationSettings } from "../../types";
import {
  X,
  ArrowLeft,
  ChevronRight,
  Sun,
  Moon,
  Monitor,
  Bell,
  BellOff,
  Eye,
  Clock,
  Activity,
  Edit3,
  CornerDownLeft,
  Mail,
  LogOut,
  Trash2,
  AlertTriangle,
  ExternalLink,
  Loader2,
  User,
  Lock,
  Palette,
  MessageCircle,
  Info,
} from "lucide-react";
import { FcGoogle } from "react-icons/fc";
import ToggleSwitch from "./ToggleSwitch";
import { usePushNotifications } from "../hooks/usePushNotifications";
import {
  useProfile,
  useUpdatePrivacy,
  useDeleteAccount,
  DEFAULT_PRIVACY,
} from "../hooks/useProfile";
import { useLocalPrefs } from "../hooks/useLocalPrefs";

const APP_VERSION = "0.1.0";

type View = "menu" | "account" | "privacy" | "notifications" | "chat" | "appearance" | "about";

interface SettingsProps {
  onClose: () => void;
  theme: Theme;
  onThemeChange: (theme: Theme) => void;
  notificationSettings: NotificationSettings;
  onNotificationChange: (settings: NotificationSettings) => void;
  /* Open the existing logout-confirm modal owned by ChatPage. */
  onLogout: () => void;
}

const Settings: React.FC<SettingsProps> = ({
  onClose,
  theme,
  onThemeChange,
  notificationSettings,
  onNotificationChange,
  onLogout,
}) => {
  const [view, setView] = useState<View>("menu");

  /* Headers per view — drives the title in the top bar and lets the back
     button know there's somewhere to go. */
  const VIEW_TITLES: Record<View, string> = {
    menu: "Settings",
    account: "Account",
    privacy: "Privacy",
    notifications: "Notifications",
    chat: "Chats",
    appearance: "Appearance",
    about: "About",
  };

  const goBack = () => setView("menu");

  return (
    <aside
      className="bg-white dark:bg-slate-800 w-full h-full flex flex-col"
      role="complementary"
      aria-labelledby="settings-heading"
    >
      {/* Top bar */}
      <header className="shrink-0 p-4 border-b border-slate-200 dark:border-slate-700 flex items-center gap-3 bg-slate-50 dark:bg-slate-800">
        {view === "menu" ? (
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400"
            aria-label="Close settings"
          >
            <X size={20} />
          </button>
        ) : (
          <button
            onClick={goBack}
            className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400"
            aria-label="Back"
          >
            <ArrowLeft size={20} />
          </button>
        )}
        <h2
          id="settings-heading"
          className="text-lg font-bold text-slate-800 dark:text-slate-100"
        >
          {VIEW_TITLES[view]}
        </h2>
      </header>

      {/* Body — swap content based on current view */}
      <div className="grow overflow-y-auto">
        {view === "menu" && <MenuView onNavigate={setView} />}
        {view === "account" && (
          <AccountView onLogout={onLogout} onClose={onClose} />
        )}
        {view === "privacy" && <PrivacyView />}
        {view === "notifications" && (
          <NotificationsView
            settings={notificationSettings}
            onChange={onNotificationChange}
          />
        )}
        {view === "chat" && <ChatView />}
        {view === "appearance" && (
          <AppearanceView theme={theme} onThemeChange={onThemeChange} />
        )}
        {view === "about" && <AboutView />}
      </div>
    </aside>
  );
};

/* ───────── Menu (category list) ───────── */

const MenuView: React.FC<{ onNavigate: (v: View) => void }> = ({ onNavigate }) => (
  <div className="py-2">
    <MenuRow
      icon={<User size={18} />}
      iconBg="bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400"
      title="Account"
      hint="Email, log out, delete account"
      onClick={() => onNavigate("account")}
    />
    <MenuRow
      icon={<Lock size={18} />}
      iconBg="bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400"
      title="Privacy"
      hint="Read receipts, last seen, online status, typing"
      onClick={() => onNavigate("privacy")}
    />
    <MenuRow
      icon={<Bell size={18} />}
      iconBg="bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400"
      title="Notifications"
      hint="Push notifications, previews, sounds"
      onClick={() => onNavigate("notifications")}
    />
    <MenuRow
      icon={<MessageCircle size={18} />}
      iconBg="bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400"
      title="Chats"
      hint="Send-on-Enter behavior"
      onClick={() => onNavigate("chat")}
    />
    <MenuRow
      icon={<Palette size={18} />}
      iconBg="bg-pink-100 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400"
      title="Appearance"
      hint="Light, dark, or system theme"
      onClick={() => onNavigate("appearance")}
    />
    <MenuRow
      icon={<Info size={18} />}
      iconBg="bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
      title="About"
      hint={`AetherChat v${APP_VERSION}`}
      onClick={() => onNavigate("about")}
    />
  </div>
);

/* ───────── Account view ───────── */

const AccountView: React.FC<{
  onLogout: () => void;
  onClose: () => void;
}> = ({ onLogout, onClose: _onClose }) => {
  const { data: profile } = useProfile();
  const { mutateAsync: deleteAccount, isPending: deleting } = useDeleteAccount();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  /* Best-effort signal: better-auth flags verified emails for Google sign-in. */
  const isGoogleSignIn = !!profile?.email && profile.emailVerified === true;

  const handleDelete = async () => {
    setDeleteError(null);
    try {
      await deleteAccount();
      window.location.reload();
    } catch (err: any) {
      setDeleteError(
        err?.response?.data?.message ?? err?.message ?? "Failed to delete account"
      );
    }
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-700/40 border border-slate-200 dark:border-slate-700">
        <div className="p-2 rounded-lg bg-white dark:bg-slate-800 shrink-0">
          <Mail size={16} className="text-blue-500" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-slate-400 dark:text-slate-500">Signed in as</p>
          <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">
            {profile?.email ?? "—"}
          </p>
        </div>
        {isGoogleSignIn && (
          <span
            className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 text-xs text-slate-600 dark:text-slate-300"
            title="Google sign-in"
          >
            <FcGoogle size={12} />
            Google
          </span>
        )}
      </div>

      <button
        onClick={onLogout}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors text-sm font-semibold"
      >
        <LogOut size={15} />
        Log out
      </button>

      <button
        onClick={() => setShowDeleteConfirm(true)}
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-sm font-semibold"
      >
        <Trash2 size={15} />
        Delete account
      </button>

      {showDeleteConfirm && (
        <DeleteConfirm
          onCancel={() => setShowDeleteConfirm(false)}
          onConfirm={handleDelete}
          deleting={deleting}
          error={deleteError}
        />
      )}
    </div>
  );
};

/* ───────── Privacy view ───────── */

const PrivacyView: React.FC = () => {
  const { data: profile } = useProfile();
  const privacy = { ...DEFAULT_PRIVACY, ...(profile?.privacy ?? {}) };
  const { mutate: updatePrivacy } = useUpdatePrivacy();

  return (
    <div className="p-6">
      <p className="text-xs text-slate-500 dark:text-slate-400 mb-5 leading-relaxed p-3 rounded-lg bg-slate-50 dark:bg-slate-700/40 border border-slate-200 dark:border-slate-700">
        These are <span className="font-semibold">mutual</span>: when you turn
        one off you stop sending that signal AND stop seeing it from others.
      </p>

      <div className="space-y-1">
        <PrivacyRow
          icon={<Eye size={15} className="text-blue-500" />}
          title="Read receipts"
          hint="Show others when you've read their messages. If off, you also can't see when they've read yours."
          enabled={privacy.readReceipts}
          onChange={(v: boolean) => updatePrivacy({ readReceipts: v })}
        />
        <PrivacyRow
          icon={<Activity size={15} className="text-emerald-500" />}
          title="Show online status"
          hint="Show your green dot to others. If off, you also see everyone as offline."
          enabled={privacy.showOnline}
          onChange={(v: boolean) => updatePrivacy({ showOnline: v })}
        />
        <PrivacyRow
          icon={<Clock size={15} className="text-amber-500" />}
          title="Show last seen"
          hint="Share when you were last online. If off, you also can't see others' last seen."
          enabled={privacy.lastSeen === "everyone"}
          onChange={(v: boolean) =>
            updatePrivacy({ lastSeen: v ? "everyone" : "nobody" })
          }
        />
        <PrivacyRow
          icon={<Edit3 size={15} className="text-purple-500" />}
          title="Typing indicator"
          hint="Show others when you're typing. If off, you also can't see when they're typing."
          enabled={privacy.typingIndicator}
          onChange={(v: boolean) => updatePrivacy({ typingIndicator: v })}
        />
      </div>
    </div>
  );
};

/* ───────── Notifications view ───────── */

const NotificationsView: React.FC<{
  settings: NotificationSettings;
  onChange: (s: NotificationSettings) => void;
}> = ({ settings, onChange }) => {
  const { isSupported, permission, isSubscribed, subscribe, unsubscribe } =
    usePushNotifications();

  const allowed = isSupported && permission === "granted" && isSubscribed;

  const handleToggleAllow = async (next: boolean) => {
    if (next) {
      await subscribe();
    } else {
      await unsubscribe();
    }
  };

  const handleSettingToggle = (key: keyof NotificationSettings) => {
    onChange({ ...settings, [key]: !settings[key] });
  };

  /* Compact status hint shown below the main toggle. */
  let statusHint = "";
  if (!isSupported) {
    statusHint = "Push notifications aren't supported on this device.";
  } else if (permission === "denied") {
    statusHint =
      "Blocked by your browser. Open the site permissions (lock icon → Permissions) to allow notifications.";
  } else if (allowed) {
    statusHint = "You'll be notified when this tab isn't focused.";
  } else {
    statusHint = "Turn this on to get notified about new messages.";
  }

  /* NOTE: A "Send test notification" button used to live here. It's been
     hidden because notifications are confirmed working — re-enable when
     debugging push delivery again.
       <button onClick={async () => {
         const reg = await navigator.serviceWorker.ready;
         reg.showNotification("AetherChat", { body: "Test", ... });
       }}>Send test</button>
  */

  const disabledRow = !allowed; // gray-out detail toggles when push is off

  return (
    <div className="p-6 space-y-4">
      <SettingRow
        icon={
          allowed ? (
            <Bell size={15} className="text-emerald-500" />
          ) : (
            <BellOff size={15} className="text-slate-400" />
          )
        }
        title="Allow push notifications"
        hint={statusHint}
        control={
          <ToggleSwitch
            label=""
            enabled={allowed}
            onChange={handleToggleAllow}
          />
        }
        disabled={permission === "denied" || !isSupported}
      />

      <SettingRow
        title="Show message previews"
        hint="Include the message text in the notification body."
        control={
          <ToggleSwitch
            label=""
            enabled={settings.previews}
            onChange={() => handleSettingToggle("previews")}
          />
        }
        disabled={disabledRow}
      />

      <SettingRow
        title="Play notification sounds"
        hint="Make a sound when a new message arrives."
        control={
          <ToggleSwitch
            label=""
            enabled={settings.sounds}
            onChange={() => handleSettingToggle("sounds")}
          />
        }
        disabled={disabledRow}
      />
    </div>
  );
};

/* ───────── Chat view ───────── */

const ChatView: React.FC = () => {
  const { prefs, update: updatePrefs } = useLocalPrefs();

  return (
    <div className="p-6 space-y-4">
      <SettingRow
        icon={<CornerDownLeft size={15} className="text-blue-500" />}
        title="Send messages with Enter"
        hint={
          prefs.sendOnEnter
            ? "Press Enter to send. Shift+Enter inserts a new line."
            : "Plain Enter inserts a new line. Ctrl/Cmd+Enter sends."
        }
        control={
          <ToggleSwitch
            label=""
            enabled={prefs.sendOnEnter}
            onChange={(v: boolean) => updatePrefs({ sendOnEnter: v })}
          />
        }
      />
    </div>
  );
};

/* ───────── Appearance view ───────── */

const AppearanceView: React.FC<{
  theme: Theme;
  onThemeChange: (t: Theme) => void;
}> = ({ theme, onThemeChange }) => (
  <div className="p-6">
    <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">
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
);

/* ───────── About view ───────── */

const AboutView: React.FC = () => (
  <div className="p-6 space-y-1">
    <AboutRow label="App version" value={`v${APP_VERSION}`} />
    <AboutLink label="Privacy policy" href="/privacy" />
    <AboutLink label="Terms of service" href="/terms" />
  </div>
);

/* ───────── Helpers ───────── */

const MenuRow: React.FC<{
  icon: React.ReactNode;
  iconBg: string;
  title: string;
  hint: string;
  onClick: () => void;
}> = ({ icon, iconBg, title, hint, onClick }) => (
  <button
    onClick={onClick}
    className="w-full flex items-center gap-4 px-6 py-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors text-left"
  >
    <div className={`p-2.5 rounded-xl shrink-0 ${iconBg}`}>{icon}</div>
    <div className="flex-1 min-w-0">
      <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
        {title}
      </p>
      <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 truncate">
        {hint}
      </p>
    </div>
    <ChevronRight
      size={16}
      className="shrink-0 text-slate-300 dark:text-slate-600"
    />
  </button>
);

/* Standardized row used inside category panels: optional icon + title + hint
   + control. Matches the visual rhythm of WhatsApp's setting rows. */
const SettingRow: React.FC<{
  icon?: React.ReactNode;
  title: string;
  hint?: string;
  control: React.ReactNode;
  disabled?: boolean;
}> = ({ icon, title, hint, control, disabled }) => (
  <div
    className={`flex items-start gap-3 py-3 transition-opacity ${
      disabled ? "opacity-40 pointer-events-none" : ""
    }`}
  >
    {icon && <div className="shrink-0 mt-0.5">{icon}</div>}
    <div className="flex-1 min-w-0">
      <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
        {title}
      </p>
      {hint && (
        <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
          {hint}
        </p>
      )}
    </div>
    <div className="shrink-0 pt-0.5">{control}</div>
  </div>
);

const PrivacyRow: React.FC<{
  icon: React.ReactNode;
  title: string;
  hint: string;
  enabled: boolean;
  onChange: (v: boolean) => void;
}> = ({ icon, title, hint, enabled, onChange }) => (
  <SettingRow
    icon={icon}
    title={title}
    hint={hint}
    control={<ToggleSwitch label="" enabled={enabled} onChange={onChange} />}
  />
);

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

const AboutRow: React.FC<{ label: string; value: string }> = ({
  label,
  value,
}) => (
  <div className="flex items-center justify-between py-2">
    <span className="text-sm text-slate-600 dark:text-slate-400">{label}</span>
    <span className="text-sm font-medium text-slate-800 dark:text-slate-200">
      {value}
    </span>
  </div>
);

const AboutLink: React.FC<{ label: string; href: string }> = ({
  label,
  href,
}) => (
  <a
    href={href}
    target="_blank"
    rel="noopener noreferrer"
    className="flex items-center justify-between py-2 text-sm text-blue-600 dark:text-blue-400 hover:underline"
  >
    {label}
    <ExternalLink size={13} />
  </a>
);

const DeleteConfirm: React.FC<{
  onCancel: () => void;
  onConfirm: () => void;
  deleting: boolean;
  error: string | null;
}> = ({ onCancel, onConfirm, deleting, error }) => (
  <div
    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
    onClick={(e) => {
      if (e.target === e.currentTarget) onCancel();
    }}
  >
    <div className="w-full max-w-sm bg-white dark:bg-slate-800 rounded-2xl shadow-2xl overflow-hidden">
      <div className="p-6 space-y-3">
        <div className="flex items-start gap-4">
          <div className="shrink-0 p-3 rounded-xl bg-red-100 dark:bg-red-900/30">
            <AlertTriangle
              size={22}
              className="text-red-600 dark:text-red-400"
            />
          </div>
          <div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">
              Delete your account?
            </h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
              This permanently removes your account, your messages, and every
              chat where you're the only participant.
            </p>
          </div>
        </div>
        <p className="text-xs text-slate-400 dark:text-slate-500">
          This action cannot be undone.
        </p>
        {error && (
          <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
        )}
      </div>
      <div className="flex gap-3 px-6 pb-5">
        <button
          onClick={onCancel}
          disabled={deleting}
          className="flex-1 py-2.5 text-sm font-semibold rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-60"
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          disabled={deleting}
          className="flex-1 py-2.5 text-sm font-semibold rounded-xl text-white bg-red-600 hover:bg-red-700 active:bg-red-800 transition-colors disabled:opacity-70 flex items-center justify-center gap-2"
        >
          {deleting ? (
            <>
              <Loader2 size={14} className="animate-spin" />
              Deleting…
            </>
          ) : (
            "Delete forever"
          )}
        </button>
      </div>
    </div>
  </div>
);

export default Settings;
