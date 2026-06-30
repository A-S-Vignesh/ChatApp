// src/lib/authClient.ts
import { createAuthClient } from "better-auth/react";
import { oneTimeTokenClient } from "better-auth/client/plugins";

/* Where we keep the session token. Frontend (Vercel) and backend (Render) are
   on different registrable domains, so the session cookie set by the backend is
   a third-party cookie the browser refuses to send back. Instead we run Better
   Auth's bearer-token flow: the backend exposes the session token in a
   `set-auth-token` response header, we stash it here, and send it back as
   `Authorization: Bearer …` on every request. */
export const BEARER_TOKEN_KEY = "bearer_token";

export const authClient = createAuthClient({
  baseURL: import.meta.env.VITE_AUTH_BASE_URL, // backend URL
  plugins: [oneTimeTokenClient()],
  fetchOptions: {
    /* Capture the token whenever the backend issues one (sign-in, OTT verify,
       session refresh). */
    onSuccess: (ctx) => {
      const authToken = ctx.response.headers.get("set-auth-token");
      if (authToken) localStorage.setItem(BEARER_TOKEN_KEY, authToken);
    },
    /* Attach it to outgoing auth-client requests (useSession, signOut, …). */
    auth: {
      type: "Bearer",
      token: () => localStorage.getItem(BEARER_TOKEN_KEY) || "",
    },
  },
});
