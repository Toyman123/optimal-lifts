import { useRef, useState, type Dispatch, type SetStateAction } from 'react'
import { ArrowLeft, Barbell, Check, ClockCountdown, Pause, Play, Plus, Trash } from '@phosphor-icons/react'
import { GeminiWorkoutEntry } from './GeminiWorkoutEntry'
import { parseWorkoutNote } from './parser'
import { formatClock, workoutKey, type WorkoutClock } from './useRestTimer'
import { newlyLoggedExerciseIds } from './timer'
import type { AppData, Draft, Routine, Session, WorkoutRow } from './types'

const uid = () => crypto.randomUUID()
const blank = (weight = '', reps = ''): WorkoutRow => ({ id: uid(), weight, reps, completed: false })
export const validRow = (row: WorkoutRow) => row.weight.trim() !== '' && Number.isFinite(Number(row.weight)) && Number(row.weight) >= 0 && Number(row.weight) <= 2000 && /^\d+$/.test(row.reps) && Number(row.reps) > 0 && Number(row.reps) <= 100

export function hydrateRows(draft: Draft, routine: Routine) {
  if (draft.rows) return draft.rows
  const parsed = parseWorkoutNote(draft.note, routine.exercises)
  return Object.fromEntries(routine.exercises.map(exercise => {
    const entry = parsed.exercises.find(item => item.exercise.id === exercise.id)
    return [exercise.id, entry?.sets.map(set => ({ id: set.id, weight: String(set.weight), reps: String(set.reps), completed: true, effort: set.effort })) ?? [blank(exercise.bodyweight ? '0' : '')]]
  }))
}

