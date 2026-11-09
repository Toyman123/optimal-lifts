import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import {
  Archive, ArrowLeft, ArrowRight, Barbell, BellRinging, CalendarBlank, CaretDown, ChartLineUp,
  ChatCircleText, Check, ClockCountdown, DotsSixVertical, Gear, House, Info,
  LockKey, NotePencil, SignOut, PaperPlaneRight, Pause, PencilSimple, Play, Plus, Repeat, Sparkle, Trash, WarningCircle, X,
} from '@phosphor-icons/react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Landing } from './Landing'
import { AuthScreen } from './AuthScreen'
import { Dashboard } from './Dashboard'
import { WorkoutDays } from './Workouts'
import { ProgressChart } from './ProgressChart'
import { BrandMark } from './BrandMark'
import { GeminiWorkoutEntry } from './GeminiWorkoutEntry'
import { createSeedData } from './data'
import { renameExerciseForFutureWorkouts } from './exercises'
import { getCloudAccessToken, useCloudSync, type CloudState } from './cloud'
import { estimatedOneRepMax, parseWorkoutNote } from './parser'
import { sessionMetric, type ChartMetric } from './progress'
import { clearData, loadData, saveData } from './storage'
import { newlyLoggedExerciseIds } from './timer'
import { reorderWorkoutNote } from './workout-note'
import { useRestTimer, type RestControls } from './useRestTimer'
import type { AppData, Draft, Exercise, Routine, Session, Variation } from './types'

