import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { App } from './App.tsx'
import { ThemeProvider, applyTheme, getInitialTheme } from './components/ThemeProvider'
import './index.css'

// Apply the persisted theme before the first paint to avoid a flash.
applyTheme(getInitialTheme())

createRoot(document.getElementById('root')!).render(
  <ThemeProvider>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </ThemeProvider>,
)
