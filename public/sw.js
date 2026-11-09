// Notifications only: deliberately leave workout data and network requests uncached.
self.addEventListener('install', event => event.waitUntil(self.skipWaiting()))
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()))
self.addEventListener('notificationclick', event => {
  event.notification.close()
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    const app = windows.find(client => new URL(client.url).origin === self.location.origin)
    if (app) return app.focus()
    return self.clients.openWindow('/')
  })())
})
