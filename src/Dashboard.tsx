import { ArrowRight, Barbell, CalendarBlank, Check, Play } from '@phosphor-icons/react'
import type { AppData, Session } from './types'
import './dashboard.css'

type Props = { data: AppData; setData: React.Dispatch<React.SetStateAction<AppData>>; startWorkout: (id?: string) => void; navigate: (view: 'home' | 'workouts' | 'progress' | 'log') => void }
const dateLabel = (date: string) => new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(new Date(`${date}T12:00:00`))
const volume = (session: Session) => session.exercises.reduce((sum, exercise) => sum + exercise.sets.reduce((total, set) => total + set.weight * set.reps, 0), 0)
const localDate = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`

export function Dashboard({ data, setData, startWorkout, navigate }: Props) {
  const active = data.routines.filter(r => !r.archived)
  const next = active.find(r => r.id === data.nextRoutineId) ?? active[0]
  const draft = data.draft && /\d/.test(data.draft.note) ? data.draft : undefined
  const routine = active.find(r => r.id === draft?.routineId) ?? next
  const recent = [...data.sessions].sort((a, b) => b.date.localeCompare(a.date) || b.savedAt.localeCompare(a.savedAt))
  const now = new Date(), today = localDate(now), monday = new Date(now)
  monday.setDate(now.getDate() - (now.getDay() + 6) % 7)
  const week = Array.from({ length: 7 }, (_, i) => { const day = new Date(monday); day.setDate(monday.getDate() + i); return { label: ['M', 'T', 'W', 'T', 'F', 'S', 'S'][i], date: localDate(day) } })
  const weekCount = recent.filter(s => s.date >= week[0].date && s.date <= today).length
  const completed = new Set(data.sessions.map(s => s.date))
  const previous = recent.find(s => s.routineId === routine?.id && s.id !== draft?.editingSessionId)
  const openSession = (session: Session) => {
    setData(current => ({ ...current, drafts: current.draft && /\d/.test(current.draft.note) && current.draft.editingSessionId !== session.id ? [...(current.drafts ?? []).filter(d => d.routineId !== current.draft!.routineId), current.draft] : current.drafts, draft: { routineId: session.routineId, date: session.date, variationId: session.variationId, note: session.rawNote, order: session.actualExerciseOrder, editingSessionId: session.id, updatedAt: new Date().toISOString() } }))
    navigate('log')
  }
  return <div className="page dashboard-page">
    <header className="dashboard-heading"><div><span className="eyebrow">YOUR TRAINING, IN FOCUS</span><h1>Dashboard<span>.</span></h1></div><span className="dashboard-date"><CalendarBlank />{new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric' }).format(now)}</span></header>
    <div className="dashboard-layout"><div className="dashboard-main">
      <section className="training-week" aria-label="Training this week"><div><strong>This week</strong><span>{weekCount} session{weekCount === 1 ? '' : 's'} logged</span></div><div className="week-days">{week.map(day => <div className={`${day.date === today ? 'today' : ''} ${completed.has(day.date) ? 'trained' : ''}`} key={day.date} aria-label={`${day.date}${completed.has(day.date) ? ', workout logged' : ''}${day.date === today ? ', today' : ''}`}><span>{day.label}</span><i>{completed.has(day.date) ? <Check weight="bold" /> : <span>·</span>}</i></div>)}</div></section>
      <section className="dashboard-recent"><div className="dashboard-section-head"><h2>Recent workouts</h2><button onClick={() => navigate('progress')}>View all <ArrowRight /></button></div>{recent.length ? <div className="dashboard-history">{recent.slice(0, 3).map(session => <button key={session.id} onClick={() => openSession(session)}><span className={`workout-type type-${session.routineId}`}><Barbell /></span><span className="dashboard-history-copy"><strong>{session.routineName}</strong><small>{dateLabel(session.date)} · {session.exercises.reduce((n, e) => n + e.sets.length, 0)} sets</small></span><span className="dashboard-volume">{volume(session).toLocaleString('en-US')}<small>lb volume</small></span><ArrowRight /></button>)}</div> : <div className="dashboard-empty"><Barbell /><h3>Your first session starts here.</h3><p>Choose a workout and log a set. We’ll take care of the history.</p><button onClick={() => navigate('workouts')}>Choose a workout <ArrowRight /></button></div>}</section>
    </div><div className="dashboard-side">
      <section className="next-workout"><div className="next-workout-photo" /><div className="next-workout-content"><span className="eyebrow"><i />{draft ? 'PICK UP WHERE YOU LEFT OFF' : 'UP NEXT'}</span><h2>{routine?.name ?? 'Your first workout'}</h2><p>{routine ? `${routine.exercises.filter(e => !e.archived).length} exercises · ${previous ? `Last trained ${dateLabel(previous.date)}` : 'Ready when you are'}` : 'Build a routine that works for you.'}</p>{active.length > 1 && !draft && <div className="next-switch" role="group" aria-label="Choose next workout">{active.map(r => <button key={r.id} className={r.id === next?.id ? 'selected' : ''} aria-pressed={r.id === next?.id} onClick={() => setData(current => ({ ...current, nextRoutineId: r.id }))}>{r.name}</button>)}</div>}<button className="primary-button" onClick={() => routine ? startWorkout(routine.id) : navigate('workouts')}>{routine ? draft ? 'Continue workout' : 'Start workout' : 'Create a workout'}<Play weight="fill" /></button></div></section>
      {routine && <section className="dashboard-plan"><div className="dashboard-section-head"><h2>On the program</h2><span>{routine.name}</span></div>{routine.exercises.filter(e => !e.archived).slice(0, 4).map((exercise, index) => { const record = previous?.exercises.find(e => e.exerciseId === exercise.id); return <div key={exercise.id}><span>{String(index + 1).padStart(2, '0')}</span><div><strong>{exercise.name}</strong><small>{record ? record.sets.map(s => `${s.bodyweight && !s.weight ? 'BW' : `${s.weight} lb`} × ${s.reps}`).join(' · ') : 'Make your first entry'}</small></div></div> })}</section>}
    </div></div>
  </div>
}
