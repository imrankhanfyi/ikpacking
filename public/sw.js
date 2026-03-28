// Cache name derived from SW URL query param (set at registration time)
const BUILD_ID = new URL(self.location).searchParams.get('v') || 'dev'
const CACHE_NAME = `pack-${BUILD_ID}`

// Cache the app shell on install
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) =>
      cache.addAll([
        '/',
        '/index.html',
        '/manifest.json',
        '/favicon.svg',
        '/icon-192.png',
        '/icon-512.png',
      ])
    )
  )
  self.skipWaiting()
})

// Clean up old caches on activate
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n))
      )
    )
  )
  self.clients.claim()
})

// Network-first for navigations and API calls, cache-first for assets
self.addEventListener('fetch', (event) => {
  const { request } = event

  // Skip non-GET and cross-origin requests (e.g. OpenRouter API)
  if (request.method !== 'GET' || !request.url.startsWith(self.location.origin)) {
    return
  }

  // HTML navigations: network-first so the latest build is always served
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone()
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone))
          return response
        })
        .catch(() => caches.match('/index.html'))
    )
    return
  }

  // Assets (JS, CSS, images): cache-first
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached
      return fetch(request).then((response) => {
        const clone = response.clone()
        caches.open(CACHE_NAME).then((cache) => cache.put(request, clone))
        return response
      })
    })
  )
})
