// ============================================
// メンテナンスマップ v2.0 - sw.js
// Service Worker（PWAオフライン対応）
// v2.0新規作成
// ============================================

const CACHE_NAME = 'maintenance-map-v2.1.0';
const urlsToCache = [
    './',
    './index.html',
    './styles.css',
    './data-storage.js',
    './csv-handler.js',
    './map-core.js',
    './route-manager.js',
    './ui-actions.js',
    './expense-styles.css',
    './expense-form.js',
    './expense-pdf.js',
    './manifest.json'
];

// v2.0 - インストール
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => cache.addAll(urlsToCache))
            .then(() => self.skipWaiting())
    );
});

// v2.0 - アクティベート（古いキャッシュ削除）
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.filter(name => name !== CACHE_NAME)
                    .map(name => caches.delete(name))
            );
        }).then(() => self.clients.claim())
    );
});

// v2.0 - フェッチ（ネットワーク優先、フォールバックでキャッシュ）
self.addEventListener('fetch', (event) => {
    // v2.0 - Google Maps APIなど外部リソースはキャッシュしない
    if (event.request.url.includes('googleapis.com') ||
        event.request.url.includes('gstatic.com') ||
        event.request.url.includes('cdnjs.cloudflare.com')) {
        event.respondWith(fetch(event.request));
        return;
    }

    event.respondWith(
        fetch(event.request)
            .then((response) => {
                const responseClone = response.clone();
                caches.open(CACHE_NAME).then((cache) => {
                    cache.put(event.request, responseClone);
                });
                return response;
            })
            .catch(() => caches.match(event.request))
    );
});
