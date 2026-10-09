import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import {
  Archive, ArrowLeft, ArrowRight, Barbell, BellRinging, CalendarBlank, CaretDown, ChartLineUp, Cloud,
  ChatCircleText, Check, ClockCountdown, DotsSixVertical, Gear, House, Info,
  LockKey, NotePencil, PaperPlaneRight, Pause, PencilSimple, Play, Plus, Repeat, Sparkle, Trash, WarningCircle, X,
} from '@phosphor-icons/react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { createSeedData } from './data'
import { renameExerciseForFutureWorkouts } from './exercises'
import { getCloudAccessToken, useCloudSync, type CloudState } from './cloud'
import { estimatedOneRepMax, parseWorkoutNote } from './parser'
import { sessionMetric, type ChartMetric } from './progress'
import { clearData, loadData, saveData } from './storage'
import { advanceSetHighWater, remainingRestSeconds } from './timer'
import type { AppData, Draft, Exercise, Routine, Session, Variation } from './types'

type View = 'home' | 'workouts' | 'log' | 'progress' | 'settings'
type RestTimer = { id: string; exerciseId: string; name: string; duration: number; remaining: number; running: boolean; endAt?: number }
const REST_ALERTS_KEY = 'optimal-lifts-rest-alerts'
const today = () => {
  const date = new Date()
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}
const uid = () => crypto.randomUUID?.() ?? Math.random().toString(36).slice(2)
const formatDate = (date: string) => new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(`${date}T12:00:00`))

const routeMotion = {
  initial: { opacity: 0, y: 9 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -6 },
  transition: { duration: .2, ease: [0.22, 1, 0.36, 1] as const },
} as const

function DumbbellMark({ size = 32 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 64 64" role="img" aria-label="Optimal Lifts">
    <rect x="5" y="22" width="8" height="20" rx="4" fill="currentColor" />
    <rect x="15" y="14" width="10" height="36" rx="5" fill="currentColor" />
    <rect x="23" y="28" width="18" height="8" fill="currentColor" />
    <rect x="39" y="14" width="10" height="36" rx="5" fill="currentColor" />
    <rect x="51" y="22" width="8" height="20" rx="4" fill="currentColor" />
  </svg>
}

function Pressable({ children, className = '', onClick, type = 'button', disabled, ariaLabel }: {
  children: React.ReactNode; className?: string; onClick?: () => void; type?: 'button' | 'submit'; disabled?: boolean; ariaLabel?: string
}) {
  const reduced = useReducedMotion()
  return <motion.button type={type} className={className} onClick={onClick} disabled={disabled} aria-label={ariaLabel}
    whileTap={disabled || reduced ? undefined : { y: 2, scale: .975 }} transition={{ type: 'spring', stiffness: 520, damping: 28 }}>
    {children}
  </motion.button>
}

function App() {
  const [data, setData] = useState<AppData>(() => loadData())
  const cloud = useCloudSync(data, setData)
  const [view, setView] = useState<View>('home')
  const [selectedRoutineId, setSelectedRoutineId] = useState(() => data.draft?.routineId || data.nextRoutineId || data.routines.find(r => !r.archived)?.id || '')
  const [notice, setNotice] = useState('')
  const [pendingRoutineId, setPendingRoutineId] = useState<string | null>(null)
  const loaded = useRef(false)

  useEffect(() => {
    if (!loaded.current) { loaded.current = true; return }
    saveData(data)
  }, [data])

  const navigate = (next: View) => { setView(next); window.scrollTo({ top: 0, behavior: 'smooth' }) }
  const toast = (message: string) => { setNotice(message); window.setTimeout(() => setNotice(''), 2400) }
  const openWorkout = (id: string, preserveCurrent = false) => {
    const routine = data.routines.find(r => r.id === id)
    if (!routine) return
    const variation = routine.variations.find(v => !v.archived)
    const stored = data.draft?.routineId === id ? data.draft : data.drafts?.find(draft => draft.routineId === id)
    const template = (variation?.exerciseIds ?? routine.exercises.filter(e => !e.archived).map(e => e.id)).map(exerciseId => routine.exercises.find(e => e.id === exerciseId)?.name).filter(Boolean).join('\n')
    const hasEnteredSets = Boolean(stored && /\d/.test(stored.note))
    const draft: Draft = stored ? { ...stored, note: hasEnteredSets ? stored.note : template, variationId: hasEnteredSets ? stored.variationId : variation?.id, order: hasEnteredSets && stored.order.length ? stored.order : (variation?.exerciseIds ?? []) } : {
      routineId: id, variationId: variation?.id, date: today(), note: template,
      order: variation?.exerciseIds ?? routine.exercises.filter(e => !e.archived).map(e => e.id), updatedAt: new Date().toISOString(),
    }
    setSelectedRoutineId(id)
    setData(current => {
      const parked = preserveCurrent && current.draft && /\d/.test(current.draft.note)
        ? [...(current.drafts ?? []).filter(item => item.routineId !== current.draft!.routineId), current.draft]
        : current.drafts
      return { ...current, draft, drafts: parked?.filter(item => item.routineId !== id) }
    })
    setPendingRoutineId(null)
    navigate('log')
  }
  const startWorkout = (routineId?: string) => {
    const id = routineId || selectedRoutineId || data.routines.find(r => !r.archived)?.id
    if (!id) return
    const switchingEnteredDraft = data.draft && data.draft.routineId !== id && /\d/.test(data.draft.note)
    if (switchingEnteredDraft) { setPendingRoutineId(id); return }
    openWorkout(id)
  }

  return <div className="app-shell">
    <aside className="desktop-rail">
      <button className="brand-lockup" onClick={() => navigate('home')}><DumbbellMark /><span>Optimal Lifts</span></button>
      <Navigation view={view} navigate={navigate} vertical />
    </aside>
    <main id="main-content" className="main-stage">
      <div className="mobile-topbar"><button className="brand-lockup" onClick={() => navigate('home')}><DumbbellMark size={28} /><span>Optimal Lifts</span></button></div>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={view} {...routeMotion} className="route">
          {view === 'home' && <Home data={data} setData={setData} startWorkout={startWorkout} navigate={navigate} toast={toast} />}
          {view === 'workouts' && <Workouts data={data} setData={setData} startWorkout={startWorkout} toast={toast} />}
          {view === 'log' && <WorkoutLog data={data} setData={setData} routineId={selectedRoutineId} navigate={navigate} toast={toast} />}
          {view === 'progress' && <Progress data={data} setData={setData} navigate={navigate} setRoutineId={setSelectedRoutineId} />}
          {view === 'settings' && <Settings data={data} setData={setData} toast={toast} cloud={cloud} />}
        </motion.div>
      </AnimatePresence>
    </main>
    <Navigation view={view} navigate={navigate} />
    <AnimatePresence>{notice && <motion.div className="toast" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}><span><Check weight="bold" /></span>{notice}</motion.div>}</AnimatePresence>
    <AnimatePresence>{pendingRoutineId && <Sheet title="Start a different workout?" onClose={() => setPendingRoutineId(null)}><div className="switch-workout-copy"><Barbell weight="fill" /><div><p>You have entered sets in <strong>{data.routines.find(r => r.id === data.draft?.routineId)?.name}</strong>.</p><span>Starting {data.routines.find(r => r.id === pendingRoutineId)?.name} will keep that draft so you can return to it later.</span></div></div><div className="sheet-footer"><Pressable className="secondary-button" onClick={() => { const currentId = data.draft?.routineId; setPendingRoutineId(null); if (currentId) openWorkout(currentId) }}>Continue current</Pressable><Pressable className="primary-button" onClick={() => openWorkout(pendingRoutineId, true)}>Start separate workout</Pressable></div></Sheet>}</AnimatePresence>
  </div>
}

