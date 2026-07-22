import { useState, useEffect } from 'react'
import {
  StopCircle,
  MoveRight,
  Play,
  RefreshCw,
  Youtube,
  Facebook,
  Instagram,
  Twitter,
  Radio,
  Tv,
  ChevronRight,
} from 'lucide-react'
import { cn } from '../../lib/utils'
import { formatDateTime, formatDuration } from '../../lib/publishHistoryService'
import { getPreviewUrl } from '../../lib/ongoingPublishService'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import type { OngoingPublish, PublishPlatform } from '../../types/publishHistory'

/**
 * Returns the best live embed URL for the platform.
 *
 * Priority:
 * 1. WebRTC preview (masterId) — shows the actual outgoing stream, works for all
 *    platforms regardless of each platform's own embedding policy.
 * 2. YouTube embed — fallback only when no WebRTC preview available.
 *    Note: YouTube live streams may have embedding disabled on the channel,
 *    so this is intentionally a last resort.
 * 3. Facebook embed — same fallback rationale as YouTube.
 */
function getPlatformEmbedUrl(record: OngoingPublish): string {
  if (record.masterId) {
    return getPreviewUrl(record.masterId)
  }
  if (record.platform === 'youtube' && record.ytData?.videoId) {
    return `https://www.youtube.com/embed/${record.ytData.videoId}?autoplay=1&mute=1&controls=0&disablekb=1&rel=0`
  }
  if (record.platform === 'facebook' && record.fbData?.videoId) {
    const href = encodeURIComponent(`https://www.facebook.com/video/${record.fbData.videoId}`)
    return `https://www.facebook.com/plugins/video.php?href=${href}&width=160&autoplay=true&mute_video=true&show_text=false`
  }
  return ''
}

/**
 * Returns the best static thumbnail for the platform,
 * walking through platform-specific data before falling back to the generic thumbnailUrl.
 */
function getPlatformThumbnail(record: OngoingPublish): string {
  return (
    record.ytData?.videoThumbnailDefaultUrl ??
    record.fbData?.thumbnail ??
    record.igData?.igThumbnail ??
    record.xData?.thumbnail ??
    record.telegramData?.thumbnail ??
    record.thumbnailUrl ??
    ''
  )
}

const PLATFORM_CONFIG: Record<
  PublishPlatform,
  { label: string; bar: string; badge: string; icon: React.ReactNode }
> = {
  youtube: {
    label: 'YouTube',
    bar: 'bg-red-500',
    badge: 'bg-red-600/15 text-red-400 border-red-500/20',
    icon: <Youtube size={11} />,
  },
  facebook: {
    label: 'Facebook',
    bar: 'bg-blue-500',
    badge: 'bg-blue-600/15 text-blue-400 border-blue-500/20',
    icon: <Facebook size={11} />,
  },
  instagram: {
    label: 'Instagram',
    bar: 'bg-pink-500',
    badge: 'bg-pink-600/15 text-pink-400 border-pink-500/20',
    icon: <Instagram size={11} />,
  },
  twitter: {
    label: 'X',
    bar: 'bg-secondary-text',
    badge: 'bg-surface-2 text-secondary-text border-primary-border',
    icon: <Twitter size={11} />,
  },
  telegram: {
    label: 'Telegram',
    bar: 'bg-sky-500',
    badge: 'bg-sky-600/15 text-sky-400 border-sky-500/20',
    icon: <Tv size={11} />,
  },
  rtmp: {
    label: 'RTMP',
    bar: 'bg-purple-500',
    badge: 'bg-purple-600/15 text-purple-400 border-purple-500/20',
    icon: <Radio size={11} />,
  },
  unknown: {
    label: 'Unknown',
    bar: 'bg-secondary-text/50',
    badge: 'bg-surface text-secondary-text/50 border-primary-border',
    icon: <Radio size={11} />,
  },
}

