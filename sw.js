// Service Worker for Budget Tracker PWA
const STATIC_CACHE = 'static-cache-' + self.registration.scope + Date.now();
const DYNAMIC_CACHE = 'dynamic-cache';

// Assets that rarely change
const ASSETS = [
    './',
    './index.html',
    './styles.css',
    './app.js',
    './manifest.json',
    'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap'
];

// Install – cache static assets
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(STATIC_CACHE).then(cache => cache.addAll(ASSETS))
    );
    self.skipWaiting();
});

// Activate – remove old caches
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys => {
            return Promise.all(
                keys.filter(key => key !== STATIC_CACHE && key !== DYNAMIC_CACHE)
                    .map(key => caches.delete(key))
            );
        })
    );
    self.clients.claim();
});

// Fetch — smart caching strategy
self.addEventListener('fetch', event => {
    const url = event.request.url;

    // Never cache Google Apps Script
    if (url.includes('script.google.com')) {
        return;
    }

    // HTML & navigation => Network First (get the newest index.html)
    if (event.request.mode === 'navigate') {
        event.respondWith(
            fetch(event.request)
                .then(response => {
                    caches.open(DYNAMIC_CACHE).then(cache => cache.put(event.request, response.clone()));
                    return response;
                })
                .catch(() => caches.match(event.request))
        );
        return;
    }

    // Other assets (CSS, JS, images) => Cache First
    event.respondWith(
        caches.match(event.request)
            .then(cacheRes => {
                return cacheRes || fetch(event.request).then(networkRes => {
                    caches.open(DYNAMIC_CACHE).then(cache => {
                        cache.put(event.request, networkRes.clone());
                    });
                    return networkRes;
                });
            })
    );
});
