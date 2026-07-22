import {
  X,
  ExternalLink,
  Youtube,
  Facebook,
  Instagram,
  Twitter,
  Radio,
  Tv,
  Link,
  User,
  Shield,
  Clapperboard,
  MonitorPlay,
} from 'lucide-react'
import { cn } from '../../lib/utils'
import { formatDateTime } from '../../lib/publishHistoryService'
import type { OngoingPublish } from '../../types/publishHistory'

interface InfoRowProps {
  icon: React.ReactNode
  label: string
  value: string
  href?: string
  monospace?: boolean
}

function InfoRow({ icon, label, value, href, monospace }: InfoRowProps) {
  return (
    <div className="flex items-start gap-2.5 py-2 border-b border-white/4 last:border-0">
      <span className="shrink-0 mt-0.5 text-white/30">{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] text-white/30 uppercase tracking-wider mb-0.5">{label}</p>
        {href ? (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              'text-xs text-[#3031cb] hover:text-[#ff2033] hover:underline transition-colors break-all cursor-pointer',
              monospace && 'font-mono',
            )}
          >
            {value}
          </a>
        ) : (
          <p
            className={cn(
              'text-xs text-white/80 break-all',
              monospace && 'font-mono text-white/60',
            )}
          >
            {value}
          </p>
        )}
      </div>
    </div>
  )
}

const PLATFORM_ICONS: Record<string, React.ReactNode> = {
  youtube: <Youtube size={14} className="text-red-400" />,
  facebook: <Facebook size={14} className="text-blue-400" />,
  instagram: <Instagram size={14} className="text-pink-400" />,
  twitter: <Twitter size={14} className="text-white/70" />,
  telegram: <Tv size={14} className="text-sky-400" />,
  rtmp: <Radio size={14} className="text-purple-400" />,
}

const PLATFORM_LABELS: Record<string, string> = {
  youtube: 'YouTube',
  facebook: 'Facebook',
  instagram: 'Instagram',
  twitter: 'X (Twitter)',
  telegram: 'Telegram',
  rtmp: 'RTMP',
  unknown: 'Unknown',
}

function maskStreamKey(url: string): string {
  return url.length > 16 ? url.slice(0, 6) + '••••••••' + url.slice(-4) : '••••••••'
}

interface PlatformInfoPanelProps {
  record: OngoingPublish | null
  onClose: () => void
}

