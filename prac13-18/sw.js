const STATIC_CACHE = 'notes-static-v6';
const DYNAMIC_CACHE = 'notes-dynamic-v6';

const APP_SHELL = [
    '/',
    '/index.html',
    '/app.js',
    '/manifest.json',
    '/styles/chota.min.css',
    '/content/home.html',
    '/content/about.html',
    '/icons/icon-32.png',
    '/icons/icon-192.png',
    '/icons/icon-512.png'
];

// Если потом добавишь иконки с такими именами — просто раскомментируй:

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(STATIC_CACHE).then((cache) => cache.addAll(APP_SHELL))
    );

    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        (async () => {
            const keys = await caches.keys();

            await Promise.all(
                keys.map((key) => {
                    if (key !== STATIC_CACHE && key !== DYNAMIC_CACHE) {
                        return caches.delete(key);
                    }
                })
            );

            await self.clients.claim();
        })()
    );
});

self.addEventListener('fetch', (event) => {
    const { request } = event;

    if (request.method !== 'GET') {
        return;
    }

    const url = new URL(request.url);

    // Не вмешиваемся в socket.io и прочие служебные запросы
    if (url.pathname.startsWith('/socket.io/')) {
        return;
    }

    // Network First для динамического контента App Shell
    if (url.pathname.startsWith('/content/')) {
        event.respondWith(networkFirst(request));
        return;
    }

    // Cache First для остальной статики
    event.respondWith(cacheFirst(request));
});

async function networkFirst(request) {
    try {
        const freshResponse = await fetch(request);

        const cache = await caches.open(DYNAMIC_CACHE);
        cache.put(request, freshResponse.clone());

        return freshResponse;
    } catch (error) {
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }

        const fallback = await caches.match('/content/home.html');
        if (fallback) {
            return fallback;
        }

        return new Response('<h1>Офлайн</h1><p>Страница недоступна без сети.</p>', {
            headers: { 'Content-Type': 'text/html; charset=utf-8' }
        });
    }
}

async function cacheFirst(request) {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
        return cachedResponse;
    }

    try {
        const freshResponse = await fetch(request);

        // Кэшируем только успешные базовые запросы
        if (freshResponse && freshResponse.status === 200 && freshResponse.type === 'basic') {
            const cache = await caches.open(DYNAMIC_CACHE);
            cache.put(request, freshResponse.clone());
        }

        return freshResponse;
    } catch (error) {
        if (
            request.mode === 'navigate' ||
            request.destination === 'document'
        ) {
            const fallback = await caches.match('/index.html');
            if (fallback) {
                return fallback;
            }
        }

        return new Response('Ресурс недоступен в офлайн-режиме.', {
            status: 503,
            headers: { 'Content-Type': 'text/plain; charset=utf-8' }
        });
    }
}

self.addEventListener('push', (event) => {
    let data = {
        title: 'Новое уведомление',
        body: 'У вас новое сообщение',
        reminderId: null,
        noteText: ''
    };

    try {
        if (event.data) {
            const parsed = event.data.json();
            data = {
                title: parsed.title || data.title,
                body: parsed.body || data.body,
                reminderId: parsed.reminderId || null,
                noteText: parsed.body || ''
            };
        }
    } catch (error) {
        console.error('Push parse error:', error);
    }

    const options = {
        body: data.body,
        icon: '/icons/icon-192.png',
        badge: '/icons/icon-32.png',
        data: {
            reminderId: data.reminderId,
            noteText: data.noteText
        },
        actions: data.reminderId
            ? [
                {
                    action: 'snooze',
                    title: 'Отложить на 5 минут'
                },
                {
                    action: 'snooze15',
                    title: 'Отложить на 15 минут'
                }
            ]
            : []
    };

    event.waitUntil(
        self.registration.showNotification(data.title, options)
    );
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    if (event.action === 'snooze' || event.action === 'snooze15') {
        const { reminderId, noteText } = event.notification.data || {};

        const snoozeMinutes = event.action === 'snooze15' ? 15 : 5;

        event.waitUntil(
            (async () => {
                try {
                    await fetch('/snooze', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            reminderId,
                            noteText,
                            snoozeMinutes
                        })
                    });

                    const allClients = await clients.matchAll({
                        type: 'window',
                        includeUncontrolled: true
                    });

                    allClients.forEach((client) => {
                        client.postMessage({
                            type: 'reminderSnoozed',
                            reminderId,
                            snoozeMinutes
                        });
                    });
                } catch (error) {
                    console.error('Snooze request failed:', error);
                }
            })()
        );

        return;
    }

    event.waitUntil(
        (async () => {
            const allClients = await clients.matchAll({
                type: 'window',
                includeUncontrolled: true
            });

            for (const client of allClients) {
                if ('focus' in client) {
                    await client.focus();
                    return;
                }
            }

            if (clients.openWindow) {
                await clients.openWindow('/');
            }
        })()
    );
});
