import { useEffect, useState } from "react";
import { MessageSquare, Shield, Zap, Send, AlertCircle, X } from "lucide-react";
import LoginPage from "./LoginPage";
import SignupPage from "./SignupPage";
import { motion, AnimatePresence } from "framer-motion";

/* Map the raw OAuth/Better-Auth error codes that come back on the redirect URL
   (?error=…) to a friendly, actionable message. Without this, a failed Google
   sign-in silently dumps the user back on the login screen with no explanation. */
function friendlyAuthError(code: string): string {
  const c = code.toLowerCase();
  if (c.includes("access_denied") || c.includes("cancel"))
    return "Sign-in was cancelled. Please try again.";
  if (c.includes("state") || c.includes("expired") || c.includes("restart"))
    return "Your sign-in session expired. Please try signing in again.";
  if (c.includes("account") && c.includes("exist"))
    return "An account with this email already exists. Try signing in instead.";
  return "Google sign-in didn't complete. Please try again.";
}

const FEATURES = [
  {
    icon: Zap,
    color: "text-yellow-400",
    bg: "bg-yellow-400/10",
    title: "Real-time messaging",
    desc: "Instant delivery with read receipts and typing indicators",
  },
  {
    icon: Shield,
    color: "text-green-400",
    bg: "bg-green-400/10",
    title: "Private by default",
    desc: "You control your online status, last seen, and read receipts",
  },
  {
    icon: Send,
    color: "text-blue-300",
    bg: "bg-blue-300/10",
    title: "Works offline",
    desc: "Messages you write offline are queued and sent when you reconnect",
  },
];

const slideVariants = {
  initial: (dir: number) => ({ x: dir > 0 ? 80 : -80, opacity: 0 }),
  animate: { x: 0, opacity: 1, transition: { duration: 0.45, ease: [0.4, 0, 0.2, 1] } },
  exit: (dir: number) => ({ x: dir > 0 ? -80 : 80, opacity: 0, transition: { duration: 0.35, ease: [0.4, 0, 0.2, 1] } }),
};

const panelVariants = {
  initial: (dir: number) => ({ x: dir > 0 ? -40 : 40, opacity: 0 }),
  animate: { x: 0, opacity: 1, transition: { duration: 0.6, ease: [0.4, 0, 0.2, 1] } },
  exit: (dir: number) => ({ x: dir > 0 ? 40 : -40, opacity: 0, transition: { duration: 0.4, ease: [0.4, 0, 0.2, 1] } }),
};

const AuthContainer = () => {
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [direction, setDirection] = useState(1);
  const [authError, setAuthError] = useState<string | null>(null);

  /* If Google/Better Auth redirected back with an error, surface it and then
     strip the param so a refresh doesn't keep showing the banner. */
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("error") || params.get("error_description");
    if (!code) return;
    setAuthError(friendlyAuthError(code));
    params.delete("error");
    params.delete("error_description");
    const qs = params.toString();
    window.history.replaceState(
      {},
      "",
      window.location.pathname + (qs ? `?${qs}` : "") + window.location.hash
    );
  }, []);

  const handleSwitchMode = (newMode: "login" | "signup") => {
    if (mode === newMode) return;
    setDirection(newMode === "signup" ? 1 : -1);
    setMode(newMode);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex">
      {/* Left panel — decorative */}
      <div
        className={`hidden lg:flex lg:w-1/2 relative overflow-hidden ${
          mode === "login" ? "order-1" : "order-2"
        }`}
      >
        {/* Gradient background */}
        <div className="absolute inset-0 bg-linear-to-br from-blue-600 via-blue-700 to-indigo-800" />

        {/* Decorative blobs */}
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-white/5 rounded-full blur-3xl" />
        <div className="absolute -bottom-32 -left-16 w-80 h-80 bg-indigo-500/20 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-125 h-125 bg-blue-500/10 rounded-full blur-3xl" />

        {/* Grid pattern overlay */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />

        <div className="relative z-10 w-full flex items-center justify-center p-12">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={mode}
              custom={direction}
              variants={panelVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="max-w-sm w-full space-y-10"
            >
              {/* Logo */}
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-white/15 backdrop-blur-sm rounded-xl border border-white/20 shadow-xl">
                  <MessageSquare size={26} className="text-white" />
                </div>
                <span className="text-2xl font-bold text-white tracking-tight">AetherChat</span>
              </div>

              {/* Headline */}
              <div className="space-y-3">
                <h2 className="text-4xl font-bold text-white leading-tight tracking-tight">
                  {mode === "login" ? "Welcome\nback." : "Start\nchatting."}
                </h2>
                <p className="text-blue-100/80 text-base leading-relaxed">
                  {mode === "login"
                    ? "Continue where you left off. Pick up your conversations."
                    : "Create your free account and start chatting in seconds."}
                </p>
              </div>

              {/* Features */}
              <div className="space-y-4">
                {FEATURES.map(({ icon: Icon, color, bg, title, desc }) => (
                  <div key={title} className="flex items-start gap-4">
                    <div className={`mt-0.5 p-2 rounded-lg ${bg} shrink-0`}>
                      <Icon size={16} className={color} />
                    </div>
                    <div>
                      <p className="text-white font-medium text-sm">{title}</p>
                      <p className="text-blue-100/60 text-xs mt-0.5 leading-relaxed">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Right panel — form */}
      <div
        className={`w-full lg:w-1/2 flex items-center justify-center p-6 md:p-10 ${
          mode === "login" ? "order-2" : "order-1"
        }`}
      >
        <div className="w-full max-w-sm">
          {authError && (
            <div className="mb-6 flex items-start gap-3 p-3.5 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
              <AlertCircle size={18} className="text-red-500 dark:text-red-400 shrink-0 mt-0.5" />
              <p className="text-sm text-red-600 dark:text-red-400 grow">{authError}</p>
              <button
                type="button"
                onClick={() => setAuthError(null)}
                aria-label="Dismiss error"
                className="text-red-400 hover:text-red-600 dark:hover:text-red-300 shrink-0"
              >
                <X size={16} />
              </button>
            </div>
          )}
          <AnimatePresence mode="wait" custom={direction}>
            {mode === "login" ? (
              <motion.div
                key="login"
                custom={direction}
                variants={slideVariants}
                initial="initial"
                animate="animate"
                exit="exit"
              >
                <LoginPage onSwitchToSignup={() => handleSwitchMode("signup")} />
              </motion.div>
            ) : (
              <motion.div
                key="signup"
                custom={direction}
                variants={slideVariants}
                initial="initial"
                animate="animate"
                exit="exit"
              >
                <SignupPage onSwitchToLogin={() => handleSwitchMode("login")} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default AuthContainer;
