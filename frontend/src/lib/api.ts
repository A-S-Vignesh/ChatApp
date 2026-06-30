import axios from "axios";
import { BEARER_TOKEN_KEY } from "./authClient";

export const api = axios.create({
  baseURL: import.meta.env.VITE_BACKEND_URL,
  withCredentials: true, // 🔑 same-site/local-dev cookie fallback
});

/* Cross-domain auth: the session lives in a bearer token (localStorage), not a
   cookie the browser would send automatically. Attach it to every request so
   the backend's bearer plugin can resolve the session. */
api.interceptors.request.use((config) => {
  const token = localStorage.getItem(BEARER_TOKEN_KEY);
  /* In axios v1 `config.headers` is always an AxiosHeaders instance here. */
  if (token) config.headers.set("Authorization", `Bearer ${token}`);
  return config;
});
