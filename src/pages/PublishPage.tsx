import { useEffect, useState, useCallback } from 'react'
import {
  RefreshCw,
  XCircle,
  Activity,
  History,
  Download,
  ChevronLeft,
  ChevronRight,
  BarChart3,
  Clock,
  LayoutList,
  LayoutGrid,
  Grid2X2,
  Grid3X3,
} from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import { cn } from '../lib/utils'
import { Select, SelectItem } from '../components/ui/Select'
import { getStorage, setStorage } from '../lib/storage'
import { useOngoingPublishes } from '../features/publish/useOngoingPublishes'
import { Toaster } from '../components/ui/Toast'
import { OngoingPublishRow } from '../features/publish/OngoingPublishRow'
import { PlatformInfoPanel } from '../features/publish/PlatformInfoPanel'
import { usePublishHistory } from '../features/publishHistory/usePublishHistory'
import { RecordCard } from '../features/publishHistory/RecordCard'
import { GridCard } from '../features/publishHistory/GridCard'
import { StatsPanel } from '../features/publishHistory/StatsPanel'
import { loadPlatformStats, exportToCsv, formatDuration } from '../lib/publishHistoryService'
import type {
  OngoingPublish,
  PublishHistoryRecord,
  PublishPlatform,
  StatsState,
} from '../types/publishHistory'
import type { GridSize } from '../features/publishHistory/GridCard'
import { useMemo } from 'react'

type Tab = 'ongoing' | 'history'
type ViewMode = 'list' | 'grid-lg' | 'grid-md' | 'grid-sm'

const GRID_COLS: Record<ViewMode, string> = {
  list: '',
  'grid-lg': 'grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4',
  'grid-md': 'grid grid-cols-3 md:grid-cols-4 xl:grid-cols-5',
  'grid-sm': 'grid grid-cols-4 md:grid-cols-5 xl:grid-cols-6',
}

const GRID_SIZE_MAP: Record<ViewMode, GridSize> = {
  list: 'lg',
  'grid-lg': 'lg',
  'grid-md': 'md',
  'grid-sm': 'sm',
}

const VIEW_OPTIONS: Array<{ value: ViewMode; icon: React.ReactNode; title: string }> = [
  { value: 'list', icon: <LayoutList size={14} />, title: 'List view' },
  { value: 'grid-lg', icon: <Grid2X2 size={14} />, title: 'Grid — large' },
  { value: 'grid-md', icon: <LayoutGrid size={14} />, title: 'Grid — medium' },
  { value: 'grid-sm', icon: <Grid3X3 size={14} />, title: 'Grid — small' },
]

const PLATFORM_PILLS: Array<{ value: PublishPlatform | 'all'; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'youtube', label: 'YouTube' },
  { value: 'facebook', label: 'Facebook' },
  { value: 'instagram', label: 'Instagram' },
  { value: 'twitter', label: 'X' },
  { value: 'telegram', label: 'Telegram' },
]

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100]

// ── Skeletons ─────────────────────────────────────────────────────────────────

function SkeletonRow() {
  return (
    <div className="bg-[#0a0f1e] border border-white/6 rounded-xl flex overflow-hidden">
      <div className="w-1 bg-white/8 shrink-0" />
      <div className="flex-1 flex items-center gap-3 px-4 py-3">
        <div className="shrink-0 w-24 h-[54px] rounded-lg bg-white/6 animate-pulse" />
        <div className="flex-1 space-y-2">
          <div className="h-3 bg-white/6 rounded animate-pulse w-2/5" />
          <div className="h-2 bg-white/4 rounded animate-pulse w-1/4" />
        </div>
        <div className="flex gap-2">
          <div className="h-6 w-20 bg-white/6 rounded-full animate-pulse" />
          <div className="h-6 w-14 bg-white/4 rounded-lg animate-pulse" />
        </div>
      </div>
    </div>
  )
}

