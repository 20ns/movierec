// Service Worker for Movie Recommendation App
// Provides offline functionality and performance caching

const CACHE_NAME = 'movierec-v1.2.0';
const STATIC_CACHE_NAME = 'movierec-static-v1.2.0';
const DYNAMIC_CACHE_NAME = 'movierec-dynamic-v1.2.0';

// Resources to cache immediately
const STATIC_ASSETS = [
  '/',
  '/static/css/main.css',
  '/static/js/main.js',
  '/manifest.json',
  '/offline.html'
];

// API endpoints to cache
const API_CACHE_PATTERNS = [
  /\/api\/movies/,
  /\/api\/recommendations/,
  /\/api\/blog/
];

// Image cache patterns
const IMAGE_CACHE_PATTERNS = [
  /\.(?:png|jpg|jpeg|svg|gif|webp|avif)$/,
  /https:\/\/image\.tmdb\.org/,
  /https:\/\/images\.unsplash\.com/
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[ServiceWorker] Install');
  
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME)
      .then((cache) => {
        console.log('[ServiceWorker] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('[ServiceWorker] Static assets cached successfully');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('[ServiceWorker] Failed to cache static assets:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[ServiceWorker] Activate');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE_NAME && 
                cacheName !== DYNAMIC_CACHE_NAME && 
                cacheName !== CACHE_NAME) {
              console.log('[ServiceWorker] Removing old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('[ServiceWorker] Cache cleanup completed');
        return self.clients.claim();
      })
  );
});

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }
  
  // Skip chrome-extension and other non-http(s) requests
  if (!url.protocol.startsWith('http')) {
    return;
  }

  event.respondWith(
    (async () => {
      try {
        // Strategy 1: Cache First for static assets
        if (isStaticAsset(request.url)) {
          return await cacheFirst(request, STATIC_CACHE_NAME);
        }
        
        // Strategy 2: Stale While Revalidate for API calls
        if (isApiRequest(request.url)) {
          return await staleWhileRevalidate(request, DYNAMIC_CACHE_NAME);
        }
        
        // Strategy 3: Cache First for images with fallback
        if (isImageRequest(request.url)) {
          return await cacheFirstWithFallback(request, DYNAMIC_CACHE_NAME);
        }
        
        // Strategy 4: Network First for everything else
        return await networkFirst(request, DYNAMIC_CACHE_NAME);
        
      } catch (error) {
        console.error('[ServiceWorker] Fetch error:', error);
        
        // Return offline page for navigation requests
        if (request.mode === 'navigate') {
          const cache = await caches.open(STATIC_CACHE_NAME);
          return await cache.match('/offline.html') || new Response('Offline');
        }
        
        return new Response('Network error', { status: 408 });
      }
    })()
  );
});

// Caching Strategies

async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cachedResponse = await cache.match(request);
  
  if (cachedResponse) {
    return cachedResponse;
  }
  
  const networkResponse = await fetch(request);
  if (networkResponse.ok) {
    cache.put(request, networkResponse.clone());
  }
  
  return networkResponse;
}

async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    throw error;
  }
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cachedResponse = await cache.match(request);
  
  const fetchPromise = fetch(request)
    .then((networkResponse) => {
      if (networkResponse.ok) {
        cache.put(request, networkResponse.clone());
      }
      return networkResponse;
    })
    .catch(() => cachedResponse);
  
  return cachedResponse || await fetchPromise;
}

async function cacheFirstWithFallback(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cachedResponse = await cache.match(request);
  
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
      return networkResponse;
    }
  } catch (error) {
    console.warn('[ServiceWorker] Network fetch failed:', error);
  }
  
  // Return a placeholder image for failed image requests
  if (isImageRequest(request.url)) {
    return new Response(
      '<svg width="200" height="200" xmlns="http://www.w3.org/2000/svg"><rect width="200" height="200" fill="#f0f0f0"/><text x="50%" y="50%" text-anchor="middle" dy=".3em" fill="#999">Image unavailable</text></svg>',
      { headers: { 'Content-Type': 'image/svg+xml' } }
    );
  }
  
  throw new Error('Resource not available');
}

// Helper functions

function isStaticAsset(url) {
  return url.includes('/static/') || 
         url.endsWith('.css') || 
         url.endsWith('.js') ||
         url.endsWith('.woff') ||
         url.endsWith('.woff2');
}

function isApiRequest(url) {
  return API_CACHE_PATTERNS.some(pattern => pattern.test(url));
}

function isImageRequest(url) {
  return IMAGE_CACHE_PATTERNS.some(pattern => pattern.test(url));
}

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  console.log('[ServiceWorker] Background sync:', event.tag);
  
  if (event.tag === 'background-sync') {
    event.waitUntil(
      // Handle any offline actions that need to be synced
      syncOfflineActions()
    );
  }
});

async function syncOfflineActions() {
  // Implementation for syncing offline user actions
  console.log('[ServiceWorker] Syncing offline actions');
}

// Push notifications (if needed in the future)
self.addEventListener('push', (event) => {
  console.log('[ServiceWorker] Push message received');
  
  const options = {
    body: event.data ? event.data.text() : 'New movie recommendations available!',
    icon: '/icon-192x192.png',
    badge: '/badge-72x72.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: 'View Recommendations',
        icon: '/icon-explore.png'
      },
      {
        action: 'close',
        title: 'Close',
        icon: '/icon-close.png'
      }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification('Movie Recommendations', options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('[ServiceWorker] Notification click received');
  
  event.notification.close();
  
  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/recommendations')
    );
  }
});
