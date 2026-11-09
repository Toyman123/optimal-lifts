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
// Rest-complete alerts scheduled on the server, so they arrive while the phone is locked.
// Same tag as the in-app notification, so the two collapse into one when the app is open.
self.addEventListener('push', event => {
  let data = {}
  try { data = event.data ? event.data.json() : {} } catch { data = { body: event.data && event.data.text() } }
  event.waitUntil(self.registration.showNotification(data.title || 'Rest complete', {
    body: data.body || 'Ready for your next set.', icon: '/icon-192.png', badge: '/icon-192.png', tag: 'optimal-lifts-rest', renotify: true,
  }))
})
