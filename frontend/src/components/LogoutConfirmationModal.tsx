import React from "react";
import { LogOut } from "lucide-react";

interface LogoutConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

const LogoutConfirmationModal: React.FC<LogoutConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="logout-modal-title"
      onClick={(e: React.MouseEvent<HTMLDivElement>) =>
        e.target === e.currentTarget && onClose()
      }
    >
      <div className="w-full max-w-sm bg-white dark:bg-slate-800 rounded-2xl shadow-2xl overflow-hidden">
        <div className="p-6 space-y-3">
          <div className="flex items-start gap-4">
            <div className="shrink-0 p-3 rounded-xl bg-red-100 dark:bg-red-900/30">
              <LogOut size={22} className="text-red-600 dark:text-red-400" />
            </div>
            <div>
              <h3
                id="logout-modal-title"
                className="text-base font-semibold text-slate-900 dark:text-white"
              >
                Sign out?
              </h3>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                You'll need to sign in again to access your conversations.
              </p>
            </div>
          </div>
        </div>

        <div className="flex gap-3 px-6 pb-5">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 text-sm font-semibold rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 py-2.5 text-sm font-semibold rounded-xl text-white bg-red-600 hover:bg-red-700 active:bg-red-800 transition-colors"
          >
            Sign out
          </button>
        </div>
      </div>
    </div>
  );
};

export default LogoutConfirmationModal;
