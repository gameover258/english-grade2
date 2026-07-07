/**
 * Service Worker — 离线缓存
 * Cache First: 课本页面图片（不常变）
 * Stale While Revalidate: JS/CSS/HTML（代码更新时后台刷新）
 */
const CACHE_STATIC = 'textbook-v3-static';
const CACHE_PAGES = 'textbook-v3-pages';

const STATIC_FILES = [
  '/学习机/',
  '/学习机/index.html',
  '/学习机/css/style.css',
  '/学习机/css/components.css',
  '/学习机/js/config.js',
  '/学习机/js/audio-player.js',
  '/学习机/js/pdf-viewer.js',
  '/学习机/js/video-player.js',
  '/学习机/js/app.js',
  '/学习机/data/words.json'
];

// 安装：预缓存静态资源
self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(CACHE_STATIC).then(function(cache) {
      return cache.addAll(STATIC_FILES);
    })
  );
  self.skipWaiting();
});

// 激活：清理旧缓存
self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(k) { return k !== CACHE_STATIC && k !== CACHE_PAGES; })
          .map(function(k) { return caches.delete(k); })
      );
    })
  );
  self.clients.claim();
});

// 请求拦截
self.addEventListener('fetch', function(e) {
  var url = new URL(e.request.url);

  // 课本页面图片：Cache First
  if (url.pathname.indexOf('/pages/p') !== -1 && url.pathname.endsWith('.jpg')) {
    e.respondWith(
      caches.open(CACHE_PAGES).then(function(cache) {
        return cache.match(e.request).then(function(cached) {
          if (cached) return cached;
          return fetch(e.request).then(function(response) {
            cache.put(e.request, response.clone());
            return response;
          });
        });
      })
    );
    return;
  }

  // JS/CSS/HTML：Stale While Revalidate
  if (/\.(js|css|html|json)(\?|$)/.test(url.pathname)) {
    e.respondWith(
      caches.open(CACHE_STATIC).then(function(cache) {
        return cache.match(e.request).then(function(cached) {
          var fetchPromise = fetch(e.request).then(function(response) {
            cache.put(e.request, response.clone());
            return response;
          }).catch(function() {});
          return cached || fetchPromise;
        });
      })
    );
    return;
  }

  // 媒体文件（音频/视频）：Network First，失败再读缓存
  if (/\.(mp3|mp4)(\?|$)/i.test(url.pathname)) {
    e.respondWith(
      fetch(e.request).then(function(response) {
        var clone = response.clone();
        caches.open(CACHE_PAGES).then(function(cache) { cache.put(e.request, clone); });
        return response;
      }).catch(function() {
        return caches.match(e.request);
      })
    );
    return;
  }
});
