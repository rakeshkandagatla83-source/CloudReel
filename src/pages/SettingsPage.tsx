import { useEffect } from 'react'
import { Check, Moon, Sun } from 'lucide-react'
import { useTheme, type Theme } from '../components/ThemeProvider'
import { cn } from '../lib/utils'

interface ThemeOption {
  value: Theme
  label: string
  description: string
  icon: typeof Sun
}

const THEME_OPTIONS: ThemeOption[] = [
  { value: 'light', label: 'Light', description: 'Bright surfaces, dark text.', icon: Sun },
  { value: 'dark', label: 'Dark', description: 'Deep surfaces, light text.', icon: Moon },
]

export function SettingsPage() {
  const { theme, setTheme } = useTheme()

  useEffect(() => {
    document.title = 'CloudReel - Settings'
  }, [])

  return (
    <div id="settings-page" className="flex h-full flex-col bg-primary-bg">
      <div id="settings-scroll" className="flex-1 overflow-y-auto">
        <div id="settings-content" className="mx-auto w-full max-w-3xl px-6 py-10">
          <header id="settings-header" className="mb-8">
            <h1 className="text-2xl font-bold text-primary-text">Settings</h1>
            <p className="mt-1 text-base text-secondary-text">
              Manage your CloudReel preferences.
            </p>
          </header>

          {/* Appearance */}
          <section
            id="settings-section-appearance"
            className="rounded-2xl border border-primary-border bg-surface p-6"
          >
            <h2 className="text-lg font-semibold text-primary-text">Appearance</h2>
            <p className="mt-1 mb-5 text-sm text-secondary-text">
              Choose how CloudReel looks to you. Your choice is saved on this device.
            </p>

            <div id="settings-theme-options" className="grid gap-3 sm:grid-cols-2">
              {THEME_OPTIONS.map(({ value, label, description, icon: Icon }) => {
                const isActive = theme === value
                return (
                  <button
                    key={value}
                    id={`settings-btn-theme-${value}`}
                    type="button"
                    onClick={() => setTheme(value)}
                    aria-pressed={isActive}
                    className={cn(
                      'group relative flex items-start gap-3 rounded-xl border p-4 text-left transition-all cursor-pointer',
                      isActive
                        ? 'border-active-accent bg-active-accent/8'
                        : 'border-primary-border bg-component-bg hover:border-active-accent/40',
                    )}
                  >
                    <span
                      className={cn(
                        'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border',
                        isActive
                          ? 'border-active-accent/40 bg-active-accent/15 text-active-accent'
                          : 'border-primary-border text-secondary-text',
                      )}
                    >
                      <Icon size={18} />
                    </span>
                    <span className="flex-1">
                      <span className="flex items-center gap-2">
                        <span className="text-base font-semibold text-primary-text">{label}</span>
                        {isActive && (
                          <Check size={15} className="text-active-accent" aria-label="Selected" />
                        )}
                      </span>
                      <span className="mt-0.5 block text-sm text-secondary-text">{description}</span>
                    </span>
                  </button>
                )
              })}
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
