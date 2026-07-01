import React, { useEffect, useState } from "react";
import { MessageSquare } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

/* Cold-start boot screen.

   The backend runs on free-tier hosting (Render) that spins the server down
   after inactivity, so the first visit of the day cold-starts it — routinely
   30–60s. A bare spinner with no context reads as "site is broken," and users
   close the tab before it ever loads. This screen keeps them:
     • a progress bar that eases toward ~95% over ~55s, so it never looks frozen
       (it just unmounts the instant the session resolves — it never fakes 100%);
     • status copy that escalates every few seconds, so there's always a fresh
       sign of life rather than one stale line;
     • a persistent "up to a minute" note that sets the expectation up front,
       which is what actually stops people from leaving early. */

const STAGES: { at: number; label: string }[] = [
  { at: 0, label: "Connecting to AetherChat…" },
  { at: 6, label: "Waking up the server…" },
  { at: 16, label: "Free hosting sleeps when idle — spinning it back up…" },
  { at: 30, label: "Thanks for your patience, almost there…" },
  { at: 45, label: "Nearly ready — just a few more seconds…" },
];

/* Expected worst-case cold start (seconds). Drives the easing curve; the wait
   still resolves the moment the backend answers, whatever the real duration. */
const TARGET_SECONDS = 55;

const BootScreen: React.FC = () => {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const start = Date.now();
    const id = setInterval(() => setElapsed((Date.now() - start) / 1000), 200);
    return () => clearInterval(id);
  }, []);

  /* Ease toward — but never reach — 95%. Fast at first, slowing near the end,
     so it always feels like it's making headway without ever claiming "done". */
  const pct = Math.min(95, (1 - Math.exp(-elapsed / (TARGET_SECONDS / 3))) * 100);

  const stage = STAGES.reduce((acc, s) => (elapsed >= s.at ? s : acc), STAGES[0]);

  return (
    <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-100 dark:bg-slate-900 text-slate-800 dark:text-slate-200 px-6">
      <div className="flex flex-col items-center gap-6 w-full max-w-xs">
        {/* Logo with soft pulsing halo */}
        <div className="relative">
          <div className="absolute inset-0 rounded-2xl bg-blue-500/30 blur-xl animate-pulse" />
          <div className="relative p-4 bg-blue-600 rounded-2xl text-white shadow-lg shadow-blue-500/30">
            <MessageSquare size={36} strokeWidth={2.25} />
          </div>
        </div>

        {/* Name + tagline */}
        <div className="flex flex-col items-center gap-1.5">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            AetherChat
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Real-time messaging</p>
        </div>

        {/* Progress bar */}
        <div className="w-full">
          <div className="h-1.5 w-full rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
            <div
              className="h-full rounded-full bg-blue-500 transition-[width] duration-500 ease-out"
              style={{ width: `${pct}%` }}
            />
          </div>

          {/* Escalating status line — cross-fades on each change */}
          <div className="relative h-5 mt-3">
            <AnimatePresence mode="wait">
              <motion.p
                key={stage.at}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
                className="absolute inset-0 text-center text-sm font-medium text-slate-600 dark:text-slate-300"
              >
                {stage.label}
              </motion.p>
            </AnimatePresence>
          </div>
        </div>

        {/* Persistent expectation-setter — the line that actually keeps people
            from leaving in the first 10 seconds. */}
        <p className="max-w-[17rem] text-center text-xs text-slate-400 dark:text-slate-500 leading-relaxed">
          The first visit can take up to a minute while our free server wakes up.
          Please keep this tab open — it'll load automatically.
        </p>
      </div>
    </div>
  );
};

export default BootScreen;
