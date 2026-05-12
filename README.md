# AetherChat

A real-time 1-to-1 chat application with WhatsApp-grade reliability features:
delivery receipts, read receipts, typing indicators, offline-tolerant sending,
push notifications, and mutual privacy controls.

Live deployment: `https://chatonaether.vercel.app` (frontend) +
`https://chatapp-lefw.onrender.com` (backend).

---

## Table of contents

- [Features](#features)
- [Tech stack](#tech-stack)
- [Project structure](#project-structure)
- [Local development](#local-development)
- [Environment variables](#environment-variables)
- [Deployment](#deployment)
- [Architecture highlights](#architecture-highlights)
- [Roadmap](#roadmap)

---

## Features

### Messaging
- **Real-time messages** over Socket.io with HTTP fallback.
- **Three-state ticks** like WhatsApp: clock (sending) → single grey (sent) →
  double grey (delivered) → double white (read).
- **Idempotent sends** — each message carries a client-generated `clientId`
  UUID, enforced by a unique compound index on the server. Retries can never
  produce duplicates.
- **Offline outbox (IndexedDB)** — messages typed while offline persist across
  reloads and auto-flush on `online` / socket reconnect.
- **Server-side rate limit** — token bucket of 30 msg / 10s per user.
- **Atomic ordering** — message persists even if the chat-preview update fails.

### Presence & reliability
- **Multi-device live sync** — sending from desktop instantly updates phone.
- **Reconnect flush** — on socket reconnect, the server marks all missed messages
  delivered and the client invalidates message/chats queries.
- **Focus-aware push** — notifications only fire when the recipient is not
  actively viewing that chat. Pages backgrounded, on a different chat, or
  minimized all count as "not focused".
- **Per-chat mute** — server-side, applies across devices.

### Privacy (mutual rule)
Four toggles that work *both* ways — if you turn one off you stop emitting that
signal AND stop receiving it from others. This removes the incentive to game
the toggles.

- Read receipts
- Online status
- Last seen
- Typing indicator

### UX
- **Auth**: Google sign-in via Better Auth (email/password disabled by default).
- **PWA**: installable, service worker, web push, offline outbox.
- **Theme**: light / dark / system (follows OS preference live).
- **WhatsApp-style settings**: drill-down categories (Account, Privacy,
  Notifications, Chats, Appearance, About).
- **Profile editing**: name, bio, phone, location, date of birth.
- **Account deletion**: cascade-deletes messages, chat memberships, and push
  subscriptions; signs the user out cleanly.

---

## Tech stack

### Frontend
| | |
|---|---|
| Framework | React 19 + Vite |
| Styling | Tailwind CSS v4 |
| Server state | TanStack Query (React Query) |
| Realtime | socket.io-client |
| Auth | better-auth/react |
| PWA | vite-plugin-pwa + Workbox |
| Offline queue | IndexedDB (custom outbox) |
| Icons | lucide-react |

### Backend
| | |
|---|---|
| Runtime | Node.js 20+ |
| HTTP | Express 5 |
| Realtime | Socket.io |
| DB | MongoDB (via Mongoose 9) |
| Auth | better-auth + @better-auth/passkey |
| Push | web-push (VAPID) |
| Email | Resend (for verification flows) |
| Language | TypeScript |

---

## Project structure

```
ChatApp/
├── frontend/                  React + Vite client
│   ├── src/
│   │   ├── components/        Chat UI, Settings, Profile modals, etc.
│   │   ├── hooks/             useMessages, useSendMessage, useOutboxFlush,
│   │   │                      useProfile, useNotificationSettings, …
│   │   ├── lib/               api, socket, outbox (IndexedDB), authClient
│   │   ├── pages/             ChatPage, AuthContainer, Login/Signup
│   │   ├── types/             Domain types
│   │   └── sw.ts              Service worker (push, caching)
│   ├── public/icons/          PWA icons
│   ├── index.html, App.tsx, index.tsx
│   └── vite.config.ts
│
├── backend/                   Express + Socket.io server
│   ├── src/
│   │   ├── lib/               auth (Better Auth), db, pushService, sendEmail
│   │   ├── middleware/        protectRoute
│   │   ├── models/            User, Chat, Message, PushSubscription
│   │   ├── routes/            chat, message, profile, push
│   │   ├── socket.ts          Realtime + presence + privacy enforcement
│   │   └── server.ts          Express bootstrap
│   └── tsconfig.json
│
└── README.md                  (you're here)
```

---

## Local development

### Prerequisites
- Node.js 20+
- A MongoDB instance (local `mongod`, or a free Atlas cluster)
- A Google Cloud OAuth 2.0 client (for sign-in)
- A Resend account (for verification emails) — optional unless you re-enable
  email/password auth

### 1. Install dependencies

```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

### 2. Generate VAPID keys (for web push)

```bash
cd backend
npx web-push generate-vapid-keys
```

Copy the **public** key into both `backend/.env` (`VAPID_PUBLIC_KEY`) and
`frontend/.env` (`VITE_VAPID_PUBLIC_KEY`). The **private** key goes only in
`backend/.env`.

### 3. Set up environment files

Copy `frontend/.env.example` → `frontend/.env` and fill in values. Create
`backend/.env` with the variables listed in
[Environment variables](#environment-variables) below.

### 4. Run

Open two terminals:

```bash
# Terminal A — backend
cd backend
npm run dev          # tsx watch on src/server.ts, port 5000

# Terminal B — frontend
cd frontend
npm run dev          # Vite dev server on port 5173
```

Open `http://localhost:5173`. Sign in with Google.

### 5. Production build (local sanity check)

```bash
cd backend && npm run build && npm start
cd frontend && npm run build && npm run preview
```

---

## Environment variables

### Backend (`backend/.env`)

| Variable | Purpose |
|---|---|
| `MONGO_URI` | MongoDB connection string |
| `BETTER_AUTH_SECRET` | 32-byte hex secret. Generate: `openssl rand -hex 32` |
| `BETTER_AUTH_URL` | Backend's public URL (e.g. `http://localhost:5000` in dev) |
| `FRONTEND_URL` | Frontend's public URL — drives CORS and `trustedOrigins` |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret |
| `RESEND_API_KEY` | Resend API key for verification emails |
| `VAPID_PUBLIC_KEY` | Web Push VAPID public key (same as frontend's) |
| `VAPID_PRIVATE_KEY` | Web Push VAPID private key — **never commit** |
| `VAPID_EMAIL` | Contact email for push providers, e.g. `mailto:you@example.com` |

### Frontend (`frontend/.env`)

All `VITE_*` values are bundled into the client JS and are **public by design**.
Never put real secrets here.

| Variable | Purpose |
|---|---|
| `VITE_AUTH_BASE_URL` | Backend URL (no `/api` suffix) |
| `VITE_BACKEND_URL` | Backend URL + `/api` |
| `VITE_BASE_URL` | This app's public URL (used as OAuth post-login redirect) |
| `VITE_VAPID_PUBLIC_KEY` | Public half of the VAPID keypair |

---

## Deployment

This project deploys cleanly on free tiers:

- **Frontend → Vercel/Netlify** (any static host that runs Vite builds)
- **Backend → Render** (or Railway, Fly.io, etc.)
- **Database → MongoDB Atlas** free cluster

### Render (backend) settings

| Field | Value |
|---|---|
| Root Directory | `backend` |
| Build Command | `npm install && npm run build` |
| Start Command | `npm start` |
| Node Version | 20+ |

Add every backend `.env` variable in Render → **Environment**. Set
`BETTER_AUTH_URL` to the Render-issued URL and `FRONTEND_URL` to your Vercel
URL.

### Vercel (frontend) settings

- Root Directory: `frontend`
- Build Command: `npm run build`
- Output: `dist`
- Env vars: all `VITE_*` from the table above, **pointing at production URLs**.

### Google OAuth

In Google Cloud Console → Credentials → your OAuth client → Authorized
redirect URIs, add:

```
https://<your-backend>.onrender.com/api/auth/callback/google
```

Without this, Google rejects the redirect with `redirect_uri_mismatch`.

---

## Architecture highlights

### No duplicate messages, ever

Every send carries a client-generated UUID (`clientId`). The server has a
sparse unique index on `(sender, clientId)`. If a retry races, the duplicate
insert fails with E11000 and the route returns the original winner. The
optimistic UI swaps temp messages by `clientId`, not by position.

### Offline outbox

`useSendMessage` enqueues every send to IndexedDB *before* the network attempt.
On failure the entry stays. A flusher hook drains the outbox on:
1. App mount
2. `window.online`
3. Socket `connect`

Hydration on app start re-inserts any pending messages back into the React
Query cache so they appear immediately — even after a hard reload.

### Mutual privacy enforcement

Privacy toggles are enforced server-side, not just in the UI. The socket layer
caches each user's privacy preferences on connect and consults them on every
typing/online event:

- `typingIndicator: false` → server drops both the user's outgoing typing
  events AND the events that would have been delivered to them.
- `showOnline: false` → no `user:online` / `user:offline` broadcast, and the
  user receives none either; everyone reads as offline.
- `lastSeen: 'nobody'` → stripped from API responses both directions.
- `readReceipts: false` → user is never added to `messages:read` emit, and
  `readBy` is filtered from messages they fetch.

Turning a toggle off is therefore symmetric — you can't peek by toggling on
briefly because while it's off you receive nothing either.

### Focus-aware push notifications

Sockets report `presence:focus` whenever the active chat or page visibility
changes. The server tracks per-socket `{activeChatId, visible}` in memory.
Push is skipped only if at least one of the recipient's sockets is BOTH
visible AND focused on that chat. Background tabs, minimized windows, and
other-chat-open all trigger a push.

### Cascade-safe account deletion

`DELETE /api/profile/me` walks the user's chats: where they're the only
participant the chat + messages are removed; where others remain, the user is
pulled from `participants`, `mutedBy`, and `deletedFor`. Then their authored
messages, push subscriptions, and User record are deleted, and Better Auth's
`signOut` clears the session cookie. The user's data leaves no orphans.

---

## Roadmap

Things explicitly *not* in v1 but slotted as next-up:

- Image / file uploads (S3 or similar)
- Message edit / delete (per-message, not whole chat)
- Reactions
- Group chats (model supports it; no UI yet)
- Block / report user
- Search across messages
- Email-verification gating (Better Auth has the hook, not wired into UI yet)
- Helmet / HSTS / structured logging (pino) — production hardening pass
- Redis adapter for Socket.io (required for horizontal scaling beyond one
  Node process)
- End-to-end encryption (TLS handles wire-MITM; E2EE would defend against the
  server operator — multi-week effort, breaks several current features like
  push previews and multi-device search)

---

## License

ISC (or change to whatever you prefer — this repo is yours).
