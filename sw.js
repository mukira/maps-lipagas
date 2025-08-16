
self.addEventListener('install', e => self.skipWaiting());
self.addEventListener('activate', e => console.log('SW Ready'));
self.addEventListener('fetch', e => e.respondWith(fetch(e.request)));
