import { useState } from 'react'
import { ArrowRight, Barbell, CalendarBlank, CaretLeft, CaretRight, Fire, Timer } from '@phosphor-icons/react'
import { estimatedOneRepMax } from './parser'
import type { AppData, Session } from './types'

const dateKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
const dateFromKey = (key: string) => new Date(`${key}T12:00:00`)
const shiftDate = (date: Date, amount: number) => { const next = new Date(date); next.setDate(next.getDate() + amount); return next }
const mondayOf = (date: Date) => shiftDate(date, -(date.getDay() + 6) % 7)
export const sessionVolume = (session: Session) => session.exercises.reduce((sum, e) => sum + e.sets.reduce((n, s) => n + s.weight * s.reps, 0), 0)
const number = (value: number) => value.toLocaleString('en-US', { maximumFractionDigits: 1 })
export const durationLabel = (seconds?: number) => {
  if (seconds === undefined) return '—'
  const minutes = Math.max(1, Math.round(seconds / 60))
  return minutes >= 60 ? `${Math.floor(minutes / 60)}h ${minutes % 60}m` : `${minutes}m`
}
const changeLabel = (current: number, previous: number) => previous > 0 ? `${current >= previous ? '+' : ''}${Math.round((current - previous) / previous * 100)}%` : undefined

export function dashboardStats(data: AppData, now = new Date()) {
  const currentDate = dateKey(now)
  const sessions = data.sessions.filter(s => s.date <= currentDate)
  const volume = sessions.reduce((sum, s) => sum + sessionVolume(s), 0)
  const recentStart = dateKey(shiftDate(now, -29)), previousStart = dateKey(shiftDate(now, -59))
  const recent = sessions.filter(s => s.date >= recentStart)
  const previous = sessions.filter(s => s.date >= previousStart && s.date < recentStart)
  const best = new Map<string, number>(); let records = 0, recentRecords = 0
  for (const session of [...sessions].sort((a, b) => a.date.localeCompare(b.date) || a.savedAt.localeCompare(b.savedAt))) {
    for (const exercise of session.exercises) {
      const score = Math.max(0, ...exercise.sets.map(s => s.bodyweight && !s.weight ? s.reps : estimatedOneRepMax(s.weight, s.reps)))
      if (best.has(exercise.exerciseId) && score > best.get(exercise.exerciseId)!) { records++; if (session.date >= recentStart) recentRecords++ }
      best.set(exercise.exerciseId, Math.max(best.get(exercise.exerciseId) ?? 0, score))
    }
  }
  const activeWeeks = new Set(sessions.map(s => dateKey(mondayOf(dateFromKey(s.date)))))
  let cursor = mondayOf(now), streak = 0
  if (!activeWeeks.has(dateKey(cursor))) cursor = shiftDate(cursor, -7)
  while (activeWeeks.has(dateKey(cursor))) { streak++; cursor = shiftDate(cursor, -7) }
  const monday = mondayOf(now)
  const week = Array.from({ length: 7 }, (_, i) => {
    const date = shiftDate(monday, i), daySessions = sessions.filter(s => s.date === dateKey(date))
    return { date: dateKey(date), day: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i], volume: daySessions.reduce((sum, s) => sum + sessionVolume(s), 0), workouts: daySessions.length, time: daySessions.reduce((sum, s) => sum + (s.durationSeconds ?? 0), 0) / 60 }
  })
  const weekSessions = sessions.filter(s => s.date >= dateKey(monday) && s.date <= dateKey(shiftDate(monday, 6)))
  const timedSessions = weekSessions.filter(s => s.durationSeconds !== undefined)
  return { sessions, volume, records, recentRecords, streak, week, weekSessions, workoutChange: changeLabel(recent.length, previous.length), volumeChange: changeLabel(recent.reduce((n, s) => n + sessionVolume(s), 0), previous.reduce((n, s) => n + sessionVolume(s), 0)), weekVolume: weekSessions.reduce((n, s) => n + sessionVolume(s), 0), averageDuration: timedSessions.length ? timedSessions.reduce((n, s) => n + s.durationSeconds!, 0) / timedSessions.length : undefined }
}

