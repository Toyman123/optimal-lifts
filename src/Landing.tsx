import { motion, useReducedMotion } from 'framer-motion'
import { ArrowDown, ArrowRight, Barbell, Check, ClockCountdown, NotePencil } from '@phosphor-icons/react'
import { LandingClassic } from './LandingClassic'
import { DEFAULT_HOMEPAGE } from './homepageTheme'
import { ContinuityDemo, LoggingDemo, TimerDemo, useDemoActivity } from './HomepageDemos'

function Mark() {
  return <span className="site-mark"><Barbell size={24} weight="bold" /></span>
}

function WorkoutPreview() {
  return <div className="workout-preview" aria-label="Example workout notes">
    <div className="preview-top"><span><Barbell size={13} /> Optimal Lifts</span><span className="demo-example">EXAMPLE</span></div>
    <div className="preview-heading"><span>YOUR WORKOUT</span><h3>Push day</h3><small>Notes</small></div>
    <div className="preview-note"><strong>Incline DB press</strong><span>70x8 70x7 <Check size={11} /></span><em>Felt good. Go up next time.</em><strong>Chest press</strong><span>120x10 120x9 <Check size={11} /></span><strong>Lateral raise</strong><span>20x12 20x10</span><span className="preview-cursor" /></div>
    <div className="preview-saved"><Check size={12} /> Notes saved</div>
  </div>
}

function PremiumLanding() {
  const reduced = Boolean(useReducedMotion())
  const heroActivity = useDemoActivity()
  const fade = { hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0, transition: { duration: .65 } } }
  const sectionMotion = { initial: reduced ? false as const : { opacity: 0, y: 22 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true, amount: .18 }, transition: { duration: .6 } }
  return <div className="landing landing-premium">
    <a className="skip-link" href="#landing-main">Skip to content</a>
    <header className="site-header"><a className="site-brand" href="/" aria-label="Optimal Lifts home"><Mark /><span>Optimal<strong>Lifts</strong></span></a><nav aria-label="Site navigation"><a href="#how-it-works">How it works</a><a href="#your-training">Your training</a><a className="site-open" href="/app">Open app <ArrowRight size={16} /></a></nav></header>
    <main id="landing-main">
      <section className="site-hero" data-running={heroActivity.running}>
        <div className="hero-shape hero-shape-one" /><div className="hero-shape hero-shape-two" />
        <div className="hero-inner">
          <motion.div className="hero-copy" initial={reduced ? false : 'hidden'} animate="visible" variants={{ visible: { transition: { staggerChildren: .13, delayChildren: .07 } } }}>
            <motion.p className="hero-eyebrow" variants={fade}><span /> YOUR TRAINING. YOUR PACE.</motion.p>
            <motion.h1 variants={{ visible: { transition: { staggerChildren: .13 } } }}><motion.span variants={{ hidden: { opacity: 0, y: 18, filter: 'blur(5px)' }, visible: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: .75 } } }}>Your workout.</motion.span><motion.span variants={{ hidden: { opacity: 0, y: 18, filter: 'blur(5px)' }, visible: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: .75 } } }}>In your own words.</motion.span></motion.h1>
            <motion.p className="hero-description" variants={fade}>A simple place for your exercises, sets, and between-set thoughts. Write your notes, time your rest, and get back to lifting.</motion.p>
            <motion.div className="hero-actions" variants={fade}><a className="site-button" href="/app">Open your workout log <ArrowRight size={17} /></a><a className="hero-secondary" href="#your-training">See it in action <ArrowDown size={14} /></a></motion.div>
            <motion.span className="hero-footnote" variants={fade}>Start logging. No account needed.</motion.span>
          </motion.div>
          <motion.div ref={heroActivity.ref} className="hero-art" data-running={heroActivity.running} initial={reduced ? false : { opacity: 0, y: 20, scale: .97 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ delay: reduced ? 0 : .45, duration: .9 }}>
            <div className="hero-product-stage"><div className="stage-grid" /><div className="hero-product-label"><span className="product-dot" /> A LITTLE SPACE FOR YOUR TRAINING</div><div className="hero-preview-float"><WorkoutPreview /></div><div className="preview-rest" aria-label="Example rest timer"><span className="hero-mini-ring"><ClockCountdown size={20} /></span><div><small>REST BETWEEN SETS</small><strong>1:30</strong></div><span className="rest-preview-bars"><i /><i /></span></div><div className="hero-save-chip"><Check size={12} /> Right where you left off</div></div>
          </motion.div>
        </div><a href="#how-it-works" className="hero-scroll" aria-label="See how Optimal Lifts works"><ArrowDown size={21} /></a>
      </section>
      <motion.section {...sectionMotion} className="site-section introduction" id="how-it-works"><div className="intro-copy"><p className="site-eyebrow">LESS TO FILL OUT. MORE ROOM TO TRAIN.</p><h2>Feels like a notebook.<br />Remembers like an app.</h2><p>Keep the way you already write your workouts. Optimal Lifts reads your sets, keeps your history, and gives you a rest timer right beside your notes.</p></div><div className="notes-demonstration"><div className="demo-label"><NotePencil size={19} /><span>WRITE IT YOUR WAY</span></div><div className="demo-line"><span>Bench press</span><strong>225x8 &nbsp; 225x6</strong></div><div className="demo-comment">Last rep was a grind. Same weight next week.</div><div className="demo-divider" /><div className="demo-result"><Check size={17} /><span>2 sets logged. Your words kept.</span></div></div></motion.section>
      <section className="site-section training-features" id="your-training"><motion.div {...sectionMotion} className="features-heading"><p className="site-eyebrow">IN YOUR CORNER</p><h2>Just what you need<br />between sets.</h2></motion.div><div className="feature-columns">
        <motion.article {...sectionMotion} transition={{ duration: .55 }} whileHover={reduced ? undefined : { y: -5 }}><LoggingDemo /><div className="feature-copy"><h3>Room for your notes</h3><p>Log weight and reps, how a set felt, or what to try next time. Your draft saves as you type.</p></div></motion.article>
        <motion.article {...sectionMotion} transition={{ duration: .55, delay: .1 }} whileHover={reduced ? undefined : { y: -5 }} className="timer-feature-card"><TimerDemo /><div className="feature-copy"><h3>Rest at your pace</h3><p>Choose your rest time. Start, pause, or adjust it without leaving your workout.</p></div></motion.article>
        <motion.article {...sectionMotion} transition={{ duration: .55, delay: .2 }} whileHover={reduced ? undefined : { y: -5 }}><ContinuityDemo /><div className="feature-copy"><h3>Something to come back to</h3><p>Keep your routines and previous sessions together. Sign in when you want to sync across devices.</p></div></motion.article>
      </div></section>
      <motion.section {...sectionMotion} className="site-cta"><div><h2>Have a workout to write down?</h2><p>Your notes and your timer are ready.</p><a className="site-button" href="/app">Let’s get to it <ArrowRight size={17} /></a></div><Barbell className="cta-barbell" size={155} weight="duotone" /></motion.section>
    </main>
    <footer className="site-footer"><a className="site-brand" href="/"><Mark /><span>Optimal<strong>Lifts</strong></span></a><span>A little space for your training.</span><a href="/app">Open app <ArrowRight size={15} /></a></footer>
  </div>
}

export function Landing() {
  const requested = new URLSearchParams(window.location.search).get('homepage')
  const theme = requested === 'classic' || requested === 'premium' ? requested : DEFAULT_HOMEPAGE
  return theme === 'classic' ? <LandingClassic /> : <PremiumLanding />
}
