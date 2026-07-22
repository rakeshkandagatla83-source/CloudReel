import { createContext, use, useCallback, useEffect, useState, type ReactNode } from 'react'
import { getStorage, setStorage } from '../lib/storage'

export type Theme = 'light' | 'dark'

export const THEME_STORAGE_KEY = 'cr_theme'
export const DEFAULT_THEME: Theme = 'light'

interface ThemeContextValue {
  theme: Theme
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

/**
 * Reads the persisted theme, falling back to the app default. Used both by the
 * pre-render bootstrap (see main.tsx) and the provider's initial state so the
 * two never disagree and cause a flash.
 */
export function getInitialTheme(): Theme {
  const stored = getStorage<Theme>(THEME_STORAGE_KEY)
  return stored === 'light' || stored === 'dark' ? stored : DEFAULT_THEME
}

/** Applies the theme to <html> so token-based utilities re-theme instantly. */
export function applyTheme(theme: Theme): void {
  document.documentElement.setAttribute('data-theme', theme)
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(getInitialTheme)

  useEffect(() => {
    applyTheme(theme)
    setStorage(THEME_STORAGE_KEY, theme)
  }, [theme])

  const setTheme = useCallback((next: Theme) => setThemeState(next), [])
  const toggleTheme = useCallback(
    () => setThemeState(prev => (prev === 'dark' ? 'light' : 'dark')),
    [],
  )

  return (
    <ThemeContext value={{ theme, setTheme, toggleTheme }}>{children}</ThemeContext>
  )
}

export function useTheme(): ThemeContextValue {
  const context = use(ThemeContext)
  if (context === null) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}