export function PlatformInfoPanel({ record, onClose }: PlatformInfoPanelProps) {
  const open = record !== null

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
          'transition-transform duration-300 ease-out',
          open ? 'translate-x-0' : 'translate-x-full',
        )}
      >
        {record && (
          <>
            {/* Header */}
            <div className="shrink-0 flex items-center gap-2.5 px-4 py-3 border-b border-white/6">
              {PLATFORM_ICONS[record.platform] ?? <Radio size={14} className="text-white/30" />}
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-semibold text-white truncate">
                  {PLATFORM_LABELS[record.platform] ?? 'Platform Info'}
                </h3>
                <p className="text-[10px] text-white/35">Publish details</p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-1 text-white/40 hover:text-white transition-colors cursor-pointer rounded-lg hover:bg-white/5"
              >
                <X size={14} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              {/* Thumbnail */}
              {record.thumbnailUrl && (
                <div className="px-4 pt-4">
                  <img
                    src={record.thumbnailUrl}
                    alt=""
                    className="w-full aspect-video object-cover rounded-xl border border-white/8"
                    onError={e => {
                      ;(e.currentTarget as HTMLImageElement).style.display = 'none'
                    }}
                  />
                </div>
              )}

              {/* Common info */}
              <div className="px-4 pt-4 pb-2">
                <p className="text-[10px] text-white/30 uppercase tracking-wider font-semibold mb-3">
                  Publish Info
                </p>

                {record.title && record.title !== '—' && (
                  <InfoRow
                    icon={<Clapperboard size={12} />}
                    label="Title"
                    value={record.title}
                  />
                )}

                <InfoRow
                  icon={<MonitorPlay size={12} />}
                  label="Input Type"
                  value={
                    record.inputType.toLowerCase().includes('vod')
                      ? record.inputType.toLowerCase().includes('upload')
                        ? 'VOD Upload'
                        : 'VOD'
                      : 'LIVE'
                  }
                />

                {record.startTime > 0 && (
                  <InfoRow
                    icon={<span className="text-[10px] font-bold">⏱</span>}
                    label="Started At"
                    value={formatDateTime(record.startTime)}
                  />
                )}
              </div>

              {/* Platform-specific info */}
              <div className="px-4 pb-4">
                <p className="text-[10px] text-white/30 uppercase tracking-wider font-semibold mb-3 mt-2">
                  Platform Details
                </p>

                {/* YouTube */}
                {record.platform === 'youtube' && record.ytData && (
                  <>
                    {record.ytData.channelTitle && (
                      <InfoRow
                        icon={<User size={12} />}
                        label="Channel"
                        value={record.ytData.channelTitle}
                      />
                    )}
                    {record.ytData.channelName && (
                      <InfoRow
                        icon={<User size={12} />}
                        label="Username"
                        value={`@${record.ytData.channelName}`}
                      />
                    )}
                    {record.ytData.videoId && (
                      <InfoRow
                        icon={<Link size={12} />}
                        label="Video ID"
                        value={record.ytData.videoId}
                        monospace
                      />
                    )}
                    {record.ytData.link && (
                      <InfoRow
                        icon={<ExternalLink size={12} />}
                        label="Watch Link"
                        value={record.ytData.link}
                        href={record.ytData.link}
                      />
                    )}
                    {record.ytData.videoId && (
                      <InfoRow
                        icon={<Youtube size={12} />}
                        label="Studio Link"
                        value="Open YouTube Studio"
                        href={`https://studio.youtube.com/video/${record.ytData.videoId}/livestreaming`}
                      />
                    )}
                  </>
                )}

                {/* Facebook */}
                {record.platform === 'facebook' && record.fbData && (
                  <>
                    {record.fbData.pageName && (
                      <InfoRow
                        icon={<User size={12} />}
                        label="Page"
                        value={record.fbData.pageName}
                      />
                    )}
                    {record.fbData.videoId && (
                      <InfoRow
                        icon={<Link size={12} />}
                        label="Video ID"
                        value={record.fbData.videoId}
                        monospace
                      />
                    )}
                    {record.fbData.link && (
                      <InfoRow
                        icon={<ExternalLink size={12} />}
                        label="Watch Link"
                        value={record.fbData.link}
                        href={record.fbData.link}
                      />
                    )}
                  </>
                )}

                {/* Instagram */}
                {record.platform === 'instagram' && record.igData && (
                  <>
                    {record.igData.igUserName && (
                      <InfoRow
                        icon={<User size={12} />}
                        label="Account"
                        value={`@${record.igData.igUserName}`}
                      />
                    )}
                    {record.igData.videoId && (
                      <InfoRow
                        icon={<Link size={12} />}
                        label="Video ID"
                        value={record.igData.videoId}
                        monospace
                      />
                    )}
                    {record.igData.link && (
                      <InfoRow
                        icon={<ExternalLink size={12} />}
                        label="Watch Link"
                        value={record.igData.link}
                        href={record.igData.link}
                      />
                    )}
                  </>
                )}

                {/* Twitter/X */}
                {record.platform === 'twitter' && record.xData && (
                  <>
                    {(record.xData.twitterName ?? record.xData.userName) && (
                      <InfoRow
                        icon={<User size={12} />}
                        label="Account"
                        value={`@${record.xData.twitterName ?? record.xData.userName}`}
                      />
                    )}
                    {record.xData.link && (
                      <InfoRow
                        icon={<ExternalLink size={12} />}
                        label="Watch Link"
                        value={record.xData.link}
                        href={record.xData.link}
                      />
                    )}
                  </>
                )}

                {/* Telegram */}
                {record.platform === 'telegram' && record.telegramData && (
                  <>
                    {record.telegramData.title && (
                      <InfoRow
                        icon={<Clapperboard size={12} />}
                        label="Title"
                        value={record.telegramData.title}
                      />
                    )}
                    {record.telegramData.link && (
                      <InfoRow
                        icon={<ExternalLink size={12} />}
                        label="Watch Link"
                        value={record.telegramData.link}
                        href={record.telegramData.link}
                      />
                    )}
                  </>
                )}

                {/* RTMP */}
                {record.platform === 'rtmp' && record.publishUrl && (
                  <>
                    <InfoRow
                      icon={<Link size={12} />}
                      label="Publish URL"
                      value={record.publishUrl}
                      monospace
                    />
                    {record.inputUrl && (
                      <InfoRow
                        icon={<Shield size={12} />}
                        label="Stream Key"
                        value={maskStreamKey(record.inputUrl)}
                        monospace
                      />
                    )}
                  </>
                )}

                {/* Fallback publish URL */}
                {record.platform === 'unknown' && record.publishUrl && (
                  <InfoRow
                    icon={<Link size={12} />}
                    label="Publish URL"
                    value={record.publishUrl}
                    monospace
                  />
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </>
  )
}