function Navigation({ view, navigate, vertical = false }: { view: View; navigate: (v: View) => void; vertical?: boolean }) {
  const items: { view: View; label: string; icon: typeof House }[] = [
    { view: 'home', label: 'Home', icon: House }, { view: 'workouts', label: 'Workouts', icon: Barbell },
    { view: 'progress', label: 'Progress', icon: ChartLineUp }, { view: 'settings', label: 'Settings', icon: Gear },
  ]
  return <nav className={vertical ? 'rail-nav' : 'bottom-nav'} aria-label="Primary navigation">
    {items.map(item => { const Icon = item.icon; const active = view === item.view || (item.view === 'workouts' && view === 'log'); return <motion.button key={item.view} onClick={() => navigate(item.view)} className={active ? 'nav-item active' : 'nav-item'} whileTap={{ scale: .92 }} aria-current={active ? 'page' : undefined}>
      <span className="nav-icon"><Icon size={22} weight={active ? 'fill' : 'regular'} />{active && <motion.i layoutId={vertical ? 'rail-pill' : 'nav-dot'} />}</span><span>{item.label}</span>
    </motion.button> })}
  </nav>
}

function PageHeader({ eyebrow, title, action }: { eyebrow: string; title: string; action?: React.ReactNode }) {
  return <header className="page-header"><div><p className="eyebrow">{eyebrow}</p><h1>{title}</h1></div>{action}</header>
}

function Home({ data, setData, startWorkout, navigate, toast }: { data: AppData; setData: React.Dispatch<React.SetStateAction<AppData>>; startWorkout: (id?: string) => void; navigate: (v: View) => void; toast: (s: string) => void }) {
  const last = [...data.sessions].sort((a, b) => b.savedAt.localeCompare(a.savedAt))[0]
  const active = data.routines.filter(r => !r.archived)
  const next = active.find(r => r.id === data.nextRoutineId) ?? active[0]
  const draftRoutine = data.routines.find(r => r.id === data.draft?.routineId)
  const meaningfulDraft = Boolean(data.draft && /\d/.test(data.draft.note))
  const draftBlocksNext = Boolean(meaningfulDraft && draftRoutine && draftRoutine.id !== next?.id)
  const totalSets = data.sessions.reduce((sum, s) => sum + s.exercises.reduce((n, e) => n + e.sets.length, 0), 0)
  const [editingRotation, setEditingRotation] = useState(false)
  const moveRoutine = (id: string, amount: number) => setData(current => {
    const routines = [...current.routines]; const index = routines.findIndex(r => r.id === id); const target = index + amount
    if (index < 0 || target < 0 || target >= routines.length) return current
    ;[routines[index], routines[target]] = [routines[target], routines[index]]
    return { ...current, routines }
  })
  return <div className="page home-page">
    <PageHeader eyebrow="Your training" title={last ? 'Ready to move forward?' : 'Start where you are.'} />
    <section className="hero-panel">
      <div className="contour" aria-hidden="true"><i /><i /><i /></div>
      <div className="hero-copy"><p className="overline">Next session</p><div className="next-session-title"><h2>{next?.name ?? 'Create a workout'}</h2>{next && <ChoiceMenu label="Choose your next session" value={next.id} options={active.map(r => ({ value: r.id, label: r.name }))} onChange={id => { setData(current => ({ ...current, nextRoutineId: id })); toast(`${active.find(r => r.id === id)?.name ?? 'Session'} is next`) }} compact />}</div>
        <p>{draftBlocksNext ? `${draftRoutine?.name} has entered sets and is safely preserved.` : meaningfulDraft && draftRoutine?.id === next?.id ? `Your ${draftRoutine.name} draft is ready to continue.` : 'A focused place for every working set.'}</p>
        {active.length ? <Pressable className="primary-button" onClick={() => startWorkout(draftBlocksNext ? draftRoutine?.id : next?.id)}>{draftBlocksNext ? `Resume ${draftRoutine?.name}` : meaningfulDraft && draftRoutine?.id === next?.id ? 'Continue workout' : 'Start workout'}<ArrowRight weight="bold" /></Pressable> : <Pressable className="primary-button" onClick={() => navigate('workouts')}>Create a workout<Plus weight="bold" /></Pressable>}
      </div>
      <div className="hero-number"><span>{data.sessions.length}</span><small>sessions logged</small></div>
    </section>
    <section className="section-block"><div className="section-heading"><div><p className="eyebrow">In rotation</p><h2>Push · Pull · Legs</h2></div><Pressable className="text-link" onClick={() => setEditingRotation(value => !value)}>{editingRotation ? <><Check />Done</> : <><PencilSimple />Edit rotation</>}</Pressable></div>
      <div className="routine-strip">{active.map((routine, index) => <motion.div layout key={routine.id} className="routine-card-wrap"><motion.button className="routine-card" whileTap={{ y: 2, scale: .985 }} onClick={() => !editingRotation && startWorkout(routine.id)}><span className="routine-index">{String(index + 1).padStart(2, '0')}</span><h3>{routine.name}</h3><p>{routine.exercises.filter(e => !e.archived).length} exercises · {routine.variations.filter(v => !v.archived).length} orders</p><span className="circle-arrow">{editingRotation ? <DotsSixVertical /> : <ArrowRight />}</span></motion.button>{editingRotation && <div className="rotation-controls"><Pressable ariaLabel={`Move ${routine.name} earlier`} disabled={index === 0} onClick={() => moveRoutine(routine.id, -1)}>←</Pressable><Pressable ariaLabel={`Move ${routine.name} later`} disabled={index === active.length - 1} onClick={() => moveRoutine(routine.id, 1)}>→</Pressable><Pressable onClick={() => navigate('workouts')}>Edit</Pressable></div>}</motion.div>)}</div>
    </section>
    <section className="metrics-grid"><Pressable className="metric-card" onClick={() => navigate('progress')}><p>Working sets</p><strong>{totalSets}</strong><span>All recorded sessions</span></Pressable><Pressable className="metric-card" onClick={() => navigate('progress')}><p>Last trained</p><strong className="metric-text">{last ? last.routineName : 'No sessions yet'}</strong><span>{last ? formatDate(last.date) : 'Your history begins here'}</span></Pressable></section>
  </div>
}

function Workouts({ data, setData, startWorkout, toast }: { data: AppData; setData: React.Dispatch<React.SetStateAction<AppData>>; startWorkout: (id: string) => void; toast: (s: string) => void }) {
  const [editing, setEditing] = useState<Routine | null>(null)
  const [newName, setNewName] = useState('')
  const addRoutine = () => {
    const name = newName.trim(); if (!name) return
    const routine: Routine = { id: uid(), name, exercises: [], variations: [{ id: uid(), name: 'Standard order', exerciseIds: [] }] }
    setData(d => ({ ...d, routines: [...d.routines, routine] })); setNewName(''); setEditing(routine); toast('Workout created')
  }
  return <div className="page"><PageHeader eyebrow="Build your rotation" title="Workouts" action={<span className="count-badge">{data.routines.filter(r => !r.archived).length} active</span>} />
    <div className="stack-list">{data.routines.filter(r => !r.archived).map((routine, index) => <motion.article layout key={routine.id} className="workout-list-card">
      <button className="drag-handle" aria-label={`Reorder ${routine.name}`}><DotsSixVertical /></button><div className="list-card-copy"><span>{String(index + 1).padStart(2, '0')}</span><h2>{routine.name}</h2><p>{routine.exercises.filter(e => !e.archived).map(e => e.name).join(' · ') || 'Add your first exercise'}</p></div>
      <div className="list-actions"><Pressable className="secondary-button" onClick={() => setEditing(routine)}>Edit</Pressable><Pressable className="round-button" onClick={() => startWorkout(routine.id)} ariaLabel={`Start ${routine.name}`}><ArrowRight /></Pressable></div>
    </motion.article>)}</div>
    <form className="inline-create" onSubmit={e => { e.preventDefault(); addRoutine() }}><label htmlFor="routine-name">New workout</label><div><input id="routine-name" value={newName} onChange={e => setNewName(e.target.value)} placeholder="Upper, Full body, Arms…" /><Pressable type="submit" className="primary-button" disabled={!newName.trim()}><Plus /> Add</Pressable></div></form>
    <details className="archive-drawer"><summary><Archive /> Archived workouts <span>{data.routines.filter(r => r.archived).length}</span></summary>{data.routines.filter(r => r.archived).map(r => <button key={r.id} onClick={() => setData(d => ({ ...d, routines: d.routines.map(item => item.id === r.id ? { ...item, archived: false } : item) }))}>{r.name}<Repeat /></button>)}</details>
    <AnimatePresence>{editing && <RoutineEditor routine={data.routines.find(r => r.id === editing.id) ?? editing} onClose={() => setEditing(null)} setData={setData} toast={toast} />}</AnimatePresence>
  </div>
}

