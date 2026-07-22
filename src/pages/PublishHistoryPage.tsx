import { useState, useCallback, useMemo, useEffect } from 'react'
import {
  RefreshCw,
  Download,
  ChevronLeft,
  ChevronRight,
  Clock,
  XCircle,
  BarChart3,
  LayoutList,
  LayoutGrid,
  Grid2X2,
  Grid3X3,
} from 'lucide-react'
import { cn } from '../lib/utils'
import { Select, SelectItem } from '../components/ui/Select'
import { getStorage, setStorage } from '../lib/storage'
import { loadPlatformStats, exportToCsv, formatDuration } from '../lib/publishHistoryService'
import { usePublishHistory } from '../features/publishHistory/usePublishHistory'
import { RecordCard } from '../features/publishHistory/RecordCard'
import { GridCard } from '../features/publishHistory/GridCard'
import type { GridSize } from '../features/publishHistory/GridCard'
import { StatsPanel } from '../features/publishHistory/StatsPanel'
import type {
  PublishHistoryRecord,
  PublishPlatform,
  StatsState,
} from '../types/publishHistory'

type ViewMode = 'list' | 'grid-lg' | 'grid-md' | 'grid-sm'

const VIEW_OPTIONS: Array<{ value: ViewMode; icon: React.ReactNode; title: string }> = [
  { value: 'list',    icon: <LayoutList size={14} />, title: 'List view' },
  { value: 'grid-lg', icon: <Grid2X2 size={14} />,   title: 'Grid — large' },
  { value: 'grid-md', icon: <LayoutGrid size={14} />, title: 'Grid — medium' },
  { value: 'grid-sm', icon: <Grid3X3 size={14} />,   title: 'Grid — small' },
]

const GRID_COLS: Record<ViewMode, string> = {
  list:    '',
  'grid-lg': 'grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4',
  'grid-md': 'grid grid-cols-3 md:grid-cols-4 xl:grid-cols-5',
  'grid-sm': 'grid grid-cols-4 md:grid-cols-5 xl:grid-cols-6',
}

const GRID_SIZE_MAP: Record<ViewMode, GridSize> = {
  list:    'lg',
  'grid-lg': 'lg',
  'grid-md': 'md',
  'grid-sm': 'sm',
}

const PLATFORM_PILLS: Array<{ value: PublishPlatform | 'all'; label: string }> = [
  { value: 'all',       label: 'All' },
  { value: 'youtube',   label: 'YouTube' },
  { value: 'facebook',  label: 'Facebook' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'twitter',   label: 'X' },
  { value: 'telegram',  label: 'Telegram' },
]

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100]

function SkeletonList() {
  return (
    <div className="bg-surface border border-primary-border rounded-xl flex gap-0 overflow-hidden">
      <div className="w-0.5 bg-surface-2 shrink-0" />
      <div className="flex-1 flex items-center gap-3 px-3 py-2">
        <div className="shrink-0 w-20 h-12 rounded-lg bg-surface-2 animate-pulse" />
        <div className="flex-1 space-y-2">
          <div className="h-3 bg-surface-2 rounded animate-pulse w-2/5" />
          <div className="h-2 bg-surface-2 rounded animate-pulse w-1/4" />
        </div>
        <div className="shrink-0 flex gap-2">
          <div className="h-5 w-14 bg-surface-2 rounded-full animate-pulse" />
          <div className="h-5 w-10 bg-surface-2 rounded-lg animate-pulse" />
          <div className="h-5 w-10 bg-surface-2 rounded-lg animate-pulse" />
        </div>
      </div>
    </div>
  )
}

function SkeletonGrid() {
  return (
    <div className="bg-surface border border-primary-border rounded-xl overflow-hidden">
      <div className="aspect-video bg-surface-2 animate-pulse" />
      <div className="p-2.5 space-y-1.5">
        <div className="h-2.5 bg-surface-2 rounded animate-pulse w-1/2" />
        <div className="h-3 bg-surface-2 rounded animate-pulse w-3/4" />
        <div className="h-2 bg-surface-2 rounded animate-pulse w-2/5" />
      </div>
    </div>
  )
}

