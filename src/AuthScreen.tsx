import { useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { ArrowLeft, ArrowRight, Info, Timer, TrendUp } from '@phosphor-icons/react'
import { BrandMark } from './BrandMark'
import type { CloudState } from './cloud'
import './auth.css'

type Mode = 'signin' | 'create' | 'reset'
const ease = [0.2, 0.8, 0.2, 1] as const

const COPY: Record<Mode | 'recover', { kicker: string; lead: string; accent: string; body: string }> = {
  signin: { kicker: 'WELCOME BACK', lead: 'Pick up where', accent: 'you left off.', body: 'Sign in to log workouts. Everything saves to your account automatically.' },
  create: { kicker: 'CREATE YOUR ACCOUNT', lead: 'Your next rep', accent: 'starts here.', body: 'Your workouts save to your account and follow you to every device.' },
  reset: { kicker: 'RESET YOUR PASSWORD', lead: 'Let’s get you', accent: 'back in.', body: 'Enter the email you signed up with and we’ll send you a link to choose a new password.' },
  recover: { kicker: 'NEW PASSWORD', lead: 'Choose a new', accent: 'password.', body: 'Pick something at least 6 characters long. You’ll stay signed in on this device.' },
}

function Showcase() {
  const reduce = useReducedMotion()
  const float = (drift: number, delay: number) => reduce ? {} : { animate: { y: [0, -drift, 0] }, transition: { duration: 5 + drift / 3, repeat: Infinity, ease: 'easeInOut' as const, delay } }
  return <aside className="auth-showcase" aria-hidden="true">
    <div className="auth-showcase-photo" />
    <svg className="auth-arch" viewBox="0 0 600 700" preserveAspectRatio="xMidYMax slice">
      <path id="auth-arc" d="M40 700 C 60 120, 540 120, 560 700" fill="none" />
      <text><textPath href="#auth-arc">{'track · improve · repeat · '.repeat(5)}{!reduce && <animate attributeName="startOffset" from="0%" to="-50%" dur="40s" repeatCount="indefinite" />}</textPath></text>
    </svg>
    <div className="auth-showcase-copy"><span>TRACK &nbsp; IMPROVE &nbsp; REPEAT</span><p>Built for<br />what drives <em>you.</em></p></div>
    <motion.div className="auth-float auth-float-note" initial={reduce ? false : { opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .9, delay: .3, ease }}>
      <motion.div {...float(8, 1.2)}><div className="auth-note-head"><em>Push day</em><span><Timer weight="bold" /> 1:30</span></div><pre>{'Incline DB Press\n70x7 70x7\nMachine Chest Press\n120x10 120x10'}</pre><div className="auth-chips"><span>70 × 7</span><span>120 × 10</span><span className="pr">120 × 10 · PR</span></div></motion.div>
    </motion.div>
    <motion.div className="auth-float auth-float-pr" initial={reduce ? false : { opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .9, delay: .5, ease }}>
      <motion.div {...float(10, 1.6)}><small>PERSONAL BEST</small><strong>225<span> lb</span></strong><p>Bench press · 5 reps</p><b><TrendUp weight="bold" /> +15 lb this block</b></motion.div>
    </motion.div>
  </aside>
}

function Field({ label, ...input }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return <label className="auth-field"><span>{label}</span><input {...input} /></label>
}

function AccountForm({ cloud }: { cloud: CloudState }) {
  const [mode, setMode] = useState<Mode>('signin')
  const [email, setEmail] = useState(''), [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false), [message, setMessage] = useState(''), [error, setError] = useState('')
  const switchTo = (next: Mode) => { setMode(next); setError(''); setMessage('') }
  const submit = async () => {
    setBusy(true); setError(''); setMessage('')
    try {
      if (mode === 'create') { const confirm = await cloud.signUpWithPassword(email.trim(), password); if (confirm) setMessage('Check your email to confirm your account, then sign in.') }
      else if (mode === 'reset') { await cloud.sendPasswordReset(email.trim()); setMessage('If there’s an account for that email, a reset link is on its way. Check your inbox and spam folder.') }
      else await cloud.signInWithPassword(email.trim(), password)
    } catch (caught) { setError(caught instanceof Error ? caught.message : 'Could not sign in. Try again.') }
    finally { setBusy(false) }
  }
  const label = mode === 'create' ? 'Create account' : mode === 'reset' ? 'Send reset link' : 'Sign in'
  return <>
    <Heading mode={mode} />
    <form className="auth-form" onSubmit={e => { e.preventDefault(); void submit() }}>
      <Field label="Email" type="email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" />
      {mode !== 'reset' && <Field label="Password" type="password" autoComplete={mode === 'create' ? 'new-password' : 'current-password'} minLength={6} required value={password} onChange={e => setPassword(e.target.value)} placeholder={mode === 'create' ? 'At least 6 characters' : ''} />}
      {mode === 'signin' && <button type="button" className="auth-inline-link" onClick={() => switchTo('reset')}>Forgot password?</button>}
      <button type="submit" className="auth-submit" disabled={busy || !cloud.authReady}>{busy ? 'Connecting…' : label}<ArrowRight weight="bold" /></button>
    </form>
    {error && <p role="alert" className="auth-message error">{error}</p>}
    {message && <p role="status" className="auth-message">{message}</p>}
    {!error && !message && cloud.message && <p role="status" className="auth-message">{cloud.message}</p>}
    {cloud.googleEnabled && mode !== 'reset' && <><div className="auth-divider"><span>or</span></div><button className="auth-secondary" disabled={busy} onClick={async () => { setBusy(true); try { await cloud.signInWithGoogle() } catch (caught) { setError(caught instanceof Error ? caught.message : 'Google sign-in failed.') } finally { setBusy(false) } }}>Continue with Google</button></>}
    <div className="auth-switch">
      {mode === 'signin' && <button disabled={busy} onClick={() => switchTo('create')}>New here? Create an account</button>}
      {mode === 'create' && <button disabled={busy} onClick={() => switchTo('signin')}>Already have an account? Sign in</button>}
      {mode === 'reset' && <button disabled={busy} onClick={() => switchTo('signin')}><ArrowLeft /> Back to sign in</button>}
    </div>
  </>
}

function SetPasswordForm({ cloud }: { cloud: CloudState }) {
  const [password, setPassword] = useState(''), [confirm, setConfirm] = useState('')
  const [busy, setBusy] = useState(false), [error, setError] = useState('')
  const submit = async () => {
    if (password !== confirm) { setError('Those passwords don’t match. Try again.'); return }
    setBusy(true); setError('')
    try { await cloud.updatePassword(password) } catch (caught) { setError(caught instanceof Error ? caught.message : 'Could not update your password.') } finally { setBusy(false) }
  }
  return <>
    <Heading mode="recover" />
    <form className="auth-form" onSubmit={e => { e.preventDefault(); void submit() }}>
      <Field label="New password" type="password" autoComplete="new-password" minLength={6} required value={password} onChange={e => { setPassword(e.target.value); setError('') }} placeholder="At least 6 characters" />
      <Field label="Confirm new password" type="password" autoComplete="new-password" minLength={6} required value={confirm} onChange={e => { setConfirm(e.target.value); setError('') }} />
      <button type="submit" className="auth-submit" disabled={busy}>{busy ? 'Saving…' : 'Save new password'}<ArrowRight weight="bold" /></button>
    </form>
    {error && <p role="alert" className="auth-message error">{error}</p>}
  </>
}

function Heading({ mode }: { mode: Mode | 'recover' }) {
  const copy = COPY[mode]
  return <div className="auth-heading" key={mode}><span className="auth-kicker"><i /> {copy.kicker}</span><h1>{copy.lead} <em>{copy.accent}</em></h1><p>{copy.body}</p></div>
}

export function AuthScreen({ cloud, onHome }: { cloud: CloudState; onHome: () => void }) {
  const reduce = useReducedMotion()
  const loading = cloud.configured && !cloud.recovering && (!cloud.authReady || (cloud.email && !cloud.hydrated && cloud.status !== 'error'))
  return <div className="auth-page">
    <Showcase />
    <main className="auth-main">
      <header className="auth-top"><button className="auth-brand" onClick={onHome} aria-label="Optimal Lifts home"><BrandMark size={30} /><span>Optimal Lifts</span></button><button className="auth-back" onClick={onHome}><ArrowLeft /> Home</button></header>
      <motion.div className="auth-box" initial={reduce ? false : { opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .7, ease }}>
        {!cloud.configured ? <div className="auth-notice"><Info weight="fill" /><div><strong>Sign-in isn’t configured</strong><p>Add VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY to the environment, then redeploy.</p></div></div>
          : cloud.recovering ? <SetPasswordForm cloud={cloud} />
          : loading ? <div className="auth-loading" role="status"><span className="auth-spinner" />{cloud.email ? 'Loading your workouts…' : 'Connecting…'}</div>
          : cloud.email ? <div><Heading mode="signin" /><p role="alert" className="auth-message error">{cloud.message ?? 'Could not load your workouts.'}</p><div className="auth-actions"><button className="auth-secondary" onClick={() => cloud.signOut()}>Sign out</button><button className="auth-submit" onClick={cloud.retry}>Try again <ArrowRight weight="bold" /></button></div></div>
          : <AccountForm cloud={cloud} />}
      </motion.div>
      <p className="auth-foot">Track. Improve. Repeat.</p>
    </main>
  </div>
}
