import React from 'react'
import ReactDOM from 'react-dom/client'
import './styles.css'
import './reference.css'
import './cornell.css'
import './landing.css'
import App from './App'
import { installPressFeedback } from './pressFeedback'

const removePressFeedback = installPressFeedback()
import.meta.hot?.dispose(removePressFeedback)

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode><App /></React.StrictMode>,
)
