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

export async function showRestNotification(name: string, test = false) {
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') throw new Error('Notification permission is not enabled.')
  const worker = await registerRestAlerts()
  await worker.showNotification(test ? 'Optimal Lifts alerts are ready' : 'Rest complete', {
    body: test ? 'This is your test notification.' : `Ready for your next ${name} set.`,
    icon: '/icon-192.png', tag: test ? 'optimal-lifts-test' : 'optimal-lifts-rest',
  })
}
