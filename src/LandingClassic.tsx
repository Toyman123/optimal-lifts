import { ArrowDown, ArrowRight, Barbell, Check, ClockCountdown, NotePencil, ChartLineUp } from '@phosphor-icons/react'

function Mark() {
  return <span className="site-mark"><Barbell size={24} weight="bold" /></span>
}

function WorkoutPreview() {
  return <div className="workout-preview" aria-label="Example workout notes">
    <div className="preview-top"><span>Optimal Lifts</span><span className="preview-dot" /></div>
    <div className="preview-heading"><span>EXAMPLE WORKOUT</span><h3>Push day</h3><small>Notes</small></div>
    <div className="preview-note"><strong>Incline DB press</strong><span>70x8 70x7</span><em>Felt good. Go up next time.</em><strong>Chest press</strong><span>120x10 120x9</span><strong>Lateral raise</strong><span>20x12 20x10</span><span className="preview-cursor" /></div>
    <div className="preview-saved"><Check size={12} /> Notes saved</div>
  </div>
}

export function LandingClassic() {
  return <div className="landing landing-classic">
    <a className="skip-link" href="#landing-main">Skip to content</a>
    <header className="site-header"><a className="site-brand" href="/" aria-label="Optimal Lifts home"><Mark /><span>Optimal<strong>Lifts</strong></span></a><nav aria-label="Site navigation"><a href="#how-it-works">How it works</a><a href="#your-training">Your training</a><a className="site-open" href="/app">Open app <ArrowRight size={16} /></a></nav></header>
    <main id="landing-main">
      <section className="site-hero">
        <div className="hero-shape hero-shape-one" /><div className="hero-shape hero-shape-two" />
        <div className="hero-inner"><div className="hero-copy"><h1>Your workout.<br />In your own words.</h1><p>A simple place for your exercises, sets, and between-set thoughts. Write your notes, time your rest, and get back to lifting.</p><a className="site-button" href="/app">Open your workout log <ArrowRight size={17} /></a><span className="hero-footnote">Your notes, saved to your account.</span></div>
          <div className="hero-art"><div className="art-blob art-blob-pink" /><div className="art-blob art-blob-red" /><WorkoutPreview /><div className="preview-rest" aria-label="Example rest timer"><span className="rest-illustration"><ClockCountdown size={22} /></span><div><small>REST BETWEEN SETS</small><strong>1:30</strong></div><span className="rest-preview-bars"><i /><i /></span></div><div className="art-sticker"><Barbell size={37} weight="bold" /></div></div>
        </div><a href="#how-it-works" className="hero-scroll" aria-label="See how Optimal Lifts works"><ArrowDown size={24} /></a>
      </section>
      <section className="site-section introduction" id="how-it-works"><div className="intro-copy"><p className="site-eyebrow">LESS TO FILL OUT. MORE ROOM TO TRAIN.</p><h2>Feels like a notebook.<br />Remembers like an app.</h2><p>Keep the way you already write your workouts. Optimal Lifts reads your sets, keeps your history, and gives you a rest timer right beside your notes.</p></div><div className="notes-demonstration"><div className="demo-label"><NotePencil size={19} /><span>WRITE IT YOUR WAY</span></div><div className="demo-line"><span>Bench press</span><strong>225x8 &nbsp; 225x6</strong></div><div className="demo-comment">Last rep was a grind. Same weight next week.</div><div className="demo-divider" /><div className="demo-result"><Check size={17} /><span>2 sets logged. Your words kept.</span></div></div></section>
      <section className="site-section training-features" id="your-training"><div className="features-heading"><p className="site-eyebrow">IN YOUR CORNER</p><h2>Just what you need<br />between sets.</h2></div><div className="feature-columns"><article><div className="feature-art feature-notes"><NotePencil size={45} weight="duotone" /><span>70x8 &nbsp; 70x7</span></div><h3>Room for your notes</h3><p>Log weight and reps, how a set felt, or what to try next time. Your draft saves as you type.</p></article><article><div className="feature-art feature-timer"><ClockCountdown size={45} weight="duotone" /><span>02:00</span></div><h3>Rest at your pace</h3><p>Choose your rest time. Start, pause, or adjust it without leaving your workout.</p></article><article><div className="feature-art feature-history"><ChartLineUp size={45} weight="duotone" /><span>Last time → this time</span></div><h3>Something to come back to</h3><p>Keep your routines and previous sessions together. Sign in to keep your workouts in sync across devices.</p></article></div></section>
      <section className="site-cta"><div><h2>Have a workout to write down?</h2><p>Your notes and your timer are ready.</p><a className="site-button" href="/app">Let’s get to it <ArrowRight size={17} /></a></div><Barbell className="cta-barbell" size={190} weight="duotone" /></section>
    </main>
    <footer className="site-footer"><a className="site-brand" href="/"><Mark /><span>Optimal<strong>Lifts</strong></span></a><span>A little space for your training.</span><a href="/app">Open app <ArrowRight size={15} /></a></footer>
  </div>
}
