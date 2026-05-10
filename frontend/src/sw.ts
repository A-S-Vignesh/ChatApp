/// <reference lib="webworker" />
import { precacheAndRoute, cleanupOutdatedCaches } from "workbox-precaching";
import { registerRoute } from "workbox-routing";
import { NetworkFirst, CacheFirst, StaleWhileRevalidate } from "workbox-strategies";
import { CacheableResponsePlugin } from "workbox-cacheable-response";
import { ExpirationPlugin } from "workbox-expiration";

declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: { url: string; revision: string | null }[];
};

/* ── Precache all Vite build assets ── */
precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

/* ── Runtime caching strategies ── */

/* API calls — NetworkFirst: always try server, fall back to cache for offline */
registerRoute(
  ({ url }) => url.pathname.startsWith("/api/"),
  new NetworkFirst({
    cacheName: "api-cache-v1",
    networkTimeoutSeconds: 5,
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxEntries: 64, maxAgeSeconds: 5 * 60 }),
    ],
  })
);

/* Static images — CacheFirst: no need to re-fetch logo/avatars on every load */
registerRoute(
  ({ request }) => request.destination === "image",
  new CacheFirst({
    cacheName: "images-cache-v1",
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxEntries: 128, maxAgeSeconds: 30 * 24 * 60 * 60 }),
    ],
  })
);

/* Google Fonts / CDN assets */
registerRoute(
  ({ url }) =>
    url.origin === "https://fonts.googleapis.com" ||
    url.origin === "https://fonts.gstatic.com",
  new StaleWhileRevalidate({
    cacheName: "google-fonts-cache-v1",
    plugins: [
      new CacheableResponsePlugin({ statuses: [0, 200] }),
      new ExpirationPlugin({ maxEntries: 20, maxAgeSeconds: 365 * 24 * 60 * 60 }),
    ],
  })
);

/* ── Push notifications ── */
self.addEventListener("push", (event) => {
  const data = (event as PushEvent).data?.json() ?? {};

  const title: string = data.title ?? "AetherChat";
  const options = {
    body: data.body ?? "You have a new message",
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    tag: data.chatId ? `chat-${data.chatId}` : "aetherchat",
    renotify: !!data.chatId,
    data: { chatId: data.chatId ?? null, url: data.url ?? "/" },
    vibrate: [100, 50, 100],
    silent: false,
  } as NotificationOptions;

  (event as PushEvent).waitUntil(self.registration.showNotification(title, options));
});

/* ── Notification click: focus existing window or open new one ── */
self.addEventListener("notificationclick", (event) => {
  const notifEvent = event as NotificationEvent;
  notifEvent.notification.close();

  if ((notifEvent as any).action === "dismiss") return;

  const { chatId, url } = notifEvent.notification.data ?? {};
  const targetUrl: string = url ?? "/";

  notifEvent.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clients) => {
        const existing = clients.find((c) =>
          c.url.startsWith(self.registration.scope)
        );
        if (existing) {
          existing.focus();
          if (chatId) {
            existing.postMessage({ type: "NOTIFICATION_CLICK", chatId });
          }
          return;
        }
        self.clients.openWindow(targetUrl);
      })
  );
});

/* ── Allow the app to trigger SW update immediately ── */
self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