type Metric = 'volume' | 'workouts' | 'time'
export function Dashboard({ data, startWorkout, navigate, displayName, onSession }: { data: AppData; startWorkout: (id?: string) => void; navigate: (view: 'workouts' | 'progress') => void; displayName?: string; onSession: (session: Session) => void }) {
  const [date, setDate] = useState(() => dateKey(new Date()))
  const [metric, setMetric] = useState<Metric>('volume')
  const [hoveredDay, setHoveredDay] = useState<number | null>(null)
  const selectedDate = dateFromKey(date), stats = dashboardStats(data, selectedDate)
  const active = data.routines.filter(r => !r.archived)
  const next = active.find(r => r.id === data.nextRoutineId) ?? active[0]
  const recent = [...stats.sessions].sort((a, b) => b.date.localeCompare(a.date) || b.savedAt.localeCompare(a.savedAt)).slice(0, 4)
  const greeting = new Date().getHours() < 12 ? 'Good morning' : new Date().getHours() < 18 ? 'Good afternoon' : 'Good evening'
  const topValue = Math.max(0, ...stats.week.map(d => d[metric]))
  const unitStep = metric === 'volume' ? 5000 : metric === 'time' ? 15 : 1
  const axisMax = Math.max(unitStep * 3, Math.ceil(topValue / (unitStep * 3)) * unitStep * 3)
  const hovered = hoveredDay !== null ? stats.week[hoveredDay] : undefined
  const units = metric === 'volume' ? 'lb' : metric === 'time' ? 'min' : 'workouts'
  return <div className="page dashboard-page">
    <header className="dashboard-heading">
      <div><h1>{greeting}{displayName ? `, ${displayName}` : '.'}</h1><p>Keep showing up. Progress compounds.</p></div>
      <div className="dashboard-heading-actions"><div className="dashboard-date"><label><CalendarBlank size={17} /><span>{date === dateKey(new Date()) ? 'Today, ' : ''}{new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(selectedDate)}</span><input type="date" aria-label="Dashboard date" value={date} onChange={event => { if (event.target.value) setDate(event.target.value) }} /></label><button aria-label="Previous day" onClick={() => setDate(dateKey(shiftDate(selectedDate, -1)))}><CaretLeft /></button><button aria-label="Next day" onClick={() => setDate(dateKey(shiftDate(selectedDate, 1)))}><CaretRight /></button></div><button className="primary-button" onClick={() => active.length ? startWorkout(data.draft?.routineId ?? next?.id) : navigate('workouts')}><Timer size={18} />{data.draft ? 'Continue Workout' : 'Start Workout'}</button></div>
    </header>
    <div className="dashboard-stats">
      <button className="dashboard-stat panel" onClick={() => navigate('progress')}><span>Total Workouts</span><strong>{stats.sessions.length}<em>{stats.workoutChange}</em></strong><small>vs last 30 days</small></button>
      <button className="dashboard-stat panel" onClick={() => navigate('progress')}><span>Total Volume</span><strong>{number(stats.volume)}<small> lbs</small></strong><small className={stats.volumeChange ? 'stat-gain' : ''}>{stats.volumeChange ?? 'All recorded sets'}</small></button>
      <button className="dashboard-stat panel" onClick={() => navigate('progress')}><span>Personal Records</span><strong>{stats.records}{stats.recentRecords > 0 && <em>+{stats.recentRecords}</em>}</strong><small>All time</small></button>
      <button className="dashboard-stat panel" onClick={() => navigate('progress')}><span>Current Streak</span><strong>{stats.streak} {stats.streak === 1 ? 'week' : 'weeks'}<Fire className="streak-flame" weight="fill" /></strong><small>{stats.streak ? 'Keep it going' : 'Train this week to begin'}</small></button>
    </div>
    <div className="dashboard-grid">
      <section className="recent-workouts panel"><header><h2>Recent Workouts</h2><button className="text-link" onClick={() => navigate('progress')}>View all <ArrowRight size={13} /></button></header><div className="recent-list">{recent.length ? recent.map(session => <button className="recent-row" aria-label={`View ${session.routineName} from ${session.date}`} key={session.id} onClick={() => onSession(session)}><span className="workout-symbol"><Barbell size={22} weight="fill" /></span><span className="recent-copy"><strong>{session.routineName}</strong><small>{new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(dateFromKey(session.date))}{session.durationSeconds !== undefined ? ` · ${durationLabel(session.durationSeconds)}` : ''}</small></span><strong className="recent-volume">{number(sessionVolume(session))} <small>lbs</small></strong><CaretRight size={17} /></button>) : <div className="dashboard-empty"><Barbell size={28} /><p>No workouts recorded yet.</p><button className="text-link" onClick={() => navigate('workouts')}>Choose a workout <ArrowRight /></button></div>}</div></section>
      <section className="weekly-activity panel"><header><h2>Weekly Activity</h2><div className="activity-tabs" aria-label="Weekly activity measurement">{(['volume', 'workouts', 'time'] as const).map(value => <button key={value} aria-pressed={metric === value} className={metric === value ? 'active' : ''} onClick={() => { setMetric(value); setHoveredDay(null) }}>{value === 'volume' ? 'Volume' : value === 'workouts' ? 'Workouts' : 'Time'}</button>)}</div></header>
        <div className="weekly-chart"><svg viewBox="0 0 380 206" role="img" aria-label={`Weekly ${metric} from ${stats.week[0].date} to ${stats.week[6].date}`}>
          {[0, 1, 2, 3].map(i => { const value = axisMax / 3 * i, y = 171 - i * 46; return <g key={i}><line x1="43" x2="366" y1={y} y2={y} /><text x="32" y={y + 4} textAnchor="end">{metric === 'volume' && value >= 1000 ? `${number(value / 1000)}K` : number(value)}</text></g> })}
          {stats.week.map((day, i) => { const x = 57 + i * 46, height = day[metric] / axisMax * 138; return <g key={day.day} className="activity-day" tabIndex={0} role="img" aria-label={`${day.day}, ${day.date}: ${number(day[metric])} ${units}`} onMouseEnter={() => setHoveredDay(i)} onMouseLeave={() => setHoveredDay(null)} onFocus={() => setHoveredDay(i)} onBlur={() => setHoveredDay(null)}><title>{day.date}: {number(day[metric])} {units}</title><rect className="bar-hit" x={x - 16} y="24" width="32" height="153" /><rect className="activity-bar" x={x - 7} y={171 - height} width="14" height={height || 1} rx="1" /><text x={x} y="195" textAnchor="middle">{day.day}</text></g> })}
        </svg>{!topValue && <p className="weekly-empty">{metric === 'time' && stats.weekSessions.length ? 'Duration is available for newly completed workouts.' : 'No workouts this week'}</p>}{hovered && <div className="activity-tooltip" role="status" style={{ left: `${Math.min(82, Math.max(18, 17 + (hoveredDay ?? 0) * 12))}%` }}><strong>{number(hovered[metric])} {units}</strong><span>{new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(dateFromKey(hovered.date))}</span></div>}</div>
        <footer className="week-summary"><div><strong>{stats.weekSessions.length}</strong><span>Workouts</span></div><div><strong>{number(stats.weekVolume)} <small>lbs</small></strong><span>Total Volume</span></div><div><strong>{durationLabel(stats.averageDuration)}</strong><span>Avg. Duration</span></div></footer>
      </section>
    </div>
  </div>
}
