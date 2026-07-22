import {
  X,
  RefreshCw,
  ExternalLink,
  Eye,
  Heart,
  MessageSquare,
  Repeat2,
  Bookmark,
  BarChart2,
  Star,
} from 'lucide-react'
import { cn } from '../../lib/utils'
import {
  formatDateTime,
  formatDuration,
  getWatchLink,
} from '../../lib/publishHistoryService'
import type {
  PublishHistoryRecord,
  StatsState,
  YtStats,
  FbStats,
  IgStats,
  XStats,
} from '../../types/publishHistory'

function fmtNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

interface StatCardProps {
  icon: React.ReactNode
  label: string
  value: number | string
}

function StatCard({ icon, label, value }: StatCardProps) {
  return (
    <div className="bg-white/4 border border-white/6 rounded-xl p-3 flex flex-col gap-1.5">
      <div className="flex items-center gap-1.5 text-white/40">
        {icon}
        <span className="text-sm uppercase tracking-wider font-medium">{label}</span>
      </div>
      <span className="text-xl font-bold text-white">
        {typeof value === 'number' ? fmtNum(value) : value}
      </span>
    </div>
  )
}

function YtStatsGrid({ s }: { s: YtStats }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <StatCard icon={<Eye size={11} />} label="Views" value={s.viewCount} />
      <StatCard icon={<Heart size={11} />} label="Likes" value={s.likeCount} />
      <StatCard icon={<MessageSquare size={11} />} label="Comments" value={s.commentCount} />
      <StatCard icon={<Star size={11} />} label="Favourites" value={s.favoriteCount} />
    </div>
  )
}

function FbStatsGrid({ s }: { s: FbStats }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <StatCard icon={<Eye size={11} />} label="Views" value={s.views} />
      <StatCard icon={<Heart size={11} />} label="Likes" value={s.likes} />
      <StatCard icon={<MessageSquare size={11} />} label="Comments" value={s.comments} />
    </div>
  )
}

function IgStatsGrid({ s }: { s: IgStats }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <StatCard icon={<Heart size={11} />} label="Likes" value={s.likes} />
      <StatCard icon={<MessageSquare size={11} />} label="Comments" value={s.comments} />
    </div>
  )
}

function XStatsGrid({ s }: { s: XStats }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <StatCard icon={<Eye size={11} />} label="Impressions" value={s.impressions} />
      <StatCard icon={<Heart size={11} />} label="Likes" value={s.likes} />
      <StatCard icon={<Repeat2 size={11} />} label="Retweets" value={s.retweets} />
      <StatCard icon={<MessageSquare size={11} />} label="Replies" value={s.replies} />
      <StatCard icon={<BarChart2 size={11} />} label="Quotes" value={s.quotes} />
      <StatCard icon={<Bookmark size={11} />} label="Bookmarks" value={s.bookmarks} />
    </div>
  )
}

interface StatsPanelProps {
  record: PublishHistoryRecord | null
  statsState: StatsState
  onClose: () => void
  onRefresh: () => void
}

export function StatsPanel({ record, statsState, onClose, onRefresh }: StatsPanelProps) {
  const open = record !== null
  const watchLink = record ? getWatchLink(record) : ''
  const duration =
    record && record.endTime > record.startTime
      ? formatDuration(record.endTime - record.startTime)
      : null

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          'fixed inset-0 z-40 bg-black/40 backdrop-blur-xs transition-opacity duration-300',
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none',
        )}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className={cn(
          'fixed right-0 top-0 bottom-0 z-50 w-80 bg-surface border-l border-white/8 flex flex-col',
          'transition-transform duration-300 ease-out shadow-[−8px_0_32px_rgba(0,0,0,0.6)]',
          open ? 'translate-x-0' : 'translate-x-full',
        )}
      >
        {record && (
          <>
            {/* Header */}
            <div className="shrink-0 flex items-center justify-between px-4 py-3 border-b border-white/6">
              <h3 className="text-sm font-semibold text-white">Stream Analytics</h3>
              <button
                type="button"
                onClick={onClose}
                className="p-1 text-white/40 hover:text-white transition-colors cursor-pointer rounded-lg hover:bg-white/5"
              >
                <X size={14} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              {/* Record info */}
              <div className="px-4 pt-4 pb-3 border-b border-white/6">
                {record.thumbnailUrl && (
                  <img
                    src={record.thumbnailUrl}
                    alt=""
                    className="w-full aspect-video object-cover rounded-lg mb-3 border border-white/8"
                    onError={e => {
                      ;(e.currentTarget as HTMLImageElement).style.display = 'none'
                    }}
                  />
                )}
                <p className="text-sm font-semibold text-white leading-tight line-clamp-2">
                  {record.title}
                </p>
                <p className="text-sm text-white/45 mt-1 capitalize">
                  {record.platform} · {record.inputType}
                </p>
                <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-sm text-white/35">
                  <span>{formatDateTime(record.startTime)}</span>
                  {duration && <span>· {duration}</span>}
                </div>
              </div>

              {/* Stats */}
              <div className="px-4 py-4">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-sm uppercase tracking-wider text-white/35 font-semibold">
                    Statistics
                  </p>
                  <button
                    type="button"
                    onClick={onRefresh}
                    disabled={statsState.status === 'loading'}
                    className="flex items-center gap-1 text-sm text-white/40 hover:text-white/70 cursor-pointer transition-colors disabled:opacity-40"
                  >
                    <RefreshCw
                      size={10}
                      className={statsState.status === 'loading' ? 'animate-spin' : ''}
                    />
                    Refresh
                  </button>
                </div>

                {statsState.status === 'loading' && (
                  <div className="flex flex-col gap-2">
                    {[1, 2, 3, 4].map(i => (
                      <div key={i} className="h-16 rounded-xl bg-white/4 animate-pulse" />
                    ))}
                  </div>
                )}

                {statsState.status === 'error' && (
                  <div className="rounded-xl bg-red-900/15 border border-red-500/20 px-4 py-3 text-sm text-red-400/80">
                    {statsState.error ?? 'Failed to load stats'}
                  </div>
                )}

                {statsState.status === 'success' &&
                  statsState.data &&
                  (() => {
                    const p = record.platform
                    if (p === 'youtube') return <YtStatsGrid s={statsState.data as YtStats} />
                    if (p === 'facebook') return <FbStatsGrid s={statsState.data as FbStats} />
                    if (p === 'instagram') return <IgStatsGrid s={statsState.data as IgStats} />
                    if (p === 'twitter') return <XStatsGrid s={statsState.data as XStats} />
                    return null
                  })()}

                {statsState.status === 'idle' && (
                  <p className="text-center text-sm text-white/30 py-6">
                    Click refresh to load stats
                  </p>
                )}
              </div>
            </div>

            {/* Footer actions */}
            {watchLink && (
              <div className="shrink-0 px-4 py-3 border-t border-white/6">
                <a
                  href={watchLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full py-2 rounded-lg bg-white/5 border border-white/10 text-sm text-white/70 hover:text-white hover:bg-white/8 cursor-pointer transition-colors"
                >
                  <ExternalLink size={13} />
                  Watch on{' '}
                  {record.platform.charAt(0).toUpperCase() + record.platform.slice(1)}
                </a>
              </div>
            )}
          </>
        )}
      </div>
    </>
  )
}
