import { motion, useReducedMotion } from 'framer-motion'
import { useId } from 'react'

export function RoutineTabs({ routines, value, onChange, label = 'Workout selection' }: {
  routines: { id: string; name: string }[]
  value?: string
  onChange: (id: string) => void
  label?: string
}) {
  const id = useId()
  const reduced = useReducedMotion()
  return <div className="routine-tabs" role="group" aria-label={label}>{routines.map(routine => <motion.button key={routine.id} type="button" aria-pressed={value === routine.id} onClick={() => onChange(routine.id)} whileTap={reduced ? undefined : { scale: .96 }}>
    {value === routine.id && <motion.span className="routine-tab-highlight" layoutId={id} transition={reduced ? { duration: 0 } : { type: 'spring', stiffness: 420, damping: 34 }} />}
    <span>{routine.name}</span>
  </motion.button>)}</div>
}