type View = 'landing' | 'home' | 'workouts' | 'log' | 'progress' | 'settings'
function viewFromHash(): View { const route = window.location.hash.replace(/^#\/?/, ''); return route === 'dashboard' ? 'home' : ['workouts', 'progress', 'settings', 'log'].includes(route) ? route as View : 'landing' }
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

const DumbbellMark = BrandMark

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
  const [view, setView] = useState<View>(() => viewFromHash())
  const [selectedRoutineId, setSelectedRoutineId] = useState(() => data.draft?.routineId || data.nextRoutineId || data.routines.find(r => !r.archived)?.id || '')
  const [notice, setNotice] = useState('')
  const [pendingRoutineId, setPendingRoutineId] = useState<string | null>(null)
  const [storageError, setStorageError] = useState('')
  const loaded = useRef(false)

  useEffect(() => {
    if (!loaded.current) { loaded.current = true; return }
    try { saveData(data); setStorageError('') }
    catch { setStorageError('This browser could not save your changes. Keep this tab open and free up browser storage before closing it.') }
  }, [data])

  useEffect(() => { const update = () => { if (['#landing-main', '#main-content', '#the-details'].includes(window.location.hash)) return; setView(viewFromHash()); window.scrollTo({ top: 0 }) }; window.addEventListener('hashchange', update); return () => window.removeEventListener('hashchange', update) }, [])
  const navigate = (next: View) => { setView(next); window.location.hash = next === 'home' ? 'dashboard' : next === 'landing' ? '/' : next; window.scrollTo({ top: 0, behavior: 'instant' }) }
  const toast = (message: string) => { setNotice(message); window.setTimeout(() => setNotice(''), 2400) }
  const rest = useRestTimer(toast)
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

  if (cloud.recovering) return <AuthScreen cloud={cloud} onHome={() => navigate('landing')} />
  if (view === 'landing') return <Landing onStart={() => navigate('home')} onLogin={() => navigate('home')} onProgress={() => navigate('progress')} />
  if (!cloud.configured || !cloud.authReady || !cloud.email || !cloud.hydrated) return <AuthScreen cloud={cloud} onHome={() => navigate('landing')} />

  return <div className="app-shell"><a className="skip-link" href="#main-content">Skip to content</a>
    <aside className="desktop-rail">
      <button className="brand-lockup" onClick={() => navigate('home')}><DumbbellMark /><span>Optimal Lifts</span></button>
      <Navigation view={view} navigate={navigate} vertical />
      <div className="rail-foot"><span className="rail-monogram">OL</span><div><strong>Your training log</strong><small>Track. Improve. Repeat.</small></div><button className="rail-home-link" onClick={() => navigate('landing')} aria-label="Open website home"><ArrowRight /></button></div>
    </aside>
    <main id="main-content" className="main-stage">
      {storageError && <p role="alert" className="storage-error">{storageError}</p>}
      <div className="mobile-topbar"><button className="brand-lockup" onClick={() => navigate('home')}><DumbbellMark size={28} /><span>Optimal Lifts</span></button></div>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={view} {...routeMotion} className="route">
          {view === 'home' && <Home data={data} setData={setData} startWorkout={startWorkout} navigate={navigate} toast={toast} />}
          {view === 'workouts' && <Workouts data={data} setData={setData} startWorkout={startWorkout} toast={toast} />}
          {view === 'log' && <WorkoutLog data={data} setData={setData} routineId={selectedRoutineId} navigate={navigate} toast={toast} rest={rest} />}
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

function Home({ data, setData, startWorkout, navigate }: { data: AppData; setData: React.Dispatch<React.SetStateAction<AppData>>; startWorkout: (id?: string) => void; navigate: (v: View) => void; toast: (s: string) => void }) {
  return <Dashboard data={data} setData={setData} startWorkout={startWorkout} navigate={navigate} />
}

function Workouts({ data, setData, startWorkout, toast }: { data: AppData; setData: React.Dispatch<React.SetStateAction<AppData>>; startWorkout: (id: string) => void; toast: (s: string) => void }) {
  const [editing, setEditing] = useState<Routine | null>(null)
  return <div className="page"><PageHeader eyebrow="Your split" title="Push · Pull · Legs" />
    <WorkoutDays data={data} startWorkout={startWorkout} onEdit={setEditing} />
    <AnimatePresence>{editing && <RoutineEditor routine={data.routines.find(r => r.id === editing.id) ?? editing} onClose={() => setEditing(null)} setData={setData} toast={toast} />}</AnimatePresence>
  </div>
}

function RoutineEditor({ routine, onClose, setData, toast }: { routine: Routine; onClose: () => void; setData: React.Dispatch<React.SetStateAction<AppData>>; toast: (s: string) => void }) {
  const [exerciseName, setExerciseName] = useState('')
  const update = (next: Routine) => setData(d => ({ ...d, routines: d.routines.map(r => r.id === next.id ? next : r) }))
  const move = (index: number, amount: number) => {
    const active = routine.exercises.filter(e => !e.archived)
    const neighbor = active[index + amount]
    if (!neighbor || !active[index]) return
    const exercises = [...routine.exercises]
    const from = exercises.findIndex(e => e.id === active[index].id), target = exercises.findIndex(e => e.id === neighbor.id)
    ;[exercises[from], exercises[target]] = [exercises[target], exercises[from]]
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

type WorkoutLogProps = { data: AppData; setData: React.Dispatch<React.SetStateAction<AppData>>; routineId: string; navigate: (v: View) => void; toast: (s: string) => void; rest: RestControls }
function WorkoutLog(props: WorkoutLogProps) {
  const routine = props.data.routines.find(r => r.id === (props.data.draft?.routineId || props.routineId)) ?? props.data.routines[0]
  if (!routine) return <div className="page"><h1>Choose a workout</h1><Pressable className="primary-button" onClick={() => props.navigate('workouts')}>Open workouts</Pressable></div>
  return <WorkoutLogContent {...props} key={routine.id} />
}
function WorkoutLogContent({ data, setData, routineId, navigate, toast, rest }: WorkoutLogProps) {
  const routine = data.routines.find(r => r.id === (data.draft?.routineId || routineId)) ?? data.routines[0]
  const variation = routine?.variations.find(v => v.id === data.draft?.variationId) ?? routine?.variations.find(v => !v.archived)
  const [note, setNote] = useState(data.draft?.note ?? '')
  const [date, setDate] = useState(data.draft?.date ?? today())
  const [order, setOrder] = useState<string[]>(data.draft?.order ?? variation?.exerciseIds ?? [])
  const [autoSaveState, setAutoSaveState] = useState<'draft' | 'saving' | 'saved' | 'issue'>('draft')
  const [liveSessionId, setLiveSessionId] = useState(data.draft?.editingSessionId)
  const finished = useRef(false)
  const [newOrderPrompt, setNewOrderPrompt] = useState(false)
  const [newOrderName, setNewOrderName] = useState('')
  const [addingExercise, setAddingExercise] = useState(false)
  const [editingRestTimes, setEditingRestTimes] = useState(false)
  const [addedExerciseName, setAddedExerciseName] = useState('')
  const { timer, setTimer, restAlertsEnabled, alertMessage, enableRestAlerts, disableRestAlerts, testRestAlert } = rest
  const [ghostScroll, setGhostScroll] = useState(0)
  const exercises = useMemo(() => routine?.exercises.filter(e => !e.archived) ?? [], [routine?.exercises])
  const result = useMemo(() => parseWorkoutNote(note, exercises), [note, exercises])
  const loggedSetCounts = useRef<Record<string, number> | null>(null)
  if (loggedSetCounts.current === null) loggedSetCounts.current = Object.fromEntries(result.exercises.map(entry => [entry.exercise.id, entry.sets.length]))
  useEffect(() => {
    if (!routine) return
    if (finished.current) return
    setData(d => ({ ...d, draft: { routineId: routine.id, variationId: variation?.id, date, note, order, editingSessionId: liveSessionId, updatedAt: new Date().toISOString() } }))
  }, [note, date, order, routine?.id, variation?.id, liveSessionId, setData])
  const orderedExercises = order.map(id => exercises.find(exercise => exercise.id === id)).filter((exercise): exercise is Exercise => Boolean(exercise))
  const previousRecordFor = (id: string) => {
    const priorSessions = data.sessions.filter(session => session.id !== liveSessionId)
    const sameOrder = [...priorSessions].reverse().find(session => session.routineId === routine.id && session.variationId === variation?.id && session.exercises.some(exercise => exercise.exerciseId === id))
    const fallback = [...priorSessions].reverse().find(session => session.routineId === routine.id && session.exercises.some(exercise => exercise.exerciseId === id))
    const session = sameOrder ?? fallback
    return session ? { session, exercise: session.exercises.find(exercise => exercise.exerciseId === id)! } : undefined
  }
  const restFor = (exercise: Exercise) => data.restSeconds?.[exercise.id] ?? recommendedRest(exercise.name)
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
    // Start rest the moment any set is logged (new or re-entered).
    const currentCounts = Object.fromEntries(result.exercises.map(entry => [entry.exercise.id, entry.sets.length]))
    const logged = newlyLoggedExerciseIds(currentCounts, loggedSetCounts.current ?? {})
    loggedSetCounts.current = currentCounts
    const newest = [...result.exercises].reverse().find(entry => logged.includes(entry.exercise.id))
    if (newest) startRest(newest.exercise)
  }, [result])
  useEffect(() => {
    if (!routine) return
    if (result.issues.length) { setAutoSaveState('issue'); return }
    if (!result.exercises.length) { setAutoSaveState('draft'); return }
    setAutoSaveState('saving')
    const timeout = window.setTimeout(() => {
      if (finished.current) return
      const id = liveSessionId ?? uid()
      const session = buildSession(id, variation)
      setData(current => ({
        ...current,
        sessions: current.sessions.some(item => item.id === id) ? current.sessions.map(item => item.id === id ? session : item) : [...current.sessions, session],
        draft: { routineId: routine.id, variationId: variation?.id, date, note, order, editingSessionId: id, updatedAt: new Date().toISOString() },
      }))
      if (!liveSessionId) setLiveSessionId(id)
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
    finished.current = true
    const actualOrder = result.exercises.map(e => e.exercise.id)
    const created = name?.trim() ? { id: uid(), name: name.trim(), exerciseIds: actualOrder } : undefined
    const exact = matched ?? created
    const id = liveSessionId ?? uid()
    const session = buildSession(id, exact)
    setData(d => ({ ...d, routines: created ? d.routines.map(r => r.id === routine.id ? { ...r, variations: [...r.variations, created] } : r) : d.routines, sessions: d.sessions.some(item => item.id === id) ? d.sessions.map(item => item.id === id ? session : item) : [...d.sessions, session], nextRoutineId: (() => { const active = d.routines.filter(r => !r.archived); return active[(active.findIndex(r => r.id === routine.id) + 1) % active.length]?.id })(), draft: undefined, drafts: d.drafts?.filter(draft => draft.routineId !== routine.id) }))
    setNewOrderPrompt(false)
    toast('Workout finished'); navigate('progress')
  }
  const completedIds = new Set(result.exercises.map(entry => entry.exercise.id))
  const ghostLines = note.split(/\r?\n/).map((line, index) => {
    const exercise = exercises.find(item => line.trim().toLowerCase() === item.name.toLowerCase())
    const previous = exercise && !completedIds.has(exercise.id) ? previousRecordFor(exercise.id) : undefined
    return <div className="ghost-line" key={`${index}-${exercise?.id ?? 'blank'}`}><span>{line || '\u00a0'}</span>{previous && <em>{previous.exercise.sets.map(set => `${set.bodyweight && !set.weight ? 'BW' : set.weight}×${set.reps}`).join('  ')}</em>}</div>
  })
  return <div className="page log-page"><div className="log-top"><Pressable className="back-button" onClick={() => navigate('workouts')}><ArrowLeft /> Workouts</Pressable><div className={`draft-indicator ${autoSaveState}`}><i />{autoSaveState === 'saved' ? 'Session saved automatically' : autoSaveState === 'saving' ? 'Saving…' : autoSaveState === 'issue' ? 'Fix highlighted text to save' : 'Draft saved'}</div></div>
    <div className="log-heading"><div><p className="eyebrow">Workout note</p><h1>{routine.name}</h1></div><label className="date-field"><CalendarBlank /><input type="date" value={date} onChange={e => setDate(e.target.value)} aria-label="Workout date" /></label></div>
    <div className="variation-picker"><span>Order</span><ChoiceMenu label="Workout order" value={variation?.id ?? ''} options={routine.variations.filter(v => !v.archived).map(v => ({ value: v.id, label: v.name }))} onChange={id => { const v = routine.variations.find(x => x.id === id); if (v) { setOrder(v.exerciseIds); setNote(reorderWorkoutNote(note, exercises, v.exerciseIds)); setData(d => ({ ...d, draft: d.draft ? { ...d.draft, variationId: v.id } : d.draft })) } }} /></div>
    <AnimatePresence>{timer && <motion.section className={timer.remaining === 0 ? 'rest-timer complete' : 'rest-timer'} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} aria-live="polite"><div><span>{timer.remaining === 0 ? 'Ready for your next set' : `Resting after ${timer.name}`}</span><strong>{formatTimer(timer.remaining)}</strong><small>±15 seconds saves as this exercise’s default · {restAlertsEnabled ? 'alerts on' : <button className="rest-alert-link" onClick={enableRestAlerts}><BellRinging /> Enable alert</button>}</small></div><div className="rest-actions"><Pressable onClick={() => adjustActiveTimer(-15)}>−15</Pressable>{timer.remaining > 0 && <Pressable className="timer-control" onClick={() => setTimer(current => current ? current.running ? { ...current, running: false, endAt: undefined } : { ...current, running: true, endAt: Date.now() + current.remaining * 1000 } : null)} ariaLabel={timer.running ? 'Pause timer' : 'Resume timer'}>{timer.running ? <Pause weight="fill" /> : <Play weight="fill" />}</Pressable>}<Pressable onClick={() => adjustActiveTimer(15)}>+15</Pressable><Pressable onClick={() => setTimer(null)}>{timer.remaining === 0 ? 'Done' : 'Cancel'}</Pressable></div></motion.section>}</AnimatePresence>
    <div className="logger-grid"><section className="note-panel"><div className="note-label-row"><label htmlFor="workout-note">Write it how you trained</label><div><Pressable onClick={() => setEditingRestTimes(true)}><ClockCountdown />Rest times</Pressable><Pressable onClick={() => setAddingExercise(true)}><Plus />Exercise</Pressable></div></div><p className="note-instruction">One exercise per line, then its sets: <code>Incline Chest Press 80x6 80x5</code></p><GeminiWorkoutEntry exercises={exercises} onApply={value => { setNote(value); setAutoSaveState('draft') }} /><div className="note-editor"><div className="previous-ghost" aria-hidden="true" style={{ transform: `translateY(-${ghostScroll}px)` }}>{ghostLines}</div><textarea id="workout-note" value={note} onChange={e => { setNote(e.target.value); setAutoSaveState('draft') }} onScroll={event => setGhostScroll(event.currentTarget.scrollTop)} placeholder={'Pull Up 70x8 70x5\nSeated Row 130x10 130x8\n\nFelt strong today'} autoFocus /></div><div className="note-footer"><span><Sparkle /> Complete sets save after you pause</span><span>{note.length} characters</span></div><div className="parse-summary" aria-live="polite">{result.exercises.length ? result.exercises.map(entry => <span key={entry.exercise.id}><Check />{entry.exercise.name} · {entry.sets.length} set{entry.sets.length === 1 ? '' : 's'}</span>) : <p>Add a set above or enter weights × reps beside an exercise below.</p>}</div>{result.issues.map((issue, index) => <div className="parse-issue" key={`${issue.line}-${index}`}><WarningCircle weight="fill" /><div><strong>Line {issue.line}: {issue.message}</strong><span>{issue.text}</span></div></div>)}</section>
      <CoachPanel sessions={data.sessions} /></div>
    <div className="sticky-save auto-save"><div><strong>{result.exercises.reduce((n, e) => n + e.sets.length, 0)} sets {autoSaveState === 'saved' ? 'saved' : 'recognized'}</strong><span>{result.issues.length ? `${result.issues.length} item${result.issues.length > 1 ? 's' : ''} needs attention` : autoSaveState === 'saving' ? 'Updating this session…' : 'Every complete set is saved automatically'}</span></div><Pressable className="primary-button" onClick={finish} disabled={!result.exercises.length || !!result.issues.length}>Finish workout <Check weight="bold" /></Pressable></div>
    <WorkoutDayProgress routine={routine} variation={variation} sessions={data.sessions} navigate={navigate} />
    <AnimatePresence>{newOrderPrompt && <Sheet title="New exercise order" onClose={() => setNewOrderPrompt(false)}><div className="order-choice"><p>This order doesn’t match a saved variation. Keep its context with this session.</p><div className="order-preview">{result.exercises.map((entry, index) => <span key={entry.exercise.id}><i>{index + 1}</i>{entry.exercise.name}</span>)}</div><div className="field"><label htmlFor="order-name">Save as a named variation</label><input id="order-name" value={newOrderName} onChange={e => setNewOrderName(e.target.value)} placeholder="e.g. Rows first" /></div></div><div className="sheet-footer"><Pressable className="secondary-button" onClick={() => finalize()}>Use once</Pressable><Pressable className="primary-button" disabled={!newOrderName.trim()} onClick={() => finalize(undefined, newOrderName)}>Save variation</Pressable></div></Sheet>}</AnimatePresence>
<AnimatePresence>{editingRestTimes && <Sheet title="Rest times" onClose={() => setEditingRestTimes(false)}><p className="sheet-help rest-help">A rest timer starts as soon as you log a set.</p><div className={restAlertsEnabled ? 'rest-alert-setting enabled' : 'rest-alert-setting'}><span><BellRinging weight="fill" /></span><div><strong>Rest-complete alerts</strong><p>{alertMessage || (restAlertsEnabled ? 'Alerts arrive even when your phone is locked. On iPhone, open Optimal Lifts from its Home Screen icon (iOS 16.4 or later).' : 'Enable alerts, then send a test notification.')}</p></div><Pressable onClick={restAlertsEnabled ? disableRestAlerts : enableRestAlerts}>{restAlertsEnabled ? 'Turn off' : 'Enable'}</Pressable>{restAlertsEnabled && <Pressable onClick={testRestAlert}>Test alert</Pressable>}</div><div className="rest-time-list">{orderedExercises.map(exercise => { const seconds = restFor(exercise); return <div className="rest-time-row" key={exercise.id}><div><strong>{exercise.name}</strong><span>{formatTimer(seconds)}</span></div><div><Pressable ariaLabel={`Reduce rest for ${exercise.name}`} onClick={() => setData(current => ({ ...current, restSeconds: { ...current.restSeconds, [exercise.id]: Math.max(30, seconds - 15) } }))}>−15</Pressable><Pressable ariaLabel={`Increase rest for ${exercise.name}`} onClick={() => setData(current => ({ ...current, restSeconds: { ...current.restSeconds, [exercise.id]: Math.min(600, seconds + 15) } }))}>+15</Pressable></div></div> })}</div><div className="sheet-footer"><Pressable className="secondary-button" onClick={() => setData(current => ({ ...current, restSeconds: { ...current.restSeconds, ...Object.fromEntries(orderedExercises.map(exercise => [exercise.id, recommendedRest(exercise.name)])) } }))}>Reset defaults</Pressable><Pressable className="primary-button" onClick={() => setEditingRestTimes(false)}>Done</Pressable></div></Sheet>}</AnimatePresence>
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
  return <section className="day-progress"><div className="day-progress-heading"><div><p className="eyebrow">Progress for this workout</p><h2>{exercise.name}</h2><span>{exercise.bodyweight ? 'Best reps' : 'Rep-adjusted weight'} · {variation?.name ?? 'Order unknown'}</span></div><ChoiceMenu label="Exercise" value={exercise.id} options={available.map(item => ({ value: item.id, label: item.name }))} onChange={setExerciseId} /></div>{points.length > 1 ? <ProgressChart key={exercise.id} points={points} label={exercise.bodyweight ? 'Best repetitions' : 'Rep-adjusted weight'} unit={exercise.bodyweight ? ' reps' : ' lb score'} onOpen={() => navigate('progress')} /> : <div className="day-progress-empty"><ChartLineUp /><p>Save at least two {exercise.name} sessions in this order to draw the line.</p></div>}<div className="day-progress-footer"><span>{records.length} same-order session{records.length === 1 ? '' : 's'}</span><Pressable className="text-link" onClick={() => navigate('progress')}>Open full progress <ArrowRight /></Pressable></div></section>
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
      const response = await fetch('/api/coach', { method: 'POST', signal: AbortSignal.timeout(35000), headers: { 'content-type': 'application/json', authorization: `Bearer ${accessToken}` }, body: JSON.stringify({ question: text, sessions: history }) })
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
  const [range, setRange] = useState<'recent' | '3m' | 'all'>('all')
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
    performance: { label: 'Rep-adjusted weight', unit: ' lb score', help: 'Average set weight, adjusted for reps. Best for comparing sessions.' },
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
    <section className="chart-card"><div className="chart-title"><div><p>{metricMeta[metric].label}</p><strong>{headline ? `${Math.round(headline * 10) / 10}` : '—'}<small>{headline ? metricMeta[metric].unit : ''}</small></strong><small className="metric-explanation">{metricMeta[metric].help}</small></div><div className="chart-context">{points.length > 1 && <b className={change >= 0 ? 'positive' : 'negative'}>{change >= 0 ? '+' : ''}{Math.round(change * 10) / 10}{metricMeta[metric].unit} since first</b>}</div></div><ProgressChart key={metric + exerciseId} points={points} label={metricMeta[metric].label} unit={metricMeta[metric].unit} onOpen={point => edit(point.item.session)} />
      {!points.length && <div className="chart-empty"><ChartLineUp /><p>Your chart begins after you save this exercise.</p><button onClick={() => navigate('workouts')}>Start a workout</button></div>}
    </section>
    <div className="stat-triplet"><article><span>Best reps</span><strong>{bestReps || '—'}</strong><small>in one completed set</small></article><article><span>Estimated 1RM</span><strong>{bestE1rm || '—'}{bestE1rm ? <small> lb</small> : ''}</strong><small>Epley estimate: weight × (1 + reps ÷ 30)</small></article><article><span>Sessions</span><strong>{records.length}</strong><small>in this view</small></article></div>
    <section className="section-block"><div className="section-heading"><div><p className="eyebrow">Saved sessions</p><h2>{progressRoutine?.name ?? 'Workout'} history</h2></div><span>{sessions.length} sessions</span></div>{!sessions.length ? <div className="progress-history-empty"><p>Your saved {progressRoutine?.name.toLowerCase()} sessions will appear here.</p></div> : <div className="timeline">{sessions.map((session, index) => <Pressable className="session-card" key={session.id} onClick={() => edit(session)}><div className="timeline-date"><strong>{new Date(`${session.date}T12:00`).getDate()}</strong><span>{new Intl.DateTimeFormat('en-US', { month: 'short' }).format(new Date(`${session.date}T12:00`))}</span></div><div className="session-copy"><p>{session.routineName}<span className={session.orderKind === 'one-off' ? 'order-tag one-off' : 'order-tag'}>{session.orderKind === 'one-off' ? 'One-off order' : session.variationName ?? 'Order unknown'}</span></p><h2>{session.exercises.map(e => e.exerciseName).join(', ')}</h2><span>{session.exercises.reduce((n, e) => n + e.sets.length, 0)} working sets · Session {sessions.length - index}</span></div><div className="session-arrow"><NotePencil /><span>Edit</span></div></Pressable>)}</div>}</section>
  </div>
}





function Settings({ data, setData, toast, cloud }: { data: AppData; setData: React.Dispatch<React.SetStateAction<AppData>>; toast: (s: string) => void; cloud: CloudState }) {
  const [confirming, setConfirming] = useState<'routines' | 'all' | null>(null)
  return <div className="page"><PageHeader eyebrow="Your app" title="Settings" />
    <section className="settings-group"><div className="settings-title"><h2>Account</h2><p>Your workouts save to this account automatically.</p></div><div className="cloud-account"><span className="settings-icon"><LockKey weight="fill" /></span><div><strong>{cloud.email}</strong><small>{cloud.status === 'error' ? 'Changes not saved yet' : cloud.status === 'syncing' ? 'Saving…' : 'All changes saved'}</small></div></div>{cloud.status === 'error' && cloud.message && <><p role="alert" className="cloud-message error">{cloud.message}</p><Pressable className="settings-row" onClick={cloud.retry}><span className="settings-icon"><Repeat /></span><div><strong>Try again</strong><small>Reconnect to your account</small></div><ArrowRight /></Pressable></>}<Pressable className="settings-row" onClick={() => cloud.signOut()}><span className="settings-icon"><SignOut /></span><div><strong>Sign out</strong><small>Removes your workouts from this device</small></div><ArrowRight /></Pressable></section>
    <section className="settings-group danger-zone"><div className="settings-title"><h2>Reset</h2><p>These actions require confirmation and cannot be undone.</p></div><button className="settings-row danger" onClick={() => setConfirming('routines')}><span className="settings-icon"><Repeat /></span><div><strong>Reset routines</strong><small>History remains untouched</small></div><ArrowRight /></button><button className="settings-row danger" onClick={() => setConfirming('all')}><span className="settings-icon"><Trash /></span><div><strong>Clear all data</strong><small>Routines, sessions, and drafts</small></div><ArrowRight /></button></section>
    <AnimatePresence>{confirming && <Sheet title={confirming === 'all' ? 'Clear all data?' : 'Reset routines?'} onClose={() => setConfirming(null)}><div className="confirm-copy"><WarningCircle weight="fill" /><p>{confirming === 'all' ? 'Every saved session and unfinished draft will be removed from this account and device.' : 'Your workout lists will return to the starter setup. Saved session history will remain unchanged.'}</p></div><div className="sheet-footer"><Pressable className="secondary-button" onClick={() => setConfirming(null)}>Cancel</Pressable><Pressable className="danger-button" onClick={() => { if (confirming === 'all') { clearData(); setData(createSeedData()) } else setData(d => ({ ...d, routines: createSeedData().routines, draft: undefined, drafts: undefined, nextRoutineId: createSeedData().nextRoutineId })); setConfirming(null); toast(confirming === 'all' ? 'All data cleared' : 'Routines reset') }}>{confirming === 'all' ? 'Clear everything' : 'Reset routines'}</Pressable></div></Sheet>}</AnimatePresence>
  </div>
}

function Sheet({ title, onClose, children, wide }: { title: string; onClose: () => void; children: React.ReactNode; wide?: boolean }) {
  return <motion.div className="sheet-layer" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><motion.button className="sheet-scrim" onClick={onClose} aria-label="Close" /><motion.section className={wide ? 'sheet wide' : 'sheet'} role="dialog" aria-modal="true" aria-label={title} initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', stiffness: 330, damping: 32 }}><div className="sheet-handle" /><header><h2>{title}</h2><Pressable className="icon-button" onClick={onClose} ariaLabel="Close"><X /></Pressable></header><div className="sheet-body">{children}</div></motion.section></motion.div>
}

export default App