function SkeletonList() {
  return (
    <div className="bg-[#0a0f1e] border border-white/6 rounded-xl flex gap-0 overflow-hidden">
      <div className="w-0.5 bg-white/8 shrink-0" />
      <div className="flex-1 flex items-center gap-3 px-3 py-2">
        <div className="shrink-0 w-20 h-12 rounded-lg bg-white/6 animate-pulse" />
        <div className="flex-1 space-y-2">
          <div className="h-3 bg-white/6 rounded animate-pulse w-2/5" />
          <div className="h-2 bg-white/4 rounded animate-pulse w-1/4" />
        </div>
        <div className="shrink-0 flex gap-2">
          <div className="h-5 w-14 bg-white/6 rounded-full animate-pulse" />
          <div className="h-5 w-10 bg-white/4 rounded-lg animate-pulse" />
        </div>
      </div>
    </div>
  )
}

function SkeletonGrid() {
  return (
    <div className="bg-[#0a0f1e] border border-white/6 rounded-xl overflow-hidden">
      <div className="aspect-video bg-white/6 animate-pulse" />
      <div className="p-2.5 space-y-1.5">
        <div className="h-2.5 bg-white/6 rounded animate-pulse w-1/2" />
        <div className="h-3 bg-white/5 rounded animate-pulse w-3/4" />
        <div className="h-2 bg-white/3 rounded animate-pulse w-2/5" />
      </div>
    </div>
  )
}

// ── Ongoing tab ───────────────────────────────────────────────────────────────

function OngoingTab() {
  const { records, loading, error, stoppingIds, movingIds, goingLiveIds, stopErrorMessage, clearStopError, refresh, stop, moveRecord, goLive } =
    useOngoingPublishes()
  const [infoRecord, setInfoRecord] = useState<OngoingPublish | null>(null)

  const publishingCount = records.filter(r => r.status.toLowerCase() === 'publishing').length

  return (
    <>
      {/* Sub-header */}
      <div className="shrink-0 px-6 py-3 border-b border-black/8 flex items-center justify-between bg-white">
        <div className="flex items-center gap-3">
          {publishingCount > 0 && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-900/20 border border-emerald-500/15 text-emerald-400 text-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
              <span className="font-semibold">{publishingCount}</span>
              <span className="text-emerald-400/60">
                {publishingCount === 1 ? 'live' : 'live'}
              </span>
            </div>
          )}
          {records.length > 0 && (
            <span className="text-sm text-white/40">
              {records.length} {records.length === 1 ? 'record' : 'records'}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={refresh}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 text-base font-medium text-white/70 border border-white/15 rounded-lg hover:bg-white/5 hover:text-white cursor-pointer transition-colors disabled:opacity-40 min-h-10"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        {error && (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <XCircle size={32} className="text-red-400/50" />
            <p className="text-sm text-red-400/70">{error}</p>
            <button
              type="button"
              onClick={refresh}
              className="px-4 py-1.5 text-sm bg-white/5 border border-white/10 rounded-lg text-white/60 hover:bg-white/8 cursor-pointer transition-colors"
            >
              Retry
            </button>
          </div>
        )}

        {loading && !error && (
          <div className="flex flex-col gap-2">
            {[1, 2, 3].map(i => <SkeletonRow key={i} />)}
          </div>
        )}

        {!loading && !error && records.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="w-16 h-16 rounded-2xl bg-white/4 border border-white/6 flex items-center justify-center">
              <Activity size={28} className="text-white/15" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-white/30">No active publishes</p>
              <p className="text-sm text-white/35 mt-1">
                Start a publish from the Studio to see it here
              </p>
            </div>
          </div>
        )}

        {!loading && !error && records.length > 0 && (
          <div className="flex flex-col gap-2">
            {records.map(r => (
              <OngoingPublishRow
                key={r.sno}
                record={r}
                isStopping={stoppingIds.has(r.sno)}
                isMoving={movingIds.has(r.sno)}
                isGoingLive={goingLiveIds.has(r.sno)}
                onStop={() => void stop(r)}
                onMoveToHistory={() => void moveRecord(r)}
                onInfo={() => setInfoRecord(r)}
                onGoLive={r.platform === 'youtube' ? () => void goLive(r) : undefined}
              />
            ))}
          </div>
        )}
      </div>

      <PlatformInfoPanel record={infoRecord} onClose={() => setInfoRecord(null)} />

      <Toaster
        id="ongoing-stop-error-toast"
        open={stopErrorMessage !== null}
        onOpenChange={open => { if (!open) clearStopError() }}
        variant="error"
        title="Stop failed"
        description={stopErrorMessage ?? undefined}
      />
    </>
  )
}

