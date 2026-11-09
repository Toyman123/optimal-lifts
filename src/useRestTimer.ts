import { useEffect, useRef, useState } from 'react'
import { isIPhoneBrowser, isInstalledApp, pushSupported, registerRestAlerts, showRestNotification, subscribePush } from './rest-alerts'
import { cancelRestPush, scheduleRestPush } from './cloud'
import { remainingRestSeconds } from './timer'

export type RestTimer = { id: string; exerciseId: string; name: string; duration: number; remaining: number; running: boolean; endAt?: number; alerted?: boolean }
const TIMER_KEY = 'optimal-lifts-active-rest'
const ALERTS_KEY = 'optimal-lifts-rest-alerts'

function loadTimer(): RestTimer | null {
  try {
    const value = JSON.parse(localStorage.getItem(TIMER_KEY) || 'null') as RestTimer | null
    if (!value || typeof value.id !== 'string' || typeof value.name !== 'string' || !Number.isFinite(value.remaining) || !Number.isFinite(value.duration)) return null
    if (value.running && Number.isFinite(value.endAt)) {
      const remaining = remainingRestSeconds(value.endAt!)
      return { ...value, remaining, running: remaining > 0 }
    }
    return value.running ? null : value
  } catch { return null }
}

export function useRestTimer(toast: (message: string) => void) {
  const [timer, setTimer] = useState<RestTimer | null>(loadTimer)
  const [restAlertsEnabled, setRestAlertsEnabled] = useState(() => localStorage.getItem(ALERTS_KEY) === 'true')
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission | 'unsupported'>(() => typeof Notification === 'undefined' ? 'unsupported' : Notification.permission)
  const [alertMessage, setAlertMessage] = useState('')
  const audio = useRef<AudioContext | null>(null)
  const notified = useRef<string | undefined>(undefined)
  const scheduledPush = useRef<string | undefined>(undefined)

  const unlockAudio = () => {
    if (!restAlertsEnabled) return
    const ctor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (ctor) { audio.current ??= new ctor(); void audio.current.resume().catch(() => undefined) }
  }
  useEffect(() => {
    window.addEventListener('pointerdown', unlockAudio)
    window.addEventListener('keydown', unlockAudio)
    return () => { window.removeEventListener('pointerdown', unlockAudio); window.removeEventListener('keydown', unlockAudio) }
  }, [restAlertsEnabled])

  useEffect(() => {
    if (timer) localStorage.setItem(TIMER_KEY, JSON.stringify(timer))
    else localStorage.removeItem(TIMER_KEY)
  }, [timer])
  useEffect(() => {
    if (!timer?.running || !timer.endAt) return
    const tick = () => setTimer(current => {
      if (!current?.running || !current.endAt) return current
      const remaining = remainingRestSeconds(current.endAt)
      return remaining === current.remaining ? current : { ...current, remaining, running: remaining > 0 }
    })
    tick()
    const interval = window.setInterval(tick, 250)
    document.addEventListener('visibilitychange', tick)
    window.addEventListener('pageshow', tick)
    return () => { window.clearInterval(interval); document.removeEventListener('visibilitychange', tick); window.removeEventListener('pageshow', tick) }
  }, [timer?.running, timer?.endAt])

  const playChime = () => {
    navigator.vibrate?.([160, 80, 160])
    const context = audio.current
    if (!context) return
    void context.resume().then(() => {
      const now = context.currentTime
      ;[0, .18].forEach((offset, index) => {
        const oscillator = context.createOscillator(), gain = context.createGain()
        oscillator.frequency.value = index ? 740 : 560
        gain.gain.setValueAtTime(.0001, now + offset)
        gain.gain.exponentialRampToValueAtTime(.16, now + offset + .015)
        gain.gain.exponentialRampToValueAtTime(.0001, now + offset + .14)
        oscillator.connect(gain); gain.connect(context.destination)
        oscillator.start(now + offset); oscillator.stop(now + offset + .15)
      })
    }).catch(() => undefined)
  }
  useEffect(() => {
    if (!timer || timer.remaining !== 0 || timer.alerted || notified.current === timer.id) return
    notified.current = timer.id
    setTimer(current => current?.id === timer.id ? { ...current, alerted: true } : current)
    if (!restAlertsEnabled) return
    playChime()
    toast(`Rest complete — ready for your next ${timer.name} set`)
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      void showRestNotification(timer.name).catch(error => setAlertMessage(error instanceof Error ? error.message : 'Notification failed. Try Test alert.'))
    }
  }, [timer?.id, timer?.remaining, restAlertsEnabled])

  // Hand each running timer to the server so the alert arrives even when the phone is locked.
  useEffect(() => {
    const canPush = restAlertsEnabled && pushSupported() && typeof Notification !== 'undefined' && Notification.permission === 'granted'
    if (canPush && timer?.running && timer.endAt && timer.endAt - Date.now() > 3000) {
      const key = `${timer.id}:${timer.endAt}`
      if (scheduledPush.current === key) return
      scheduledPush.current = key
      const { id, name, endAt } = timer
      void subscribePush().then(subscription => subscription && scheduleRestPush({ id, name, endAt }, subscription)).catch(error => console.warn('Locked-screen rest alert unavailable', error))
      return
    }
    // Paused, cancelled or alerts turned off: drop the pending push. A timer that simply ran out keeps it.
    if (scheduledPush.current && (!timer || (!timer.running && timer.remaining > 0) || !restAlertsEnabled)) {
      scheduledPush.current = undefined
      void cancelRestPush().catch(() => undefined)
    }
  }, [timer?.id, timer?.running, timer?.endAt, timer?.remaining === 0, restAlertsEnabled])

  const enableRestAlerts = async () => {
    setRestAlertsEnabled(true); localStorage.setItem(ALERTS_KEY, 'true')
    // Keep the permission request in the button gesture; an awaited audio resume loses it on iOS.
    const permissionRequest = typeof Notification !== 'undefined' && Notification.permission === 'default'
      ? Notification.requestPermission() : Promise.resolve(typeof Notification === 'undefined' ? 'unsupported' as const : Notification.permission)
    const ctor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (ctor) { audio.current ??= new ctor(); void audio.current.resume().catch(() => undefined) }
    try {
      const permission = await permissionRequest
      setNotificationPermission(permission)
      if (permission === 'granted') {
        await registerRestAlerts()
        await showRestNotification('', true)
        const subscribed = await subscribePush().catch(() => undefined)
        setAlertMessage(subscribed ? 'Notifications enabled. Rest alerts arrive even when your phone is locked.' : 'Notifications enabled. Keep the app on screen for on-time alerts.')
        toast('Test notification sent')
      } else {
        const message = isIPhoneBrowser() && !isInstalledApp()
          ? 'Open Optimal Lifts from its Home Screen icon, then enable alerts.'
          : permission === 'denied' ? 'Allow notifications for Optimal Lifts in your phone settings, then try again.'
          : 'Sound alerts enabled. This browser does not support notifications.'
        setAlertMessage(message); toast(message)
      }
    } catch (error) { const message = error instanceof Error ? error.message : 'Could not enable notifications.'; setAlertMessage(message); toast(message) }
  }
  const disableRestAlerts = () => { setRestAlertsEnabled(false); localStorage.removeItem(ALERTS_KEY); setAlertMessage(''); toast('Rest alerts turned off') }
  const testRestAlert = async () => {
    unlockAudio(); playChime()
    try { await showRestNotification('', true); toast('Test notification sent') }
    catch (error) { const message = error instanceof Error ? error.message : 'Notification failed.'; setAlertMessage(message); toast(message) }
  }
  return { timer, setTimer, restAlertsEnabled, notificationPermission, alertMessage, enableRestAlerts, disableRestAlerts, testRestAlert }
}

export type RestControls = ReturnType<typeof useRestTimer>