export function WorkoutLogger({ data, setData, clock, onBack, onFinish, toast, coach }: { data: AppData; setData: Dispatch<SetStateAction<AppData>>; clock: WorkoutClock; onBack: () => void; onFinish: () => void; toast: (message: string) => void; coach?: React.ReactNode }) {
  const draft = data.draft!
  const routine = data.routines.find(item => item.id === draft.routineId)!
  const initialParsed = useRef(parseWorkoutNote(draft.note, routine.exercises))
  const [entryMode, setEntryMode] = useState<'notes' | 'sets'>(draft.entryMode ?? 'notes')
  const toNote = (values: Record<string, WorkoutRow[]>) => [initialParsed.current.sessionComment, ...[...new Set([...draft.order, ...routine.exercises.map(e => e.id)])].map(id => routine.exercises.find(e => e.id === id)).filter((e): e is Routine['exercises'][number] => Boolean(e && !e.archived)).map(exercise => {
    const sets = (values[exercise.id] ?? []).filter(row => row.weight || row.reps).map(row => `${exercise.bodyweight ? `bw+${row.weight || '0'}` : row.weight}x${row.reps}`).join(' ')
    const comment = initialParsed.current.exercises.find(item => item.exercise.id === exercise.id)?.comment
    return [exercise.name, sets, comment].filter(Boolean).join('\n')
  })].filter(Boolean).join('\n\n')
  const [notesText, setNotesText] = useState(() => draft.rows && !draft.entryMode ? toNote(draft.rows) : draft.note)
  const [rows, setRows] = useState(() => hydrateRows(entryMode === 'notes' ? { ...draft, note: notesText, rows: undefined } : draft, routine))
  const rowsRef = useRef(rows)
  const sessionId = useRef(draft.editingSessionId ?? uid())
  const [newExercise, setNewExercise] = useState('')
  const [error, setError] = useState('')
  const [orderName, setOrderName] = useState('')
  const [needsOrder, setNeedsOrder] = useState(false)
  const [restSettings, setRestSettings] = useState(false)
  const [historyId, setHistoryId] = useState<string>()
  const order = [...new Set([...draft.order, ...routine.exercises.filter(e => !e.archived).map(e => e.id)])]
  const exercises = order.map(id => routine.exercises.find(e => e.id === id)).filter((e): e is Routine['exercises'][number] => Boolean(e && !e.archived))
  const key = workoutKey(draft)
  const completed = Object.values(rows).flat().filter(row => row.completed && validRow(row)).length
  const previous = (id: string) => [...data.sessions].filter(s => s.id !== sessionId.current && s.routineId === routine.id).sort((a, b) => b.date.localeCompare(a.date) || b.savedAt.localeCompare(a.savedAt)).find(s => s.exercises.some(e => e.exerciseId === id))
  const restFor = (id: string) => data.restSeconds?.[id] ?? 120
  const [restExerciseId, setRestExerciseId] = useState(() => exercises[0]?.id ?? '')
  const setCounts = (parsed: ReturnType<typeof parseWorkoutNote>) => Object.fromEntries(parsed.exercises.map(item => [item.exercise.id, item.sets.length]))
  const changeNotes = (note: string) => {
    setNotesText(note); setError('')
    const before = setCounts(initialParsed.current)
    initialParsed.current = parseWorkoutNote(note, routine.exercises)
    // Start rest the moment a set is written (new or re-entered).
    const logged = newlyLoggedExerciseIds(setCounts(initialParsed.current), before)
    const newest = [...initialParsed.current.exercises].reverse().find(item => logged.includes(item.exercise.id))
    if (newest) clock.start(key, newest.exercise.id, newest.exercise.name, restFor(newest.exercise.id))
    const next = hydrateRows({ ...draft, rows: undefined, note }, routine)
    rowsRef.current = next; setRows(next)
    const noteOrder = initialParsed.current.exercises.map(item => item.exercise.id)
    setData(current => ({ ...current, draft: { ...current.draft!, entryMode: 'notes', note, rows: next, order: [...new Set([...noteOrder, ...current.draft!.order])], updatedAt: new Date().toISOString() } }))
  }
  const switchEntry = (mode: 'notes' | 'sets') => {
    if (mode === entryMode) return
    if (entryMode === 'notes' && parseWorkoutNote(notesText, routine.exercises).issues.length) { setError('Fix the incomplete sets in your notes before switching to set entry.'); return }
    const note = mode === 'notes' ? toNote(rowsRef.current) : notesText
    setNotesText(note); initialParsed.current = parseWorkoutNote(note, routine.exercises)
    setEntryMode(mode)
    setData(current => ({ ...current, draft: { ...current.draft!, entryMode: mode, note, rows: rowsRef.current, updatedAt: new Date().toISOString() } }))
  }

  // Commit draft fields and completed sets together. Field editing never starts rest.
  const commit = (next: Record<string, WorkoutRow[]>, extra: Partial<Draft> = {}) => {
    rowsRef.current = next; setRows(next); setError('')
    const ordered = extra.order ? [...exercises].sort((a, b) => extra.order!.indexOf(a.id) - extra.order!.indexOf(b.id)) : exercises
    const entries = ordered.flatMap(exercise => {
      const sets = (next[exercise.id] ?? []).filter(row => row.completed && validRow(row)).map(row => ({ id: row.id, weight: Number(row.weight), reps: Number(row.reps), bodyweight: exercise.bodyweight, effort: row.effort }))
      return sets.length ? [{ exerciseId: exercise.id, exerciseName: exercise.name, position: 0, sets, comment: initialParsed.current.exercises.find(item => item.exercise.id === exercise.id)?.comment }] : []
    }).map((entry, index) => ({ ...entry, position: index + 1 }))
    const note = entryMode === 'notes' ? notesText : [initialParsed.current.sessionComment, ...entries.map(entry => `${entry.exerciseName}\n${entry.sets.map(set => `${set.bodyweight ? `bw+${set.weight}` : set.weight}x${set.reps}`).join(' ')}${entry.comment ? `\n${entry.comment}` : ''}`)].filter(Boolean).join('\n\n')
    const variation = routine.variations.find(v => v.id === (extra.variationId ?? draft.variationId))
    const session: Session = { durationSeconds: data.sessions.find(s => s.id === sessionId.current)?.durationSeconds, id: sessionId.current, date: extra.date ?? draft.date, savedAt: new Date().toISOString(), routineId: routine.id, routineName: routine.name, variationId: variation?.id, variationName: variation?.name, orderKind: variation ? 'variation' : 'one-off', actualExerciseOrder: entries.map(e => e.exerciseId), exercises: entries, comment: initialParsed.current.sessionComment, rawNote: note }
    setData(current => ({ ...current, draft: { ...current.draft!, ...extra, rows: next, note, editingSessionId: sessionId.current, updatedAt: new Date().toISOString() }, sessions: entries.length ? [...current.sessions.filter(s => s.id !== sessionId.current), session] : current.sessions.filter(s => s.id !== sessionId.current) }))
  }
  const updateRow = (id: string, rowId: string, patch: Partial<WorkoutRow>) => commit({ ...rowsRef.current, [id]: rowsRef.current[id].map(row => row.id === rowId ? { ...row, ...patch } : row) })
  const completeRow = (exerciseId: string, row: WorkoutRow) => {
    if (!row.completed && !validRow(row)) { setError('Enter a weight from 0–2,000 lb and 1–100 whole reps before completing a set.'); return }
    updateRow(exerciseId, row.id, { completed: !row.completed })
    if (!row.completed) { clock.start(key, exerciseId, exercises.find(e => e.id === exerciseId)!.name, restFor(exerciseId)) }
  }
  const finish = (saveOrder = false) => {
    if (!completed) return
    if (entryMode === 'notes' && parseWorkoutNote(notesText, routine.exercises).issues.length) { setError('Fix the incomplete sets in your notes before finishing. Your draft is saved.'); return }
    if (Object.values(rowsRef.current).flat().some(row => row.completed && !validRow(row))) { setError('Fix the highlighted set values before finishing.'); return }
    commit(rowsRef.current)
    const ids = exercises.filter(e => rows[e.id]?.some(row => row.completed)).map(e => e.id)
    const exact = routine.variations.find(v => !v.archived && v.exerciseIds.filter(id => ids.includes(id)).join('|') === ids.join('|'))
    if (!exact && !saveOrder) { setNeedsOrder(true); return }
    const variation = exact ?? (orderName.trim() ? { id: uid(), name: orderName.trim(), exerciseIds: ids } : undefined)
    setData(current => ({ ...current, routines: !exact && variation ? current.routines.map(r => r.id === routine.id ? { ...r, variations: [...r.variations, variation] } : r) : current.routines, sessions: current.sessions.map(s => s.id === sessionId.current ? { ...s, variationId: variation?.id, variationName: variation?.name, orderKind: variation ? 'variation' : 'one-off' } : s), draft: undefined, drafts: current.drafts?.filter(d => workoutKey(d) !== key) }))
    if (clock.timer?.workoutKey === key) clock.cancel()
    toast('Workout finished. Every set saved.'); onFinish()
  }
  return <div className="page training-page">
    <div className="training-top"><button className="back-button" onClick={onBack}><ArrowLeft /> Workouts</button><span className="save-status"><i /> Saved to your account</span></div>
    <header className="training-heading"><div><p className="eyebrow">Workout in progress</p><h1>{routine.name}</h1></div><button className="primary-button" disabled={!completed} onClick={() => finish()}>Finish workout <Check /></button></header>
    <div className="training-toolbar"><label>Date <input aria-label="Workout date" type="date" value={draft.date} onChange={e => commit(rowsRef.current, { date: e.target.value })} /></label><label>Order <select aria-label="Workout order" value={draft.variationId ?? ''} onChange={e => { const variation = routine.variations.find(v => v.id === e.target.value); if (variation) commit(rowsRef.current, { variationId: variation.id, order: variation.exerciseIds }) }}>{routine.variations.filter(v => !v.archived).map(v => <option key={v.id} value={v.id}>{v.name}</option>)}</select></label>{entryMode === 'sets' && <button className="text-link" onClick={() => setRestSettings(!restSettings)}><ClockCountdown /> Rest settings</button>}</div>
    {restSettings && <section className="rest-settings panel"><h2>Rest between sets</h2><p>Starts as soon as you log a set.</p><button className="secondary-button" onClick={() => void clock.enableAlerts()}>{clock.alerts ? 'Turn alerts off' : 'Enable sound & vibration'}</button><p>Alerts work while the browser can run. If your phone suspends the app, the countdown catches up when you return.</p>{exercises.map(e => <label key={e.id}>{e.name}<select aria-label={`Rest for ${e.name}`} value={restFor(e.id)} onChange={event => setData(current => ({ ...current, restSeconds: { ...current.restSeconds, [e.id]: Number(event.target.value) } }))}>{[...new Set([30, 60, 90, 120, 150, 180, 240, 300, restFor(e.id)])].sort((a, b) => a - b).map(n => <option key={n} value={n}>{formatClock(n)}</option>)}</select></label>)}</section>}
    {error && <p className="form-error" role="alert">{error}</p>}
    <div className="entry-switch segmented" aria-label="Workout entry"><button className={entryMode === 'notes' ? 'active' : ''} aria-pressed={entryMode === 'notes'} onClick={() => switchEntry('notes')}>Notes</button><button className={entryMode === 'sets' ? 'active' : ''} aria-pressed={entryMode === 'sets'} onClick={() => switchEntry('sets')}>Set entry</button></div>
    <section className="manual-rest panel" aria-label="Rest timer controls"><div><ClockCountdown size={21} /><strong>Rest timer</strong></div><label><span className="sr-only">Rest exercise</span><select aria-label="Rest exercise" value={restExerciseId} onChange={event => setRestExerciseId(event.target.value)}>{exercises.map(exercise => <option key={exercise.id} value={exercise.id}>{exercise.name}</option>)}</select></label><select aria-label="Rest duration" value={restFor(restExerciseId)} onChange={event => setData(current => ({ ...current, restSeconds: { ...current.restSeconds, [restExerciseId]: Number(event.target.value) } }))}>{[...new Set([30, 60, 90, 120, 150, 180, 240, 300, restFor(restExerciseId)])].sort((a, b) => a - b).map(duration => <option key={duration} value={duration}>{formatClock(duration)}</option>)}</select><button className="primary-button" disabled={!restExerciseId} onClick={() => clock.start(key, restExerciseId, exercises.find(e => e.id === restExerciseId)?.name ?? routine.name, restFor(restExerciseId))}><Play weight="fill" />{clock.timer?.workoutKey === key ? 'Restart rest' : 'Start rest'}</button></section>
    {entryMode === 'notes' && <section className="workout-notes panel"><label htmlFor="workout-notes">Workout notes</label><p>Write your exercises and sets, like Bench 225x8 225x6. Add notes on the lines below.</p><textarea id="workout-notes" spellCheck={false} value={notesText} onChange={event => changeNotes(event.target.value)} /><footer><span>Draft saved as you type</span><button className="secondary-button" onClick={() => { if (parseWorkoutNote(notesText, routine.exercises).issues.length) { setError('Fix the incomplete sets before saving. Your draft is saved.'); return } commit(rowsRef.current); toast('Notes saved.') }}>Save notes</button></footer><GeminiWorkoutEntry exercises={exercises} onApply={changeNotes} /></section>}
    {entryMode === 'sets' && <div className="training-layout"><div className="exercise-stack">{exercises.map(exercise => {
      const list = rows[exercise.id] ?? [blank(exercise.bodyweight ? '0' : '')]
      const prior = previous(exercise.id)
      const priorExercise = prior?.exercises.find(e => e.exerciseId === exercise.id)
      return <section key={exercise.id} className="exercise-log panel"><header><span className="exercise-symbol"><Barbell /></span><div><h2>{exercise.name}</h2><p>{exercise.bodyweight ? 'Bodyweight · Enter added weight' : 'Strength · Weight in pounds'}</p></div><button className="text-link" onClick={() => setHistoryId(historyId === exercise.id ? undefined : exercise.id)}>View history</button></header>
        {historyId === exercise.id && <div className="exercise-history">{priorExercise ? <><span>{prior!.date}</span><strong>{priorExercise.sets.map(s => `${s.weight} lb × ${s.reps}`).join(' · ')}</strong></> : <span>No previous sets for this exercise.</span>}</div>}
        <div className="log-set-head"><span>Set</span><span>Weight (lb)</span><span>Reps</span><span className="sr-only">Complete</span><span /></div>
        {list.map((row, index) => <div className={`log-set-row ${row.completed ? 'is-complete' : ''}`} key={row.id}><span>{index + 1}</span><input aria-label={`${exercise.name} set ${index + 1} weight`} inputMode="decimal" type="number" min="0" max="2000" step="0.5" placeholder={String(priorExercise?.sets[index]?.weight ?? '—')} value={row.weight} onChange={e => updateRow(exercise.id, row.id, { weight: e.target.value })} /><input aria-label={`${exercise.name} set ${index + 1} reps`} inputMode="numeric" type="number" min="1" max="100" placeholder={String(priorExercise?.sets[index]?.reps ?? '—')} value={row.reps} onChange={e => updateRow(exercise.id, row.id, { reps: e.target.value })} /><button className="set-check" aria-label={`${row.completed ? 'Undo' : 'Complete'} ${exercise.name} set ${index + 1}`} aria-pressed={row.completed} onClick={() => completeRow(exercise.id, row)}>{row.completed ? <Check weight="bold" /> : <span />}</button><button className="delete-set" aria-label={`Delete ${exercise.name} set ${index + 1}`} onClick={() => commit({ ...rowsRef.current, [exercise.id]: list.filter(r => r.id !== row.id) })}><Trash /></button></div>)}
        <footer><button className="secondary-button" onClick={() => { const last = list.at(-1); commit({ ...rowsRef.current, [exercise.id]: [...list, blank(last?.weight ?? '', last?.reps ?? '')] }) }}><Plus /> Add set</button><button className="text-link" disabled={!priorExercise} onClick={() => commit({ ...rowsRef.current, [exercise.id]: [...list.filter(row => row.completed), ...priorExercise!.sets.slice(list.filter(row => row.completed).length).map(s => blank(String(s.weight), String(s.reps)))] })}>Use previous</button><span>{list.filter(r => r.completed).length} completed</span></footer>
      </section>
    })}<form className="add-exercise panel" onSubmit={event => { event.preventDefault(); if (!newExercise.trim()) return; const id = uid(); const addedRows = [blank()]; setData(current => ({ ...current, routines: current.routines.map(r => r.id === routine.id ? { ...r, exercises: [...r.exercises, { id, name: newExercise.trim(), aliases: [], bodyweight: false }] } : r), draft: { ...current.draft!, order: [...current.draft!.order, id], rows: { ...rowsRef.current, [id]: addedRows } } })); rowsRef.current = { ...rowsRef.current, [id]: addedRows }; setRows(rowsRef.current); setNewExercise('') }}><input aria-label="New exercise name" placeholder="Add an exercise…" value={newExercise} onChange={e => setNewExercise(e.target.value)} /><button className="secondary-button" disabled={!newExercise.trim()}><Plus /> Add</button></form></div>
      <aside className="training-summary panel"><ClockCountdown size={26} /><h2>One set at a time.</h2><p>Log your weight and reps, then tap the check to complete your set and start rest.</p><strong>{completed}<small> sets completed</small></strong><button className="secondary-button" onClick={() => void clock.enableAlerts()}>{clock.alerts ? 'Alerts on · Turn off' : 'Enable rest alerts'}</button><GeminiWorkoutEntry exercises={exercises} onApply={note => { const parsed = parseWorkoutNote(note, exercises); if (parsed.issues.length) { setError('Review the imported sets before applying.'); return } initialParsed.current = parsed; const next = Object.fromEntries(exercises.map(e => [e.id, parsed.exercises.find(p => p.exercise.id === e.id)?.sets.map(s => ({ id: s.id, weight: String(s.weight), reps: String(s.reps), completed: false, effort: s.effort })) ?? rowsRef.current[e.id] ?? [blank()]])); commit(next); toast('Sets imported. Mark each set complete when ready.') }} /></aside>
    </div>}
    {coach && <section className="workout-coach">{coach}</section>}
    {needsOrder && <div className="inline-order panel"><h2>Keep this exercise order?</h2><p>This session uses a different order from your saved variations.</p><input aria-label="New order name" placeholder="Optional variation name" value={orderName} onChange={e => setOrderName(e.target.value)} /><button className="primary-button" onClick={() => finish(true)}>{orderName.trim() ? 'Save variation & finish' : 'Use once & finish'}</button><button className="text-link" onClick={() => setNeedsOrder(false)}>Keep training</button></div>}
  </div>
}

export function RestTimerBar({ clock, onOpen }: { clock: WorkoutClock; onOpen: () => void }) {
  const timer = clock.timer
  if (!timer) return null
  return <section className={`rest-dock ${timer.remaining === 0 ? 'complete' : ''}`} aria-label="Rest timer"><button className="rest-label" onClick={onOpen}><ClockCountdown /><span>{timer.remaining === 0 ? 'Ready for your next set' : timer.running ? `Rest · ${timer.name}` : 'Rest paused'}<strong role="timer">{formatClock(timer.remaining)}</strong></span></button><div className="rest-actions"><button aria-label="Subtract 15 seconds" onClick={() => clock.adjust(-15)}>−15</button>{timer.remaining > 0 && <button aria-label={timer.running ? 'Pause timer' : 'Resume timer'} onClick={clock.toggle}>{timer.running ? <Pause /> : <Play />}</button>}<button aria-label="Add 15 seconds" onClick={() => clock.adjust(15)}>+15</button><button onClick={clock.cancel}>{timer.remaining === 0 ? 'Next set' : 'Skip'}</button></div></section>
}
