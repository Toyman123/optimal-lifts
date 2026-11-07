import { AnimatePresence, motion, useInView, useReducedMotion } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { ArrowRight, Check, CheckCircle, ClockCountdown, Minus, Pause, Play, Plus } from '@phosphor-icons/react'

export function useDemoActivity() {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { amount: .25 })
  const reduced = Boolean(useReducedMotion())
  const [pageVisible, setPageVisible] = useState(() => typeof document !== 'undefined' && !document.hidden)
  useEffect(() => {
    const update = () => setPageVisible(!document.hidden)
    document.addEventListener('visibilitychange', update)
    return () => document.removeEventListener('visibilitychange', update)
  }, [])
  return { ref, reduced, running: inView && pageVisible && !reduced }
}

export function useDemoLoop(count: number, interval: number, running: boolean) {
  const [step, setStep] = useState(0)
  useEffect(() => {
    if (!running) return
    const timer = window.setInterval(() => setStep(current => (current + 1) % count), interval)
    return () => window.clearInterval(timer)
  }, [count, interval, running])
  return step
}

export function LoggingDemo() {
  const { ref, reduced, running } = useDemoActivity()
  const tick = useDemoLoop(5, 1400, running)
  const step = reduced ? 4 : tick
  return <div ref={ref} className="product-demo logging-demo" role="img" aria-label="Example: logging 70 by 8, then 70 by 7, adding a note, and saving the workout">
    <div className="demo-mini-heading" aria-hidden="true"><span>WORKOUT NOTES</span><span className="demo-example">DEMO</span></div>
    <div className="mini-exercise" aria-hidden="true"><strong>Incline DB press</strong><span>Push day</span></div>
    <div className="demo-set-row" aria-hidden="true"><span>01</span><strong>70 <small>×</small> 8</strong><motion.span className="demo-set-check" animate={{ opacity: step >= 1 ? 1 : .25, scale: step >= 1 ? 1 : .85 }} transition={{ duration: reduced ? 0 : .3 }}><Check size={14} weight="bold" /></motion.span></div>
    <div className="demo-second-set" aria-hidden="true"><AnimatePresence>{step >= 2 && <motion.div className="demo-set-row" initial={reduced ? false : { opacity: 0, y: 7 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: reduced ? 0 : .3 }}><span>02</span><strong>70 <small>×</small> 7</strong><span className="demo-set-check"><Check size={14} weight="bold" /></span></motion.div>}</AnimatePresence></div>
    <div className="demo-note-line" aria-hidden="true"><motion.span animate={{ opacity: step >= 3 ? 1 : 0 }} transition={{ duration: reduced ? 0 : .25 }}>Felt good. Same weight next time.</motion.span></div>
    <div className="demo-save-state" aria-hidden="true"><motion.span animate={{ opacity: step === 4 ? 1 : .35 }} transition={{ duration: reduced ? 0 : .25 }}><CheckCircle size={15} weight={step === 4 ? 'fill' : 'regular'} />{step === 4 ? 'All notes saved' : 'Draft saves as you go'}</motion.span></div>
  </div>
}

export function TimerDemo() {
  const { ref, reduced, running } = useDemoActivity()
  const [paused, setPaused] = useState(false)
  const [adjustment, setAdjustment] = useState(0)
  const step = useDemoLoop(12, 1000, running && !paused)
  const total = 120 + adjustment
  const remaining = Math.max(0, total - (reduced ? 0 : Math.min(step, 8)))
  const label = `${String(Math.floor(remaining / 60)).padStart(2, '0')}:${String(remaining % 60).padStart(2, '0')}`
  const circumference = 2 * Math.PI * 70
  return <div ref={ref} className="product-demo timer-demo" data-running={running && !paused}>
    <div className="demo-mini-heading"><span>BETWEEN SETS</span><span className="demo-example">DEMO</span></div>
    <div className="demo-timer-ring" role="img" aria-label={`Example rest timer: ${label}, ${paused ? 'paused' : 'running'}`}><svg viewBox="0 0 168 168" aria-hidden="true"><circle className="timer-ring-track" cx="84" cy="84" r="70" /><motion.circle className="timer-ring-fill" cx="84" cy="84" r="70" strokeDasharray={circumference} animate={{ strokeDashoffset: circumference * (1 - remaining / total) }} transition={{ duration: reduced ? 0 : .9, ease: 'linear' }} /></svg><div aria-hidden="true"><ClockCountdown size={16} /><strong>{label}</strong><span>{paused ? 'Rest paused' : 'Take a breath'}</span></div></div>
    <div className="demo-timer-controls"><button type="button" aria-label="Subtract 15 seconds from demo" disabled={adjustment <= -90} onClick={() => setAdjustment(current => Math.max(-90, current - 15))}><Minus size={13} /><span>15</span></button><button type="button" className="demo-timer-toggle" aria-label={paused ? 'Resume demo timer' : 'Pause demo timer'} onClick={() => setPaused(current => !current)}>{paused ? <Play size={15} weight="fill" /> : <Pause size={15} weight="fill" />}</button><button type="button" aria-label="Add 15 seconds to demo" disabled={adjustment >= 180} onClick={() => setAdjustment(current => Math.min(180, current + 15))}><Plus size={13} /><span>15</span></button></div>
  </div>
}

export function ContinuityDemo() {
  const { ref, reduced, running } = useDemoActivity()
  const tick = useDemoLoop(3, 2300, running)
  const step = reduced ? 2 : tick
  return <div ref={ref} className="product-demo continuity-demo" role="img" aria-label="Example: leaving Push day and returning with both logged sets preserved">
    <div className="demo-mini-heading" aria-hidden="true"><span>YOUR TRAINING</span><span className="demo-example">DEMO</span></div>
    <div className="continuity-viewport" aria-hidden="true"><AnimatePresence mode="wait"><motion.div key={step === 1 ? 'rotation' : 'workout'} className="continuity-screen" initial={reduced ? false : { opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }} transition={{ duration: reduced ? 0 : .3 }}>{step === 1 ? <><div className="mini-exercise"><strong>Your workouts</strong><span>Everything in its place</span></div>{['Push', 'Pull', 'Legs'].map((name, index) => <div className={index === 0 ? 'continuity-routine selected' : 'continuity-routine'} key={name}><span>{name}</span>{index === 0 ? <small>In progress <ArrowRight size={13} /></small> : <ArrowRight size={13} />}</div>)}</> : <><div className="mini-exercise"><strong>Push day</strong><span>{step === 2 ? 'Right where you left off' : 'Workout in progress'}</span></div><div className="continuity-lift"><span>Incline DB press</span><strong>70 × 8 &nbsp; 70 × 7</strong><Check size={15} /></div><div className="continuity-lift"><span>Chest press</span><strong>120 × 10</strong><Check size={15} /></div></>}</motion.div></AnimatePresence></div>
    <div className="continuity-preserved" aria-hidden="true"><span className="continuity-dot" /><span>{step === 1 ? 'Saved while you move' : step === 2 ? 'Your progress, still here' : 'Session saved'}</span><CheckCircle size={15} weight="fill" /></div>
  </div>
}
