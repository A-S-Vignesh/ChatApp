import { useState } from "react";
import { MessageSquare, Shield, Zap, Users } from "lucide-react";
import LoginPage from "./LoginPage";
import SignupPage from "./SignupPage";
import { motion, AnimatePresence } from "framer-motion";

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
    title: "Secure by default",
    desc: "Your messages are protected with enterprise-grade security",
  },
  {
    icon: Users,
    color: "text-blue-300",
    bg: "bg-blue-300/10",
    title: "Team collaboration",
    desc: "Connect and coordinate across your entire organization",
  },
];

const STATS = [
  { value: "10K+", label: "Active users" },
  { value: "99.9%", label: "Uptime" },
  { value: "< 50ms", label: "Avg. latency" },
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
                    ? "Continue where you left off. Your team is waiting."
                    : "Create your free account and connect with your team instantly."}
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

              {/* Stats */}
              <div className="pt-8 border-t border-white/10">
                <div className="grid grid-cols-3 gap-4">
                  {STATS.map(({ value, label }) => (
                    <div key={label} className="text-center">
                      <p className="text-xl font-bold text-white">{value}</p>
                      <p className="text-blue-100/60 text-xs mt-0.5">{label}</p>
                    </div>
                  ))}
                </div>
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
