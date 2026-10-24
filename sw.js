/* Stofftrainer Service Worker – alles vorab cachen, danach offline (Version wird vom Deploy-Skript hochgezählt) */
const VERSION = "st-3";
const FILES = ["./", "./index.html", "./gen.js", "./manifest.webmanifest",
  "./pdf.min.js", "./pdf.worker.min.js", "./tesseract.min.js", "./worker.min.js",
  "./tesseract-core-simd-lstm.wasm.js", "./tesseract-core-lstm.wasm.js",
  "./deu.traineddata.gz", "./eng.traineddata.gz",
  "./icon-180.png", "./icon-192.png", "./icon-512.png"];
self.addEventListener("install", e => { e.waitUntil(caches.open(VERSION).then(c => c.addAll(FILES)).then(() => self.skipWaiting())); });
self.addEventListener("activate", e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  e.respondWith(caches.match(e.request, {ignoreSearch: true}).then(r => r || fetch(e.request).then(res => { const copy = res.clone(); caches.open(VERSION).then(c => c.put(e.request, copy)); return res; })));
});
