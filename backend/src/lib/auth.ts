import { betterAuth } from "better-auth";
import { MongoClient, Db } from "mongodb";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import { bearer, oneTimeToken } from "better-auth/plugins";
import dotenv from "dotenv";
import { sendEmail } from "./sendEmail.js";
import { passkey } from "@better-auth/passkey";

dotenv.config();

/* -------------------- MongoDB -------------------- */
const client = new MongoClient(process.env.MONGO_URI!);
let db: Db;
try {
  await client.connect();
  db = client.db();
} catch (err) {
  console.error("FATAL: Better Auth could not connect to MongoDB at startup:", err);
  process.exit(1);
}

/* When the frontend and backend live on different domains (e.g. Vercel +
   Render), cookies must be `SameSite=None; Secure` for the browser to:
     a) store cookies set in cross-origin responses (the OAuth `state` cookie)
     b) send those cookies back on the callback redirect from Google.
   In local dev (same-host http) we want plain `Lax` so the browser keeps
   accepting cookies without https. We toggle on whether baseURL is https. */
const isProduction = (process.env.BETTER_AUTH_URL ?? "").startsWith("https://");

/* -------------------- Auth -------------------- */
export const auth = betterAuth({
  secret: process.env.BETTER_AUTH_SECRET!,
  baseURL: process.env.BETTER_AUTH_URL!,
  /* Allow both the deployed frontend and the local dev frontend. Better Auth
     checks `callbackURL` against this list before redirecting — anything not
     listed comes back as INVALID_CALLBACKURL. */
  trustedOrigins: [
    process.env.FRONTEND_URL,
    process.env.BETTER_AUTH_URL, // backend's own origin — the social callback redirects here first
    "http://localhost:5173",
    "http://localhost:5000",
  ].filter(Boolean) as string[],

  advanced: {
    /* Cross-site cookies are required when frontend (Vercel) and backend
       (Render) are on different registrable domains. Without these flags
       the OAuth state cookie is dropped, surfacing as `state_mismatch`
       after the Google redirect. */
    defaultCookieAttributes: {
      sameSite: isProduction ? "none" : "lax",
      secure: isProduction,
      httpOnly: true,
    },
  },

  /* bearer() lets the session token travel as an `Authorization: Bearer …`
     header instead of a cookie — the only way to authenticate cross-site to
     a different registrable domain (Vercel ↔ Render) once browsers partition
     third-party cookies. oneTimeToken() issues a short-lived, single-use token
     used purely to hand the freshly-minted session from the backend (where the
     OAuth callback lands) over to the frontend, which then stores the bearer
     token. See `/api/social-complete` in server.ts. */
  plugins: [
    passkey(),
    bearer(),
    /* Hardening for the URL-borne handoff token:
       - expiresIn: 1 (minute) — the token only has to survive one
         Render→browser→Vercel redirect hop (sub-second); a 1-min ceiling keeps
         the replay window tiny even though it briefly lives in a URL.
       - storeToken: "hashed" — only a hash is persisted, so a leaked DB dump
         can't be replayed. It's already single-use: verifyOneTimeToken deletes
         the record before it even checks expiry. */
    oneTimeToken({ expiresIn: 1, storeToken: "hashed" }),
  ],

  /* 🔐 Mongo Adapter */
  database: mongodbAdapter(db),

  /* 📦 Explicit collection names */
  user: {
    modelName: "users",
  },
  account: {
    modelName: "accounts",
    accountLinking: {
      enabled: true,
    },
    /* Store the OAuth `state` (CSRF/PKCE handshake) in MongoDB instead of a
       cookie. With the frontend (Vercel) and backend (Render) on different
       registrable domains, the browser partitions the state cookie set during
       sign-in away from the first-party jar used at Google's callback — so the
       cookie is gone on return and Better Auth aborts with `state_mismatch`.
       Keying the state by the value Google echoes back in the URL removes the
       cookie from the loop entirely.
       `skipStateCookieCheck` is required alongside it: even under the database
       strategy Better Auth still cross-checks a signed `state` cookie (which is
       equally lost cross-site) unless we opt out. The CSRF protection then
       rests on the state being server-issued, unguessable (32 random chars) and
       single-use (deleted on first callback) — the same trade-off Better Auth's
       own oauth-proxy plugin makes for multi-domain deployments. */
    storeStateStrategy: "database",
    skipStateCookieCheck: true,
  },
  session: {
    modelName: "sessions",
  },

  /* 🔑 Email + Password — disabled. Google-only login removes the
     credential brute-force surface. Flip back to `true` when you want
     to re-enable, and add a rate limiter on /api/auth/* at the same time. */
  emailAndPassword: {
    enabled: false,
  },

  /* ✉️ Email Verification */
  emailVerification: {
    sendVerificationEmail: async ({ user, url }) => {
      await sendEmail({
        to: user.email,
        subject: "Verify your email",
        text: `Click the link below to verify your email:\n\n${url}`,
      });
    },
  },

  /* 🌐 Social Login */
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    },
  },
});
