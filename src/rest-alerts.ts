let registration: Promise<ServiceWorkerRegistration> | undefined

export function registerRestAlerts() {
  if (!('serviceWorker' in navigator)) return Promise.reject(new Error('Notifications are unavailable in this browser.'))
  registration ??= navigator.serviceWorker.register('/sw.js', { scope: '/', updateViaCache: 'none' }).then(async () => {
    return navigator.serviceWorker.ready
  }).catch(error => { registration = undefined; throw error })
  return registration
}

export function isIPhoneBrowser() {
  return /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
}

export function isInstalledApp() {
  return window.matchMedia('(display-mode: standalone)').matches || Boolean((navigator as Navigator & { standalone?: boolean }).standalone)
}

/** Converts a base64url VAPID public key into the byte array the Push API expects. */
export function urlBase64ToUint8Array(base64: string) {
  const padded = (base64 + '='.repeat((4 - base64.length % 4) % 4)).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(padded)
  return Uint8Array.from(raw, char => char.charCodeAt(0))
}

export const pushSupported = () => typeof window !== 'undefined' && 'PushManager' in window && 'serviceWorker' in navigator && Boolean(import.meta.env.VITE_VAPID_PUBLIC_KEY)

/** Subscribes this device to push so rest alerts can arrive while the phone is locked. */
export async function subscribePush(): Promise<PushSubscriptionJSON | undefined> {
  if (!pushSupported() || typeof Notification === 'undefined' || Notification.permission !== 'granted') return undefined
  const worker = await registerRestAlerts()
  const existing = await worker.pushManager.getSubscription()
  const subscription = existing ?? await worker.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(import.meta.env.VITE_VAPID_PUBLIC_KEY) })
  return subscription.toJSON()
}

export async function showRestNotification(name: string, test = false) {
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') throw new Error('Notification permission is not enabled.')
  const worker = await registerRestAlerts()
  await worker.showNotification(test ? 'Optimal Lifts alerts are ready' : 'Rest complete', {
    body: test ? 'This is your test notification.' : `Ready for your next ${name} set.`,
    icon: '/icon-192.png', tag: test ? 'optimal-lifts-test' : 'optimal-lifts-rest',
  })
}
