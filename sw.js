/* ============================================================
   Guess the Correlation — service worker
   Cache-first for the app shell, so the tool runs offline once
   loaded. Bump CACHE_VERSION whenever any cached file changes,
   or old versions will be served indefinitely.
   ============================================================ */

/* Every deploy that touches a cached file needs a new version string,
   otherwise browsers will keep serving whatever they cached first.
   Bumped for the navigation fix below. */
var CACHE_VERSION = "corr-v2-2026-07-20";

/* Static assets only. HTML pages are deliberately absent: navigations are
   never served from this cache (see the fetch handler), so precaching them
   would do nothing useful - and cache.addAll fails as a whole if any single
   URL in the list 404s, which would silently cache nothing at all. Keeping
   this list to assets that are actually cache-served keeps that failure
   mode small and easy to spot. */
var CORE_ASSETS = [
  "./manifest.json",
  "./site.css",
  "./corr.js",
  "./nav.js",
  "./strings.js",
  "./app.js",
  "./tutorial.js",
  "./learn.js",
  "./shared/brand.css",
  "./shared/i18n.js",
  "./shared/theme.js",
  "./shared/logo.svg",
  "./shared/favicon.svg"
];

self.addEventListener("install", function (event) {
  event.waitUntil(
    caches.open(CACHE_VERSION).then(function (cache) { return cache.addAll(CORE_ASSETS); })
      .then(function () { return self.skipWaiting(); })
  );
});

/* Delete every cache except the current one. Without this an updated SW
   will happily install alongside the old cache and never free the space. */
self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) {
        if (k !== CACHE_VERSION) return caches.delete(k);
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener("fetch", function (event) {
  var req = event.request;
  if (req.method !== "GET") return;

  var url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  /* Page navigations (clicking a link, typing a URL, reloading) are never
     intercepted. They go straight to the network exactly as if there were
     no service worker at all.

     This is deliberate, not an oversight: dev servers (npx serve, python
     http.server) pick a fresh port on every restart, and a stale worker
     from an earlier port can otherwise leave a page's *navigations* being
     served by a fetch handler with nothing usable to answer with -
     resolving to `undefined` and surfacing to the user as net::ERR_FAILED,
     as if the page were missing. HTML is cheap to refetch and the one
     place where "always show the real page" matters more than offline
     support, so it is excluded from interception entirely. */
  var isNavigation = req.mode === "navigate" ||
    (req.headers.get("accept") || "").indexOf("text/html") !== -1;
  if (isNavigation) return;

  /* Everything else (JS, CSS, SVG, the manifest) is cache-first, so the
     tool still works offline once its static assets have loaded once. */
  event.respondWith(
    caches.match(req).then(function (cached) {
      if (cached) return cached;
      return fetch(req).then(function (resp) {
        if (!resp || resp.status !== 200 || resp.type !== "basic") return resp;
        var clone = resp.clone();
        caches.open(CACHE_VERSION).then(function (cache) { cache.put(req, clone); }).catch(function () {});
        return resp;
      });
    }).catch(function () {
      /* Genuinely offline with nothing cached for this asset: let the
         browser's normal network-error handling take over rather than
         synthesizing a response. */
      return fetch(req);
    })
  );
});
