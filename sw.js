const CACHE_NAME = 'comicvault-v10';
const ASSETS = [
  './',
  './index.html',
  './css/style.css',
  './css/components.css',
  './js/app.js',
  './js/auth.js',
  './js/db.js',
  './js/firebase-config.js',
  './js/utils.js',
  './js/components/autocomplete.js',
  './js/components/star-rating.js',
  './js/services/importExportService.js',
  './js/services/statsService.js',
  './js/views/budget.js',
  './js/views/aiInsights.js',
  './js/views/changelog.js',
  './js/views/collection.js',
  './js/views/form.js',
  './js/views/form/templates.js',
  './js/views/import.js',
  './js/views/settings.js',
  './js/views/stats.js',
  './js/views/wishlist.js',
  './js/views/collection/templates.js',
  './js/views/collection/columnManager.js',
  './js/views/collection/fieldConfig.js',
  './js/views/collection/bulkActions.js',
  './favicon.png',
  './comicvault_logo.png'
];

// Install Event - cache assets
self.addEventListener('install', (e) => {
    e.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS);
        }).then(() => self.skipWaiting())
    );
});

// Activate Event - clean old caches
self.addEventListener('activate', (e) => {
    e.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.map((key) => {
                    if (key !== CACHE_NAME) {
                        return caches.delete(key);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

// Fetch Event - Network First with Cache Fallback for dynamic, Cache-First for static
self.addEventListener('fetch', (e) => {
    // Exclude local/development domains and IPs from caching to prevent stale assets during development
    const isLocal = e.request.url.includes('localhost') || 
                    e.request.url.includes('127.0.0.1') || 
                    e.request.url.includes('192.168.') || 
                    e.request.url.includes('10.') ||
                    e.request.url.includes('.local');
    if (isLocal) {
        return;
    }

    // Exclude Firebase SDK and API requests from cache
    if (e.request.url.includes('firebase') || e.request.url.includes('firestore') || e.request.url.includes('google')) {
        return;
    }
    
    // Exclude test suite files from cache to prevent stale test runner code during development
    if (e.request.url.includes('tests.html') || e.request.url.includes('/tests/') || e.request.url.includes('.test.js')) {
        return;
    }
    
    e.respondWith(
        caches.match(e.request).then((cachedResponse) => {
            if (cachedResponse) {
                // Return cached version immediately, update cache in background
                fetch(e.request).then((networkResponse) => {
                    if (networkResponse.status === 200) {
                        caches.open(CACHE_NAME).then((cache) => cache.put(e.request, networkResponse));
                    }
                }).catch(() => {/* Ignore network errors offline */});
                
                return cachedResponse;
            }
            
            return fetch(e.request).then((networkResponse) => {
                // Cache dynamic fetched resources if successful
                if (networkResponse.status === 200 && e.request.method === 'GET') {
                    const responseClone = networkResponse.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put(e.request, responseClone));
                }
                return networkResponse;
            });
        })
    );
});
