import { ArrowRight, Barbell, ChartBar, Fire, Play, Trophy } from '@phosphor-icons/react'
import type { Dispatch, SetStateAction } from 'react'
import { estimatedOneRepMax } from './parser'
import type { AppData } from './types'

export function dashboardStats(data: AppData, now = new Date()) {
  const volume = data.sessions.reduce((n, s) => n + s.exercises.reduce((a, e) => a + e.sets.reduce((b, set) => b + set.weight * set.reps, 0), 0), 0)
  const best = new Map<string, number>(); let records = 0
  for (const session of [...data.sessions].sort((a, b) => a.date.localeCompare(b.date) || a.savedAt.localeCompare(b.savedAt))) {
    for (const exercise of session.exercises) {
      const score = Math.max(0, ...exercise.sets.map(s => s.bodyweight && !s.weight ? s.reps : estimatedOneRepMax(s.weight, s.reps)))
      if (best.has(exercise.exerciseId) && score > best.get(exercise.exerciseId)!) records++
      best.set(exercise.exerciseId, Math.max(best.get(exercise.exerciseId) ?? 0, score))
    }
  }
  const localDate = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
  const days = new Set(data.sessions.map(s => s.date)); let streak = 0
  const cursor = new Date(now); cursor.setHours(12, 0, 0, 0)
  if (!days.has(localDate(cursor))) cursor.setDate(cursor.getDate() - 1)
  while (days.has(localDate(cursor))) { streak++; cursor.setDate(cursor.getDate() - 1) }
  const monday = new Date(now); monday.setDate(monday.getDate() - (monday.getDay() + 6) % 7)
  const week = Array.from({ length: 7 }, (_, i) => { const date = new Date(monday); date.setDate(date.getDate() + i); return { day: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i], sets: data.sessions.filter(s => s.date === localDate(date)).reduce((n, s) => n + s.exercises.reduce((a, e) => a + e.sets.length, 0), 0) } })
  return { volume, records, streak, week }
}

export function Dashboard({ data, setData, startWorkout, navigate }: { data: AppData; setData: Dispatch<SetStateAction<AppData>>; startWorkout: (id?: string) => void; navigate: (view: 'home' | 'workouts' | 'log' | 'progress' | 'coach' | 'settings') => void }) {
  const stats = dashboardStats(data)
  const active = data.routines.filter(r => !r.archived)
  const next = active.find(r => r.id === data.nextRoutineId) ?? active[0]
  const recent = [...data.sessions].sort((a, b) => b.date.localeCompare(a.date) || b.savedAt.localeCompare(a.savedAt)).slice(0, 4)
  const greeting = new Date().getHours() < 12 ? 'Good morning' : new Date().getHours() < 18 ? 'Good afternoon' : 'Good evening'
  return <div className="page dashboard-page"><div className="dashboard-breadcrumb"><Barbell size={17} /> Dashboard<span>{new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }).format(new Date())}</span></div>
    <header className="dashboard-heading"><div><h1>{greeting}.</h1><p>Keep showing up. Progress compounds.</p></div><button className="primary-button" onClick={() => active.length ? startWorkout(data.draft?.routineId ?? next?.id) : navigate('workouts')}><Play weight="fill" />{data.draft ? 'Continue workout' : 'Start workout'}</button></header>
    <div className="dashboard-stats">{[
      { label: 'Total workouts', value: data.sessions.length.toLocaleString(), foot: 'Sessions logged', icon: Barbell },
      { label: 'Total volume', value: stats.volume.toLocaleString(), suffix: ' lb', foot: 'Weight × repetitions', icon: ChartBar },
      { label: 'Personal records', value: stats.records.toLocaleString(), foot: 'New exercise bests', icon: Trophy },
      { label: 'Current streak', value: `${stats.streak} ${stats.streak === 1 ? 'day' : 'days'}`, foot: 'Consecutive training days', icon: Fire },
    ].map(stat => <button key={stat.label} className="dashboard-stat panel" onClick={() => navigate('progress')}><span>{stat.label}</span><strong>{stat.value}<small>{stat.suffix}</small></strong><div><small>{stat.foot}</small><stat.icon size={22} weight="fill" /></div></button>)}</div>
    <div className="dashboard-grid"><section className="recent-workouts panel"><header><h2>Recent workouts</h2><button className="text-link" onClick={() => navigate('progress')}>View all <ArrowRight /></button></header>{recent.length ? recent.map(session => <button className="recent-row" key={session.id} onClick={() => navigate('progress')}><span className="workout-symbol"><Barbell /></span><span><strong>{session.routineName}</strong><small>{new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(`${session.date}T12:00:00`))}</small></span><span className="recent-numbers"><strong>{session.exercises.reduce((n, e) => n + e.sets.length, 0)} sets</strong><small>{session.exercises.reduce((n, e) => n + e.sets.reduce((a, s) => a + s.weight * s.reps, 0), 0).toLocaleString()} lb</small></span><ArrowRight size={16} /></button>) : <div className="dashboard-empty"><Barbell size={30} /><p>Your first workout starts here.</p><button className="text-link" onClick={() => navigate('workouts')}>Choose a workout <ArrowRight /></button></div>}</section>
      <div className="dashboard-side"><section className="weekly-activity panel"><header><h2>Weekly activity</h2><span>This week · sets</span></header><div className="activity-bars">{stats.week.map(day => <div key={day.day}><span>{day.sets || ''}</span><div className="bar-track"><i style={{ height: `${day.sets ? Math.max(5, day.sets / Math.max(1, ...stats.week.map(d => d.sets)) * 100) : 0}%` }} /></div><small>{day.day}</small></div>)}</div></section><section className="discipline-panel"><div className="mountain mountain-back" /><div className="mountain mountain-front" /><p>Discipline today.<br />Stronger tomorrow.</p><span>TRACK. IMPROVE. REPEAT.</span></section></div></div>
    <section className="rotation-section"><header><div><h2>Your training rotation</h2><p>Choose what comes next.</p></div><button className="text-link" onClick={() => navigate('workouts')}>Manage workouts <ArrowRight /></button></header><div className="rotation-grid">{active.map(r => <article className={`rotation-card panel ${next?.id === r.id ? 'up-next' : ''}`} key={r.id}><Barbell size={23} /><h3>{r.name}</h3><span>{r.exercises.filter(e => !e.archived).length} exercises</span><div><button className="text-link" onClick={() => setData(current => ({ ...current, nextRoutineId: r.id }))}>{next?.id === r.id ? 'Up next' : 'Set as next'}</button><button className="secondary-button" onClick={() => startWorkout(r.id)} aria-label={`Start ${r.name}`}><Play weight="fill" /></button></div></article>)}</div></section>
  </div>
}
