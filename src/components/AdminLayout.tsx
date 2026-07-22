import { useCallback, useState } from 'react'
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { ArrowLeft, ChevronDown, CreditCard, LogOut, ShieldCheck, Users, Wallet } from 'lucide-react'
import { cn } from '../lib/utils'
import { getStorage } from '../lib/storage'
import { logout } from '../lib/authService'
import type { UserData } from '../types/user'

interface AdminNavItem {
  id: string
  to: string
  label: string
  Icon: typeof CreditCard
}

const ADMIN_NAV_ITEMS: AdminNavItem[] = [
  { id: 'admin-nav-plans', to: '/admin/plans', label: 'Plans', Icon: CreditCard },
  { id: 'admin-nav-gateways', to: '/admin/gateways', label: 'Gateways', Icon: Wallet },
  { id: 'admin-nav-users', to: '/admin/users', label: 'Users', Icon: Users },
]

export function AdminLayout() {
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [user] = useState(() => getStorage<UserData>('pcr_user'))

  const displayName = user
    ? [user.firstname, user.lastname].filter(Boolean).join(' ').trim() || user.emailAddress
    : 'Admin'

  const initials = user
    ? ((user.firstname[0] ?? '') + (user.lastname[0] ?? '')).toUpperCase()
    : ''

  const handleLogout = useCallback(() => {
    setOpen(false)
    logout()
    navigate('/login', { replace: true })
  }, [navigate])

  return (
    <div id="admin-shell" className="flex h-screen flex-col bg-primary-bg text-white">
      <header
        id="admin-header"
        className="sticky top-0 z-40 h-14 bg-primary-bg/95 backdrop-blur-sm border-b border-white/6 flex items-center px-4 sm:px-6 xl:px-8"
      >
        <Link id="admin-header-brand" to="/admin/plans" className="flex items-center gap-2">
          <ShieldCheck size={18} className="text-[#3031cb]" />
          <span className="text-sm font-semibold tracking-wide">Admin Console</span>
        </Link>

        <div id="admin-header-right" className="ml-auto flex items-center gap-2">
          <Link
            id="admin-header-back-to-app"
            to="/events"
            className="hidden sm:flex items-center gap-1.5 text-xs text-white/55 hover:text-white px-3 py-1.5 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
          >
            <ArrowLeft size={14} />
            <span>Back to App</span>
          </Link>

          <DropdownMenu.Root open={open} onOpenChange={setOpen}>
            <DropdownMenu.Trigger asChild>
              <button
                id="admin-header-user-trigger"
                type="button"
                className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-white/5 cursor-pointer transition-colors"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#3031cb] text-xs font-semibold">
                  {initials || 'A'}
                </span>
                <span className="hidden sm:inline text-sm text-white/80 max-w-40 truncate">{displayName}</span>
                <ChevronDown size={14} className="text-white/45" />
              </button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content
                id="admin-header-user-menu"
                align="end"
                sideOffset={6}
                className="z-50 min-w-44 rounded-lg border border-white/8 bg-secondary-bg p-1 shadow-xl"
              >
                <DropdownMenu.Item
                  id="admin-header-user-menu-logout"
                  onSelect={handleLogout}
                  className="flex items-center gap-2 rounded-md px-2.5 py-2 text-sm text-white/80 outline-hidden data-highlighted:bg-white/8 data-highlighted:text-white cursor-pointer"
                >
                  <LogOut size={14} />
                  <span>Sign out</span>
                </DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        </div>
      </header>

      <div id="admin-body" className="flex flex-1 overflow-hidden">
        <aside
          id="admin-sidebar"
          className="w-56 shrink-0 border-r border-white/6 bg-[#080e1a] py-4 px-2 overflow-y-auto"
        >
          <nav id="admin-sidebar-nav" className="flex flex-col gap-0.5">
            {ADMIN_NAV_ITEMS.map(({ id, to, label, Icon }) => (
              <NavLink
                key={id}
                id={id}
                to={to}
                end={false}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors cursor-pointer',
                    isActive
                      ? 'bg-white/8 text-white'
                      : 'text-white/55 hover:bg-white/5 hover:text-white/85',
                  )
                }
              >
                <Icon size={15} />
                <span>{label}</span>
              </NavLink>
            ))}
          </nav>
        </aside>

        <main id="admin-main" className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
