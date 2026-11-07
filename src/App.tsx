import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import {
  Archive, ArrowLeft, ArrowRight, ArrowUpRight, DotsThree, Barbell, CaretDown, ChartLineUp,
  ChatCircleText, Check, DotsSixVertical, Gear, House, Info,
  NotePencil, Play, Plus, Repeat, Trash, UserCircle, WarningCircle, X,
} from '@phosphor-icons/react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { WorkoutLogger, RestTimerBar } from './WorkoutLogger'
import { useRestTimer, workoutKey } from './useRestTimer'
import { Dashboard } from './Dashboard'
import { Landing } from './Landing'
import { RoutineTabs } from './RoutineTabs'
import { createSeedData } from './data'
import { createSampleHistory } from './sampleHistory'
import { renameExerciseForFutureWorkouts } from './exercises'
import { getCloudAccessToken, useCloudSync, type CloudState } from './cloud'
import { estimatedOneRepMax } from './parser'
import { sessionMetric, type ChartMetric } from './progress'
import { clearData, loadData, saveData } from './storage'
import type { AppData, Draft, Exercise, Routine, Session } from './types'

type View = 'home' | 'workouts' | 'log' | 'progress' | 'coach' | 'settings'
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

function TrainingApp() {
  const [data, setData] = useState<AppData>(() => loadData())
  const cloud = useCloudSync(data, setData)
  const [view, setView] = useState<View>('home')
  const [selectedRoutineId, setSelectedRoutineId] = useState(() => data.draft?.routineId || data.nextRoutineId || data.routines.find(r => !r.archived)?.id || '')
  const [notice, setNotice] = useState('')
  const [pendingRoutineId, setPendingRoutineId] = useState<string | null>(null)
  const loaded = useRef(false)
  const clock = useRestTimer([data.draft, ...(data.drafts ?? [])].filter((draft): draft is Draft => Boolean(draft)).map(workoutKey))

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
    const hasEnteredSets = Boolean(stored && (/\d/.test(stored.note) || stored.rows))
    const draft: Draft = stored ? { ...stored, startedAt: stored.startedAt ?? Date.now(), note: hasEnteredSets ? stored.note : template, variationId: hasEnteredSets ? stored.variationId : variation?.id, order: hasEnteredSets && stored.order.length ? stored.order : (variation?.exerciseIds ?? []) } : {
      routineId: id, startedAt: Date.now(), variationId: variation?.id, date: today(), note: template,
      order: variation?.exerciseIds ?? routine.exercises.filter(e => !e.archived).map(e => e.id), updatedAt: new Date().toISOString(),
    }
    setSelectedRoutineId(id)
    setData(current => {
      const parked = preserveCurrent && current.draft
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
    const switchingEnteredDraft = data.draft && data.draft.routineId !== id
    if (switchingEnteredDraft) { setPendingRoutineId(id); return }
    openWorkout(id)
  }

  if (!cloud.configured || !cloud.authReady || !cloud.email || !cloud.hydrated) return <AuthGate cloud={cloud} />

  return <div className="app-shell">
    <aside className="desktop-rail">
      <a className="brand-lockup" href="/" aria-label="Optimal Lifts home"><DumbbellMark /><span>OptimalLifts</span></a>
      <Navigation view={view} navigate={navigate} vertical />
      <button className="rail-footer" onClick={() => navigate('settings')}><UserCircle size={32} weight="duotone" /><span><strong>{cloud.displayName ?? "Your profile"}</strong><small>{cloud.email}</small></span></button>
    </aside>
    <main id="main-content" className="main-stage">
      <div className="mobile-topbar"><a className="brand-lockup" href="/" aria-label="Optimal Lifts home"><DumbbellMark size={28} /><span>OptimalLifts</span></a></div>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={view} {...routeMotion} className="route">
          {view === 'home' && <Dashboard data={data} startWorkout={startWorkout} navigate={navigate} displayName={cloud.displayName?.split(" ")[0]} />}
          {view === 'workouts' && <Workouts data={data} setData={setData} startWorkout={startWorkout} toast={toast} navigate={navigate} />}
          {view === 'log' && data.draft && <WorkoutLogger key={workoutKey(data.draft)} data={data} setData={setData} clock={clock} onBack={() => navigate('workouts')} onFinish={() => navigate('progress')} toast={toast} coach={<CoachPanel sessions={data.sessions} embedded />} />}
          {view === 'coach' && <div className="page coach-page"><PageHeader eyebrow="" title="Coach" /><CoachPanel sessions={data.sessions} /></div>}
          {view === 'progress' && <Progress data={data} setData={setData} navigate={navigate} setRoutineId={setSelectedRoutineId} />}
          {view === 'settings' && <Settings data={data} setData={setData} toast={toast} cloud={cloud} />}
        </motion.div>
      </AnimatePresence>
    </main>
    {data.draft && !clock.timer && view !== 'log' && <button className="workout-dock" onClick={() => openWorkout(data.draft!.routineId)} aria-label="Continue current workout"><span className="dock-art"><Barbell size={23} /></span><span><strong>{data.routines.find(r => r.id === data.draft?.routineId)?.name ?? 'Your workout'}</strong><small>Workout in progress</small></span><span className="dock-play"><Play size={17} weight="fill" /></span></button>}
    <RestTimerBar clock={clock} onOpen={() => { const target = [data.draft, ...(data.drafts ?? [])].find(d => d && workoutKey(d) === clock.timer?.workoutKey); if (target) openWorkout(target.routineId, true) }} />
    <Navigation view={view} navigate={navigate} />
    <AnimatePresence>{notice && <motion.div className="toast" initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}><span><Check weight="bold" /></span>{notice}</motion.div>}</AnimatePresence>
    <AnimatePresence>{pendingRoutineId && <Sheet title="Start a different workout?" onClose={() => setPendingRoutineId(null)}><div className="switch-workout-copy"><Barbell weight="fill" /><div><p>You have entered sets in <strong>{data.routines.find(r => r.id === data.draft?.routineId)?.name}</strong>.</p><span>Starting {data.routines.find(r => r.id === pendingRoutineId)?.name} will keep that draft so you can return to it later.</span></div></div><div className="sheet-footer"><Pressable className="secondary-button" onClick={() => { const currentId = data.draft?.routineId; setPendingRoutineId(null); if (currentId) openWorkout(currentId) }}>Continue current</Pressable><Pressable className="primary-button" onClick={() => openWorkout(pendingRoutineId, true)}>Start separate workout</Pressable></div></Sheet>}</AnimatePresence>
  </div>
}

