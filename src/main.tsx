import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './styles/globals.css'

// Deter casual console snooping
console.log(
  '%c⚠ Stop!',
  'color: #ef4444; font-size: 48px; font-weight: 900;'
);
console.log(
  '%cThis browser feature is intended for developers. If someone told you to paste something here to get data or unlock features — that\'s a scam. Nothing here is accessible to you that isn\'t already on the page.',
  'color: #fff; font-size: 14px; font-family: sans-serif; background: #13131a; padding: 8px 12px; border-radius: 6px; border-left: 4px solid #ef4444;'
);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
