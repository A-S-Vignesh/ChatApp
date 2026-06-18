import React, { useState } from "react";
import { Loader2, MessageSquare } from "lucide-react";
import { FcGoogle } from "react-icons/fc";
import { authClient } from "../lib/authClient";

interface LoginPageProps {
  onSwitchToSignup: () => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onSwitchToSignup }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      /* After Google completes, Better Auth redirects the browser to this URL.
         Fall back to the current origin so the user always returns to the
         frontend they came from — even if VITE_BASE_URL isn't set on the
         deployment. Without this fallback, Better Auth uses its own baseURL
         (the backend) and the user ends up stranded there. */
      const callbackURL = import.meta.env.VITE_BASE_URL || window.location.origin;
      await authClient.signIn.social(
        { provider: "google", callbackURL },
        { onError: (ctx) => { setError(ctx.error.message || "Google login failed"); setLoading(false); } }
      );
    } catch (err: any) {
      setError(err?.message || "Google login failed");
      setLoading(false);
    }
  };

  return (
    <div className="w-full">
      {/* Mobile logo */}
      <div className="lg:hidden flex items-center justify-center gap-3 mb-10">
        <div className="p-2.5 bg-blue-600 rounded-xl text-white shadow-lg shadow-blue-500/30">
          <MessageSquare size={24} />
        </div>
        <span className="text-2xl font-bold text-slate-900 dark:text-white">AetherChat</span>
      </div>

      <div className="text-center mb-10">
        <h2 className="text-3xl font-bold text-slate-900 dark:text-white tracking-tight">
          Welcome back
        </h2>
        <p className="mt-2.5 text-slate-500 dark:text-slate-400">
          Sign in to continue your conversations
        </p>
      </div>

      {error && (
        <div className="mb-6 p-3.5 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
          <p className="text-sm text-red-600 dark:text-red-400 text-center">{error}</p>
        </div>
      )}

      <button
        onClick={handleGoogleLogin}
        disabled={loading}
        className="w-full flex items-center justify-center gap-3 py-3.5 px-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/80 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md group"
      >
        {loading ? (
          <Loader2 size={20} className="animate-spin text-slate-400" />
        ) : (
          <FcGoogle size={22} />
        )}
        <span className="font-semibold text-slate-700 dark:text-slate-200 text-sm">
          {loading ? "Signing in…" : "Continue with Google"}
        </span>
      </button>

      <p className="mt-5 text-xs text-center text-slate-400 dark:text-slate-500 leading-relaxed">
        By continuing, you agree to our{" "}
        <button type="button" className="underline underline-offset-2 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
          Terms of Service
        </button>{" "}
        and{" "}
        <button type="button" className="underline underline-offset-2 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
          Privacy Policy
        </button>
      </p>

      <div className="mt-10 pt-7 border-t border-slate-100 dark:border-slate-800">
        <p className="text-center text-sm text-slate-500 dark:text-slate-400">
          Don't have an account?{" "}
          <button
            type="button"
            onClick={onSwitchToSignup}
            className="font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
          >
            Create one free
          </button>
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
