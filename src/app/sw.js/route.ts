import { BUILD_ID } from "@/lib/version";

export const dynamic = "force-static";

/**
 * Service worker, generated per build. Because BUILD_ID is embedded, the script bytes change
 * on every deployment, which is what makes browsers detect and install the new worker.
 *
 * Security: the worker NEVER caches HTML pages, API responses, launch redirects or anything
 * user/tenant-specific. It only caches immutable, public static assets and an offline page.
 */
const SCRIPT = `/* OneSeiMangkeiSEZ service worker — build ${BUILD_ID} */
const BUILD_ID = ${JSON.stringify(BUILD_ID)};
const CACHE = "onekinra-static-" + BUILD_ID;
const OFFLINE_URL = "/offline.html";
const PRECACHE = [OFFLINE_URL, "/icons/icon-192.png", "/icons/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(PRECACHE)));
  // The new worker waits until the page asks it to take over (SKIP_WAITING), so the page can
  // pick a safe moment to reload. First-time installs activate immediately (no controller).
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k.startsWith("onekinra-") && k !== CACHE).map((k) => caches.delete(k)));
      await self.clients.claim();
    })(),
  );
});

function isStaticAsset(url) {
  return url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/") || url.pathname.startsWith("/brand/");
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Pages: always from the network (authorization is decided server-side on every request).
  // Only when the network is unreachable, show the static offline page.
  if (req.mode === "navigate") {
    event.respondWith(fetch(req).catch(() => caches.match(OFFLINE_URL)));
    return;
  }

  // Immutable public assets: cache-first.
  if (isStaticAsset(url)) {
    event.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            if (res.ok && res.type === "basic") {
              const copy = res.clone();
              caches.open(CACHE).then((c) => c.put(req, copy));
            }
            return res;
          }),
      ),
    );
  }
  // Everything else (API, /launch, RSC data): untouched, straight to the network.
});
`;

export function GET() {
  return new Response(SCRIPT, {
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      // Browsers must always revalidate the worker script to discover new versions.
      "Cache-Control": "no-cache, no-store, max-age=0, must-revalidate",
      "Service-Worker-Allowed": "/",
    },
  });
}
