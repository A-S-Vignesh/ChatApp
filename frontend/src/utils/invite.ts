/* Invite deep-links.
   An invite URL carries the inviter's identity so that, after the recipient
   signs in, the app can auto-open a conversation with them (WhatsApp-style
   "click to chat"). We encode the inviter's email as base64url so the link
   reads like an opaque token rather than a plaintext address. */

const APP_LINK = (import.meta.env.VITE_BASE_URL || window.location.origin).replace(/\/$/, "");

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function encodeInvite(email: string): string {
  return btoa(email).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function decodeInvite(token: string): string | null {
  try {
    let b64 = token.replace(/-/g, "+").replace(/_/g, "/");
    while (b64.length % 4) b64 += "=";
    const email = atob(b64);
    return EMAIL_RE.test(email) ? email : null;
  } catch {
    return null;
  }
}

/** Build the shareable invite URL. Without an email it's just the app link. */
export function buildInviteUrl(email?: string): string {
  if (!email) return APP_LINK;
  return `${APP_LINK}/?invite=${encodeInvite(email)}`;
}

/** Read an `invite` token from the current URL, if present. */
export function getInviteFromUrl(): string | null {
  return new URLSearchParams(window.location.search).get("invite");
}

/** Post-login redirect target that preserves any pending invite token, so a
    recipient who signs in via the invite link still lands with it attached. */
export function inviteAwareCallbackURL(): string {
  const invite = getInviteFromUrl();
  return invite ? `${APP_LINK}/?invite=${encodeURIComponent(invite)}` : APP_LINK;
}
