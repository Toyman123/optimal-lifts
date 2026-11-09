import { useEffect, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { ArrowRight, Barbell, ChartBar, Check, Fire, House, List, Plus, Timer, Trophy } from '@phosphor-icons/react'
import { BrandMark } from './BrandMark'
import './landing.css'

type LandingProps = { onStart: () => void; onLogin: () => void; onProgress: () => void }

const ease = [0.2, 0.8, 0.2, 1] as const
const NOTE_TEXT = ['Incline DB Press', '70x7 70x7', 'Machine Chest Press', '120x10 120x10', 'felt strong'].join('\n')

function Brand({ size = 34 }: { size?: number }) {
  return <a className="landing-brand" href="#/" aria-label="Optimal Lifts home"><BrandMark size={size} /><span>Optimal Lifts</span></a>
}

function PreviewNav({ progress = false }: { progress?: boolean }) {
  return <div className="preview-nav"><span className={!progress ? 'selected' : ''}><House weight="fill" />Home</span><span><Barbell />Workouts</span><span className="preview-add"><Plus /></span><span className={progress ? 'selected' : ''}><ChartBar weight="fill" />Progress</span><span><List />More</span></div>
}
function Phone({ children, className = '', index, drift }: { children: React.ReactNode; className?: string; index: number; drift: number }) {
  const reduce = useReducedMotion()
  return <motion.div className={`preview-slot ${className}`} initial={reduce ? false : { opacity: 0, y: 90 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1, delay: .45 + index * .12, ease }}>
    <motion.div className="preview-phone" animate={reduce ? undefined : { y: [0, -drift, 0] }} transition={{ duration: 5.5 + index * .7, repeat: Infinity, ease: 'easeInOut', delay: 1.5 + index * .3 }}>
      <div className="phone-glass"><div className="phone-status"><span>9:41</span><i /><span>▮▮▮ ▰</span></div>{children}</div>
    </motion.div>
  </motion.div>
}
function PreviewExercise({ name, weights, reps }: { name: string; weights: number[]; reps: number[] }) {
  return <div className="preview-exercise"><div className="preview-exercise-title"><span><Barbell /></span><div><strong>{name}</strong><small>{weights.length} sets</small></div><span>···</span></div>{weights.map((weight, i) => <div className="preview-set" key={i}><span>{i + 1}</span><span>{weight} <small>lbs</small></span><span>×</span><span>{reps[i]}</span><i><Check weight="bold" /></i></div>)}<div className="preview-set-add">+ Add set</div></div>
}

/** Types the sample workout note out, then reveals the parsed sets, on a loop. */
function NoteCard() {
  const reduce = Boolean(useReducedMotion())
  const [count, setCount] = useState(reduce ? NOTE_TEXT.length : 0)
  useEffect(() => {
    if (reduce) return
    let n = 0, timer = 0
    const tick = () => {
      n += 1; setCount(n)
      if (n < NOTE_TEXT.length) timer = window.setTimeout(tick, NOTE_TEXT[n - 1] === '\n' ? 260 : 40)
      else timer = window.setTimeout(() => { n = 0; setCount(0); timer = window.setTimeout(tick, 700) }, 7000)
    }
    timer = window.setTimeout(tick, 1800)
    return () => window.clearTimeout(timer)
  }, [reduce])
  const done = count >= NOTE_TEXT.length
  return <motion.div className="note-card" initial={reduce ? false : { opacity: 0, y: 40, rotate: 0 }} animate={{ opacity: 1, y: 0, rotate: -5 }} transition={{ duration: .9, delay: 1.1, ease }}>
    <div className="note-card-head"><span>Push day</span><span className="note-timer"><Timer weight="bold" /> 1:30</span></div>
    <pre>{NOTE_TEXT.slice(0, count)}<span className="caret" /></pre>
    <div className="note-chips">{['70 × 7', '70 × 7', '120 × 10', '120 × 10 · PR'].map((chip, i) => <motion.span key={i} className={chip.includes('PR') ? 'pr' : ''} initial={false} animate={done ? { opacity: 1, scale: 1 } : { opacity: 0, scale: .6 }} transition={{ delay: done ? i * .12 : 0, type: 'spring', stiffness: 380, damping: 20 }}>{chip}</motion.span>)}</div>
  </motion.div>
}

const ROUTINES = [
  { name: 'Push', tone: 'ox', art: <svg viewBox="0 0 110 50"><rect x="10" y="22" width="90" height="6" rx="3" className="cream" /><rect x="14" y="8" width="10" height="34" rx="3" className="hot" /><rect x="86" y="8" width="10" height="34" rx="3" className="hot" /><rect x="26" y="14" width="6" height="22" rx="2" className="cream" /><rect x="78" y="14" width="6" height="22" rx="2" className="cream" /></svg> },
  { name: 'Pull', tone: 'pine', art: <svg viewBox="0 0 70 60"><rect x="5" y="6" width="60" height="5" rx="2.5" className="cream" /><path d="M20 11 L28 40 M50 11 L42 40" className="cream-line" /><rect x="22" y="40" width="26" height="12" rx="4" className="hot" /></svg> },
  { name: 'Legs', tone: 'hot', art: <svg viewBox="0 0 70 60"><circle cx="35" cy="30" r="24" className="ox" /><circle cx="35" cy="30" r="14" className="cream-ring" /><circle cx="35" cy="30" r="4" className="cream" /></svg> },
]

export function Landing({ onStart, onLogin, onProgress }: LandingProps) {
  const reduce = useReducedMotion()
  const rise = (delay: number) => reduce ? {} : { initial: { opacity: 0, y: 28 }, animate: { opacity: 1, y: 0 }, transition: { duration: .8, delay, ease } }
  const inView = (delay = 0) => reduce ? {} : { initial: { opacity: 0, y: 36 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true, amount: .3 }, transition: { duration: .7, delay, ease } }
  const arcText = 'track · improve · repeat · '.repeat(6)

  return <div className="landing">
    <a className="skip-link" href="#landing-main">Skip to content</a>
    <section className="landing-hero">
      <header className="landing-header"><Brand /><nav aria-label="Website navigation"><span className="landing-motto">TRACK &nbsp; IMPROVE &nbsp; REPEAT</span><button onClick={onLogin}>Log in <ArrowRight /></button></nav></header>
      <main id="landing-main" className="landing-content">
        <div className="landing-copy">
          <motion.span className="landing-kicker" {...rise(.05)}><i /> YOUR NEXT REP STARTS HERE</motion.span>
          <h1><motion.span {...rise(.12)}>Built for</motion.span><motion.span {...rise(.22)}>what drives</motion.span><motion.em {...rise(.32)}>you.</motion.em></h1>
          <motion.p {...rise(.42)}>Track your lifts. Beat your best.<br />A cleaner, stronger you.</motion.p>
          <motion.div {...rise(.52)}><button className="landing-cta" onClick={onStart}>Get started <ArrowRight weight="bold" /></button></motion.div>
          <motion.span className="landing-caption" {...rise(.6)}>REAL PROGRESS.<br />NOT JUST WORKOUTS.</motion.span>
        </div>
        <div className="hero-stage" aria-hidden="true">
          <svg className="arch" viewBox="0 0 1000 560" preserveAspectRatio="xMidYMax slice">
            <defs>
              <clipPath id="ol-arch-clip"><path d="M40 560 C 110 -130, 890 -130, 960 560 Z" /></clipPath>
              <path id="ol-arc" d="M115 560 C 190 -45, 810 -45, 885 560" />
            </defs>
            <motion.g initial={reduce ? false : { scaleY: 0 }} animate={{ scaleY: 1 }} transition={{ duration: 1.1, delay: .2, ease }} style={{ originY: 1 }}>
              <g clipPath="url(#ol-arch-clip)">
                <rect width="1000" height="560" className="arch-fill" />
                <image href="/images/gym-atmosphere.png" x="0" y="0" width="1000" height="560" preserveAspectRatio="xMidYMid slice" className="arch-photo" />
                <rect width="1000" height="560" className="arch-tint" />
              </g>
              <text className="arch-text"><textPath href="#ol-arc">{arcText}{!reduce && <animate attributeName="startOffset" from="0%" to="-50%" dur="45s" repeatCount="indefinite" />}</textPath></text>
            </motion.g>
          </svg>
          <div className="phone-showcase">
            <Phone className="splash-phone" index={0} drift={7}><div className="splash-photo" /><div className="preview-brand"><BrandMark size={30} /><strong>Optimal Lifts</strong><span>TRACK PROGRESS<br />BUILD A STRONGER YOU</span></div><div className="preview-onboard"><span>Get started</span><span>Log in</span></div></Phone>
            <Phone className="dashboard-phone" index={1} drift={10}><div className="preview-body"><div className="preview-heading">Dashboard <span>▣</span></div><div className="preview-week">{['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, i) => <span key={i}>{day}<i className={i === 3 ? 'selected' : ''}>{i < 3 ? '•' : i === 3 ? '✓' : '·'}</i></span>)}</div><div className="preview-streak"><Fire weight="fill" /><span><strong>Keep going</strong><small>3 workouts this week</small></span></div><div className="preview-stats">{[['12', 'Total workouts'], ['28,450', 'Total volume (lbs)'], ['6', 'PRs this month'], ['92%', 'Consistency']].map(([value, label]) => <div key={label}><strong>{value}</strong><span>{label}</span></div>)}</div><div className="preview-section-title">Recent workouts <span>View all</span></div><div className="preview-history">{[['Push', 'Today · 1h 2m', '12,850'], ['Pull', 'Tue, Apr 22', '10,600'], ['Legs', 'Sat, Apr 19', '8,950']].map(([name, date, volume], i) => <div key={name}><i className={`type-${i}`}><Barbell /></i><span><strong>{name}</strong><small>{date}</small></span><small>{volume} lbs</small></div>)}</div></div><PreviewNav /></Phone>
            <Phone className="workout-phone" index={2} drift={6}><div className="preview-body"><div className="preview-toolbar"><span>←</span>Workout<span>⁙</span></div><div className="preview-workout-title"><div><strong>Push</strong><small>Today · 1h 2m</small></div><span>Finish</span></div><PreviewExercise name="Barbell Bench Press" weights={[135, 185, 185, 205]} reps={[8, 6, 6, 4]} /><PreviewExercise name="Incline Dumbbell Press" weights={[50, 50, 60]} reps={[10, 10, 8]} /><PreviewExercise name="Overhead Press" weights={[65, 65]} reps={[8, 8]} /></div></Phone>
            <Phone className="progress-phone" index={3} drift={9}><div className="preview-body"><div className="preview-toolbar">Progress</div><div className="preview-tabs"><span>Strength</span><span>Volume</span><span>Consistency</span></div><div className="preview-chart"><div>Bench Press <strong>+40 lbs</strong></div><small>Since Jan 1</small><svg viewBox="0 0 220 148"><g className="preview-grid"><path d="M25 15V125H210 M25 40H210 M25 68H210 M25 96H210 M60 15V125 M98 15V125 M136 15V125 M174 15V125 M210 15V125" /></g><text x="0" y="20">250</text><text x="0" y="70">200</text><text x="0" y="120">150</text><motion.path className="preview-chart-line" d="M25 108 L60 99 L98 85 L136 75 L174 62 L210 48" initial={reduce ? false : { pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 1.6, delay: 1.6, ease: 'easeInOut' }} />{[[25,108],[60,99],[98,85],[136,75],[174,62],[210,48]].map(([cx,cy], i) => <motion.circle key={cx} cx={cx} cy={cy} r="3" initial={reduce ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.6 + i * .25 }} />)}<text x="25" y="143">Jan</text><text x="78" y="143">Feb</text><text x="132" y="143">Mar</text><text x="193" y="143">Apr</text></svg>{[['Current', '205 lbs × 4'], ['Previous best', '185 lbs × 5'], ['1 rep max (est.)', '225 lbs']].map(([label, value]) => <div className="preview-chart-row" key={label}><span>{label}</span><span>{value}</span></div>)}<div className="preview-pr"><Trophy weight="fill" /><span><strong>New PR!</strong><small>205 lbs for 4 reps</small></span></div></div><div className="preview-section-title">All exercises <span>View all</span></div>{[['Squat','+60 lbs'],['Deadlift','+85 lbs'],['Overhead Press','+25 lbs'],['Barbell Row','+40 lbs']].map(([name,value]) => <div className="preview-lift" key={name}><Barbell /><span>{name}</span><strong>{value}</strong></div>)}</div><PreviewNav progress /></Phone>
          </div>
          <NoteCard />
        </div>
      </main>
      <div className="landing-bottom"><span>BUILT FOR THE WORK YOU PUT IN.</span><span>Interface preview · example training data</span><a href="#the-details">Explore the details <span>↓</span></a></div>
    </section>

    <section className="days">
      <motion.h2 {...inView()}>Pick your <em>day.</em></motion.h2>
      <div className="day-grid">
        {ROUTINES.map((routine, i) => <motion.button key={routine.name} className="day-card" onClick={onStart} {...inView(i * .1)} whileHover={reduce ? undefined : { y: -6 }}>
          {i === 2 && <span className="day-tag">Up next</span>}
          <span className={`day-art ${routine.tone}`} aria-hidden="true">{routine.art}</span>
          <span className="day-copy"><small>Routine</small><strong>{routine.name}</strong><span>Start <ArrowRight weight="bold" /></span></span>
        </motion.button>)}
      </div>
    </section>

    <section id="the-details" className="landing-details">
      <motion.div className="landing-details-intro" {...inView()}><span className="landing-kicker">LESS FRICTION. MORE PROGRESS.</span><h2>Everything you need.<br /><em>Nothing in your way.</em></h2><p>From your first warm-up to your next personal best. A training log that keeps up with you.</p></motion.div>
      <div className="landing-feature-list">
        {([['01', 'Your workouts. Your way.', 'Build your rotation. Write your sets naturally, or log each one as you go.', onStart], ['02', 'See the work add up.', 'Keep your history close. Compare your weights, reps, and volume over time.', onProgress], ['03', 'Pick up where you left off.', 'Sign in and your workouts follow you to every device.', onLogin]] as const).map(([num, title, body, action], i) =>
          <motion.button key={num} onClick={action} {...inView(i * .08)}><span>{num}</span><div><h3>{title}</h3><p>{body}</p></div><ArrowRight /></motion.button>)}
      </div>
    </section>
    <footer className="landing-footer"><Brand size={25} /><p>Track. Improve. Repeat.</p><button onClick={onStart}>Open your dashboard <ArrowRight /></button></footer>
  </div>
}
