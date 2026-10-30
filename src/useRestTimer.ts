import { useEffect, useRef, useState } from 'react'
import { remainingRestSeconds } from './timer'

export type RestTimer = { id: string; workoutKey: string; exerciseId: string; name: string; duration: number; remaining: number; running: boolean; endAt?: number; notified?: boolean }
const KEY = 'optimal-lifts:rest-timer'
const ALERTS = 'optimal-lifts-rest-alerts'

export function reconcileTimer(timer: RestTimer, now = Date.now()): RestTimer {
  if (!timer.running || !timer.endAt) return timer
  const remaining = remainingRestSeconds(timer.endAt, now)
  return { ...timer, remaining, running: remaining > 0 }
}

export function readTimer(): RestTimer | null {
  try {
    const value = JSON.parse(localStorage.getItem(KEY) ?? 'null') as RestTimer | null
    if (!value || typeof value.id !== 'string' || typeof value.workoutKey !== 'string' || !Number.isFinite(value.remaining) || value.remaining < 0 || value.remaining > 600 || (value.running && !Number.isFinite(value.endAt))) return null
    return reconcileTimer(value)
  } catch { return null }
}

export function useRestTimer(activeKeys: string[]) {
  const [timer, setTimer] = useState<RestTimer | null>(readTimer)
  const [now, setNow] = useState(Date.now)
  const [alerts, setAlerts] = useState(() => localStorage.getItem(ALERTS) === 'true')
  const audio = useRef<AudioContext | null>(null)
  const timerRef = useRef(timer)
  timerRef.current = timer
  const update = (next: RestTimer | null) => {
    timerRef.current = next
    if (next) localStorage.setItem(KEY, JSON.stringify(next)); else localStorage.removeItem(KEY)
    setTimer(next)
  }
  useEffect(() => {
    const tick = () => {
      setNow(Date.now())
      const current = timerRef.current
      if (!current?.running) return
      const next = reconcileTimer(current)
      if (next.remaining !== current.remaining || next.running !== current.running) update(next)
    }
    const interval = window.setInterval(tick, 250)
    document.addEventListener('visibilitychange', tick)
    window.addEventListener('pageshow', tick)
    window.addEventListener('focus', tick)
    tick()
    return () => { clearInterval(interval); document.removeEventListener('visibilitychange', tick); window.removeEventListener('pageshow', tick); window.removeEventListener('focus', tick) }
  }, [])
  const keyList = activeKeys.join('|')
  useEffect(() => { if (timerRef.current && !activeKeys.includes(timerRef.current.workoutKey)) update(null) }, [keyList])
  useEffect(() => {
    if (!timer || timer.remaining !== 0 || timer.notified) return
    update({ ...timer, notified: true })
    if (!alerts) return
    navigator.vibrate?.([160, 80, 160])
    if (audio.current) {
      const context = audio.current
      void context.resume().then(() => {
        const oscillator = context.createOscillator(), gain = context.createGain()
        oscillator.frequency.value = 740; gain.gain.value = .12
        oscillator.connect(gain); gain.connect(context.destination); oscillator.start(); oscillator.stop(context.currentTime + .18)
      }).catch(() => undefined)
    }
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted' && document.visibilityState !== 'visible') {
      try { new Notification('Rest complete', { body: `Ready for your next ${timer.name} set.`, tag: 'optimal-lifts-rest', icon: '/icon-192.png' }) } catch { /* Browser may require service-worker notifications. */ }
    }
  }, [timer, alerts])
  useEffect(() => () => { void audio.current?.close().catch(() => undefined) }, [])
  const enableAlerts = async () => {
    const next = !alerts
    setAlerts(next); localStorage.setItem(ALERTS, String(next))
    if (!next) return
    const AudioCtor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (AudioCtor) { audio.current ??= new AudioCtor(); await audio.current.resume().catch(() => undefined) }
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') await Notification.requestPermission()
  }
  return {
    timer, now, alerts, enableAlerts,
    start: (workoutKey: string, exerciseId: string, name: string, duration: number) => update({ id: crypto.randomUUID(), workoutKey, exerciseId, name, duration, remaining: duration, running: true, endAt: Date.now() + duration * 1000 }),
    cancel: () => update(null),
    toggle: () => {
      const current = timerRef.current && reconcileTimer(timerRef.current)
      if (!current || !current.remaining) return
      update({ ...current, running: !current.running, endAt: current.running ? undefined : Date.now() + current.remaining * 1000 })
    },
    adjust: (seconds: number) => {
      const current = timerRef.current && reconcileTimer(timerRef.current)
      if (!current) return
      const remaining = Math.min(600, Math.max(0, current.remaining + seconds))
      update({ ...current, remaining, duration: Math.min(600, Math.max(30, current.duration + seconds)), notified: false, running: current.running && remaining > 0, endAt: current.running ? Date.now() + remaining * 1000 : undefined })
    },
  }
}

export type WorkoutClock = ReturnType<typeof useRestTimer>
export const workoutKey = (draft: { routineId: string; startedAt?: number; editingSessionId?: string }) => `${draft.routineId}:${draft.startedAt ?? draft.editingSessionId ?? 'legacy'}`
export const formatClock = (seconds: number) => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`
