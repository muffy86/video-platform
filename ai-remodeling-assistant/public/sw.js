// Service Worker for AI Remodeling Assistant
// Provides offline functionality and caching for better mobile performance

const CACHE_NAME = 'ai-remodeling-assistant-v1';
const STATIC_CACHE = 'static-v1';
const DYNAMIC_CACHE = 'dynamic-v1';

// Files to cache for offline functionality
const STATIC_FILES = [
  '/',
  '/index.html',
  '/manifest.json',
  '/vite.svg',
  // Core app files will be added dynamically
];

// API endpoints to cache (with TTL)
const API_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Install event - cache static files
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('Caching static files');
        return cache.addAll(STATIC_FILES);
      })
      .then(() => {
        return self.skipWaiting();
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
              console.log('Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        return self.clients.claim();
      })
  );
});

// Fetch event - implement caching strategy
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip cross-origin requests and non-GET requests
  if (!url.origin.includes(self.location.origin) || request.method !== 'GET') {
    return;
  }

  // Handle different types of requests with appropriate caching strategies
  if (isStaticAsset(request)) {
    // Cache first for static assets
    event.respondWith(cacheFirst(request));
  } else if (isAPIRequest(request)) {
    // Network first with cache fallback for API requests
    event.respondWith(networkFirstWithTimeout(request));
  } else if (isImageRequest(request)) {
    // Cache first for images with network fallback
    event.respondWith(cacheFirstWithNetworkFallback(request));
  } else {
    // Network first for HTML pages
    event.respondWith(networkFirst(request));
  }
});

// Caching strategies
async function cacheFirst(request) {
  try {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.error('Cache first failed:', error);
    return new Response('Offline content not available', { status: 503 });
  }
}

async function networkFirst(request) {
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('Network failed, trying cache:', request.url);
    const cachedResponse = await caches.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return offline page for navigation requests
    if (request.mode === 'navigate') {
      return caches.match('/offline.html') || 
             new Response('You are offline', { status: 503 });
    }
    
    return new Response('Content not available offline', { status: 503 });
  }
}

async function networkFirstWithTimeout(request, timeout = 3000) {
  try {
    // Race between network request and timeout
    const networkPromise = fetch(request);
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Network timeout')), timeout);
    });
    
    const networkResponse = await Promise.race([networkPromise, timeoutPromise]);
    
    if (networkResponse.ok) {
      // Cache successful API responses with timestamp
      const cache = await caches.open(DYNAMIC_CACHE);
      const responseWithTimestamp = new Response(networkResponse.body, {
        ...networkResponse,
        headers: {
          ...networkResponse.headers,
          'sw-cached-at': Date.now().toString()
        }
      });
      cache.put(request, responseWithTimestamp.clone());
      return networkResponse;
    }
    
    throw new Error('Network response not ok');
  } catch (error) {
    console.log('Network failed for API request, checking cache:', request.url);
    
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      // Check if cached response is still fresh
      const cachedAt = cachedResponse.headers.get('sw-cached-at');
      if (cachedAt && (Date.now() - parseInt(cachedAt)) < API_CACHE_TTL) {
        return cachedResponse;
      }
    }
    
    return new Response(JSON.stringify({
      error: 'Service temporarily unavailable',
      offline: true,
      message: 'Please check your internet connection'
    }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

async function cacheFirstWithNetworkFallback(request) {
  try {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      // Fetch fresh version in background
      fetch(request).then(response => {
        if (response.ok) {
          const cache = caches.open(DYNAMIC_CACHE);
          cache.then(c => c.put(request, response));
        }
      }).catch(() => {
        // Ignore background fetch errors
      });
      
      return cachedResponse;
    }
    
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    return new Response('Image not available offline', { status: 503 });
  }
}

// Helper functions
function isStaticAsset(request) {
  const url = new URL(request.url);
  return url.pathname.match(/\.(js|css|woff2?|ttf|eot|ico|svg)$/);
}

function isAPIRequest(request) {
  const url = new URL(request.url);
  return url.pathname.startsWith('/api/') || 
         url.origin.includes('openrouter.ai') ||
         url.origin.includes('api.openai.com');
}

function isImageRequest(request) {
  const url = new URL(request.url);
  return url.pathname.match(/\.(jpg|jpeg|png|gif|webp|avif)$/);
}

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  console.log('Background sync triggered:', event.tag);
  
  if (event.tag === 'background-upload') {
    event.waitUntil(handleBackgroundUpload());
  }
});

async function handleBackgroundUpload() {
  // Handle background upload of captured images when online
  try {
    const cache = await caches.open('pending-uploads');
    const requests = await cache.keys();
    
    for (const request of requests) {
      try {
        const response = await cache.match(request);
        const data = await response.json();
        
        // Attempt to upload
        await fetch('/api/upload', {
          method: 'POST',
          body: JSON.stringify(data),
          headers: { 'Content-Type': 'application/json' }
        });
        
        // Remove from pending cache if successful
        await cache.delete(request);
      } catch (error) {
        console.log('Background upload failed for request:', request.url);
      }
    }
  } catch (error) {
    console.error('Background sync failed:', error);
  }
}

// Push notification handling (for future features)
self.addEventListener('push', (event) => {
  console.log('Push notification received');
  
  const options = {
    body: event.data ? event.data.text() : 'New update available',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: 'Open App',
        icon: '/icons/checkmark.png'
      },
      {
        action: 'close',
        title: 'Close',
        icon: '/icons/xmark.png'
      }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification('AI Remodeling Assistant', options)
  );
});

// Notification click handling
self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event);
  event.notification.close();
  
  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

// Message handling from main thread
self.addEventListener('message', (event) => {
  console.log('Service Worker received message:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  // Send response back to main thread
  event.ports[0].postMessage({
    type: 'SW_RESPONSE',
    success: true
  });
});