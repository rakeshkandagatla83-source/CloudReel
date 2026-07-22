import { useState } from 'react'
import {
  ExternalLink,
  BarChart2,
  Youtube,
  Facebook,
  Instagram,
  Twitter,
  Radio,
  Tv,
} from 'lucide-react'
import { cn } from '../../lib/utils'
import {
  formatDateTime,
  formatDuration,
  hasStats,
  getWatchLink,
} from '../../lib/publishHistoryService'
import type { PublishHistoryRecord, PublishPlatform } from '../../types/publishHistory'

export type GridSize = 'sm' | 'md' | 'lg'

const PLATFORM_CONFIG: Record<
  PublishPlatform,
  { label: string; accentCls: string; badgeCls: string; icon: React.ReactNode }
> = {
  youtube: {
    label: 'YouTube',
    accentCls: 'bg-red-500',
    badgeCls: 'bg-red-600/15 text-red-400 border-red-500/20',
    icon: <Youtube size={10} />,
  },
  facebook: {
    label: 'Facebook',
    accentCls: 'bg-blue-500',
    badgeCls: 'bg-blue-600/15 text-blue-400 border-blue-500/20',
    icon: <Facebook size={10} />,
  },
  instagram: {
    label: 'Instagram',
    accentCls: 'bg-pink-500',
    badgeCls: 'bg-pink-600/15 text-pink-400 border-pink-500/20',
    icon: <Instagram size={10} />,
  },
  twitter: {
    label: 'X',
    accentCls: 'bg-primary-text/40',
    badgeCls: 'bg-surface-2 text-secondary-text border-primary-border',
    icon: <Twitter size={10} />,
  },
  telegram: {
    label: 'Telegram',
    accentCls: 'bg-sky-500',
    badgeCls: 'bg-sky-600/15 text-sky-400 border-sky-500/20',
    icon: <Tv size={10} />,
  },
  rtmp: {
    label: 'RTMP',
    accentCls: 'bg-purple-500',
    badgeCls: 'bg-purple-600/15 text-purple-400 border-purple-500/20',
    icon: <Radio size={10} />,
  },
  unknown: {
    label: 'Unknown',
    accentCls: 'bg-primary-text/15',
    badgeCls: 'bg-surface-2 text-secondary-text border-primary-border',
    icon: <Radio size={10} />,
  },
}

function statusConfig(status: string): { cls: string; dot: string } {
  const s = status.toLowerCase()
  if (s === 'uploaded' || s === 'success')
    return { cls: 'bg-[#24dd6e]/10 text-[#24dd6e] border-[#24dd6e]/40', dot: 'bg-[#24dd6e]' }
  if (s === 'failed' || s === 'error')
    return { cls: 'bg-[#e00000]/10 text-[#e00000] border-[#e00000]/40', dot: 'bg-[#e00000]' }
  if (s === 'not uploaded')
    return { cls: 'bg-amber-100 text-amber-700 border-amber-300', dot: 'bg-amber-500' }
  if (s === 'stopped')
    return { cls: 'bg-slate-100 text-slate-700 border-slate-300', dot: 'bg-slate-500' }
  return { cls: 'bg-surface-2 text-secondary-text border-primary-border', dot: 'bg-secondary-text/50' }
}

interface GridCardProps {
  record: PublishHistoryRecord
  size: GridSize
  onViewStats: () => void
}

export function GridCard({ record, onViewStats }: GridCardProps) {
  const [imgError, setImgError] = useState(false)
  const platform = PLATFORM_CONFIG[record.platform] ?? PLATFORM_CONFIG.unknown
  const status = statusConfig(record.status)
  const watchLink = getWatchLink(record)
  const canViewStats = hasStats(record)
  const duration =
    record.endTime > record.startTime
      ? formatDuration(record.endTime - record.startTime)
      : null
  const isLive = record.inputType.toLowerCase().includes('live')

  return (
    <div className="group bg-surface border border-primary-border rounded-xl overflow-hidden hover:bg-surface-2 transition-colors flex flex-col">
      {/* Thumbnail */}
      <div className="relative w-full aspect-video bg-surface-2 overflow-hidden shrink-0">
        {record.thumbnailUrl && !imgError ? (
          <img
            src={record.thumbnailUrl}
            alt=""
            className="w-full h-full object-cover"
            onError={() => setImgError(true)}
          />
        ) : (
          <div
            className={cn(
              'w-full h-full flex items-center justify-center',
              record.platform === 'youtube'
                ? 'bg-red-600/10'
                : record.platform === 'facebook'
                  ? 'bg-blue-600/10'
                  : record.platform === 'instagram'
                    ? 'bg-pink-600/10'
                    : 'bg-surface-2',
            )}
          >
            <span className="opacity-40">{platform.icon}</span>
          </div>
        )}

        {/* Platform accent bar across top */}
        <div className={cn('absolute top-0 left-0 right-0 h-0.5', platform.accentCls)} />

        {/* LIVE badge — top left */}
        {isLive && (
          <span className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded bg-[#e00000]/10 border border-[#e00000]/30 text-[8px] font-bold text-[#e00000] backdrop-blur-xs">
            LIVE
          </span>
        )}

        {/* Status badge — top right */}
        <div
          className={cn(
            'absolute top-1.5 right-1.5 flex items-center gap-0.5 px-1.5 py-0.5 rounded-full border text-[8px] font-semibold backdrop-blur-xs',
            status.cls,
          )}
        >
          <span className={cn('h-1 w-1 rounded-full shrink-0', status.dot)} />
          {record.status || 'Unknown'}
        </div>
      </div>

      {/* Content — single row: info left, actions right */}
      <div className="flex items-center gap-2 px-2.5 py-2">
        {/* Left: platform badge + title + time */}
        <div className="flex-1 min-w-0 flex flex-col gap-0.5">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span
              className={cn(
                'inline-flex items-center gap-1 px-1.5 py-0.5 rounded border text-sm shrink-0',
                platform.badgeCls,
              )}
            >
              {platform.icon} {platform.label}
            </span>
            <p className="text-sm font-semibold text-primary-text truncate leading-tight">
              {record.title}
            </p>
          </div>
          {record.startTime > 0 && (
            <p className="text-sm text-secondary-text/50 truncate">
              {formatDateTime(record.startTime)}
              {duration ? <span className="text-secondary-text/70 font-medium"> · {duration}</span> : null}
            </p>
          )}
          {(record.startedBy || record.stoppedBy) && (
            <p className="text-sm text-secondary-text/40 truncate">
              {record.startedBy && (
                <>Started by <span className="text-secondary-text/60">{record.startedBy}</span></>
              )}
              {record.stoppedBy && (
                <> · Stopped by <span className="text-secondary-text/60">{record.stoppedBy}</span></>
              )}
            </p>
          )}
        </div>

        {/* Right: action chips */}
        <div className="shrink-0 flex items-center gap-1">
          {canViewStats && (
            <button
              type="button"
              onClick={onViewStats}
              className="flex items-center gap-0.5 px-2 py-0.5 rounded bg-surface-2 border border-primary-border text-sm text-secondary-text hover:bg-black/5 hover:text-primary-text cursor-pointer transition-colors"
            >
              <BarChart2 size={9} /> Stats
            </button>
          )}
          {watchLink && (
            <a
              href={watchLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-0.5 px-2 py-0.5 rounded bg-surface-2 border border-primary-border text-sm text-secondary-text hover:bg-black/5 hover:text-primary-text cursor-pointer transition-colors"
            >
              <ExternalLink size={9} /> Watch
            </a>
          )}
        </div>
      </div>
    </div>
  )
}