function RoutineEditor({ routine, onClose, setData, toast }: { routine: Routine; onClose: () => void; setData: React.Dispatch<React.SetStateAction<AppData>>; toast: (s: string) => void }) {
  const [exerciseName, setExerciseName] = useState('')
  const update = (next: Routine) => setData(d => ({ ...d, routines: d.routines.map(r => r.id === next.id ? next : r) }))
  const move = (index: number, amount: number) => {
    const exercises = [...routine.exercises]; const target = index + amount; if (target < 0 || target >= exercises.length) return
    ;[exercises[index], exercises[target]] = [exercises[target], exercises[index]]
    const ids = exercises.filter(e => !e.archived).map(e => e.id)
    update({ ...routine, exercises, variations: routine.variations.map((v, i) => i === 0 ? { ...v, exerciseIds: ids } : v) })
  }
  return <Sheet title="Edit workout" onClose={onClose} wide><div className="field"><label htmlFor="edit-routine-name">Workout name</label><input id="edit-routine-name" value={routine.name} onChange={e => update({ ...routine, name: e.target.value })} /></div>
    <div className="editor-section"><div className="section-heading small"><h3>Exercises</h3><span>Changes apply to future sessions</span></div>
      <div className="exercise-editor-list">{routine.exercises.filter(e => !e.archived).map((exercise, index) => <div className="exercise-editor-row" key={exercise.id}><DotsSixVertical /><input aria-label="Exercise name" value={exercise.name} onChange={e => { const name = e.target.value; setData(current => renameExerciseForFutureWorkouts(current, exercise.id, name)) }} /><div><button onClick={() => move(index, -1)} aria-label="Move up">↑</button><button onClick={() => move(index, 1)} aria-label="Move down">↓</button><button onClick={() => update({ ...routine, exercises: routine.exercises.map(x => x.id === exercise.id ? { ...x, archived: true } : x), variations: routine.variations.map(v => ({ ...v, exerciseIds: v.exerciseIds.filter(id => id !== exercise.id) })) })} aria-label="Archive exercise"><Archive /></button></div></div>)}</div>
      <form className="mini-form" onSubmit={e => { e.preventDefault(); if (!exerciseName.trim()) return; const exercise: Exercise = { id: uid(), name: exerciseName.trim(), aliases: [], bodyweight: false }; update({ ...routine, exercises: [...routine.exercises, exercise], variations: routine.variations.map((v, i) => i === 0 ? { ...v, exerciseIds: [...v.exerciseIds, exercise.id] } : v) }); setExerciseName('') }}><input value={exerciseName} onChange={e => setExerciseName(e.target.value)} placeholder="Exercise name" aria-label="New exercise name" /><Pressable className="icon-button" type="submit" ariaLabel="Add exercise"><Plus /></Pressable></form>
    </div>
    <div className="editor-section"><div className="section-heading small"><h3>Named orders</h3></div>{routine.variations.filter(v => !v.archived).map(v => <div className="variation-row" key={v.id}><div><strong>{v.name}</strong><span>{v.exerciseIds.map(id => routine.exercises.find(e => e.id === id)?.name).filter(Boolean).join(' → ') || 'No exercises'}</span></div></div>)}</div>
    <div className="sheet-footer"><Pressable className="danger-text" onClick={() => { update({ ...routine, archived: true }); onClose(); toast('Workout archived') }}><Archive /> Archive workout</Pressable><Pressable className="primary-button" onClick={() => { onClose(); toast('Changes saved') }}><Check /> Done</Pressable></div>
  </Sheet>
}

