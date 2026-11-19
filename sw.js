/* 国学经典共读 · Service Worker
   策略：外壳预缓存；页面与数据网络优先（改版即时可见）；静态资源缓存优先 + 后台更新 */
var VERSION = 'guoxue-v13';

var SHELL = [
  '/',
  '/favicon.svg',
  '/manifest.webmanifest',
  '/shared/reader.css',
  '/shared/palette.css',
  '/shared/appearance.js',
  '/shared/reader.js',
  '/books.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/apple-touch-icon.png'
];

function precache(cache, urls) {
  // 逐个加入，单个失败不阻断整体安装
  return Promise.all(urls.map(function (u) {
    return cache.add(new Request(u, { cache: 'reload' })).catch(function () {});
  }));
}

self.addEventListener('install', function (e) {
  e.waitUntil(
    caches.open(VERSION).then(function (c) {
      return precache(c, SHELL).then(function () {
        // 书目从 books.json 读取，新增书籍无需改本文件
        return fetch('/books.json', { cache: 'reload' })
          .then(function (r) { return r.json(); })
          .then(function (books) {
            var urls = [];
            books.forEach(function (b) {
              urls.push('/' + b.key + '/', '/' + b.key + '/data.json', '/' + b.key + '/study.html');
            });
            return precache(c, urls);
          })
          .catch(function () {});
      });
    }).then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) {
        if (k !== VERSION) return caches.delete(k);
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

function netFirst(req, fallback) {
  return fetch(req).then(function (res) {
    if (res && res.ok && res.status === 200) {
      var copy = res.clone();
      caches.open(VERSION).then(function (c) { c.put(req, copy); });
    }
    return res;
  }).catch(function () {
    return caches.match(req).then(function (hit) {
      return hit || (fallback ? fallback() : Response.error());
    });
  });
}

function staleWhileRevalidate(req) {
  return caches.match(req).then(function (hit) {
    var net = fetch(req).then(function (res) {
      if (res && res.ok) {
        var copy = res.clone();
        caches.open(VERSION).then(function (c) { c.put(req, copy); });
      }
      return res;
    }).catch(function () { return null; });
    return hit || net.then(function (r) { return r || Response.error(); });
  });
}

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;

  var url;
  try { url = new URL(req.url); } catch (err) { return; }
  if (url.origin !== self.location.origin) return;

  // 页面导航：网络优先，断网时回退同地址缓存，再退回首页
  if (req.mode === 'navigate') {
    e.respondWith(netFirst(req, function () { return caches.match('/'); }));
    return;
  }

  // 数据与研读页：网络优先，保证勘误 / 新增章节即时可见
  if (/\.json$/.test(url.pathname) || /study\.html$/.test(url.pathname)) {
    e.respondWith(netFirst(req));
    return;
  }

  // 样式与脚本：网络优先（避免改版后旧 CSS 与新 DOM 错配），断网回退缓存
  if (/^\/shared\//.test(url.pathname)) {
    e.respondWith(netFirst(new Request(req, { cache: 'reload' })));
    return;
  }

  // 图标类：缓存优先，后台静默更新
  if (/^\/icons\//.test(url.pathname) || /favicon\.svg$/.test(url.pathname) || /\.webmanifest$/.test(url.pathname)) {
    e.respondWith(staleWhileRevalidate(req));
  }
});
