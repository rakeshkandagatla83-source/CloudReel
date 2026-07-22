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

// Platform config
const PLATFORM_CONFIG: Record<
  PublishPlatform,
  { label: string; cls: string; icon: React.ReactNode }
> = {
  youtube: {
    label: 'YouTube',
    cls: 'bg-red-600/15 text-red-400 border-red-500/20',
    icon: <Youtube size={12} />,
  },
  facebook: {
    label: 'Facebook',
    cls: 'bg-blue-600/15 text-blue-400 border-blue-500/20',
    icon: <Facebook size={12} />,
  },
  instagram: {
    label: 'Instagram',
    cls: 'bg-pink-600/15 text-pink-400 border-pink-500/20',
    icon: <Instagram size={12} />,
  },
  twitter: {
    label: 'X (Twitter)',
    cls: 'bg-surface-2 text-secondary-text border-primary-border',
    icon: <Twitter size={12} />,
  },
  telegram: {
    label: 'Telegram',
    cls: 'bg-sky-600/15 text-sky-400 border-sky-500/20',
    icon: <Tv size={12} />,
  },
  rtmp: {
    label: 'RTMP',
    cls: 'bg-purple-600/15 text-purple-400 border-purple-500/20',
    icon: <Radio size={12} />,
  },
  unknown: {
    label: 'Unknown',
    cls: 'bg-surface-2 text-secondary-text border-primary-border',
    icon: <Radio size={12} />,
  },
}

function statusConfig(status: string): { cls: string; dot: string } {
  const s = status.toLowerCase()
  if (s === 'uploaded' || s === 'success')
    return {
      cls: 'bg-[#24dd6e]/10 text-[#24dd6e] border-[#24dd6e]/20',
      dot: 'bg-[#24dd6e]',
    }
  if (s === 'failed' || s === 'error')
    return {
      cls: 'bg-[#e00000]/10 text-[#e00000] border-[#e00000]/20',
      dot: 'bg-[#e00000]',
    }
  if (s === 'not uploaded')
    return {
      cls: 'bg-amber-100 text-amber-700 border-amber-300',
      dot: 'bg-amber-500',
    }
  return { cls: 'bg-surface-2 text-secondary-text border-primary-border', dot: 'bg-secondary-text/50' }
}

function inputTypeLabel(t: string): string {
  const s = t.toLowerCase().replace(/\s+/g, '')
  if (s === 'vodupload') return 'VOD Upload'
  if (s === 'vod') return 'VOD'
  if (s === 'live') return 'LIVE'
  return t || '—'
}

interface RecordCardProps {
  record: PublishHistoryRecord
  onViewStats: () => void
}

export function RecordCard({ record, onViewStats }: RecordCardProps) {
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
    <div className="group bg-surface border border-primary-border rounded-xl overflow-hidden hover:bg-surface-2 transition-colors flex gap-0">
      {/* Platform accent bar */}
      <div
        className={cn('w-1 shrink-0', {
          'bg-red-500': record.platform === 'youtube',
          'bg-blue-500': record.platform === 'facebook',
          'bg-pink-500': record.platform === 'instagram',
          'bg-white/40': record.platform === 'twitter',
          'bg-sky-500': record.platform === 'telegram',
          'bg-purple-500': record.platform === 'rtmp',
          'bg-white/15': record.platform === 'unknown',
        })}
      />

      <div className="flex-1 flex items-center gap-4 px-5 py-4 min-w-0">
        {/* Thumbnail */}
        <div className="shrink-0 w-32 h-18 rounded-lg overflow-hidden bg-surface-2 border border-primary-border flex items-center justify-center">
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
              {platform.icon}
            </div>
          )}
        </div>

        {/* Main info */}
        <div className="flex-1 min-w-0 space-y-2">
          <p className="text-base font-bold text-primary-text truncate leading-tight">
            {record.title}
          </p>
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={cn(
                'inline-flex items-center gap-1.5 px-2 py-1 rounded border text-sm font-semibold',
                platform.cls,
              )}
            >
              {platform.icon} {platform.label}
            </span>
            {isLive ? (
              <span className="text-sm px-2 py-1 rounded bg-[#e00000]/10 border border-[#e00000]/20 text-[#e00000] font-bold">
                LIVE
              </span>
            ) : (
              <span className="text-sm px-2 py-1 rounded bg-surface-2 border border-primary-border text-secondary-text font-semibold">
                {inputTypeLabel(record.inputType)}
              </span>
            )}
            {record.startTime > 0 && (
              <span className="text-sm text-secondary-text">{formatDateTime(record.startTime)}</span>
            )}
            {duration && (
              <span className="text-sm text-secondary-text font-semibold">· {duration}</span>
            )}
          </div>
          {(record.startedBy || record.stoppedBy) && (
            <p className="text-sm text-secondary-text/70 mt-1.5 truncate">
              {record.startedBy && (
                <>Started by <span className="text-secondary-text">{record.startedBy}</span></>
              )}
              {record.stoppedBy && (
                <> · Stopped by <span className="text-secondary-text">{record.stoppedBy}</span></>
              )}
            </p>
          )}
        </div>

        {/* Right side: status + actions in one aligned row */}
        <div className="shrink-0 flex items-center gap-2.5">
          <div
            className={cn(
              'flex items-center gap-1.5 px-3 py-1 rounded-full border text-sm font-bold',
              status.cls,
            )}
          >
            <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', status.dot)} />
            {record.status || 'Unknown'}
          </div>
          {canViewStats && (
            <button
              type="button"
              onClick={onViewStats}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-surface-2 border border-primary-border text-base text-secondary-text hover:bg-black/5 hover:text-primary-text cursor-pointer transition-colors min-h-10 font-medium"
            >
              <BarChart2 size={14} /> Stats
            </button>
          )}
          {watchLink && (
            <a
              href={watchLink}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-surface-2 border border-primary-border text-base text-secondary-text hover:bg-black/5 hover:text-primary-text cursor-pointer transition-colors min-h-10 font-medium"
            >
              <ExternalLink size={14} /> Watch
            </a>
          )}
        </div>
      </div>
    </div>
  )
}
