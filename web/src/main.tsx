import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import PortalShell from './portal/PortalShell.tsx'

/* /superadmin-control = the founder's portal; everything else = the app.
   The path is routing convenience only — authorization is server-side. */
const isPortal = location.pathname.startsWith('/superadmin-control')

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {isPortal ? <PortalShell /> : <App />}
  </StrictMode>,
)