// ── History tab ───────────────────────────────────────────────────────────────

function HistoryTab() {
  const [viewMode, setViewMode] = useState<ViewMode>(
    () => (getStorage<ViewMode>('publish_history_view') ?? 'list'),
  )

  function changeView(v: ViewMode) {
    setViewMode(v)
    setStorage('publish_history_view', v)
  }

  const { records, total, loading, error, filters, applyFilters, totalPages, refetch } =
    usePublishHistory()

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
    <>
      {/* Toolbar */}
      <div className="shrink-0 px-6 py-2.5 border-b border-black/8 flex flex-wrap items-center gap-2 bg-white">
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={filters.startDate}
            onChange={e => applyFilters({ startDate: e.target.value })}
            className="cursor-pointer outline-hidden"
          />
          <span className="text-white/20 text-base">→</span>
          <input
            type="date"
            value={filters.endDate}
            onChange={e => applyFilters({ endDate: e.target.value })}
            className="cursor-pointer outline-hidden"
          />
        </div>

        <Select
          value={filters.platform}
          onValueChange={v => applyFilters({ platform: v as typeof filters.platform })}
        >
          {PLATFORM_PILLS.map(p => (
            <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
          ))}
        </Select>

        <button
          type="button"
          onClick={() => applyFilters({ sortOrder: filters.sortOrder === 'desc' ? 'asc' : 'desc' })}
          className="flex items-center gap-2 px-4 py-2 text-base font-medium text-white/70 border border-white/15 rounded-lg hover:bg-white/5 cursor-pointer transition-colors min-h-10"
        >
          {filters.sortOrder === 'desc' ? '↓ Newest' : '↑ Oldest'}
        </button>

        <div className="ml-auto flex items-center gap-2.5">
          {!loading && records.length > 0 && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/4 border border-white/15 text-white/70 text-sm">
              <Clock size={14} className="shrink-0" />
              <span className="font-semibold">{totalAirtime}</span>
              <span className="text-white/55">airtime</span>
            </div>
          )}
          <button
            type="button"
            onClick={handleExport}
            disabled={records.length === 0}
            className="flex items-center gap-2 px-4 py-2 text-base font-medium text-white/70 border border-white/15 rounded-lg hover:bg-white/5 hover:text-white cursor-pointer transition-colors disabled:opacity-30 disabled:cursor-not-allowed min-h-10"
          >
            <Download size={16} /> Export CSV
          </button>
          <button
            type="button"
            onClick={refetch}
            disabled={loading}
            className="p-2 text-white/70 border border-white/15 rounded-lg hover:bg-white/5 hover:text-white cursor-pointer transition-colors disabled:opacity-40 min-h-10 w-10 flex items-center justify-center"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
          <div className="flex items-center bg-white/4 border border-white/15 rounded-lg p-1 gap-1 min-h-10">
            {VIEW_OPTIONS.map(v => (
              <button
                key={v.value}
                type="button"
                title={v.title}
                onClick={() => changeView(v.value)}
                className={cn(
                  'p-1.5 rounded-md cursor-pointer transition-colors w-8 h-8 flex items-center justify-center',
                  viewMode === v.value
                    ? 'bg-white/12 text-white'
                    : 'text-white/55 hover:text-white/85 hover:bg-white/6',
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
              className="px-4 py-1.5 text-sm bg-white/5 border border-white/10 rounded-lg text-white/60 hover:bg-white/8 cursor-pointer transition-colors"
            >
              Retry
            </button>
          </div>
        )}

        {loading && !error && (
          isGrid ? (
            <div className={cn(GRID_COLS[viewMode], 'gap-3')}>
              {Array.from({ length: skeletonCount }, (_, i) => <SkeletonGrid key={i} />)}
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {Array.from({ length: skeletonCount }, (_, i) => <SkeletonList key={i} />)}
            </div>
          )
        )}

        {!loading && !error && records.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <BarChart3 size={40} className="text-white/10" />
            <p className="text-sm text-white/30 font-medium">No publish records found</p>
            <p className="text-sm text-white/35">
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
        <div className="shrink-0 px-6 py-3 border-t border-black/8 flex items-center justify-between bg-white">
          <div className="flex items-center gap-3">
            <Select
              value={String(filters.pageSize)}
              onValueChange={v => applyFilters({ pageSize: Number(v) })}
            >
              {PAGE_SIZE_OPTIONS.map(n => (
                <SelectItem key={n} value={String(n)}>{n} / page</SelectItem>
              ))}
            </Select>
            <p className="text-sm text-white/40">
              Showing {(filters.page - 1) * filters.pageSize + 1}–
              {Math.min(filters.page * filters.pageSize, total)} of {total.toLocaleString()}
            </p>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => applyFilters({ page: filters.page - 1 })}
              disabled={filters.page <= 1}
              className="p-2 rounded-lg text-white/70 hover:text-white hover:bg-white/5 disabled:opacity-25 disabled:cursor-not-allowed cursor-pointer transition-colors w-10 h-10 flex items-center justify-center"
            >
              <ChevronLeft size={16} />
            </button>
            {pageNumbers.map((p, i) =>
              p === '...' ? (
                <span key={`ellipsis-${i}`} className="px-2 text-white/55 text-base">…</span>
              ) : (
                <button
                  key={p}
                  type="button"
                  onClick={() => applyFilters({ page: p })}
                  className={cn(
                    'w-10 h-10 rounded-lg text-base font-bold cursor-pointer transition-colors flex items-center justify-center',
                    filters.page === p
                      ? 'bg-[#3031cb] text-white'
                      : 'text-white/70 hover:bg-white/5 hover:text-white',
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

      <StatsPanel
        record={selectedRecord}
        statsState={currentStatsState}
        onClose={() => setSelectedRecord(null)}
        onRefresh={() => { if (selectedRecord) void loadStats(selectedRecord) }}
      />
    </>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export function PublishPage() {
  useEffect(() => {
    document.title = 'CloudReel - Publish'
  }, [])

  const [searchParams] = useSearchParams()

  const [activeTab, setActiveTab] = useState<Tab>(() => {
    const tabParam = searchParams.get('tab') as Tab | null
    if (tabParam === 'ongoing' || tabParam === 'history') return tabParam
    return getStorage<Tab>('publish_active_tab') ?? 'ongoing'
  })

  function switchTab(tab: Tab) {
    setActiveTab(tab)
    setStorage('publish_active_tab', tab)
  }

  return (
    <div className="flex h-full flex-col">
      {/* Tab bar */}
      <div className="shrink-0 px-6 pt-2 pb-0 border-b border-black/8 bg-white">
        {/* Tabs */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => switchTab('ongoing')}
            className={cn(
              'flex items-center gap-2.5 px-5 py-3 text-base font-semibold border-b-2 transition-colors cursor-pointer',
              activeTab === 'ongoing'
                ? 'border-[#3031cb] text-[#3031cb]'
                : 'border-transparent text-white/55 hover:text-white/85 hover:border-white/20',
            )}
          >
            <Activity size={16} />
            Ongoing
          </button>
          <button
            type="button"
            onClick={() => switchTab('history')}
            className={cn(
              'flex items-center gap-2.5 px-5 py-3 text-base font-semibold border-b-2 transition-colors cursor-pointer',
              activeTab === 'history'
                ? 'border-[#3031cb] text-[#3031cb]'
                : 'border-transparent text-white/55 hover:text-white/85 hover:border-white/20',
            )}
          >
            <History size={16} />
            History
          </button>
        </div>
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {activeTab === 'ongoing' ? <OngoingTab /> : <HistoryTab />}
      </div>
    </div>
  )
}
