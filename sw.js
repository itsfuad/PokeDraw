const OFFLINE_VERSION = 355;
const CACHE_NAME = 'offline-draw';
const OFFLINE_URL = '/';

self.addEventListener('install', (event) => {
	event.waitUntil(
		(async () => {
			await caches.keys().then(cacheNames => {
				return Promise.all(
					cacheNames.map(cache => {
						if (cache !== CACHE_NAME+'-'+OFFLINE_VERSION) {
							console.log('%cService Worker: Clearing Old cache', 'color: blue;');
							return caches.delete(cache);
						}
					})
				);
			});
			const cache = await caches.open(CACHE_NAME+'-'+OFFLINE_VERSION);
			await cache.addAll([
				new Request(OFFLINE_URL, { cache: 'reload' }),
			]);
		})()
	);
	self.skipWaiting();
});

self.addEventListener('activate', (event) => {
	event.waitUntil(
		(async () => {
			if ('navigationPreload' in self.registration) {
				await self.registration.navigationPreload.enable();
			}
		})()
	);
	self.clients.claim();
});

self.addEventListener('fetch', (event) => {
	if (event.request.mode === 'navigate') {
		event.respondWith(
			(async () => {
				try {
					const preloadResponse = await event.preloadResponse;
					if (preloadResponse) {
						return preloadResponse;
					}
					const networkResponse = await fetch(event.request);
					return networkResponse;
				} catch (error) {
					console.log('%cFetch failed; returning offline page instead.', 'color: orangered;');
					const cache = await caches.open(CACHE_NAME+'-'+OFFLINE_VERSION);
					const cachedResponse = await cache.match(OFFLINE_URL);
					return cachedResponse;
				}
			})()
		);
	} else {
		event.respondWith(
			(async () => {
				const cache = await caches.open(CACHE_NAME+'-'+OFFLINE_VERSION);
				const cachedResponse = await cache.match(event.request);
				if (cachedResponse) {
					return cachedResponse;
				} else {
					const networkResponse = await fetch(event.request);
					cache.put(event.request, networkResponse.clone());
					return networkResponse;
				}
			})()
		);
	}
});
  

console.log('%cService Worker: Poketab Messenger is running', 'color: limegreen;');