function Navigation({ view, navigate, vertical = false }: { view: View; navigate: (v: View) => void; vertical?: boolean }) {
  const items: { view: View; label: string; icon: typeof House }[] = [
    { view: 'home', label: 'Dashboard', icon: House }, { view: 'workouts', label: 'Workouts', icon: Barbell },
    { view: 'progress', label: 'Analytics', icon: ChartLineUp }, { view: 'coach', label: 'Coach', icon: ChatCircleText }, { view: 'settings', label: 'Settings', icon: Gear },
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

function Workouts({ data, setData, startWorkout, toast, navigate }: { navigate: (view: View) => void; data: AppData; setData: React.Dispatch<React.SetStateAction<AppData>>; startWorkout: (id: string) => void; toast: (s: string) => void }) {
  const [editing, setEditing] = useState<Routine | null>(null)
  const [newName, setNewName] = useState('')
  const addRoutine = () => {
    const name = newName.trim(); if (!name) return
    const routine: Routine = { id: uid(), name, exercises: [], variations: [{ id: uid(), name: 'Standard order', exerciseIds: [] }] }
    setData(d => ({ ...d, routines: [...d.routines, routine] })); setNewName(''); setEditing(routine); toast('Workout created')
  }
  const activeRoutines = data.routines.filter(routine => !routine.archived)
  const moveRoutine = (id: string, direction: number) => setData(current => {
    const active = current.routines.filter(routine => !routine.archived)
    const at = active.findIndex(routine => routine.id === id)
    const target = active[at + direction]
    if (!target) return current
    const routines = [...current.routines]
    const from = routines.findIndex(routine => routine.id === id), to = routines.findIndex(routine => routine.id === target.id)
    ;[routines[from], routines[to]] = [routines[to], routines[from]]
    return { ...current, routines }
  })
  return <div className="page workouts-page"><PageHeader eyebrow="Your rotation" title="Workouts" />
    <div className="routine-list">{activeRoutines.map((routine, index) => <motion.article layout key={routine.id} className="routine-row" transition={{ type: 'spring', stiffness: 350, damping: 32 }}>
      <Pressable className="routine-open" onClick={() => startWorkout(routine.id)} ariaLabel={(data.draft?.routineId === routine.id ? 'Continue ' : 'Start ') + routine.name}><span className="routine-index">{String(index + 1).padStart(2, '0')}</span><span className="routine-name">{routine.name}</span>{data.draft?.routineId === routine.id ? <span className="routine-status"><i /> In progress</span> : data.nextRoutineId === routine.id ? <span className="routine-status">Up next</span> : null}<span className="routine-arrow"><ArrowUpRight size={24} /></span></Pressable>
      <details className="routine-menu" name="routine-actions" onKeyDown={event => { if (event.key === 'Escape') { event.currentTarget.removeAttribute('open'); event.currentTarget.querySelector('summary')?.focus() } }}><summary aria-label={'Options for ' + routine.name}><DotsThree size={23} weight="bold" /></summary><div><button onClick={event => { setEditing(routine); event.currentTarget.closest('details')?.removeAttribute('open') }}><NotePencil /> Edit workout</button><button onClick={event => { setData(current => ({ ...current, nextRoutineId: routine.id })); event.currentTarget.closest('details')?.removeAttribute('open') }}><Check /> Set as next</button><button disabled={index === 0} onClick={() => moveRoutine(routine.id, -1)}>↑ Move earlier</button><button disabled={index === activeRoutines.length - 1} onClick={() => moveRoutine(routine.id, 1)}>↓ Move later</button></div></details>
    </motion.article>)}</div>
    <details className="add-routine-drawer"><summary><Plus size={18} /> New workout</summary><form className="inline-create" onSubmit={e => { e.preventDefault(); addRoutine() }}><label htmlFor="routine-name">Workout name</label><div><input id="routine-name" value={newName} onChange={e => setNewName(e.target.value)} placeholder="Upper, Full body, Arms…" /><Pressable type="submit" className="primary-button" disabled={!newName.trim()}><Plus /> Add</Pressable></div></form></details>
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

function ChoiceMenu({ label, value, options, onChange, compact = false }: { label: string; value: string; options: { value: string; label: string; description?: string }[]; onChange: (value: string) => void; compact?: boolean }) {
  const [open, setOpen] = useState(false)
  const selected = options.find(option => option.value === value)
  const choices = <div className="choice-list">{options.map(option => <Pressable key={option.value} className={option.value === value ? 'choice-option selected' : 'choice-option'} onClick={() => { onChange(option.value); setOpen(false) }}><span><strong>{option.label}</strong>{option.description && <small>{option.description}</small>}</span>{option.value === value && <Check weight="bold" />}</Pressable>)}</div>
  const fullScreenChoice = compact && open ? createPortal(<motion.div className="full-choice-layer" role="dialog" aria-modal="true" aria-label={label} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><div className="full-choice-top"><div><p>Up next</p><h2>{label}</h2></div><Pressable className="full-choice-close" onClick={() => setOpen(false)} ariaLabel="Close"><X /></Pressable></div>{choices}<p className="full-choice-hint">Your selection updates the Home screen immediately.</p></motion.div>, document.body) : null
  return <><Pressable className={compact ? 'choice-button compact' : 'choice-button'} onClick={() => setOpen(true)} ariaLabel={label}><span>{compact ? 'Change' : selected?.label ?? 'Choose'}</span><CaretDown weight="bold" /></Pressable>{fullScreenChoice}<AnimatePresence>{open && !compact && <Sheet title={label} onClose={() => setOpen(false)}>{choices}</Sheet>}</AnimatePresence></>
}

function CoachPanel({ sessions, embedded = false }: { sessions: Session[]; embedded?: boolean }) {
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
  return <section className={embedded ? 'coach-panel embedded' : 'coach-panel'} aria-label="Workout coach">{embedded && <h2>Coach</h2>}{!messages.length && <p className="coach-context">Ask about your saved sets or what to try next.</p>}{(messages.length > 0 || status === 'asking') && <div className="coach-feed">{messages.map((message, index) => <div key={index} className={`chat-bubble ${message.role}`}>{message.text}</div>)}{status === 'asking' && <div className="coach-thinking" role="status" aria-label="Coach is thinking"><i /><i /><i /></div>}</div>}{error && <p className="coach-error" role="alert">{error}</p>}<form className="coach-input" onSubmit={event => { event.preventDefault(); void ask() }}><label htmlFor="coach-question" className="sr-only">Ask the workout coach</label><textarea id="coach-question" rows={2} maxLength={1200} value={question} onChange={event => setQuestion(event.target.value)} placeholder="Ask a question…" /><Pressable type="submit" ariaLabel="Ask coach" disabled={!question.trim() || status === 'asking'}><ArrowUpRight size={22} /></Pressable></form></section>
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
  const [sample, setSample] = useState(() => !data.sessions.some(session => { const age = Date.now() - new Date(session.date + 'T12:00:00').getTime(); return age >= 0 && age <= 45 * 86400000 }))
  const sampleHistory = useMemo(() => createSampleHistory(data.routines), [data.routines])
  const chartSessions = sample ? sampleHistory : data.sessions
  const records = chartSessions.filter(session => session.routineId === progressRoutineId).flatMap(s => s.exercises.filter(e => e.exerciseId === exerciseId).map(e => ({ session: s, exercise: e }))).filter(item => {
    if (range === 'all') return true; const age = Date.now() - new Date(`${item.session.date}T12:00:00`).getTime(); return age <= (range === '3m' ? 92 : 45) * 86400000
  }).filter(item => order === 'all' || item.session.variationId === order).sort((a, b) => a.session.date.localeCompare(b.session.date))
  const points = records.map(r => ({ date: r.session.date, value: sessionMetric(r.exercise.sets, metric), reps: Math.max(...r.exercise.sets.map(s => s.reps)), item: r }))
  const bestWeight = records.length ? Math.max(...records.flatMap(record => record.exercise.sets.map(set => set.weight))) : 0
  const bestReps = points.length ? Math.max(...points.map(p => p.reps)) : 0
  const bestE1rm = records.length ? Math.max(...records.flatMap(r => r.exercise.sets.map(s => estimatedOneRepMax(s.weight, s.reps)))) : 0
  const sessions = [...chartSessions].filter(session => session.routineId === progressRoutineId).sort((a, b) => b.savedAt.localeCompare(a.savedAt))
  const edit = (session: Session) => { setData(d => ({ ...d, drafts: d.draft && d.draft.editingSessionId !== session.id ? [...(d.drafts ?? []).filter(item => item.routineId !== d.draft!.routineId), d.draft] : d.drafts, draft: { startedAt: Date.now(), isHistorical: true, routineId: session.routineId, variationId: session.variationId, date: session.date, note: session.rawNote, order: session.actualExerciseOrder, editingSessionId: session.id, updatedAt: new Date().toISOString() } })); setRoutineId(session.routineId); navigate('log') }
  const metricMeta: Record<ChartMetric, { label: string; unit: string; help: string }> = {
    performance: { label: 'Rep-adjusted weight', unit: ' lb score', help: 'Average across completed sets: weight × (1 + 0.025 × (reps − 1)). This is a weight comparison score—not the load lifted or a 1RM.' },
    weight: { label: 'Highest weight', unit: ' lb', help: 'The heaviest completed set in each session.' },
    reps: { label: 'Best repetitions', unit: ' reps', help: 'The most repetitions completed in one set.' },
    volume: { label: 'Total volume', unit: ' lb', help: 'Weight × repetitions across all completed sets.' },
  }
  const headline = points.length ? Math.max(...points.map(point => point.value)) : 0
  const change = points.length > 1 ? points.at(-1)!.value - points[0].value : 0
  return <div className="page progress-page"><PageHeader eyebrow="Your training" title="Progress" />
    <RoutineTabs routines={activeRoutines} value={progressRoutineId} onChange={setProgressRoutineId} label="Workout list" /><div className="history-source"><span>{sample ? 'Sample history' : 'Your history'}</span><button onClick={() => setSample(current => !current)}>{sample ? 'Show my workouts' : 'View sample data'}</button></div>
    <div className="progress-toolbar"><ChoiceMenu label="Exercise" value={exerciseId} options={exerciseOptions.map(([value, label]) => ({ value, label }))} onChange={setExerciseId} /><label><span className="sr-only">History range</span><select aria-label="History range" value={range} onChange={event => setRange(event.target.value as typeof range)}><option value="recent">Recent</option><option value="3m">3 months</option><option value="all">All history</option></select></label></div>
    <details className="progress-order"><summary>Exercise order <span>{order === 'all' ? 'All orders' : progressRoutine?.variations.find(v => v.id === order)?.name}</span><CaretDown size={12} /></summary><ChoiceMenu label="Exercise order" value={order} options={[...(progressRoutine?.variations.filter(v => !v.archived).map(v => ({ value: v.id, label: v.name })) ?? []), { value: 'all', label: 'All orders', description: 'Includes named and one-off orders with context' }]} onChange={setOrder} /></details>
    <div className="metric-switch" aria-label="Chart measurement">{(['performance', 'weight', 'reps', 'volume'] as ChartMetric[]).map(item => <Pressable key={item} className={metric === item ? 'active' : ''} ariaLabel={item === 'performance' ? 'Adjusted weight' : item === 'weight' ? 'Weight' : item === 'reps' ? 'Reps' : 'Volume'} disabled={item === 'performance' && selectedExercise?.bodyweight} onClick={() => setMetric(item)}>{item === 'performance' ? 'Adjusted' : item === 'weight' ? 'Weight' : item === 'reps' ? 'Reps' : 'Volume'}</Pressable>)}</div>
    <section className="chart-card"><div className="chart-title"><div><p>{metricMeta[metric].label}</p><strong>{headline ? `${Math.round(headline * 10) / 10}` : '—'}<small>{headline ? metricMeta[metric].unit : ''}</small></strong><details className="metric-help"><summary>About this measure</summary><p>{metricMeta[metric].help}</p></details></div><div className="chart-context"><span>{order === 'all' ? 'All orders shown with context' : progressRoutine?.variations.find(v => v.id === order)?.name ?? 'Order-aware comparison'}</span>{points.length > 1 && <b className={change >= 0 ? 'positive' : 'negative'}>{change >= 0 ? '+' : ''}{Math.round(change * 10) / 10}{metricMeta[metric].unit} since first</b>}</div></div><LineChart points={points} label={metricMeta[metric].label} unit={metricMeta[metric].unit} onPointClick={sample ? undefined : point => edit(point.item.session)} />
      {!points.length && <div className="chart-empty"><ChartLineUp /><p>Your chart begins after you save this exercise.</p><button onClick={() => navigate('workouts')}>Start a workout</button></div>}
    </section>
    <div className="stat-triplet"><article><span>Best reps</span><strong>{bestReps || '—'}</strong><small>in one completed set</small></article><article><span>Estimated 1RM</span><strong>{bestE1rm || '—'}{bestE1rm ? <small> lb</small> : ''}</strong><small>Epley estimate: weight × (1 + reps ÷ 30)</small></article><article><span>Sessions</span><strong>{records.length}</strong><small>in this view</small></article></div>
    {!sample && !!records.length && <section className="section-block"><div className="section-heading"><h2>Behind the line</h2><span>Tap a session to correct it</span></div><div className="history-mini">{[...records].reverse().map(({ session, exercise }) => <Pressable key={session.id} onClick={() => edit(session)}><span>{formatDate(session.date)}</span><strong>{Math.max(...exercise.sets.map(s => s.weight))} lb</strong><small>#{exercise.position} · {session.variationName ?? 'Order unknown'} · {exercise.sets.map(s => `${s.weight}×${s.reps}`).join(', ')}</small><ArrowRight /></Pressable>)}</div></section>}
    {!sample && <section className="section-block"><div className="section-heading"><div><p className="eyebrow">Saved sessions</p><h2>{progressRoutine?.name ?? 'Workout'} history</h2></div><span>{sessions.length} sessions</span></div>{!sessions.length ? <div className="progress-history-empty"><p>Your saved {progressRoutine?.name.toLowerCase()} sessions will appear here.</p></div> : <div className="timeline">{sessions.map((session, index) => <Pressable className="session-card" key={session.id} onClick={() => edit(session)}><div className="timeline-date"><strong>{new Date(`${session.date}T12:00`).getDate()}</strong><span>{new Intl.DateTimeFormat('en-US', { month: 'short' }).format(new Date(`${session.date}T12:00`))}</span></div><div className="session-copy"><p>{session.routineName}<span className={session.orderKind === 'one-off' ? 'order-tag one-off' : 'order-tag'}>{session.orderKind === 'one-off' ? 'One-off order' : session.variationName ?? 'Order unknown'}</span></p><h2>{session.exercises.length} exercises</h2><span>{session.exercises.reduce((n, e) => n + e.sets.length, 0)} working sets · Session {sessions.length - index}</span></div><div className="session-arrow"><NotePencil /><span>Edit</span></div></Pressable>)}</div>}</section>}
  </div>
}

function LineChart({ points, label, unit, onPointClick }: { points: { date: string; value: number; item: { session: Session } }[]; label: string; unit: string; onPointClick?: (point: { date: string; value: number; item: { session: Session } }) => void }) {
  if (points.length < 2) return <div className="chart-space" />
  const width = 760, height = 280, padX = 42, padTop = 24, padBottom = 48
  const max = Math.max(...points.map(p => p.value)), min = Math.min(...points.map(p => p.value)), spread = max - min || 1
  const coords = points.map((p, i) => ({ ...p, x: padX + i * ((width - padX * 2) / (points.length - 1)), y: height - padBottom - ((p.value - min) / spread) * (height - padTop - padBottom) }))
  const path = coords.map((p, i) => `${i ? 'L' : 'M'} ${p.x} ${p.y}`).join(' ')
  const dateStep = Math.max(1, Math.ceil(points.length / 6))
  const formatAxisDate = (date: string) => new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(new Date(`${date}T12:00:00`))
  return <svg className="line-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`${label} by workout date`}><defs><linearGradient id="area" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#8b94a6" stopOpacity=".72"/><stop offset="1" stopColor="#8b94a6" stopOpacity="0"/></linearGradient></defs>{[0, .5, 1].map(ratio => { const y = padTop + ratio * (height - padTop - padBottom); const value = max - ratio * spread; return <g key={ratio}><line x1={padX} x2={width - padX} y1={y} y2={y} className="chart-gridline"/><text x={padX - 8} y={y + 3} textAnchor="end" className="chart-axis-value">{Math.round(value * 10) / 10}</text></g> })}<path d={`${path} L ${coords.at(-1)!.x} ${height-padBottom} L ${coords[0].x} ${height-padBottom} Z`} fill="url(#area)"/><motion.path d={path} fill="none" stroke="var(--mint)" strokeWidth="3" strokeLinecap="round" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: .65 }}/>{coords.map((point, index) => <g key={`${point.date}-${index}`} role={onPointClick ? 'button' : undefined} tabIndex={onPointClick ? 0 : undefined} className={onPointClick ? 'chart-point' : 'chart-sample-point'} onClick={() => onPointClick?.(point)} onKeyDown={event => { if (event.key === 'Enter' || event.key === ' ') onPointClick?.(point) }}><title>{formatAxisDate(point.date)}: {Math.round(point.value * 10) / 10}{unit}.{onPointClick ? ' Open session.' : ' Sample data.'}</title><circle cx={point.x} cy={point.y} r="14" fill="transparent"/><circle cx={point.x} cy={point.y} r="5" fill="var(--surface)" stroke="var(--mint)" strokeWidth="3"/>{(index % dateStep === 0 || index === coords.length - 1) && <text x={point.x} y={height - 17} textAnchor="middle" className="chart-date">{formatAxisDate(point.date)}</text>}</g>)}</svg>
}

function AccountSignIn({ cloud }: { cloud: CloudState }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const authenticate = async (signup = false, google = false) => {
    setBusy(true); setMessage('')
    try {
      if (google) await cloud.signInWithGoogle()
      else if (signup) { const needsConfirmation = await cloud.signUpWithPassword(email, password); if (needsConfirmation) setMessage('Check your email to confirm your account.') }
      else await cloud.signInWithPassword(email, password)
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Sign-in failed. Try again.') }
    finally { setBusy(false) }
  }
  return <form className="account-form" onSubmit={event => { event.preventDefault(); void authenticate() }}><p>Sign in to log your workouts. Everything saves to your account and follows you to every device.</p><label>Email<input type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} /></label><label>Password<input type="password" minLength={6} autoComplete="current-password" required value={password} onChange={e => setPassword(e.target.value)} /></label>{message && <p role="status">{message}</p>}<div><button className="primary-button" disabled={busy}>{busy ? 'Connecting…' : 'Sign in'}</button><button type="button" className="secondary-button" disabled={busy || !email || password.length < 6} onClick={() => void authenticate(true)}>Create account</button>{cloud.googleEnabled && <button type="button" className="secondary-button" disabled={busy} onClick={() => void authenticate(false, true)}>Continue with Google</button>}</div></form>
}

function AuthGate({ cloud }: { cloud: CloudState }) {
  const loading = cloud.configured && (!cloud.authReady || (cloud.email && !cloud.hydrated && cloud.status !== 'error'))
  return <div className="auth-gate"><div className="auth-card panel">
    <a className="brand-lockup" href="/" aria-label="Optimal Lifts home"><DumbbellMark size={28} /><span>OptimalLifts</span></a>
    {!cloud.configured ? <div className="disclosure"><Info weight="fill" /><div><strong>Sign-in isn’t configured</strong><p>Add VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY to the environment, then redeploy.</p></div></div>
      : loading ? <p role="status" className="auth-loading">{cloud.email ? 'Loading your workouts…' : 'Connecting…'}</p>
      : cloud.email ? <div className="auth-error"><p role="alert" className="cloud-message error">{cloud.message ?? 'Could not load your workouts.'}</p><div className="sheet-footer"><Pressable className="secondary-button" onClick={() => cloud.signOut()}>Sign out</Pressable><Pressable className="primary-button" onClick={cloud.retry}>Try again</Pressable></div></div>
      : <>{cloud.status === 'error' && cloud.message && <p role="alert" className="cloud-message error">{cloud.message}</p>}<AccountSignIn cloud={cloud} /></>}
  </div></div>
}

function Settings({ data, setData, toast, cloud }: { data: AppData; setData: React.Dispatch<React.SetStateAction<AppData>>; toast: (s: string) => void; cloud: CloudState }) {
  const [confirming, setConfirming] = useState<'routines' | 'all' | null>(null)
  return <div className="page"><PageHeader eyebrow="Your app" title="Profile & Settings" />
    <section className="settings-group"><div className="settings-title"><h2>Account</h2><p>Your workouts save to this account automatically.</p></div><div className="cloud-account"><span className="settings-icon"><UserCircle weight="fill" /></span><div><strong>{cloud.email}</strong><small>{cloud.status === 'error' ? 'Changes not saved yet' : cloud.status === 'syncing' ? 'Saving…' : 'All changes saved'}</small></div></div>{cloud.status === 'error' && cloud.message && <><p role="alert" className="cloud-message error">{cloud.message}</p><Pressable className="settings-row" onClick={cloud.retry}><span className="settings-icon"><Repeat /></span><div><strong>Try again</strong><small>Reconnect to your account</small></div><ArrowRight /></Pressable></>}<Pressable className="settings-row" onClick={() => cloud.signOut()}><span className="settings-icon"><ArrowLeft /></span><div><strong>Sign out</strong><small>Removes your workouts from this device</small></div><ArrowRight /></Pressable></section>
    <section className="settings-group danger-zone"><div className="settings-title"><h2>Reset</h2><p>These actions require confirmation and cannot be undone.</p></div><button className="settings-row danger" onClick={() => setConfirming('routines')}><span className="settings-icon"><Repeat /></span><div><strong>Reset routines</strong><small>History remains untouched</small></div><ArrowRight /></button><button className="settings-row danger" onClick={() => setConfirming('all')}><span className="settings-icon"><Trash /></span><div><strong>Clear all data</strong><small>Routines, sessions, and drafts</small></div><ArrowRight /></button></section>
    <AnimatePresence>{confirming && <Sheet title={confirming === 'all' ? 'Clear all data?' : 'Reset routines?'} onClose={() => setConfirming(null)}><div className="confirm-copy"><WarningCircle weight="fill" /><p>{confirming === 'all' ? 'Every saved session and unfinished draft will be removed from this account and device.' : 'Your workout lists will return to the starter setup. Saved session history will remain unchanged.'}</p></div><div className="sheet-footer"><Pressable className="secondary-button" onClick={() => setConfirming(null)}>Cancel</Pressable><Pressable className="danger-button" onClick={() => { if (confirming === 'all') { clearData(); setData(createSeedData()) } else setData(d => ({ ...d, routines: createSeedData().routines, draft: undefined })); setConfirming(null); toast(confirming === 'all' ? 'All data cleared' : 'Routines reset') }}>{confirming === 'all' ? 'Clear everything' : 'Reset routines'}</Pressable></div></Sheet>}</AnimatePresence>
  </div>
}

function Sheet({ title, onClose, children, wide }: { title: string; onClose: () => void; children: React.ReactNode; wide?: boolean }) {
  return <motion.div className="sheet-layer" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><motion.button className="sheet-scrim" onClick={onClose} aria-label="Close" /><motion.section className={wide ? 'sheet wide' : 'sheet'} role="dialog" aria-modal="true" aria-label={title} initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', stiffness: 330, damping: 32 }}><div className="sheet-handle" /><header><h2>{title}</h2><Pressable className="icon-button" onClick={onClose} ariaLabel="Close"><X /></Pressable></header><div className="sheet-body">{children}</div></motion.section></motion.div>
}

export function showsLanding(location: Pick<Location, 'pathname' | 'hash' | 'search'>) {
  const callback = /(?:access_token|refresh_token|error|type)=/.test(location.hash) || new URLSearchParams(location.search).has('code')
  return location.pathname === '/' && !callback
}

function App() {
  return showsLanding(window.location) ? <Landing /> : <TrainingApp />
}

export default App