function WorkoutLog({ data, setData, routineId, navigate, toast }: { data: AppData; setData: React.Dispatch<React.SetStateAction<AppData>>; routineId: string; navigate: (v: View) => void; toast: (s: string) => void }) {
  const routine = data.routines.find(r => r.id === (data.draft?.routineId || routineId)) ?? data.routines[0]
  const variation = routine?.variations.find(v => v.id === data.draft?.variationId) ?? routine?.variations.find(v => !v.archived)
  const [note, setNote] = useState(data.draft?.note ?? '')
  const [date, setDate] = useState(data.draft?.date ?? today())
  const [order, setOrder] = useState<string[]>(data.draft?.order ?? variation?.exerciseIds ?? [])
  const [autoSaveState, setAutoSaveState] = useState<'draft' | 'saving' | 'saved' | 'issue'>('draft')
  const [liveSessionId, setLiveSessionId] = useState(data.draft?.editingSessionId)
  const [newOrderPrompt, setNewOrderPrompt] = useState(false)
  const [newOrderName, setNewOrderName] = useState('')
  const [addingExercise, setAddingExercise] = useState(false)
  const [editingRestTimes, setEditingRestTimes] = useState(false)
  const [addedExerciseName, setAddedExerciseName] = useState('')
  const [timer, setTimer] = useState<RestTimer | null>(null)
  const [restAlertsEnabled, setRestAlertsEnabled] = useState(() => localStorage.getItem(REST_ALERTS_KEY) === 'true')
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission | 'unsupported'>(() => typeof Notification === 'undefined' ? 'unsupported' : Notification.permission)
  const [ghostScroll, setGhostScroll] = useState(0)
  const audioContextRef = useRef<AudioContext | null>(null)
  const notifiedTimerRef = useRef<string | undefined>(undefined)
  const exercises = routine?.exercises.filter(e => !e.archived) ?? []
  const result = useMemo(() => parseWorkoutNote(note, exercises), [note, exercises])
  const setHighWater = useRef<Record<string, number> | null>(null)
  if (setHighWater.current === null) setHighWater.current = Object.fromEntries(result.exercises.map(entry => [entry.exercise.id, entry.sets.length]))
  useEffect(() => {
    if (!routine) return
    const timeout = window.setTimeout(() => setData(d => ({ ...d, draft: { routineId: routine.id, variationId: variation?.id, date, note, order, editingSessionId: liveSessionId, updatedAt: new Date().toISOString() } })), 250)
    return () => clearTimeout(timeout)
  }, [note, date, order, routine?.id, variation?.id, liveSessionId, setData])
  useEffect(() => {
    if (!timer?.running || !timer.endAt || timer.remaining <= 0) return
    const updateFromClock = () => setTimer(current => {
      if (!current?.running || !current.endAt) return current
      const remaining = remainingRestSeconds(current.endAt)
      if (remaining === current.remaining) return current
      return { ...current, remaining, running: remaining > 0, endAt: remaining > 0 ? current.endAt : undefined }
    })
    updateFromClock()
    const interval = window.setInterval(updateFromClock, 250)
    document.addEventListener('visibilitychange', updateFromClock)
    return () => { window.clearInterval(interval); document.removeEventListener('visibilitychange', updateFromClock) }
  }, [timer?.running, timer?.endAt])
  useEffect(() => {
    if (!timer || timer.remaining !== 0 || notifiedTimerRef.current === timer.id) return
    notifiedTimerRef.current = timer.id
    if (!restAlertsEnabled) return
    const originalTitle = document.title
    document.title = 'Rest complete · Optimal Lifts'
    window.setTimeout(() => { if (document.title === 'Rest complete · Optimal Lifts') document.title = originalTitle }, 8000)
    navigator.vibrate?.([160, 80, 160])
    const context = audioContextRef.current
    if (context) {
      context.resume().then(() => {
        const now = context.currentTime
        ;[0, .18].forEach((offset, index) => {
          const oscillator = context.createOscillator(), gain = context.createGain()
          oscillator.frequency.value = index ? 740 : 560; gain.gain.setValueAtTime(.0001, now + offset); gain.gain.exponentialRampToValueAtTime(.16, now + offset + .015); gain.gain.exponentialRampToValueAtTime(.0001, now + offset + .14)
          oscillator.connect(gain); gain.connect(context.destination); oscillator.start(now + offset); oscillator.stop(now + offset + .15)
        })
      }).catch(() => undefined)
    }
    if (notificationPermission === 'granted' && document.visibilityState !== 'visible') {
      try { new Notification('Rest complete', { body: `Ready for your next ${timer.name} set.`, icon: '/icon-192.png', tag: 'optimal-lifts-rest' }) }
      catch { /* Some mobile browsers expose permission but require service-worker push. */ }
    }
  }, [timer?.id, timer?.remaining, restAlertsEnabled, notificationPermission])
  if (!routine) return null
  const orderedExercises = order.map(id => exercises.find(exercise => exercise.id === id)).filter((exercise): exercise is Exercise => Boolean(exercise))
  const previousRecordFor = (id: string) => {
    const priorSessions = data.sessions.filter(session => session.id !== liveSessionId)
    const sameOrder = [...priorSessions].reverse().find(session => session.routineId === routine.id && session.variationId === variation?.id && session.exercises.some(exercise => exercise.exerciseId === id))
    const fallback = [...priorSessions].reverse().find(session => session.routineId === routine.id && session.exercises.some(exercise => exercise.exerciseId === id))
    const session = sameOrder ?? fallback
    return session ? { session, exercise: session.exercises.find(exercise => exercise.exerciseId === id)! } : undefined
  }
  const restFor = (exercise: Exercise) => data.restSeconds?.[exercise.id] ?? recommendedRest(exercise.name)
  const enableRestAlerts = async () => {
    setRestAlertsEnabled(true); localStorage.setItem(REST_ALERTS_KEY, 'true')
    const AudioContextCtor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (AudioContextCtor) { audioContextRef.current ??= new AudioContextCtor(); await audioContextRef.current.resume().catch(() => undefined) }
    let permission = notificationPermission
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') permission = await Notification.requestPermission()
    if (typeof Notification !== 'undefined') { permission = Notification.permission; setNotificationPermission(permission) }
    toast(permission === 'granted' ? 'Rest alerts enabled while the app is open' : 'Sound and vibration alerts enabled')
  }
  const disableRestAlerts = () => { setRestAlertsEnabled(false); localStorage.removeItem(REST_ALERTS_KEY); toast('Rest alerts turned off') }
  const startRest = (exercise: Exercise) => {
    const duration = restFor(exercise)
    setTimer({ id: uid(), exerciseId: exercise.id, name: exercise.name, duration, remaining: duration, running: true, endAt: Date.now() + duration * 1000 })
  }
  const adjustActiveTimer = (seconds: number) => {
    if (!timer) return
    const duration = Math.min(600, Math.max(30, timer.duration + seconds))
    setTimer(current => {
      if (!current) return null
      const remaining = Math.min(600, Math.max(0, current.remaining + seconds))
      return { ...current, duration, remaining, running: current.running && remaining > 0, endAt: current.running && remaining > 0 ? Date.now() + remaining * 1000 : undefined }
    })
    setData(current => ({ ...current, restSeconds: { ...current.restSeconds, [timer.exerciseId]: duration } }))
  }
  const buildSession = (id: string, matched: Variation | undefined, entries = result.exercises): Session => ({
    id, date, savedAt: new Date().toISOString(), routineId: routine.id, routineName: routine.name,
    variationId: matched?.id, variationName: matched?.name, orderKind: matched ? 'variation' : 'one-off',
    actualExerciseOrder: entries.map(entry => entry.exercise.id),
    exercises: entries.map((entry, index) => ({ exerciseId: entry.exercise.id, exerciseName: entry.exercise.name, position: index + 1, sets: entry.sets, comment: entry.comment })),
    comment: result.sessionComment, rawNote: note,
  })
  useEffect(() => {
    if (!routine) return
    const currentCounts = Object.fromEntries(result.exercises.map(entry => [entry.exercise.id, entry.sets.length]))
    if (result.issues.length) { setAutoSaveState('issue'); return }
    if (!result.exercises.length) { setAutoSaveState('draft'); return }
    setAutoSaveState('saving')
    const timeout = window.setTimeout(() => {
      const id = liveSessionId ?? uid()
      const session = buildSession(id, variation)
      setData(current => ({
        ...current,
        sessions: current.sessions.some(item => item.id === id) ? current.sessions.map(item => item.id === id ? session : item) : [...current.sessions, session],
        draft: { routineId: routine.id, variationId: variation?.id, date, note, order, editingSessionId: id, updatedAt: new Date().toISOString() },
      }))
      if (!liveSessionId) setLiveSessionId(id)
      const advanced = advanceSetHighWater(currentCounts, setHighWater.current ?? {})
      setHighWater.current = advanced.next
      const newlyCompleted = [...result.exercises].reverse().find(entry => advanced.addedExerciseIds.includes(entry.exercise.id))
      if (newlyCompleted) startRest(newlyCompleted.exercise)
      setAutoSaveState('saved')
    }, 1100)
    return () => window.clearTimeout(timeout)
  }, [note, date, variation?.id])
  const finish = () => {
    if (!result.exercises.length || result.issues.length) return
    const actualOrder = result.exercises.map(e => e.exercise.id)
    const exact = routine.variations.find(v => !v.archived && v.exerciseIds.filter(id => actualOrder.includes(id)).join('|') === actualOrder.join('|'))
    if (!exact) { setNewOrderPrompt(true); return }
    finalize(exact)
  }
  const finalize = (matched?: Variation, name?: string) => {
    const actualOrder = result.exercises.map(e => e.exercise.id)
    const created = name?.trim() ? { id: uid(), name: name.trim(), exerciseIds: actualOrder } : undefined
    const exact = matched ?? created
    const id = liveSessionId ?? uid()
    const session = buildSession(id, exact)
    setData(d => ({ ...d, routines: created ? d.routines.map(r => r.id === routine.id ? { ...r, variations: [...r.variations, created] } : r) : d.routines, sessions: d.sessions.some(item => item.id === id) ? d.sessions.map(item => item.id === id ? session : item) : [...d.sessions, session], draft: undefined, drafts: d.drafts?.filter(draft => draft.routineId !== routine.id) }))
    setNewOrderPrompt(false)
    toast('Workout finished'); window.setTimeout(() => navigate('progress'), 450)
  }
  const completedIds = new Set(result.exercises.map(entry => entry.exercise.id))
  const ghostLines = note.split(/\r?\n/).map((line, index) => {
    const exercise = exercises.find(item => line.trim().toLowerCase() === item.name.toLowerCase())
    const previous = exercise && !completedIds.has(exercise.id) ? previousRecordFor(exercise.id) : undefined
    return <div className="ghost-line" key={`${index}-${exercise?.id ?? 'blank'}`}><span>{line || '\u00a0'}</span>{previous && <em>{previous.exercise.sets.map(set => `${set.bodyweight && !set.weight ? 'BW' : set.weight}×${set.reps}`).join('  ')}</em>}</div>
  })
  return <div className="page log-page"><div className="log-top"><Pressable className="back-button" onClick={() => navigate('workouts')}><ArrowLeft /> Workouts</Pressable><div className={`draft-indicator ${autoSaveState}`}><i />{autoSaveState === 'saved' ? 'Session saved automatically' : autoSaveState === 'saving' ? 'Saving…' : autoSaveState === 'issue' ? 'Fix highlighted text to save' : 'Draft saved locally'}</div></div>
    <div className="log-heading"><div><p className="eyebrow">Workout note</p><h1>{routine.name}</h1></div><label className="date-field"><CalendarBlank /><input type="date" value={date} onChange={e => setDate(e.target.value)} aria-label="Workout date" /></label></div>
    <div className="variation-picker"><span>Order</span><ChoiceMenu label="Workout order" value={variation?.id ?? ''} options={routine.variations.filter(v => !v.archived).map(v => ({ value: v.id, label: v.name }))} onChange={id => { const v = routine.variations.find(x => x.id === id); if (v) { setOrder(v.exerciseIds); setData(d => ({ ...d, draft: d.draft ? { ...d.draft, variationId: v.id } : d.draft })) } }} /></div>
    <AnimatePresence>{timer && <motion.section className={timer.remaining === 0 ? 'rest-timer complete' : 'rest-timer'} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} aria-live="polite"><div><span>{timer.remaining === 0 ? 'Ready for your next set' : `Resting after ${timer.name}`}</span><strong>{formatTimer(timer.remaining)}</strong><small>±15 seconds saves as this exercise’s default · {restAlertsEnabled ? 'alerts on' : <button className="rest-alert-link" onClick={enableRestAlerts}><BellRinging /> Enable alert</button>}</small></div><div className="rest-actions"><Pressable onClick={() => adjustActiveTimer(-15)}>−15</Pressable>{timer.remaining > 0 && <Pressable className="timer-control" onClick={() => setTimer(current => current ? current.running ? { ...current, running: false, endAt: undefined } : { ...current, running: true, endAt: Date.now() + current.remaining * 1000 } : null)} ariaLabel={timer.running ? 'Pause timer' : 'Resume timer'}>{timer.running ? <Pause weight="fill" /> : <Play weight="fill" />}</Pressable>}<Pressable onClick={() => adjustActiveTimer(15)}>+15</Pressable><Pressable onClick={() => setTimer(null)}>{timer.remaining === 0 ? 'Done' : 'Cancel'}</Pressable></div></motion.section>}</AnimatePresence>
    <div className="logger-grid"><section className="note-panel"><div className="note-label-row"><label htmlFor="workout-note">Write it how you trained</label><div><Pressable onClick={() => setEditingRestTimes(true)}><ClockCountdown />Rest times</Pressable><Pressable onClick={() => setAddingExercise(true)}><Plus />Exercise</Pressable></div></div><div className="note-editor"><div className="previous-ghost" aria-hidden="true" style={{ transform: `translateY(-${ghostScroll}px)` }}>{ghostLines}</div><textarea id="workout-note" value={note} onChange={e => { setNote(e.target.value); setAutoSaveState('draft') }} onScroll={event => setGhostScroll(event.currentTarget.scrollTop)} placeholder={'Pull Up 70x8 70x5\nSeated Row 130x10 130x8\n\nFelt strong today'} autoFocus /></div><div className="note-footer"><span><Sparkle /> Complete sets save after you pause</span><span>{note.length} characters</span></div><div className="parse-summary" aria-live="polite">{result.exercises.length ? result.exercises.map(entry => <span key={entry.exercise.id}><Check />{entry.exercise.name} · {entry.sets.length} set{entry.sets.length === 1 ? '' : 's'}</span>) : <p>Faint numbers are your previous workout. Type your new sets over them.</p>}</div>{result.issues.map(issue => <div className="parse-issue" key={`${issue.line}-${issue.text}`}><WarningCircle weight="fill" /><div><strong>Line {issue.line}: {issue.message}</strong><span>{issue.text}</span></div></div>)}</section>
      <CoachPanel sessions={data.sessions} /></div>
    <div className="sticky-save auto-save"><div><strong>{result.exercises.reduce((n, e) => n + e.sets.length, 0)} sets {autoSaveState === 'saved' ? 'saved' : 'recognized'}</strong><span>{result.issues.length ? `${result.issues.length} item${result.issues.length > 1 ? 's' : ''} needs attention` : autoSaveState === 'saving' ? 'Updating this session…' : 'Every complete set is saved automatically'}</span></div><Pressable className="primary-button" onClick={finish} disabled={!result.exercises.length || !!result.issues.length}>Finish workout <Check weight="bold" /></Pressable></div>
    <WorkoutDayProgress routine={routine} variation={variation} sessions={data.sessions} navigate={navigate} />
    <AnimatePresence>{newOrderPrompt && <Sheet title="New exercise order" onClose={() => setNewOrderPrompt(false)}><div className="order-choice"><p>This order doesn’t match a saved variation. Keep its context with this session.</p><div className="order-preview">{result.exercises.map((entry, index) => <span key={entry.exercise.id}><i>{index + 1}</i>{entry.exercise.name}</span>)}</div><div className="field"><label htmlFor="order-name">Save as a named variation</label><input id="order-name" value={newOrderName} onChange={e => setNewOrderName(e.target.value)} placeholder="e.g. Rows first" /></div></div><div className="sheet-footer"><Pressable className="secondary-button" onClick={() => finalize()}>Use once</Pressable><Pressable className="primary-button" disabled={!newOrderName.trim()} onClick={() => finalize(undefined, newOrderName)}>Save variation</Pressable></div></Sheet>}</AnimatePresence>
    <AnimatePresence>{editingRestTimes && <Sheet title="Rest times" onClose={() => setEditingRestTimes(false)}><p className="sheet-help rest-help">These timers start automatically after a new complete set. Editing or retyping an existing set won’t restart one.</p><div className={restAlertsEnabled ? 'rest-alert-setting enabled' : 'rest-alert-setting'}><span><BellRinging weight="fill" /></span><div><strong>Rest-complete alerts</strong><p>{restAlertsEnabled ? notificationPermission === 'granted' ? 'Sound, vibration, and background alerts work while Optimal Lifts stays open.' : 'Sound and vibration work while Optimal Lifts stays open.' : 'Hear and feel when it’s time for your next set.'}</p></div><Pressable onClick={restAlertsEnabled ? disableRestAlerts : enableRestAlerts}>{restAlertsEnabled ? 'Turn off' : 'Enable'}</Pressable></div><div className="rest-time-list">{orderedExercises.map(exercise => { const seconds = restFor(exercise); return <div className="rest-time-row" key={exercise.id}><div><strong>{exercise.name}</strong><span>{formatTimer(seconds)}</span></div><div><Pressable ariaLabel={`Reduce rest for ${exercise.name}`} onClick={() => setData(current => ({ ...current, restSeconds: { ...current.restSeconds, [exercise.id]: Math.max(30, seconds - 15) } }))}>−15</Pressable><Pressable ariaLabel={`Increase rest for ${exercise.name}`} onClick={() => setData(current => ({ ...current, restSeconds: { ...current.restSeconds, [exercise.id]: Math.min(600, seconds + 15) } }))}>+15</Pressable></div></div> })}</div><div className="sheet-footer"><Pressable className="secondary-button" onClick={() => setData(current => ({ ...current, restSeconds: { ...current.restSeconds, ...Object.fromEntries(orderedExercises.map(exercise => [exercise.id, recommendedRest(exercise.name)])) } }))}>Reset defaults</Pressable><Pressable className="primary-button" onClick={() => setEditingRestTimes(false)}>Done</Pressable></div></Sheet>}</AnimatePresence>
    <AnimatePresence>{addingExercise && <Sheet title="Add an exercise" onClose={() => setAddingExercise(false)}><div className="field"><label htmlFor="new-live-exercise">Exercise name</label><input id="new-live-exercise" value={addedExerciseName} onChange={e => setAddedExerciseName(e.target.value)} placeholder="e.g. Chest-supported row" autoFocus /></div><p className="sheet-help">It will be available in this workout immediately. Add its sets to your note after saving.</p><div className="sheet-footer"><Pressable className="secondary-button" onClick={() => setAddingExercise(false)}>Cancel</Pressable><Pressable className="primary-button" disabled={!addedExerciseName.trim()} onClick={() => { const exercise: Exercise = { id: uid(), name: addedExerciseName.trim(), aliases: [], bodyweight: false }; setData(d => ({ ...d, routines: d.routines.map(r => r.id === routine.id ? { ...r, exercises: [...r.exercises, exercise], variations: r.variations.map(v => v.id === variation?.id ? { ...v, exerciseIds: [...v.exerciseIds, exercise.id] } : v) } : r), draft: d.draft ? { ...d.draft, order: [...d.draft.order, exercise.id] } : d.draft })); setOrder(current => [...current, exercise.id]); setAddedExerciseName(''); setAddingExercise(false); toast('Exercise added') }}>Add exercise</Pressable></div></Sheet>}</AnimatePresence>
  </div>
}

