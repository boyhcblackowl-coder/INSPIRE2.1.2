const CACHE='inspire-v5-worker-1.0.0';
const SHELL=['./','./index.html','./styles.css','./app.js','./manifest.webmanifest','./icons/favicon-64.png','./icons/icon-180.png','./icons/icon-192.png','./icons/icon-512.png','./icons/icon-maskable-512.png'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
  const u=new URL(e.request.url);
  if(u.origin!==self.location.origin)return;
  if(u.pathname.endsWith('/config.js')||e.request.mode==='navigate'){
    e.respondWith(fetch(e.request).catch(()=>caches.match(e.request).then(r=>r||caches.match('./index.html'))));return;
  }
  e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request)));
});
