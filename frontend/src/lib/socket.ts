import { io } from "socket.io-client";
import { BEARER_TOKEN_KEY } from "./authClient";

const SOCKET_URL = import.meta.env.VITE_AUTH_BASE_URL || "http://localhost:5000";

export const socket = io(SOCKET_URL, {
  withCredentials: true,
  transports: ["websocket", "polling"],
  /* A browser can't set an Authorization header on the WebSocket handshake, so
     we hand the bearer token to the server via the auth payload instead. Using a
     function means the latest token is read on every (re)connect — important
     after login, where the token only exists once the OTT exchange completes. */
  auth: (cb) => cb({ token: localStorage.getItem(BEARER_TOKEN_KEY) || "" }),
  autoConnect: false,
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  reconnectionAttempts: Infinity,
  timeout: 10000,
});
