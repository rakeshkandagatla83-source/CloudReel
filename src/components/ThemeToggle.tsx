import { Moon, Sun } from 'lucide-react'
import { useTheme } from './ThemeProvider'
import { cn } from '../lib/utils'

interface ThemeToggleProps {
  id?: string
  className?: string
}

/** Icon button that flips between light and dark themes. */
export function ThemeToggle({ id = 'theme-toggle-btn', className }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme()
  const isDark = theme === 'dark'

  return (
    <button
      id={id}
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
      title={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
      className={cn(
        'flex h-9 w-9 items-center justify-center rounded-lg border border-primary-border',
        'bg-component-bg text-secondary-text transition-colors cursor-pointer',
        'hover:text-primary-text hover:border-active-accent/40',
        className,
      )}
    >
      {isDark ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  )
}
