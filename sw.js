// ==========================================
// Service Worker - メンテナンスマップ
// Version: 1.0.0
// ==========================================

const CACHE_NAME = 'maintenance-map-v1.0.0';
const OFFLINE_URL = 'index.html';

// キャッシュするファイル
const FILES_TO_CACHE = [
  './',
  'index.html',
  'help.html',
  'manifest.json'
];

// インストール時
self.addEventListener('install', event => {
  console.log('[SW] インストール開始');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] キャッシュ作成:', CACHE_NAME);
        return cache.addAll(FILES_TO_CACHE);
      })
      .then(() => {
        console.log('[SW] インストール完了');
        return self.skipWaiting();
      })
  );
});

// アクティベート時（古いキャッシュを削除）
self.addEventListener('activate', event => {
  console.log('[SW] アクティベート開始');
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheName !== CACHE_NAME) {
              console.log('[SW] 古いキャッシュ削除:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('[SW] アクティベート完了');
        return self.clients.claim();
      })
  );
});

// フェッチ時（ネットワーク優先、失敗したらキャッシュ）
self.addEventListener('fetch', event => {
  // Google Maps APIはキャッシュしない
  if (event.request.url.includes('googleapis.com') || 
      event.request.url.includes('maps.google.com') ||
      event.request.url.includes('cdnjs.cloudflare.com') ||
      event.request.url.includes('wikipedia.org')) {
    event.respondWith(fetch(event.request));
    return;
  }

  // GETリクエストのみキャッシュ対象
  if (event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then(response => {
        // 成功したらキャッシュを更新
        if (response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME)
            .then(cache => {
              cache.put(event.request, responseClone);
            });
        }
        return response;
      })
      .catch(() => {
        // オフライン時はキャッシュから返す
        return caches.match(event.request)
          .then(response => {
            if (response) {
              return response;
            }
            // キャッシュにもなければオフラインページ
            if (event.request.mode === 'navigate') {
              return caches.match(OFFLINE_URL);
            }
          });
      })
  );
});

console.log('[SW] Service Worker ロード完了');
