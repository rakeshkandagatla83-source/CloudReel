import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { useCallback, useState } from 'react'
import { useNavigate, useLocation, Link } from 'react-router-dom'
import { ChevronDown, LogOut, User, LibraryBig, CreditCard, CalendarDays, BarChart3, Layers, LayoutTemplate, Tv2, Users, Settings } from 'lucide-react'
import { cn } from '../lib/utils'
import { getStorage } from '../lib/storage'
import { logout } from '../lib/authService'
import type { UserData } from '../types/user'
import { WorkspacePicker } from './WorkspacePicker'
import { useTheme } from './ThemeProvider'

export function Navbar() {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const { theme } = useTheme()
  const [open, setOpen] = useState(false)
  const [user] = useState(() => getStorage<UserData>('pcr_user'))

  const logoSrc = theme === 'dark' ? '/CloudReel-white.png' : '/CloudReel.png'

  const displayName = user
    ? [user.firstname, user.lastname].filter(Boolean).join(' ').trim() || user.emailAddress
    : 'Account'

  const initials = user
    ? ((user.firstname[0] ?? '') + (user.lastname[0] ?? '')).toUpperCase()
    : ''

  const handleLogout = useCallback(() => {
    setOpen(false)
    logout()
    navigate('/login', { replace: true })
  }, [navigate])

  return (
    <header id="navbar-header" className="sticky top-0 z-40 h-14 bg-primary-bg/95 backdrop-blur-sm border-b border-primary-border flex items-center overflow-hidden px-4 sm:px-6 xl:px-8 shadow-xs">

      {/* Brand */}
      <img id="navbar-brand-logo" src={logoSrc} alt="CloudReel" className="h-7 w-auto shrink-0" />

      {/* Nav links */}
      <nav id="navbar-nav" className="ml-6 flex h-full items-stretch shrink-0">
        <Link
          id="navbar-link-mam"
          to="/mam"
          title="MAM"
          className={cn(
            'flex items-center gap-2 px-4 text-base font-medium transition-colors border-b-2',
            pathname === '/mam'
              ? 'bg-active-accent/8 text-active-accent border-active-accent'
              : 'text-secondary-text border-transparent hover:bg-component-bg hover:text-primary-text',
          )}
        >
          <LibraryBig size={16} />
          <span className="hidden xl:inline">MAM</span>
        </Link>
        <Link
          id="navbar-link-events"
          to="/events"
          title="Events"
          className={cn(
            'flex items-center gap-2 px-4 text-base font-medium transition-colors border-b-2',
            pathname === '/events'
              ? 'bg-active-accent/8 text-active-accent border-active-accent'
              : 'text-secondary-text border-transparent hover:bg-component-bg hover:text-primary-text',
          )}
        >
          <CalendarDays size={16} />
          <span className="hidden xl:inline">Events</span>
        </Link>
        <Link
          id="navbar-link-publish"
          to="/publish"
          title="Publish"
          className={cn(
            'flex items-center gap-2 px-4 text-base font-medium transition-colors border-b-2',
            pathname.startsWith('/publish')
              ? 'bg-active-accent/8 text-active-accent border-active-accent'
              : 'text-secondary-text border-transparent hover:bg-component-bg hover:text-primary-text',
          )}
        >
          <BarChart3 size={16} />
          <span className="hidden xl:inline">Publish</span>
        </Link>
        <Link
          id="navbar-link-graphics"
          to="/gfx"
          title="Graphics"
          className={cn(
            'flex items-center gap-2 px-4 text-base font-medium transition-colors border-b-2',
            pathname === '/gfx'
              ? 'bg-active-accent/8 text-active-accent border-active-accent'
              : 'text-secondary-text border-transparent hover:bg-component-bg hover:text-primary-text',
          )}
        >
          <Layers size={16} />
          <span className="hidden xl:inline">Graphics</span>
        </Link>
        <Link
          id="navbar-link-multiviewer"
          to="/multiviewer"
          title="Multiviewer"
          className={cn(
            'flex items-center gap-2 px-4 text-base font-medium transition-colors border-b-2',
            pathname.startsWith('/multiviewer')
              ? 'bg-active-accent/8 text-active-accent border-active-accent'
              : 'text-secondary-text border-transparent hover:bg-component-bg hover:text-primary-text',
          )}
        >
          <Tv2 size={16} />
          <span className="hidden xl:inline">Multiviewer</span>
        </Link>
        <Link
          id="navbar-link-layouts"
          to="/layout-builder"
          title="Layouts"
          className={cn(
            'flex items-center gap-2 px-4 text-base font-medium transition-colors border-b-2',
            pathname.startsWith('/layout-builder')
              ? 'bg-active-accent/8 text-active-accent border-active-accent'
              : 'text-secondary-text border-transparent hover:bg-component-bg hover:text-primary-text',
          )}
        >
          <LayoutTemplate size={16} />
          <span className="hidden xl:inline">Layouts</span>
        </Link>
      </nav>

      <div id="navbar-spacer" className="flex-1" />

      {/* Workspace picker — tenant & channel */}
      <WorkspacePicker tenants={user?.tenants ?? []} />

      <div id="navbar-divider" className="w-px h-4 bg-primary-border mx-2 shrink-0" />

      {/* Profile dropdown */}
      <DropdownMenu.Root open={open} onOpenChange={setOpen}>
        <DropdownMenu.Trigger asChild>
          <button
            id="navbar-btn-profile"
            type="button"
            className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-component-bg transition-colors cursor-pointer group outline-none"
          >
            {/* Avatar */}
            {user?.image ? (
              <img
                src={user.image}
                alt={displayName}
                className="h-7 w-7 rounded-full object-cover shrink-0 border border-active-accent/30"
              />
            ) : (
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-active-accent/10 border border-active-accent/25 text-sm font-semibold text-active-accent shrink-0">
                {initials || <User size={13} />}
              </span>
            )}
            <span className="hidden sm:block text-base text-secondary-text group-hover:text-primary-text transition-colors max-w-36 truncate">
              {displayName}
            </span>
            <ChevronDown
              size={13}
              className={cn(
                'text-muted-text transition-transform duration-200',
                open && 'rotate-180',
              )}
            />
          </button>
        </DropdownMenu.Trigger>

        <DropdownMenu.Portal>
          <DropdownMenu.Content
            align="end"
            sideOffset={8}
            className={cn(
              'w-56 bg-surface border border-primary-border rounded-xl shadow-xl overflow-hidden',
              'data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95',
              'data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95',
              'data-[side=bottom]:slide-in-from-top-2',
              'duration-150 origin-top-right',
            )}
          >
            {/* User info header */}
            <div id="navbar-dropdown-user-info" className="px-4 py-3 border-b border-primary-border">
              <p className="text-base font-semibold text-primary-text truncate">{displayName}</p>
              {user?.emailAddress && (
                <p className="text-sm text-muted-text truncate mt-0.5">{user.emailAddress}</p>
              )}
            </div>

            {/* My Subscription */}
            <DropdownMenu.Item
              id="navbar-dropdown-item-subscription"
              onSelect={() => { setOpen(false); navigate('/subscription') }}
              className={cn(
                'flex items-center gap-2.5 px-4 py-3 text-base text-secondary-text outline-none',
                'hover:text-primary-text hover:bg-component-bg transition-colors cursor-pointer',
                'data-highlighted:text-primary-text data-highlighted:bg-component-bg',
              )}
            >
              <CreditCard size={16} />
              My Subscription
            </DropdownMenu.Item>

            {/* Settings */}
            <DropdownMenu.Item
              id="navbar-dropdown-item-settings"
              onSelect={() => { setOpen(false); navigate('/settings') }}
              className={cn(
                'flex items-center gap-2.5 px-4 py-3 text-base text-secondary-text outline-none',
                'hover:text-primary-text hover:bg-component-bg transition-colors cursor-pointer',
                'data-highlighted:text-primary-text data-highlighted:bg-component-bg',
              )}
            >
              <Settings size={16} />
              Settings
            </DropdownMenu.Item>

            {/* Admin: User Signups (only for admins) */}
            {user?.isAdmin && (
              <DropdownMenu.Item
                id="navbar-dropdown-item-admin"
                onSelect={() => { setOpen(false); navigate('/admin/users') }}
                className={cn(
                  'flex items-center gap-2.5 px-4 py-3 text-base text-secondary-text outline-none',
                  'hover:text-primary-text hover:bg-component-bg transition-colors cursor-pointer',
                  'data-highlighted:text-primary-text data-highlighted:bg-component-bg',
                )}
              >
                <Users size={16} />
                User Signups
              </DropdownMenu.Item>
            )}

            {/* Sign out */}
            <DropdownMenu.Item
              id="navbar-dropdown-item-signout"
              onSelect={handleLogout}
              className={cn(
                'flex items-center gap-2.5 px-4 py-3 text-base text-secondary-text outline-none',
                'hover:text-primary-text hover:bg-component-bg transition-colors cursor-pointer',
                'data-highlighted:text-primary-text data-highlighted:bg-component-bg',
              )}
            >
              <LogOut size={16} />
              Sign out
            </DropdownMenu.Item>
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>
    </header>
  )
}
