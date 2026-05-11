import { useEffect, useState } from "react";

/* Device-local UI preferences that don't need to sync across devices. Stored
   in localStorage. If you'd rather these followed the user across devices,
   move them to the User model + /profile/me. */

export type LocalPrefs = {
  /* Pressing Enter alone sends the message (default). When false, Enter
     inserts a newline and Ctrl/Cmd+Enter sends — like Slack's setting. */
  sendOnEnter: boolean;
};

const DEFAULTS: LocalPrefs = {
  sendOnEnter: true,
};

const STORAGE_KEY = "aetherchat:localPrefs";

function read(): LocalPrefs {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw) as Partial<LocalPrefs>;
    return { ...DEFAULTS, ...parsed };
  } catch {
    return DEFAULTS;
  }
}

/* Simple pub/sub so multiple components stay in sync when the prefs change. */
const subscribers = new Set<() => void>();
function broadcast() {
  for (const fn of subscribers) fn();
}

export function useLocalPrefs() {
  const [prefs, setPrefs] = useState<LocalPrefs>(read);

  useEffect(() => {
    const fn = () => setPrefs(read());
    subscribers.add(fn);
    return () => {
      subscribers.delete(fn);
    };
  }, []);

  const update = (patch: Partial<LocalPrefs>) => {
    const next = { ...read(), ...patch };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    broadcast();
  };

  return { prefs, update };
}
