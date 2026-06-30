
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { authClient } from "./src/lib/authClient";

const queryClient = new QueryClient();

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

/* Cross-domain login handoff: after Google sign-in the backend redirects here
   with a one-time token (`?ott=`). We exchange it for the bearer token (stored
   by authClient's onSuccess) BEFORE React mounts, so the very first useSession()
   call already carries the token and the user lands signed-in — no flash of the
   login screen. The token is stripped from the URL either way. */
async function exchangeOneTimeToken(): Promise<void> {
  const params = new URLSearchParams(window.location.search);
  const ott = params.get("ott");
  if (!ott) return;

  try {
    await authClient.oneTimeToken.verify({ token: ott });
  } catch {
    /* Expired/used/invalid token — fall through; the app shows the login screen
       and the user can retry. */
  } finally {
    params.delete("ott");
    const qs = params.toString();
    window.history.replaceState(
      {},
      "",
      window.location.pathname + (qs ? `?${qs}` : "") + window.location.hash
    );
  }
}

exchangeOneTimeToken().finally(() => {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </React.StrictMode>
  );
});