const recommendedRest = (name: string) => {
  const normalized = name.toLowerCase()
  if (/leg press|rdl|romanian|deadlift|squat|incline.*press|pull[ -]?up/.test(normalized)) return 180
  if (/shoulder press|chest press|row|pulldown/.test(normalized)) return 150
  return 120
}
const formatTimer = (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`

function WorkoutDayProgress({ routine, variation, sessions, navigate }: { routine: Routine; variation?: Variation; sessions: Session[]; navigate: (view: View) => void }) {
  const available = routine.exercises.filter(exercise => !exercise.archived)
  const [exerciseId, setExerciseId] = useState(available[0]?.id ?? '')
  const exercise = available.find(item => item.id === exerciseId) ?? available[0]
  useEffect(() => { if (!available.some(item => item.id === exerciseId)) setExerciseId(available[0]?.id ?? '') }, [routine.id, exerciseId, available])
  if (!exercise) return null
  const sameOrderRecords = sessions.filter(session => session.routineId === routine.id && session.variationId === variation?.id).flatMap(session => session.exercises.filter(item => item.exerciseId === exercise.id).map(item => ({ session, exercise: item })))
  const records = sameOrderRecords.slice(-8)
  const metric: ChartMetric = exercise.bodyweight ? 'reps' : 'performance'
  const points = records.map(record => ({ date: record.session.date, value: sessionMetric(record.exercise.sets, metric), item: record }))
  return <section className="day-progress"><div className="day-progress-heading"><div><p className="eyebrow">Progress for this workout</p><h2>{exercise.name}</h2><span>{exercise.bodyweight ? 'Best reps' : 'Rep-adjusted weight'} · {variation?.name ?? 'Order unknown'}</span></div><ChoiceMenu label="Exercise" value={exercise.id} options={available.map(item => ({ value: item.id, label: item.name }))} onChange={setExerciseId} /></div>{points.length > 1 ? <LineChart points={points} label={exercise.bodyweight ? 'Best repetitions' : 'Rep-adjusted weight'} unit={exercise.bodyweight ? ' reps' : ' lb score'} onPointClick={() => navigate('progress')} /> : <div className="day-progress-empty"><ChartLineUp /><p>Save at least two {exercise.name} sessions in this order to draw the line.</p></div>}<div className="day-progress-footer"><span>{records.length} same-order session{records.length === 1 ? '' : 's'}</span><Pressable className="text-link" onClick={() => navigate('progress')}>Open full progress <ArrowRight /></Pressable></div></section>
}

function ChoiceMenu({ label, value, options, onChange, compact = false }: { label: string; value: string; options: { value: string; label: string; description?: string }[]; onChange: (value: string) => void; compact?: boolean }) {
  const [open, setOpen] = useState(false)
  const selected = options.find(option => option.value === value)
  const choices = <div className="choice-list">{options.map(option => <Pressable key={option.value} className={option.value === value ? 'choice-option selected' : 'choice-option'} onClick={() => { onChange(option.value); setOpen(false) }}><span><strong>{option.label}</strong>{option.description && <small>{option.description}</small>}</span>{option.value === value && <Check weight="bold" />}</Pressable>)}</div>
  const fullScreenChoice = compact && open ? createPortal(<motion.div className="full-choice-layer" role="dialog" aria-modal="true" aria-label={label} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><div className="full-choice-top"><div><p>Up next</p><h2>{label}</h2></div><Pressable className="full-choice-close" onClick={() => setOpen(false)} ariaLabel="Close"><X /></Pressable></div>{choices}<p className="full-choice-hint">Your selection updates the Home screen immediately.</p></motion.div>, document.body) : null
  return <><Pressable className={compact ? 'choice-button compact' : 'choice-button'} onClick={() => setOpen(true)} ariaLabel={label}><span>{compact ? 'Change' : selected?.label ?? 'Choose'}</span><CaretDown weight="bold" /></Pressable>{fullScreenChoice}<AnimatePresence>{open && !compact && <Sheet title={label} onClose={() => setOpen(false)}>{choices}</Sheet>}</AnimatePresence></>
}

function CoachPanel({ sessions }: { sessions: Session[] }) {
  const [question, setQuestion] = useState('')
  const [messages, setMessages] = useState<{ role: 'user' | 'coach'; text: string }[]>([])
  const [status, setStatus] = useState<'idle' | 'asking'>('idle')
  const [error, setError] = useState('')
  const ask = async () => {
    const text = question.trim(); if (!text || status === 'asking') return
    setMessages(current => [...current, { role: 'user', text }]); setQuestion(''); setError(''); setStatus('asking')
    const history = [...sessions].sort((a, b) => b.savedAt.localeCompare(a.savedAt)).slice(0, 30).map(session => ({ date: session.date, routine: session.routineName, variation: session.variationName, orderKind: session.orderKind, comment: session.comment, exercises: session.exercises.map(exercise => ({ name: exercise.exerciseName, position: exercise.position, comment: exercise.comment, sets: exercise.sets.map(set => ({ weight: set.weight, reps: set.reps, bodyweight: set.bodyweight })) })) }))
    try {
      const accessToken = await getCloudAccessToken()
      if (!accessToken) throw new Error('Sign in under Settings before using AI coaching.')
      const response = await fetch('/api/coach', { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${accessToken}` }, body: JSON.stringify({ question: text, sessions: history }) })
      const body = await response.json() as { answer?: string; message?: string; code?: string }
      if (!response.ok) throw new Error(body.message || 'The coach is unavailable.')
      setMessages(current => [...current, { role: 'coach', text: body.answer ?? 'I could not form an answer from that history.' }])
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'The coach is unavailable. Your workout data is unchanged.') }
    finally { setStatus('idle') }
  }
  return <section className="coach-panel"><header><div className="coach-mark"><ChatCircleText weight="fill" /></div><div><p className="eyebrow">Optimal coach</p><h2>Ask about your training</h2></div><span className="model-chip">Gemini</span></header><div className="coach-feed">{!messages.length && <div className="coach-intro"><p>I can compare recent sessions, spot rep or load trends, and answer from the workouts you’ve saved.</p><div className="suggestion-list">{['What should I try to beat today?', 'How is my pull-up progressing?', 'Compare my last two leg sessions.'].map(item => <Pressable key={item} onClick={() => setQuestion(item)}>{item}<ArrowRight /></Pressable>)}</div></div>}{messages.map((message, index) => <div key={index} className={`chat-bubble ${message.role}`}>{message.text}</div>)}{status === 'asking' && <div className="coach-thinking"><i /><i /><i /></div>}</div>{error && <div className="coach-error"><WarningCircle weight="fill" />{error}</div>}<form className="coach-input" onSubmit={event => { event.preventDefault(); ask() }}><label htmlFor="coach-question" className="sr-only">Ask the workout coach</label><textarea id="coach-question" rows={2} value={question} onChange={event => setQuestion(event.target.value)} placeholder="Ask about your saved workouts…" /><Pressable type="submit" ariaLabel="Ask coach" disabled={!question.trim() || status === 'asking'}><PaperPlaneRight weight="fill" /></Pressable></form><details className="coach-disclosure"><summary>What gets sent to Gemini?</summary><p>Your question and up to 30 recent saved sessions: dates, workout and variation names, exercise order, sets, loads, reps, and comments. Draft text is not sent. Google’s free tier may use submitted content to improve its products.</p></details></section>
}