interface StatusConfig {
  cls: string
  dot: string
  pulse: boolean
  label: string
}

function statusConfig(status: string): StatusConfig {
  const s = status.toLowerCase()
  if (s === 'publishing')
    return { cls: 'bg-emerald-900/30 text-emerald-400 border-emerald-500/20', dot: 'bg-emerald-400', pulse: true, label: 'Publishing' }
  if (s === 'starting' || s === 'initializing' || s === 'pending' || s === 'queued')
    return { cls: 'bg-amber-900/30 text-amber-400 border-amber-500/20', dot: 'bg-amber-400', pulse: true, label: status }
  if (s === 'stopping')
    return { cls: 'bg-orange-900/30 text-orange-400 border-orange-500/20', dot: 'bg-orange-400', pulse: true, label: 'Stopping' }
  if (s === 'uploaded (publish)' || s === 'uploaded')
    return { cls: 'bg-blue-900/30 text-blue-400 border-blue-500/20', dot: 'bg-blue-400', pulse: false, label: 'Uploaded' }
  if (s === 'not uploaded (publish)' || s === 'not uploaded')
    return { cls: 'bg-red-900/30 text-red-400 border-red-500/20', dot: 'bg-red-400', pulse: false, label: 'Not Uploaded' }
  return { cls: 'bg-surface border-primary-border text-secondary-text', dot: 'bg-secondary-text/50', pulse: false, label: status || 'Unknown' }
}

function inputTypeLabel(t: string): string {
  const s = t.toLowerCase().replace(/\s+/g, '')
  if (s === 'vodupload') return 'VOD Upload'
  if (s === 'vod') return 'VOD'
  if (s === 'live') return 'LIVE'
  return t || '—'
}

function isVodDone(record: OngoingPublish): boolean {
  const s = record.status.toLowerCase()
  return s.includes('uploaded (publish)') || s.includes('not uploaded (publish)')
}

function isStoppable(record: OngoingPublish): boolean {
  const s = record.status.toLowerCase()
  return !s.includes('(publish)') && s !== 'stopping'
}

interface OngoingPublishRowProps {
  record: OngoingPublish
  isStopping: boolean
  isMoving: boolean
  isGoingLive?: boolean
  onStop: () => void
  onMoveToHistory: () => void
  onInfo: () => void
  onGoLive?: () => void
}

