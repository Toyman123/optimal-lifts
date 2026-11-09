import { motion, useReducedMotion } from 'framer-motion'
import { ArrowRight, PencilSimple } from '@phosphor-icons/react'
import type { AppData, Routine } from './types'
import './workouts.css'

const ease = [0.2, 0.8, 0.2, 1] as const
const dateLabel = (date: string) => new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(new Date(`${date}T12:00:00`))

const ART = {
  push: <svg viewBox="0 0 110 50"><rect x="10" y="22" width="90" height="6" rx="3" className="cream" /><rect x="14" y="8" width="10" height="34" rx="3" className="accent" /><rect x="86" y="8" width="10" height="34" rx="3" className="accent" /><rect x="26" y="14" width="6" height="22" rx="2" className="cream" /><rect x="78" y="14" width="6" height="22" rx="2" className="cream" /></svg>,
  pull: <svg viewBox="0 0 70 60"><rect x="5" y="6" width="60" height="5" rx="2.5" className="cream" /><path d="M20 11 L28 40 M50 11 L42 40" className="cream-line" /><rect x="22" y="40" width="26" height="12" rx="4" className="accent" /></svg>,
  legs: <svg viewBox="0 0 70 60"><circle cx="35" cy="30" r="24" className="accent" /><circle cx="35" cy="30" r="14" className="cream-ring" /><circle cx="35" cy="30" r="4" className="cream" /></svg>,
}
const TONES = ['ox', 'pine', 'hot'] as const
const KEYS = ['push', 'pull', 'legs'] as const

function look(routine: Routine, index: number) {
  const name = routine.name.toLowerCase()
  const key = KEYS.find(k => name.includes(k)) ?? KEYS[index % 3]
  return { art: ART[key], tone: TONES[KEYS.indexOf(key)] }
}

type Props = { data: AppData; startWorkout: (id: string) => void; onEdit: (routine: Routine) => void }

export function WorkoutDays({ data, startWorkout, onEdit }: Props) {
  const reduce = useReducedMotion()
  const routines = data.routines.filter(r => !r.archived)
  const nextId = (routines.find(r => r.id === data.nextRoutineId) ?? routines[0])?.id
  const sessions = [...data.sessions].sort((a, b) => b.date.localeCompare(a.date))

  return <div className="wdays">
    {routines.map((routine, i) => {
      const { art, tone } = look(routine, i)
      const exercises = routine.exercises.filter(e => !e.archived)
      const last = sessions.find(s => s.routineId === routine.id)
      return <motion.article key={routine.id} className={`wday${routine.id === nextId ? ' is-next' : ''}`}
        initial={reduce ? false : { opacity: 0, y: 28 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .6, delay: i * .08, ease }}
        whileHover={reduce ? undefined : { y: -6 }}>
        <div className={`wday-art ${tone}`} aria-hidden="true">
          <span className="wday-num">Day {String(i + 1).padStart(2, '0')}</span>
          {routine.id === nextId && <span className="wday-tag">Up next</span>}
          {art}
        </div>
        <div className="wday-body">
          <h2>{routine.name}</h2>
          <p className="wday-meta">{exercises.length} exercises · {last ? `Last trained ${dateLabel(last.date)}` : 'Not trained yet'}</p>
          <ol className="wday-list">{exercises.length ? exercises.map(e => <li key={e.id}>{e.name}</li>) : <li className="empty">Add your first exercise</li>}</ol>
          <div className="wday-actions">
            <button className="wday-edit" onClick={() => onEdit(routine)} aria-label={`Edit ${routine.name}`}><PencilSimple /> Edit</button>
            <button className="wday-start" onClick={() => startWorkout(routine.id)} aria-label={`Start ${routine.name}`}>Start <ArrowRight weight="bold" /></button>
          </div>
        </div>
      </motion.article>
    })}
  </div>
}
