const CACHE_NAME = 'taxi-ledger-v1';
const ASSETS = [
  './',
  './index.html',
  './app.js',
  './db.js',
  './driveSync.js',
  './manifest.webmanifest',
  './sw.js'
];

// Εγκατάσταση και αποθήκευση αρχείων στην προσωρινή μνήμη (Cache)
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
});

// Ενεργοποίηση και καθαρισμός παλιάς μνήμης
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
      );
    })
  );
});

// Στρατηγική: Προτεραιότητα στο Δίκτυο, αν αποτύχει πάρε από την Cache
self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request).catch(() => {
      return caches.match(event.request);
    })
  );
});
