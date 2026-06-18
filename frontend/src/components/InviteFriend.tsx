import React, { useState } from "react";
import { Share2, Copy, Check } from "lucide-react";
import { authClient } from "../lib/authClient";

/* Public URL of this app — what we want friends to open. Falls back to the
   current origin so it works in any deployment / locally. */
const APP_LINK = import.meta.env.VITE_BASE_URL || window.location.origin;

function buildInviteText(myEmail?: string): string {
  return [
    "Let's chat on AetherChat — sign in with Google here:",
    APP_LINK,
    myEmail ? `Then add me (${myEmail}) to start a conversation.` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

interface InviteFriendProps {
  /** Layout: side-by-side buttons (default) or stacked for narrow columns. */
  stacked?: boolean;
  className?: string;
}

/**
 * Reusable "invite a friend" affordance. Uses the native share sheet where it
 * exists (mobile, some desktops); otherwise copies the link to the clipboard
 * with inline feedback. Self-contained — reads the signed-in user's email so
 * the invite can say "add me (you@example.com)".
 */
const InviteFriend: React.FC<InviteFriendProps> = ({ stacked = false, className = "" }) => {
  const { data: session } = authClient.useSession();
  const [copied, setCopied] = useState(false);

  const myEmail = session?.user?.email ?? undefined;

  const copyLink = async (): Promise<boolean> => {
    try {
      await navigator.clipboard.writeText(APP_LINK);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      return true;
    } catch {
      return false;
    }
  };

  const handleInvite = async () => {
    /* Prefer the OS share sheet — best experience on mobile. */
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: "Join me on AetherChat",
          text: buildInviteText(myEmail),
          url: APP_LINK,
        });
        return;
      } catch {
        /* user dismissed the sheet, or it failed — fall back to copy */
      }
    }
    await copyLink();
  };

  return (
    <div
      className={`flex ${stacked ? "flex-col" : "flex-row"} gap-2 ${className}`}
    >
      <button
        type="button"
        onClick={handleInvite}
        className="flex-1 inline-flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-blue-500 text-white text-sm font-medium hover:bg-blue-600 transition"
      >
        <Share2 size={15} />
        Invite a friend
      </button>
      <button
        type="button"
        onClick={copyLink}
        aria-label="Copy invite link"
        className="flex-1 inline-flex items-center justify-center gap-2 py-2 px-3 rounded-lg border border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-200 text-sm font-medium hover:bg-slate-100 dark:hover:bg-slate-700 transition"
      >
        {copied ? <Check size={15} className="text-green-500" /> : <Copy size={15} />}
        {copied ? "Link copied!" : "Copy link"}
      </button>
    </div>
  );
};

export default InviteFriend;
