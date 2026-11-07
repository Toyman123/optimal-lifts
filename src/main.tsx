import React from 'react'
import ReactDOM from 'react-dom/client'
import './styles.css'
import './reference.css'
import './cornell.css'
import './landing.css'
import './landingPremium.css'
import './appPremium.css'
import { MotionConfig } from 'framer-motion'
import App from './App'
import { installPressFeedback } from './pressFeedback'

const removePressFeedback = installPressFeedback()
import.meta.hot?.dispose(removePressFeedback)

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode><MotionConfig reducedMotion="user"><App /></MotionConfig></React.StrictMode>,
)