export function OngoingPublishRow({
  record,
  isStopping,
  isMoving,
  isGoingLive = false,
  onStop,
  onMoveToHistory,
  onInfo,
  onGoLive,
}: OngoingPublishRowProps) {
  const [stopDialogOpen, setStopDialogOpen] = useState(false)
  const [moveDialogOpen, setMoveDialogOpen] = useState(false)
  const [previewLoaded, setPreviewLoaded] = useState(false)
  const [imgError, setImgError] = useState(false)
  const [iframeError, setIframeError] = useState(false)

  const platform = PLATFORM_CONFIG[record.platform] ?? PLATFORM_CONFIG.unknown
  // Show stopping state immediately on the badge — don't wait for the server to update
  const sc = isStopping ? statusConfig('stopping') : statusConfig(record.status)
  const duration =
    record.endTime > record.startTime ? formatDuration(record.endTime - record.startTime) : null
  const previewUrl = getPlatformEmbedUrl(record)
  const thumbnailUrl = getPlatformThumbnail(record)
  // Native platform embeds (no masterId) need autoplay permissions and no sandbox restrictions
  const isNativeEmbed = !record.masterId && (record.platform === 'youtube' || record.platform === 'facebook')

  // Probe the WebRTC preview URL before mounting the iframe.
  // fetch() receives the HTTP status (unlike iframes, which fire onLoad even for 504).
  // Native embeds (YouTube/Facebook) are trusted CDNs — no probe needed.
  useEffect(() => {
    if (!previewUrl || isNativeEmbed) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIframeError(false)
      return
    }
    let cancelled = false
    setIframeError(false)
    setPreviewLoaded(false)
    const controller = new AbortController()
    fetch(previewUrl, { signal: controller.signal })
      .then(res => { if (!cancelled && !res.ok) setIframeError(true) })
      .catch(err => {
        // AbortError = component unmounted — ignore.
        // TypeError without 'abort' = network failure → show fallback.
        if (!cancelled && err.name !== 'AbortError') setIframeError(true)
      })
    return () => { cancelled = true; controller.abort() }
  }, [previewUrl, isNativeEmbed])
  // const canStop = isStoppable(record) && !isStopping
  const canMove = isVodDone(record) && !isMoving

  return (
    <>
      {/* Entire row is the click target for details */}
      <div
        role="button"
        tabIndex={0}
        onClick={onInfo}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onInfo() } }}
        className="group bg-surface border border-primary-border rounded-xl overflow-hidden cursor-pointer transition-all duration-200 hover:border-[#3031cb]/30 hover:bg-surface-2 hover:shadow-sm flex"
      >
        {/* Platform accent bar */}
        <div className={cn('w-1 shrink-0', platform.bar)} />

        <div className="flex-1 flex items-center gap-4 px-5 py-4 min-w-0">
          {/* Preview */}
          <div className="shrink-0 w-32 h-18 rounded-lg overflow-hidden bg-surface-2 border border-primary-border relative flex items-center justify-center">
            {previewUrl && !iframeError ? (
              <>
                {!previewLoaded && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className={cn('w-2 h-2 rounded-full', platform.bar, 'opacity-60 animate-pulse')} />
                  </div>
                )}
                <iframe
                  src={previewUrl}
                  className={cn(
                    'w-full h-full border-0 transition-opacity duration-300',
                    previewLoaded ? 'opacity-100' : 'opacity-0',
                  )}
                  onLoad={() => setPreviewLoaded(true)}
                  onError={() => { setIframeError(true); setPreviewLoaded(false) }}
                  allow="autoplay; encrypted-media; picture-in-picture"
                  {...(!isNativeEmbed && { sandbox: 'allow-scripts allow-same-origin' })}
                  title="Live preview"
                />
              </>
            ) : thumbnailUrl && !imgError ? (
              <img
                src={thumbnailUrl}
                alt=""
                className="w-full h-full object-cover"
                onError={() => setImgError(true)}
              />
            ) : (
              <div className={cn('w-full h-full flex items-center justify-center opacity-40', {
                'bg-red-600/10': record.platform === 'youtube',
                'bg-blue-600/10': record.platform === 'facebook',
                'bg-pink-600/10': record.platform === 'instagram',
                'bg-sky-600/10': record.platform === 'telegram',
                'bg-purple-600/10': record.platform === 'rtmp',
                'bg-surface-2': !['youtube', 'facebook', 'instagram', 'telegram', 'rtmp'].includes(record.platform),
              })}>
                {platform.icon}
              </div>
            )}
          </div>

          {/* Main info */}
          <div className="flex-1 min-w-0 space-y-2">
            {/* Row 1: badges + title */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className={cn('inline-flex items-center gap-1.5 px-2 py-1 rounded border text-sm font-semibold', platform.badge)}>
                {platform.icon} {platform.label}
              </span>
              <span className={cn(
                'text-sm px-2 py-1 rounded border font-semibold',
                record.inputType.toLowerCase().includes('live')
                  ? 'bg-emerald-900/20 border-emerald-500/20 text-emerald-400'
                  : 'bg-surface border-primary-border text-secondary-text',
              )}>
                {inputTypeLabel(record.inputType)}
              </span>
              <span className="text-base font-bold text-primary-text truncate">
                {record.title}
              </span>
            </div>

            {/* Row 2: target + time */}
            <div className="flex items-center gap-3 text-sm text-secondary-text flex-wrap">
              {record.publishUrl && (
                <span className="font-mono truncate max-w-40 text-secondary-text/70">
                  {record.publishUrl}
                </span>
              )}
              {record.startTime > 0 && (
                <span>{formatDateTime(record.startTime)}</span>
              )}
              {duration && (
                <span className="text-primary-text font-semibold">· {duration}</span>
              )}
              {record.startedBy && (
                <span>by <span className="text-primary-text">{record.startedBy}</span></span>
              )}
            </div>
          </div>

          {/* Status + Actions */}
          <div className="shrink-0 flex items-center gap-2.5">
            {/* Status badge */}
            <div className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm font-bold',
              sc.cls,
            )}>
              <span className={cn(
                'h-1.5 w-1.5 rounded-full shrink-0',
                sc.dot,
                sc.pulse && 'animate-pulse',
              )} />
              {sc.label}
            </div>

            {/* Go Live (YouTube only, when not yet transitioned to live) */}
            {record.platform === 'youtube' && onGoLive && isStoppable(record) && record.status.toLowerCase() !== 'publishing' && (
              <button
                type="button"
                onClick={e => { e.stopPropagation(); onGoLive() }}
                disabled={isGoingLive}
                title="Transition broadcast to live"
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-600/10 border border-emerald-500/20 text-base text-emerald-400 hover:bg-emerald-600/20 hover:text-emerald-300 cursor-pointer transition-colors disabled:opacity-40 disabled:cursor-not-allowed min-h-10 font-medium"
              >
                {isGoingLive
                  ? <RefreshCw size={14} className="animate-spin" />
                  : <Play size={14} />
                }
                Go Live
              </button>
            )}

            {/* Move to History (VOD done) */}
            {canMove && (
              <button
                type="button"
                onClick={e => { e.stopPropagation(); setMoveDialogOpen(true) }}
                disabled={isMoving}
                title="Move to history"
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-surface border border-primary-border text-base text-secondary-text hover:text-primary-text hover:bg-surface-2 cursor-pointer transition-colors disabled:opacity-40 disabled:cursor-not-allowed min-h-10 font-medium"
              >
                <MoveRight size={14} />
                History
              </button>
            )}

            {/* Stop button */}
            {isStoppable(record) && (
              <button
                type="button"
                onClick={e => { e.stopPropagation(); setStopDialogOpen(true) }}
                disabled={isStopping}
                title="Stop publish"
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-red-600/10 border border-red-500/20 text-base text-red-400 hover:bg-red-600/20 hover:text-red-300 cursor-pointer transition-colors disabled:opacity-40 disabled:cursor-not-allowed min-h-10 font-medium"
              >
                {isStopping ? <RefreshCw size={14} className="animate-spin" /> : <StopCircle size={14} />}
                {isStopping ? 'Stopping…' : 'Stop'}
              </button>
            )}

            {/* Disclosure indicator — signals the row is clickable */}
            <ChevronRight
              size={16}
              className="shrink-0 text-secondary-text/50 group-hover:text-primary-text transition-colors ml-0.5"
            />
          </div>
        </div>
      </div>

      {/* Stop confirmation */}
      <ConfirmDialog
        open={stopDialogOpen}
        onOpenChange={setStopDialogOpen}
        title="Stop Publish?"
        description={`This will stop the "${record.title || record.platform}" publish. The stream will end immediately.`}
        confirmLabel="Stop Publish"
        variant="danger"
        onConfirm={() => { setStopDialogOpen(false); onStop() }}
      />

      {/* Move to history confirmation */}
      <ConfirmDialog
        open={moveDialogOpen}
        onOpenChange={setMoveDialogOpen}
        title="Move to History?"
        description={`Move "${record.title || record.platform}" to publish history?`}
        confirmLabel="Move to History"
        onConfirm={() => { setMoveDialogOpen(false); onMoveToHistory() }}
      />
    </>
  )
}
