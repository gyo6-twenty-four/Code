import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { installPasswordResetLink } from './lib/auth-link'
import './index.css'
import App from './App.jsx'

installPasswordResetLink()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