function Progress({ data, setData, navigate, setRoutineId }: { data: AppData; setData: React.Dispatch<React.SetStateAction<AppData>>; navigate: (v: View) => void; setRoutineId: (id: string) => void }) {
  const activeRoutines = data.routines.filter(routine => !routine.archived)
  const [progressRoutineId, setProgressRoutineId] = useState(activeRoutines[0]?.id ?? '')
  const progressRoutine = data.routines.find(routine => routine.id === progressRoutineId)
  const exerciseOptions = useMemo(() => (progressRoutine?.exercises.filter(exercise => !exercise.archived).map(exercise => [exercise.id, exercise.name] as [string, string]) ?? []), [progressRoutine])
  const [exerciseId, setExerciseId] = useState(exerciseOptions[0]?.[0] ?? '')
  useEffect(() => { if (!exerciseOptions.some(([id]) => id === exerciseId)) setExerciseId(exerciseOptions[0]?.[0] ?? '') }, [progressRoutineId, exerciseOptions, exerciseId])
  const [range, setRange] = useState<'recent' | '3m' | 'all'>('recent')
  const selectedExercise = progressRoutine?.exercises.find(exercise => exercise.id === exerciseId)
  const [metric, setMetric] = useState<ChartMetric>('performance')
  useEffect(() => { if (selectedExercise?.bodyweight && metric === 'performance') setMetric('reps') }, [selectedExercise?.bodyweight, metric])
  const [order, setOrder] = useState(progressRoutine?.variations.find(v => !v.archived)?.id ?? 'all')
  useEffect(() => { setOrder(progressRoutine?.variations.find(v => !v.archived)?.id ?? 'all') }, [progressRoutineId])
  const records = data.sessions.filter(session => session.routineId === progressRoutineId).flatMap(s => s.exercises.filter(e => e.exerciseId === exerciseId).map(e => ({ session: s, exercise: e }))).filter(item => {
    if (range === 'all') return true; const age = Date.now() - new Date(`${item.session.date}T12:00:00`).getTime(); return age <= (range === '3m' ? 92 : 45) * 86400000
  }).filter(item => order === 'all' || item.session.variationId === order).sort((a, b) => a.session.date.localeCompare(b.session.date))
  const points = records.map(r => ({ date: r.session.date, value: sessionMetric(r.exercise.sets, metric), reps: Math.max(...r.exercise.sets.map(s => s.reps)), item: r }))
  const bestWeight = records.length ? Math.max(...records.flatMap(record => record.exercise.sets.map(set => set.weight))) : 0
  const bestReps = points.length ? Math.max(...points.map(p => p.reps)) : 0
  const bestE1rm = records.length ? Math.max(...records.flatMap(r => r.exercise.sets.map(s => estimatedOneRepMax(s.weight, s.reps)))) : 0
  const sessions = [...data.sessions].filter(session => session.routineId === progressRoutineId).sort((a, b) => b.savedAt.localeCompare(a.savedAt))
  const edit = (session: Session) => { setData(d => ({ ...d, draft: { routineId: session.routineId, variationId: session.variationId, date: session.date, note: session.rawNote, order: session.actualExerciseOrder, editingSessionId: session.id, updatedAt: new Date().toISOString() } })); setRoutineId(session.routineId); navigate('log') }
  const metricMeta: Record<ChartMetric, { label: string; unit: string; help: string }> = {
    performance: { label: 'Rep-adjusted weight', unit: ' lb score', help: 'Average across completed sets: weight × (1 + 0.025 × (reps − 1)). This is a weight comparison score—not the load lifted or a 1RM.' },
    weight: { label: 'Highest weight', unit: ' lb', help: 'The heaviest completed set in each session.' },
    reps: { label: 'Best repetitions', unit: ' reps', help: 'The most repetitions completed in one set.' },
    volume: { label: 'Total volume', unit: ' lb', help: 'Weight × repetitions across all completed sets.' },
  }
  const headline = points.length ? Math.max(...points.map(point => point.value)) : 0
  const change = points.length > 1 ? points.at(-1)!.value - points[0].value : 0
  return <div className="page"><PageHeader eyebrow="Measured in context" title="Progress" action={<ChoiceMenu label="Exercise" value={exerciseId} options={exerciseOptions.map(([value, label]) => ({ value, label }))} onChange={setExerciseId} />} />
    <div className="ppl-switch" aria-label="Workout list">{activeRoutines.map(routine => <Pressable key={routine.id} className={progressRoutineId === routine.id ? 'active' : ''} onClick={() => setProgressRoutineId(routine.id)}>{routine.name}</Pressable>)}</div>
    <div className="filter-row"><div className="segmented">{(['recent', '3m', 'all'] as const).map(r => <Pressable key={r} className={range === r ? 'active' : ''} onClick={() => setRange(r)}>{r === 'recent' ? 'Recent' : r === '3m' ? '3 months' : 'All history'}</Pressable>)}</div><ChoiceMenu label="Exercise order" value={order} options={[...(progressRoutine?.variations.filter(v => !v.archived).map(v => ({ value: v.id, label: v.name })) ?? []), { value: 'all', label: 'All orders', description: 'Includes named and one-off orders with context' }]} onChange={setOrder} /></div>
    <div className="metric-switch" aria-label="Chart measurement">{(['performance', 'weight', 'reps', 'volume'] as ChartMetric[]).map(item => <Pressable key={item} className={metric === item ? 'active' : ''} disabled={item === 'performance' && selectedExercise?.bodyweight} onClick={() => setMetric(item)}>{item === 'performance' ? 'Adjusted weight' : item === 'weight' ? 'Weight' : item === 'reps' ? 'Reps' : 'Volume'}</Pressable>)}</div>
    <section className="chart-card"><div className="chart-title"><div><p>{metricMeta[metric].label}</p><strong>{headline ? `${Math.round(headline * 10) / 10}` : '—'}<small>{headline ? metricMeta[metric].unit : ''}</small></strong><small className="metric-explanation">{metricMeta[metric].help}</small></div><div className="chart-context"><span>{order === 'all' ? 'All orders shown with context' : progressRoutine?.variations.find(v => v.id === order)?.name ?? 'Order-aware comparison'}</span>{points.length > 1 && <b className={change >= 0 ? 'positive' : 'negative'}>{change >= 0 ? '+' : ''}{Math.round(change * 10) / 10}{metricMeta[metric].unit} since first</b>}</div></div><LineChart points={points} label={metricMeta[metric].label} unit={metricMeta[metric].unit} onPointClick={point => edit(point.item.session)} />
      {!points.length && <div className="chart-empty"><ChartLineUp /><p>Your chart begins after you save this exercise.</p><button onClick={() => navigate('workouts')}>Start a workout</button></div>}
    </section>
    <div className="stat-triplet"><article><span>Best reps</span><strong>{bestReps || '—'}</strong><small>in one completed set</small></article><article><span>Estimated 1RM</span><strong>{bestE1rm || '—'}{bestE1rm ? <small> lb</small> : ''}</strong><small>Epley estimate: weight × (1 + reps ÷ 30)</small></article><article><span>Sessions</span><strong>{records.length}</strong><small>in this view</small></article></div>
    {!!records.length && <section className="section-block"><div className="section-heading"><h2>Behind the line</h2><span>Tap a session to correct it</span></div><div className="history-mini">{[...records].reverse().map(({ session, exercise }) => <Pressable key={session.id} onClick={() => edit(session)}><span>{formatDate(session.date)}</span><strong>{Math.max(...exercise.sets.map(s => s.weight))} lb</strong><small>#{exercise.position} · {session.variationName ?? 'Order unknown'} · {exercise.sets.map(s => `${s.weight}×${s.reps}`).join(', ')}</small><ArrowRight /></Pressable>)}</div></section>}
    <section className="section-block"><div className="section-heading"><div><p className="eyebrow">Saved sessions</p><h2>{progressRoutine?.name ?? 'Workout'} history</h2></div><span>{sessions.length} sessions</span></div>{!sessions.length ? <div className="progress-history-empty"><p>Your saved {progressRoutine?.name.toLowerCase()} sessions will appear here.</p></div> : <div className="timeline">{sessions.map((session, index) => <Pressable className="session-card" key={session.id} onClick={() => edit(session)}><div className="timeline-date"><strong>{new Date(`${session.date}T12:00`).getDate()}</strong><span>{new Intl.DateTimeFormat('en-US', { month: 'short' }).format(new Date(`${session.date}T12:00`))}</span></div><div className="session-copy"><p>{session.routineName}<span className={session.orderKind === 'one-off' ? 'order-tag one-off' : 'order-tag'}>{session.orderKind === 'one-off' ? 'One-off order' : session.variationName ?? 'Order unknown'}</span></p><h2>{session.exercises.map(e => e.exerciseName).join(', ')}</h2><span>{session.exercises.reduce((n, e) => n + e.sets.length, 0)} working sets · Session {sessions.length - index}</span></div><div className="session-arrow"><NotePencil /><span>Edit</span></div></Pressable>)}</div>}</section>
  </div>
}

function LineChart({ points, label, unit, onPointClick }: { points: { date: string; value: number; item: { session: Session } }[]; label: string; unit: string; onPointClick: (point: { date: string; value: number; item: { session: Session } }) => void }) {
  if (points.length < 2) return <div className="chart-space" />
  const width = 760, height = 280, padX = 42, padTop = 24, padBottom = 48
  const max = Math.max(...points.map(p => p.value)), min = Math.min(...points.map(p => p.value)), spread = max - min || 1
  const coords = points.map((p, i) => ({ ...p, x: padX + i * ((width - padX * 2) / (points.length - 1)), y: height - padBottom - ((p.value - min) / spread) * (height - padTop - padBottom) }))
  const path = coords.map((p, i) => `${i ? 'L' : 'M'} ${p.x} ${p.y}`).join(' ')
  const dateStep = Math.max(1, Math.ceil(points.length / 6))
  const formatAxisDate = (date: string) => new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(new Date(`${date}T12:00:00`))
  return <svg className="line-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`${label} by workout date`}><defs><linearGradient id="area" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#c8ef78" stopOpacity=".72"/><stop offset="1" stopColor="#c8ef78" stopOpacity="0"/></linearGradient></defs>{[0, .5, 1].map(ratio => { const y = padTop + ratio * (height - padTop - padBottom); const value = max - ratio * spread; return <g key={ratio}><line x1={padX} x2={width - padX} y1={y} y2={y} className="chart-gridline"/><text x={padX - 8} y={y + 3} textAnchor="end" className="chart-axis-value">{Math.round(value * 10) / 10}</text></g> })}<path d={`${path} L ${coords.at(-1)!.x} ${height-padBottom} L ${coords[0].x} ${height-padBottom} Z`} fill="url(#area)"/><motion.path d={path} fill="none" stroke="var(--forest)" strokeWidth="3" strokeLinecap="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: .65 }}/>{coords.map((point, index) => <g key={`${point.date}-${index}`} role="button" tabIndex={0} className="chart-point" onClick={() => onPointClick(point)} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') onPointClick(point) }}><title>{formatAxisDate(point.date)}: {Math.round(point.value * 10) / 10}{unit}. Open session.</title><circle cx={point.x} cy={point.y} r="14" fill="transparent"/><circle cx={point.x} cy={point.y} r="5" fill="var(--surface)" stroke="var(--forest)" strokeWidth="3"/>{(index % dateStep === 0 || index === coords.length - 1) && <text x={point.x} y={height - 17} textAnchor="middle" className="chart-date">{formatAxisDate(point.date)}</text>}</g>)}</svg>
}

function Settings({ data, setData, toast, cloud }: { data: AppData; setData: React.Dispatch<React.SetStateAction<AppData>>; toast: (s: string) => void; cloud: CloudState }) {
  const [confirming, setConfirming] = useState<'routines' | 'all' | null>(null)
  return <div className="page"><PageHeader eyebrow="Your app" title="Settings" />
    <section className="settings-group"><div className="settings-title"><h2>Cloud backup</h2><p>Keep the complete workout record available across your signed-in devices.</p></div>{!cloud.configured ? <div className="disclosure"><Info weight="fill" /><div><strong>Supabase setup needed</strong><p>Add the project URL and publishable key to the Vercel environment, then run the included database migration.</p></div></div> : cloud.email ? <><div className="cloud-account"><span className="settings-icon"><Cloud weight="fill" /></span><div><strong>{cloud.email}</strong><small>{cloud.status === 'synced' ? 'Everything is backed up' : cloud.status === 'syncing' ? 'Saving changes…' : cloud.status === 'error' ? 'Sync needs attention' : 'Device copy available'}</small></div><span className={`status-pill ${cloud.status === 'error' ? 'error' : ''}`}>{cloud.status}</span></div>{cloud.message && <p className={cloud.status === 'error' ? 'cloud-message error' : 'cloud-message'}>{cloud.message}</p>}<Pressable className="settings-row" onClick={() => cloud.syncNow()}><span className="settings-icon"><Repeat /></span><div><strong>Sync now</strong><small>Send this device’s latest data to Supabase</small></div><ArrowRight /></Pressable><Pressable className="settings-row" onClick={() => cloud.signOut()}><span className="settings-icon"><ArrowLeft /></span><div><strong>Sign out</strong><small>Your local device copy remains available</small></div><ArrowRight /></Pressable></> : <div className="cloud-signin-prompt"><span className="settings-icon"><LockKey weight="fill" /></span><div><strong>Using this device only</strong><p>Sign-in and cloud backup are temporarily hidden.</p></div></div>}</section>
    <section className="settings-group danger-zone"><div className="settings-title"><h2>Reset</h2><p>These actions require confirmation and cannot be undone.</p></div><button className="settings-row danger" onClick={() => setConfirming('routines')}><span className="settings-icon"><Repeat /></span><div><strong>Reset routines</strong><small>History remains untouched</small></div><ArrowRight /></button><button className="settings-row danger" onClick={() => setConfirming('all')}><span className="settings-icon"><Trash /></span><div><strong>Clear all data</strong><small>Routines, sessions, and drafts</small></div><ArrowRight /></button></section>
    <AnimatePresence>{confirming && <Sheet title={confirming === 'all' ? 'Clear all data?' : 'Reset routines?'} onClose={() => setConfirming(null)}><div className="confirm-copy"><WarningCircle weight="fill" /><p>{confirming === 'all' ? 'Every saved session and unfinished draft will be removed from this account and device.' : 'Your workout lists will return to the starter setup. Saved session history will remain unchanged.'}</p></div><div className="sheet-footer"><Pressable className="secondary-button" onClick={() => setConfirming(null)}>Cancel</Pressable><Pressable className="danger-button" onClick={() => { if (confirming === 'all') { clearData(); setData(createSeedData()) } else setData(d => ({ ...d, routines: createSeedData().routines, draft: undefined })); setConfirming(null); toast(confirming === 'all' ? 'All data cleared' : 'Routines reset') }}>{confirming === 'all' ? 'Clear everything' : 'Reset routines'}</Pressable></div></Sheet>}</AnimatePresence>
  </div>
}

function Sheet({ title, onClose, children, wide }: { title: string; onClose: () => void; children: React.ReactNode; wide?: boolean }) {
  return <motion.div className="sheet-layer" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><motion.button className="sheet-scrim" onClick={onClose} aria-label="Close" /><motion.section className={wide ? 'sheet wide' : 'sheet'} role="dialog" aria-modal="true" aria-label={title} initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', stiffness: 330, damping: 32 }}><div className="sheet-handle" /><header><h2>{title}</h2><Pressable className="icon-button" onClick={onClose} ariaLabel="Close"><X /></Pressable></header><div className="sheet-body">{children}</div></motion.section></motion.div>
}

export default App
