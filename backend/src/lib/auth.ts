import { betterAuth } from "better-auth";
import { MongoClient } from "mongodb";
import { mongodbAdapter } from "better-auth/adapters/mongodb";
import dotenv from "dotenv";
import { sendEmail } from "./sendEmail.js";
import { passkey } from "@better-auth/passkey";

dotenv.config();

/* -------------------- MongoDB -------------------- */
const client = new MongoClient(process.env.MONGO_URI!);
await client.connect();
const db = client.db();

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
    "http://localhost:5173",
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

  plugins: [passkey()],

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
