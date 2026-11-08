import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { installPasswordResetLink } from './lib/auth-link'
import { adoptLegacyHash, installAppLinks } from './lib/state'
import './index.css'
import App from './App.jsx'

installPasswordResetLink()
adoptLegacyHash()
installAppLinks()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
