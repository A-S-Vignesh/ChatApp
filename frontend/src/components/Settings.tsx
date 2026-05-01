import React from "react";
import type { Theme, NotificationSettings } from "../../types";
import { X, Sun, Moon, Bell } from "lucide-react";
import ToggleSwitch from "./ToggleSwitch";

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
  const handleNotificationToggle = (key: keyof NotificationSettings) => {
    onNotificationChange({
      ...notificationSettings,
      [key]: !notificationSettings[key],
    });
  };

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
            <div className="flex gap-2 p-1 bg-slate-100 dark:bg-slate-700 rounded-lg">
              <button
                onClick={() => onThemeChange("light")}
                className={`w-full flex items-center justify-center gap-2 px-3 py-1.5 rounded-md text-sm font-semibold transition-colors ${
                  theme === "light"
                    ? "bg-white shadow-sm text-blue-600"
                    : "text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600"
                }`}
              >
                <Sun size={16} />
                Light
              </button>
              <button
                onClick={() => onThemeChange("dark")}
                className={`w-full flex items-center justify-center gap-2 px-3 py-1.5 rounded-md text-sm font-semibold transition-colors ${
                  theme === "dark"
                    ? "bg-slate-900 shadow-sm text-blue-500"
                    : "text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600"
                }`}
              >
                <Moon size={16} />
                Dark
              </button>
            </div>
          </div>
        </div>

        {/* Notifications Section */}
        <div>
          <h3 className="text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-4">
            Notifications
          </h3>
          <div className="space-y-4">
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

export default Settings;