export function PublishHistoryPage() {
  useEffect(() => {
    document.title = 'CloudReel - Publish History'
  }, [])

  const [viewMode, setViewMode] = useState<ViewMode>(
    () => (getStorage<ViewMode>('publish_history_view') ?? 'list'),
  )

  function changeView(v: ViewMode) {
    setViewMode(v)
    setStorage('publish_history_view', v)
  }

  const { records, total, loading, error, filters, applyFilters, totalPages, refetch } =
    usePublishHistory()

  // Stats panel state
  const [selectedRecord, setSelectedRecord] = useState<PublishHistoryRecord | null>(null)
  const [statsCache, setStatsCache] = useState<Record<number, StatsState>>({})

  const loadStats = useCallback(async (record: PublishHistoryRecord) => {
    const sno = record.sno
    setStatsCache(prev => ({ ...prev, [sno]: { status: 'loading' } }))
    try {
      const data = await loadPlatformStats(record)
      setStatsCache(prev => ({ ...prev, [sno]: { status: 'success', data } }))
    } catch (e) {
      setStatsCache(prev => ({
        ...prev,
        [sno]: { status: 'error', error: (e as Error).message },
      }))
    }
  }, [])

  function openStats(record: PublishHistoryRecord) {
    setSelectedRecord(record)
    const existing = statsCache[record.sno]
    if (!existing || existing.status === 'idle') void loadStats(record)
  }

  function refreshStats() {
    if (selectedRecord) void loadStats(selectedRecord)
  }

  const currentStatsState: StatsState = selectedRecord
    ? (statsCache[selectedRecord.sno] ?? { status: 'idle' })
    : { status: 'idle' }

  const totalAirtime = useMemo(() => {
    const totalSecs = records
      .filter(r => r.endTime > r.startTime)
      .reduce((s, r) => s + (r.endTime - r.startTime), 0)
    return formatDuration(totalSecs)
  }, [records])

  function handleExport() {
    exportToCsv(records, `publish-history-${filters.startDate}-${filters.endDate}.csv`)
  }

  // Pagination page numbers — max 7 buttons with ellipsis
  const pageNumbers = useMemo<Array<number | '...'>>(() => {
    const pages: Array<number | '...'> = []
    const cur = filters.page
    const tp = totalPages
    if (tp <= 7) {
      for (let i = 1; i <= tp; i++) pages.push(i)
    } else {
      pages.push(1)
      if (cur > 3) pages.push('...')
      for (let i = Math.max(2, cur - 1); i <= Math.min(tp - 1, cur + 1); i++) pages.push(i)
      if (cur < tp - 2) pages.push('...')
      pages.push(tp)
    }
    return pages
  }, [filters.page, totalPages])

  const isGrid = viewMode !== 'list'
  const skeletonCount = isGrid ? 12 : 5

  return (
    <div className="flex h-full flex-col">
      {/* Toolbar */}
      <div className="shrink-0 px-6 py-2.5 border-b border-primary-border flex flex-wrap items-center gap-2 bg-surface">
        <h1 className="text-base font-bold text-primary-text flex items-center gap-2 shrink-0">
          <BarChart3 size={16} className="text-[#3031cb]" />
          Publish History
        </h1>

        <div className="w-px h-4 bg-primary-border mx-1" />

        {/* Date range */}
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={filters.startDate}
            onChange={e => applyFilters({ startDate: e.target.value })}
            className="cursor-pointer outline-hidden"
          />
          <span className="text-secondary-text text-base">→</span>
          <input
            type="date"
            value={filters.endDate}
            onChange={e => applyFilters({ endDate: e.target.value })}
            className="cursor-pointer outline-hidden"
          />
        </div>

        {/* Platform dropdown */}
        <Select
          value={filters.platform}
          onValueChange={v => applyFilters({ platform: v as typeof filters.platform })}
        >
          {PLATFORM_PILLS.map(p => (
            <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
          ))}
        </Select>

        {/* Sort toggle */}
        <button
          type="button"
          onClick={() => applyFilters({ sortOrder: filters.sortOrder === 'desc' ? 'asc' : 'desc' })}
          className="flex items-center gap-2 px-4 py-2 text-base font-medium text-secondary-text border border-primary-border rounded-lg hover:bg-surface-2 cursor-pointer transition-colors min-h-10"
        >
          {filters.sortOrder === 'desc' ? '↓ Newest' : '↑ Oldest'}
        </button>

        <div className="ml-auto flex items-center gap-2.5">
          {/* Total airtime chip */}
          {!loading && records.length > 0 && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-surface-2 border border-primary-border text-secondary-text text-sm">
              <Clock size={14} className="shrink-0" />
              <span className="font-semibold">{totalAirtime}</span>
              <span className="text-secondary-text/80">airtime</span>
            </div>
          )}

          <button
            type="button"
            onClick={handleExport}
            disabled={records.length === 0}
            className="flex items-center gap-2 px-4 py-2 text-base font-medium text-secondary-text border border-primary-border rounded-lg hover:bg-surface-2 hover:text-primary-text cursor-pointer transition-colors disabled:opacity-30 disabled:cursor-not-allowed min-h-10"
          >
            <Download size={16} /> Export CSV
          </button>

          <button
            type="button"
            onClick={refetch}
            disabled={loading}
            className="p-2 text-secondary-text border border-primary-border rounded-lg hover:bg-surface-2 hover:text-primary-text cursor-pointer transition-colors disabled:opacity-40 min-h-10 w-10 flex items-center justify-center"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>

          {/* View mode toggle */}
          <div className="flex items-center bg-surface-2 border border-primary-border rounded-lg p-1 gap-1 min-h-10">
            {VIEW_OPTIONS.map(v => (
              <button
                key={v.value}
                type="button"
                title={v.title}
                onClick={() => changeView(v.value)}
                className={cn(
                  'p-1.5 rounded-md cursor-pointer transition-colors w-8 h-8 flex items-center justify-center',
                  viewMode === v.value
                    ? 'bg-primary-text/10 text-primary-text'
                    : 'text-secondary-text hover:text-primary-text hover:bg-surface-2',
                )}
              >
                {v.icon}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {error && (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <XCircle size={32} className="text-red-400/50" />
            <p className="text-sm text-red-400/70">{error}</p>
            <button
              type="button"
              onClick={refetch}
              className="px-4 py-1.5 text-xs bg-surface-2 border border-primary-border rounded-lg text-secondary-text hover:bg-surface-2 cursor-pointer transition-colors"
            >
              Retry
            </button>
          </div>
        )}

        {loading && !error && (
          isGrid ? (
            <div className={cn(GRID_COLS[viewMode], 'gap-3')}>
              {Array.from({ length: skeletonCount }, (_, i) => (
                <SkeletonGrid key={i} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {Array.from({ length: skeletonCount }, (_, i) => (
                <SkeletonList key={i} />
              ))}
            </div>
          )
        )}

        {!loading && !error && records.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <BarChart3 size={40} className="text-secondary-text/30" />
            <p className="text-sm text-secondary-text font-medium">No publish records found</p>
            <p className="text-[11px] text-secondary-text/70">
              Try adjusting the date range or platform filter
            </p>
          </div>
        )}

        {!loading && !error && records.length > 0 && (
          isGrid ? (
            <div className={cn(GRID_COLS[viewMode], 'gap-3')}>
              {records.map(r => (
                <GridCard
                  key={r.sno}
                  record={r}
                  size={GRID_SIZE_MAP[viewMode]}
                  onViewStats={() => openStats(r)}
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {records.map(r => (
                <RecordCard key={r.sno} record={r} onViewStats={() => openStats(r)} />
              ))}
            </div>
          )
        )}
      </div>

      {/* Pagination */}
      {!loading && !error && total > 0 && (
        <div className="shrink-0 px-6 py-3 border-t border-primary-border flex items-center justify-between bg-surface">
          <div className="flex items-center gap-3">
            <Select
              value={String(filters.pageSize)}
              onValueChange={v => applyFilters({ pageSize: Number(v) })}
            >
              {PAGE_SIZE_OPTIONS.map(n => (
                <SelectItem key={n} value={String(n)}>{n} / page</SelectItem>
              ))}
            </Select>
            <p className="text-sm text-secondary-text">
              Showing {(filters.page - 1) * filters.pageSize + 1}–
              {Math.min(filters.page * filters.pageSize, total)} of {total.toLocaleString()}
            </p>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={filters.page === 1}
              onClick={() => applyFilters({ page: filters.page - 1 })}
              className="p-2 rounded-lg text-secondary-text hover:text-primary-text hover:bg-surface-2 disabled:opacity-25 disabled:cursor-not-allowed cursor-pointer transition-colors w-10 h-10 flex items-center justify-center"
            >
              <ChevronLeft size={16} />
            </button>

            {pageNumbers.map((p, i) =>
              p === '...' ? (
                <span key={`ellipsis-${i}`} className="px-2 text-secondary-text text-base">
                  ...
                </span>
              ) : (
                <button
                  key={p}
                  type="button"
                  onClick={() => applyFilters({ page: p })}
                  className={cn(
                    'w-10 h-10 rounded-lg text-sm font-medium flex items-center justify-center transition-colors cursor-pointer',
                    p === filters.page
                      ? 'bg-[#3031cb] text-white'
                      : 'text-secondary-text hover:bg-surface-2 hover:text-primary-text',
                  )}
                >
                  {p}
                </button>
              ),
            )}
            <button
              type="button"
              onClick={() => applyFilters({ page: filters.page + 1 })}
              disabled={filters.page >= totalPages}
              className="p-2 rounded-lg text-white/70 hover:text-white hover:bg-white/5 disabled:opacity-25 disabled:cursor-not-allowed cursor-pointer transition-colors w-10 h-10 flex items-center justify-center"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Stats Panel */}
      <StatsPanel
        record={selectedRecord}
        statsState={currentStatsState}
        onClose={() => setSelectedRecord(null)}
        onRefresh={refreshStats}
      />
    </div>
  )
}
