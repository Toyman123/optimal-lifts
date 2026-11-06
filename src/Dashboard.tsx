import { useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { RoutineTabs } from './RoutineTabs'
import { ArrowUpRight } from '@phosphor-icons/react'
import type { AppData } from './types'

export function Dashboard({ data, startWorkout, navigate, displayName }: { data: AppData; startWorkout: (id?: string) => void; navigate: (view: 'workouts' | 'progress') => void; displayName?: string }) {
  const active = data.routines.filter(r => !r.archived)
  const next = active.find(r => r.id === data.nextRoutineId) ?? active[0]
  const [selectedId, setSelectedId] = useState(data.draft?.routineId ?? next?.id)
  const featured = active.find(routine => routine.id === selectedId) ?? next
  const continuing = Boolean(featured && data.draft?.routineId === featured.id)
  const reduced = useReducedMotion()
  const lastSession = [...data.sessions].filter(session => session.routineId === featured?.id).sort((a, b) => b.date.localeCompare(a.date))[0]
  const greeting = new Date().getHours() < 12 ? 'Good morning' : new Date().getHours() < 18 ? 'Good afternoon' : 'Good evening'
  return <div className="page dashboard-page">
    <header className="dashboard-heading">
      <div><p className="eyebrow">YOUR TRAINING</p><h1>{greeting}{displayName ? `, ${displayName}` : '.'}</h1></div>
      <span className="home-date">{new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(new Date())}</span>
    </header>
    <section className="training-focus" aria-label="Your next workout">
      <RoutineTabs routines={active} value={featured?.id} onChange={setSelectedId} />
      <div className="training-focus-body">
        <div><p className="focus-status">{continuing ? <><i /> In progress</> : 'Next session'}</p><motion.h2 key={featured?.id} initial={reduced ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .18 }}>{featured?.name ?? 'Your workout'}</motion.h2><p className="focus-last">{lastSession ? 'Last trained ' + new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(new Date(lastSession.date + 'T12:00:00')) : 'Your notes and timer, ready to go.'}</p></div>
        <motion.button className="session-launch" whileHover={reduced ? undefined : { y: -3 }} whileTap={reduced ? undefined : { scale: .96 }} onClick={() => featured ? startWorkout(featured.id) : navigate('workouts')} aria-label={featured ? (continuing ? 'Continue ' : 'Start ') + featured.name : 'Create a workout'}><span>{continuing ? 'Continue' : featured ? 'Start session' : 'Create workout'}</span><span className="launch-circle"><ArrowUpRight size={27} weight="bold" /></span></motion.button>
      </div>
    </section>
  </div>
}
