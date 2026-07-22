import { useState } from 'react'
import { Plus, RefreshCw, Database, Bookmark, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'
import { Select, SelectItem } from '../../components/ui/Select'
import { DbLayoutCard } from './DbLayoutCard'
import { LocalTemplateCard } from './LocalTemplateCard'
import { JsonViewerModal } from './JsonViewerModal'
import { cn } from '../../lib/utils'
import type { DbLayout, LocalTemplate, DbFetchStatus } from '../../types/layoutBuilder'

interface LayoutDashboardProps {
  dbLayouts: {
    filtered: DbLayout[]
    status: DbFetchStatus
    statusMessage: string
    groups: string[]
    groupFilter: string
    setGroupFilter: (v: string) => void
    fetch: () => Promise<void>
    deleteLayout: (id: number) => Promise<void>
  }
  localTemplates: LocalTemplate[]
  onNewTemplate: () => void
  onImport: (layout: DbLayout) => void
  onEditLocal: (tpl: LocalTemplate) => void
  onDeleteLocal: (id: string) => void
  onToast: (msg: string, variant?: 'success' | 'error') => void
}

function DbLayoutCardSkeleton() {
  return (
    <div className="bg-secondary-bg border border-white/8 rounded-xl overflow-hidden">
      <div className="w-full aspect-video bg-primary-bg animate-pulse" />
      <div className="px-3 py-2.5 space-y-2">
        <div className="h-3 w-3/4 rounded bg-white/8 animate-pulse" />
        <div className="h-2.5 w-1/2 rounded bg-white/5 animate-pulse" />
        <div className="flex gap-1.5 pt-0.5">
          <div className="flex-1 h-7 rounded-lg bg-white/5 animate-pulse" />
          <div className="w-8 h-7 rounded-lg bg-white/5 animate-pulse" />
          <div className="w-8 h-7 rounded-lg bg-white/5 animate-pulse" />
        </div>
      </div>
    </div>
  )
}

function StatusBadge({ status, message }: { status: DbFetchStatus; message: string }) {
  if (status === 'idle') return null
  return (
    <span
      className={cn(
        'flex items-center gap-1.5 text-sm px-2.5 py-1 rounded border',
        status === 'ok' && 'bg-[#24dd6e]/10 text-[#24dd6e] border-[#24dd6e]/25',
        status === 'error' && 'bg-[#e00000]/10 text-[#e00000] border-[#e00000]/25',
        status === 'loading' && 'bg-surface-2 text-secondary-text border-primary-border',
      )}
    >
      {status === 'loading' && <Loader2 size={14} className="animate-spin" />}
      {status === 'ok' && <CheckCircle2 size={14} />}
      {status === 'error' && <AlertCircle size={14} />}
      {message}
    </span>
  )
}

export function LayoutDashboard({
  dbLayouts,
  localTemplates,
  onNewTemplate,
  onImport,
  onEditLocal,
  onDeleteLocal,
  onToast,
}: LayoutDashboardProps) {
  const [jsonLayout, setJsonLayout] = useState<DbLayout | null>(null)
  const { filtered, status, statusMessage, groups, groupFilter, setGroupFilter, fetch, deleteLayout } = dbLayouts

  return (
    <div className="flex h-full flex-col">
      {/* Single Header Toolbar */}
      <div className="shrink-0 bg-primary-bg border-b border-white/8 px-6 py-3 flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2 mr-2">
          <Database size={18} className="text-white/40" />
          <h1 className="text-base font-semibold text-white">Layout Builder</h1>
          <span className="text-sm px-2 py-0.5 rounded bg-white/5 text-white/40 border border-white/8">
            {filtered.length}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-sm text-white/55">Group</label>
          <Select
            value={groupFilter}
            onValueChange={setGroupFilter}
            placeholder="All Groups"
            className="min-w-36"
          >
            <SelectItem value="">All Groups</SelectItem>
            {groups.map((g) => (
              <SelectItem key={g} value={g}>
                {g}
              </SelectItem>
            ))}
          </Select>
        </div>

        <button
          type="button"
          onClick={fetch}
          disabled={status === 'loading'}
          className={cn(
            'flex items-center gap-1.5 h-10 px-4 rounded-lg text-base font-semibold cursor-pointer transition-colors',
            'bg-white/5 border border-white/10 text-white/60 hover:bg-white/10 hover:text-white/85',
            'disabled:opacity-50 disabled:cursor-not-allowed',
          )}
        >
          <RefreshCw size={15} className={cn(status === 'loading' && 'animate-spin')} />
          Refresh
        </button>

        <StatusBadge status={status} message={statusMessage} />

        <div className="flex-1" />

        <button
          type="button"
          onClick={onNewTemplate}
          className="flex items-center gap-1.5 h-10 px-4 rounded-lg bg-[#3031cb] hover:bg-[#2626a8] text-white text-base font-semibold cursor-pointer transition-colors"
        >
          <Plus size={16} />
          New Template
        </button>
      </div>

      {/* Body - scrollable */}
      <div className="flex-1 overflow-y-auto p-6 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:bg-white/10 [&::-webkit-scrollbar-thumb]:rounded">

        {/* DB Layouts Section */}
        <div className="mb-8">
          {(status === 'idle' || status === 'loading') && filtered.length === 0 && (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <DbLayoutCardSkeleton key={i} />
              ))}
            </div>
          )}

          {status === 'ok' && filtered.length === 0 && (
            <div className="text-center py-10 text-secondary-text/50 text-sm">No layouts found</div>
          )}

          {status === 'error' && filtered.length === 0 && (
            <div className="text-center py-10 text-secondary-text/50 text-sm">{statusMessage}</div>
          )}

          {filtered.length > 0 && (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-4">
              {filtered.map((layout) => (
                <DbLayoutCard
                  key={layout.id}
                  layout={layout}
                  onImport={onImport}
                  onViewJson={(l) => setJsonLayout(l)}
                  onDelete={deleteLayout}
                  onToast={onToast}
                />
              ))}
            </div>
          )}
        </div>

        {/* Divider */}
        <div className="border-t border-white/8 mb-8" />

        {/* Local Templates Section */}
        <div>
          <div className="flex items-center gap-2.5 mb-4">
            <Bookmark size={16} className="text-white/40" />
            <h2 className="text-sm font-semibold text-white/55 uppercase tracking-widest">
              My Saved Templates
            </h2>
            <span className="text-sm px-2 py-0.5 rounded bg-white/5 text-white/40 border border-white/8">
              {localTemplates.length}
            </span>
          </div>

          {localTemplates.length === 0 ? (
            <div className="text-center py-12 text-white/20">
              <p className="text-3xl mb-3">🖼</p>
              <p className="text-sm mb-1">No templates yet</p>
              <p className="text-xs text-secondary-text/50">Click &quot;New Template&quot; to get started</p>
            </div>
          ) : (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-4">
              {localTemplates.map((tpl) => (
                <LocalTemplateCard
                  key={tpl.id}
                  template={tpl}
                  onEdit={onEditLocal}
                  onDelete={onDeleteLocal}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* JSON viewer */}
      <JsonViewerModal layout={jsonLayout} onClose={() => setJsonLayout(null)} />
    </div>
  )
}
