import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { ChevronDown, Building2, Tv, Check } from 'lucide-react'
import { cn } from '../lib/utils'
import { getStorage } from '../lib/storage'
import { setWorkspace, getChannelData } from '../lib/authService'
import type { Channel, Tenant } from '../types/user'

// ── Private helpers ────────────────────────────────────────────────────────

function TenantThumb({ tenant, size = 16 }: { tenant: Tenant; size?: number }) {
  return tenant.tLogoUrl
    ? <img src={tenant.tLogoUrl} alt="" style={{ width: size, height: size }} className="rounded-sm object-contain shrink-0" />
    : <Building2 size={size} className="shrink-0 text-current opacity-50" />
}

function ChannelThumb({ channel, size = 16 }: { channel: Channel; size?: number }) {
  const src = channel.icon || channel.logo
  return src
    ? <img src={src} alt="" style={{ width: size, height: size }} className="rounded-sm object-contain shrink-0" />
    : <Tv size={size} className="shrink-0 text-current opacity-50" />
}

const CONTENT_CN = cn(
  'min-w-52 bg-surface border border-primary-border rounded-xl shadow-xl py-1.5 overflow-hidden',
  'data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95',
  'data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95',
  'data-[side=bottom]:slide-in-from-top-2 duration-150 origin-top-left',
)

const ITEM_CN = cn(
  'flex items-center gap-3 px-3 py-2 mx-1.5 rounded-lg text-sm text-secondary-text outline-none cursor-pointer transition-colors',
  'hover:bg-surface-2 hover:text-primary-text',
  'data-highlighted:bg-surface-2 data-highlighted:text-primary-text',
)

// ── Component ──────────────────────────────────────────────────────────────

interface WorkspacePickerProps {
  tenants: Tenant[]
}

export function WorkspacePicker({ tenants }: WorkspacePickerProps) {
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [storedTenantId] = useState(() => getStorage<number>('pcr_tenant_id'))
  const [storedChannel] = useState(() => getChannelData())
  const [pendingTenantId, setPendingTenantId] = useState<number | null>(null)
  const [tenantOpen, setTenantOpen] = useState(false)
  const [channelOpen, setChannelOpen] = useState(false)

  const applyWorkspaceChange = useCallback(() => {
    if (pathname === '/studio') {
      navigate('/events', { replace: true })
    } else {
      window.location.reload()
    }
  }, [pathname, navigate])

  const activeTenantId = pendingTenantId ?? storedTenantId
  const activeTenant = tenants.find(t => t.tid === activeTenantId) ?? null
  const channels = activeTenant?.channels ?? []
  const activeChannel = pendingTenantId === null ? storedChannel : null

  // Reset workspace selection if no channel chosen within 30 seconds
  useEffect(() => {
    if (pendingTenantId === null) return
    const id = setTimeout(() => setPendingTenantId(null), 30_000)
    return () => clearTimeout(id)
  }, [pendingTenantId])

  const handleTenantSelect = useCallback((tid: number) => {
    if (tid === storedTenantId) {
      setPendingTenantId(null)
      return
    }
    const tenant = tenants.find(t => t.tid === tid)
    if (tenant?.channels.length === 1) {
      setWorkspace(tid, tenant.channels[0])
      applyWorkspaceChange()
      return
    }
    setPendingTenantId(tid)
    setChannelOpen(true)
  }, [storedTenantId, tenants, applyWorkspaceChange])

  const handleChannelSelect = useCallback((channel: Channel) => {
    const tid = pendingTenantId ?? storedTenantId
    if (tid === null) return
    setWorkspace(tid, channel)
    applyWorkspaceChange()
  }, [pendingTenantId, storedTenantId, applyWorkspaceChange])

  if (!activeTenant) return null

  return (
    <div className="flex items-center gap-1">

      {/* ── Tenant ── */}
      {tenants.length === 1 ? (
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-primary-border/50 bg-surface-2 text-[13px] text-secondary-text select-none">
          <TenantThumb tenant={activeTenant} />
          <span className="max-w-24 truncate font-medium">{activeTenant.tName}</span>
        </div>
      ) : (
        <DropdownMenu.Root open={tenantOpen} onOpenChange={setTenantOpen}>
          <DropdownMenu.Trigger asChild>
            <button
              type="button"
              className="flex items-center gap-2 rounded-lg px-3 py-1.5 bg-surface border border-primary-border text-[13px] text-primary-text hover:bg-surface-2 hover:border-secondary-text/30 transition-colors cursor-pointer outline-none shadow-sm"
            >
              <TenantThumb tenant={activeTenant} />
              <span className="max-w-24 truncate font-medium">{activeTenant.tName}</span>
              <ChevronDown size={14} className={cn('shrink-0 text-muted-text transition-transform duration-150 ml-1', tenantOpen && 'rotate-180')} />
            </button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content align="start" sideOffset={8} className={CONTENT_CN}>
              <p className="px-4 pt-1.5 pb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-text">Tenant</p>
              {tenants.map(t => (
                <DropdownMenu.Item
                  key={t.tid}
                  onSelect={() => handleTenantSelect(t.tid)}
                  className={cn(ITEM_CN, t.tid === activeTenantId && 'text-active-accent bg-active-accent/10 font-medium')}
                >
                  <TenantThumb tenant={t} size={20} />
                  <span className="flex-1 truncate min-w-0">{t.tName}</span>
                  {t.tid === activeTenantId && <Check size={16} className="shrink-0 text-active-accent" />}
                </DropdownMenu.Item>
              ))}
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      )}

      {/* ── Channel ── */}
      {channels.length === 1 ? (
        <div className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 bg-surface-2 border border-primary-border/50 text-[13px] font-medium text-secondary-text select-none max-w-44 overflow-hidden">
          <ChannelThumb channel={channels[0]} />
          <span className="truncate min-w-0">{channels[0].channelName}</span>
        </div>
      ) : (
        <DropdownMenu.Root open={channelOpen} onOpenChange={setChannelOpen}>
          <DropdownMenu.Trigger asChild>
            <button
              type="button"
              className={cn(
                'flex items-center gap-2 rounded-lg px-3 py-1.5 border text-[13px] font-medium transition-colors cursor-pointer outline-none shadow-sm',
                activeChannel
                  ? 'bg-surface border-primary-border text-primary-text hover:bg-surface-2 hover:border-secondary-text/30'
                  : 'bg-surface border-dashed border-primary-border text-muted-text hover:border-secondary-text hover:text-secondary-text',
              )}
            >
              {activeChannel ? (
                <>
                  <ChannelThumb channel={activeChannel} />
                  <span className="max-w-28 truncate">{activeChannel.channelName}</span>
                </>
              ) : (
                <span>Select channel…</span>
              )}
              <ChevronDown size={14} className={cn('shrink-0 text-muted-text transition-transform duration-150 ml-1', channelOpen && 'rotate-180')} />
            </button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content align="start" sideOffset={8} className={CONTENT_CN}>
              <p className="px-4 pt-1.5 pb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-text">Channel</p>
              {channels.map(c => (
                <DropdownMenu.Item
                  key={c.id}
                  onSelect={() => handleChannelSelect(c)}
                  className={cn(ITEM_CN, c.id === activeChannel?.id && 'text-active-accent bg-active-accent/10 font-medium')}
                >
                  <ChannelThumb channel={c} size={20} />
                  <span className="flex-1 truncate min-w-0">{c.channelName}</span>
                  {c.id === activeChannel?.id && <Check size={16} className="shrink-0 text-active-accent" />}
                </DropdownMenu.Item>
              ))}
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
      )}

    </div>
  )
}
