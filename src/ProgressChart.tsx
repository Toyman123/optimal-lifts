import { useId, useLayoutEffect, useRef, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { ArrowRight, Trophy } from '@phosphor-icons/react'
import type { Session, SessionExercise } from './types'
import './chart.css'

export type ChartPoint = { date: string; value: number; item: { session: Session; exercise: SessionExercise } }
type Props = { points: ChartPoint[]; label: string; unit: string; onOpen: (point: ChartPoint) => void }

const PAD_L = 48, PAD_R = 20, PAD_T = 30, PAD_B = 40
const shortDate = (date: string) => new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(new Date(`${date}T12:00:00`))
const round = (value: number) => Math.round(value * 10) / 10
const setText = (exercise: SessionExercise) => exercise.sets.map(set => `${set.bodyweight && !set.weight ? 'BW' : set.weight}×${set.reps}`)

/** Smooth curve through the points that never overshoots (monotone cubic). */
function smoothPath(pts: { x: number; y: number }[]) {
  if (pts.length < 3) return pts.map((p, i) => `${i ? 'L' : 'M'}${p.x},${p.y}`).join(' ')
  const n = pts.length, dx: number[] = [], m: number[] = [], t: number[] = []
  for (let i = 0; i < n - 1; i++) { dx[i] = pts[i + 1].x - pts[i].x; m[i] = (pts[i + 1].y - pts[i].y) / dx[i] }
  t[0] = m[0]; t[n - 1] = m[n - 2]
  for (let i = 1; i < n - 1; i++) t[i] = m[i - 1] * m[i] <= 0 ? 0 : (3 * (dx[i - 1] + dx[i])) / ((2 * dx[i] + dx[i - 1]) / m[i - 1] + (dx[i] + 2 * dx[i - 1]) / m[i])
  let d = `M${pts[0].x},${pts[0].y}`
  for (let i = 0; i < n - 1; i++) {
    const h = dx[i] / 3
    d += ` C${pts[i].x + h},${pts[i].y + t[i] * h} ${pts[i + 1].x - h},${pts[i + 1].y - t[i + 1] * h} ${pts[i + 1].x},${pts[i + 1].y}`
  }
  return d
}

function niceTicks(min: number, max: number) {
  const span = max - min || Math.max(1, Math.abs(max) * .1)
  const raw = span / 3, mag = 10 ** Math.floor(Math.log10(raw)), step = [1, 2, 2.5, 5, 10].map(s => s * mag).find(s => s >= raw) ?? raw
  const lo = Math.floor(min / step) * step, hi = Math.ceil(max / step) * step
  const ticks: number[] = []
  for (let v = lo; v <= hi + step / 2; v += step) ticks.push(round(v))
  return ticks
}

export function ProgressChart({ points, label, unit, onOpen }: Props) {
  const reduce = useReducedMotion()
  const id = useId().replace(/:/g, '')
  const [active, setActive] = useState<number | null>(null)
  const box = useRef<HTMLDivElement>(null)
  const [W, setW] = useState(760)
  useLayoutEffect(() => {
    const el = box.current
    if (!el) return
    if (el.clientWidth) setW(Math.max(280, el.clientWidth))
    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(([entry]) => setW(Math.max(280, Math.round(entry.contentRect.width))))
    observer.observe(el)
    return () => observer.disconnect()
  }, [points.length > 1])
  const H = W < 560 ? 240 : 300

  if (points.length === 1) {
    const only = points[0]
    return <button className="pchart-single" onClick={() => onOpen(only)}><span>{shortDate(only.date)}</span><strong>{round(only.value)}<small>{unit}</small></strong><p>{setText(only.item.exercise).join(' · ')}</p><em>Log another session to start your trend line.</em></button>
  }
  if (!points.length) return null

  const ticks = niceTicks(Math.min(...points.map(p => p.value)), Math.max(...points.map(p => p.value)))
  const lo = ticks[0], hi = ticks.at(-1)!, spread = hi - lo || 1
  let best = -Infinity
  const coords = points.map((p, i) => {
    const isPr = p.value > best && i > 0; best = Math.max(best, p.value)
    return { ...p, isPr, x: PAD_L + i * ((W - PAD_L - PAD_R) / (points.length - 1)), y: H - PAD_B - ((p.value - lo) / spread) * (H - PAD_T - PAD_B) }
  })
  const line = smoothPath(coords)
  const area = `${line} L${coords.at(-1)!.x},${H - PAD_B} L${coords[0].x},${H - PAD_B} Z`
  const dateStep = Math.max(1, Math.ceil(points.length / (W < 560 ? 4 : 7)))
  const current = active === null ? null : coords[active]

  const pick = (clientX: number, rect: DOMRect) => {
    const x = ((clientX - rect.left) / rect.width) * W
    let nearest = 0
    coords.forEach((c, i) => { if (Math.abs(c.x - x) < Math.abs(coords[nearest].x - x)) nearest = i })
    setActive(nearest)
  }
  const onKey = (event: React.KeyboardEvent) => {
    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') { event.preventDefault(); setActive(i => Math.max(0, Math.min(coords.length - 1, (i ?? (event.key === 'ArrowRight' ? -1 : coords.length)) + (event.key === 'ArrowRight' ? 1 : -1)))) }
    if ((event.key === 'Enter' || event.key === ' ') && current) { event.preventDefault(); onOpen(current) }
    if (event.key === 'Escape') setActive(null)
  }
  const tipSide = current ? (current.x / W < .22 ? 'left' : current.x / W > .78 ? 'right' : '') : ''

  return <div ref={box} className="pchart" tabIndex={0} role="group" aria-label={`${label} by workout date. Use the arrow keys to move between sessions and Enter to open one.`} onKeyDown={onKey} onBlur={() => setActive(null)}>
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${label}: ${points.map(p => `${shortDate(p.date)} ${round(p.value)}${unit}`).join(', ')}`}
      onPointerMove={e => pick(e.clientX, e.currentTarget.getBoundingClientRect())}
      onPointerDown={e => pick(e.clientX, e.currentTarget.getBoundingClientRect())}
      onPointerLeave={e => { if (e.pointerType === 'mouse') setActive(null) }}
      onClick={() => current && onOpen(current)}>
      <defs>
        <linearGradient id={`fill-${id}`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="var(--lime)" stopOpacity=".22" /><stop offset="1" stopColor="var(--lime)" stopOpacity="0" /></linearGradient>
      </defs>
      {ticks.map(tick => { const y = H - PAD_B - ((tick - lo) / spread) * (H - PAD_T - PAD_B); return <g key={tick}><line className="pchart-grid" x1={PAD_L} x2={W - PAD_R} y1={y} y2={y} /><text className="pchart-axis" x={PAD_L - 12} y={y + 4} textAnchor="end">{tick.toLocaleString('en-US')}</text></g> })}
      {coords.map((c, i) => (i % dateStep === 0 || i === coords.length - 1) && <text key={`d${i}`} className={`pchart-axis${active === i ? ' on' : ''}`} x={c.x} y={H - 16} textAnchor="middle">{shortDate(c.date)}</text>)}
      <motion.path key={`a-${label}`} d={area} fill={`url(#fill-${id})`} initial={reduce ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: .8, delay: .35 }} />
      <motion.path key={`l-${label}`} d={line} className="pchart-line" initial={reduce ? false : { pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1, ease: [0.2, 0.8, 0.2, 1] }} />
      {current && <line className="pchart-guide" x1={current.x} x2={current.x} y1={PAD_T - 10} y2={H - PAD_B} />}
      {coords.map((c, i) => <motion.circle key={`${label}-${c.date}-${i}`} cx={c.x} cy={c.y} r={active === i ? 7 : c.isPr ? 5.5 : 4} className={`pchart-dot${c.isPr ? ' pr' : ''}${active === i ? ' on' : ''}`}
        initial={reduce ? false : { scale: 0 }} animate={{ scale: 1 }} transition={{ delay: .5 + i * (0.5 / coords.length), type: 'spring', stiffness: 400, damping: 18 }} style={{ transformOrigin: `${c.x}px ${c.y}px` }} />)}
    </svg>
    {current && <div className={`pchart-tip ${tipSide}`} style={{ left: `${(current.x / W) * 100}%`, top: `${(current.y / H) * 100}%` }} role="status">
      <span className="pchart-tip-date">{shortDate(current.date)}{current.isPr && <b><Trophy weight="fill" /> Best yet</b>}</span>
      <strong>{round(current.value).toLocaleString('en-US')}<small>{unit}</small></strong>
      <span className="pchart-tip-sets">{setText(current.item.exercise).map((s, i) => <i key={i}>{s}</i>)}</span>
      <span className="pchart-tip-open">Tap to open <ArrowRight weight="bold" /></span>
    </div>}
  </div>
}
