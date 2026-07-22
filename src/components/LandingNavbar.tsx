import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Radio, Menu, X } from 'lucide-react'
import { cn } from '../lib/utils'
import { useTheme } from './ThemeProvider'
import { ThemeToggle } from './ThemeToggle'

const NAV_LINKS = [
  { label: 'Features', href: '#features' },
  { label: 'Protocols', href: '#protocols' },
  { label: 'Demo', href: '#demo' },
]

export function LandingNavbar() {
  const { theme } = useTheme()
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 30)
    window.addEventListener('scroll', handler, { passive: true })
    return () => window.removeEventListener('scroll', handler)
  }, [])

  const logoSrc = theme === 'dark' ? '/CloudReel-white.png' : '/CloudReel.png'

  return (
    <header
      id="landing-navbar"
      className={cn(
        'fixed inset-x-0 top-0 z-50 transition-all duration-500',
        scrolled
          ? 'bg-primary-bg/94 backdrop-blur-xl border-b border-primary-border shadow-[0_4px_60px_rgba(0,0,0,0.15)]'
          : 'bg-transparent',
      )}
    >
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-8">
          {/* Brand */}
          <div id="landing-navbar-brand" className="flex items-center gap-3 shrink-0">
            <img src={logoSrc} alt="CloudReel" className="h-7 w-auto" />
            <div className="hidden sm:flex items-center gap-2 pl-3 border-l border-primary-border">
              <span className="text-[10px] tracking-[0.22em] text-muted-text uppercase font-mono">
                Cloud Producer
              </span>
              <span className="h-1.5 w-1.5 rounded-full bg-active-accent animate-pulse" />
            </div>
          </div>

          {/* Desktop Nav */}
          <nav id="landing-navbar-links" className="hidden md:flex items-center gap-0.5 flex-1 justify-center">
            {NAV_LINKS.map(({ label, href }) => (
              <a
                key={label}
                href={href}
                className="px-4 py-2 text-sm text-secondary-text hover:text-primary-text hover:bg-component-bg rounded-lg transition-all duration-200 cursor-pointer"
              >
                {label}
              </a>
            ))}
          </nav>

          {/* CTAs */}
          <div id="landing-navbar-actions" className="flex items-center gap-2 shrink-0">
            <ThemeToggle id="landing-btn-theme-toggle" />
            <Link
              to="/login"
              className="hidden sm:block px-4 py-2 text-sm text-secondary-text hover:text-primary-text transition-colors cursor-pointer rounded-lg hover:bg-component-bg"
            >
              Sign In
            </Link>
            <a
              href="#demo"
              className="flex items-center gap-1.5 px-4 py-2 bg-active-accent hover:opacity-90 text-white text-sm font-semibold rounded-lg transition-all cursor-pointer shadow-[0_0_20px_rgba(48,49,203,0.3)] hover:shadow-[0_0_32px_rgba(48,49,203,0.5)]"
            >
              <Radio size={13} />
              Get Started
            </a>
            <button
              id="landing-btn-mobile-menu"
              type="button"
              className="md:hidden p-2 text-secondary-text hover:text-primary-text cursor-pointer rounded-lg hover:bg-component-bg"
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              {mobileOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div id="landing-navbar-mobile-menu" className="md:hidden border-t border-primary-border py-3 flex flex-col gap-0.5">
            {NAV_LINKS.map(({ label, href }) => (
              <a
                key={label}
                href={href}
                onClick={() => setMobileOpen(false)}
                className="px-4 py-3 text-sm text-secondary-text hover:text-primary-text hover:bg-component-bg rounded-lg transition-colors cursor-pointer"
              >
                {label}
              </a>
            ))}
            <Link
              to="/login"
              className="px-4 py-3 text-sm text-secondary-text hover:text-primary-text hover:bg-component-bg rounded-lg transition-colors cursor-pointer"
              onClick={() => setMobileOpen(false)}
            >
              Sign In
            </Link>
          </div>
        )}
      </div>
    </header>
  )
}
