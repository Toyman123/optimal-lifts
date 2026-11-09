import React from 'react'
import ReactDOM from 'react-dom/client'
import '@fontsource/dm-sans/400.css'
import '@fontsource/dm-sans/500.css'
import '@fontsource/dm-sans/600.css'
import '@fontsource/dm-sans/700.css'
import '@fontsource/fraunces/500-italic.css'

import './styles.css'
import './theme.css'
import App from './App'
import { registerRestAlerts } from './rest-alerts'

void registerRestAlerts().catch(() => undefined)

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode><App /></React.StrictMode>,
)
