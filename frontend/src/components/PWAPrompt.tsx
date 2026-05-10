import React, { useEffect, useState } from "react";
import { useRegisterSW } from "virtual:pwa-register/react";
import { Download, RefreshCw, X } from "lucide-react";

export const PWAPrompt: React.FC = () => {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(swUrl, registration) {
      /* Poll for updates every hour */
      if (registration) {
        setInterval(() => registration.update(), 60 * 60 * 1000);
      }
    },
  });

  /* "Add to Home Screen" install prompt */
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [showInstall, setShowInstall] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(e);
      setShowInstall(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === "accepted") {
      setInstallPrompt(null);
      setShowInstall(false);
    }
  };

  return (
    <>
      {/* Update available banner */}
      {needRefresh && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 px-4 py-3 rounded-xl shadow-2xl border border-slate-700 dark:border-slate-200 max-w-sm w-[calc(100%-2rem)]">
          <RefreshCw size={18} className="shrink-0 text-blue-400 dark:text-blue-600" />
          <p className="text-sm font-medium flex-1">New version available</p>
          <button
            onClick={() => updateServiceWorker(true)}
            className="text-sm font-semibold text-blue-400 dark:text-blue-600 hover:underline"
          >
            Update
          </button>
          <button
            onClick={() => setNeedRefresh(false)}
            className="text-slate-400 dark:text-slate-500 hover:text-white dark:hover:text-slate-900"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Install to home screen banner */}
      {showInstall && !needRefresh && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-blue-600 text-white px-4 py-3 rounded-xl shadow-2xl max-w-sm w-[calc(100%-2rem)]">
          <Download size={18} className="shrink-0" />
          <p className="text-sm font-medium flex-1">Install AetherChat for the best experience</p>
          <button
            onClick={handleInstall}
            className="text-sm font-semibold bg-white text-blue-600 px-3 py-1 rounded-lg hover:bg-blue-50 transition-colors"
          >
            Install
          </button>
          <button
            onClick={() => setShowInstall(false)}
            className="text-blue-200 hover:text-white"
          >
            <X size={16} />
          </button>
        </div>
      )}
    </>
  );
};
