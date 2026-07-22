import { useState, useEffect } from 'react'
import {
  X,
  Image as ImageIcon,
  Clock,
  HardDrive,
  Gauge,
  MonitorPlay,
  Tag,
  Tv2,
  BookOpen,
  Calendar,
  Upload,
} from 'lucide-react'
import type { Asset } from '../../types/asset'
import { formatDuration, formatFileSize, formatEpoch, CATEGORY_MAP } from './assetUtils'
import { getVideoBase, getBgBase } from '../../lib/studioConfig'

interface AssetPreviewPanelProps {
  asset: Asset | null
  onClose: () => void
}

function VideoPreview({ src }: { src: string }) {
  return (
    <video
      key={src}
      src={src}
      controls
      controlsList="nodownload"
      className="h-full w-full object-contain"
    />
  )
}

function ImagePreview({ src, name }: { src: string; name: string }) {
  const [errored, setErrored] = useState(false)

  if (!src || errored) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <ImageIcon size={40} className="text-white/15" />
      </div>
    )
  }

  return (
    <img
      src={src}
      alt={name}
      className="h-full w-full object-contain"
      onError={() => setErrored(true)}
    />
  )
}

interface DetailRowProps {
  icon: React.ReactNode
  label: string
  value: React.ReactNode
}

function DetailRow({ icon, label, value }: DetailRowProps) {
  return (
    <div className="flex items-start gap-3 py-2.5">
      <span className="mt-0.5 shrink-0 text-white/30">{icon}</span>
      <span className="w-24 shrink-0 text-xs text-white/40">{label}</span>
      <span className="flex-1 text-xs text-white/80">{value}</span>
    </div>
  )
}

export function AssetPreviewPanel({ asset, onClose }: AssetPreviewPanelProps) {
  const isOpen = asset !== null

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [isOpen, onClose])

  const VIDEO_EXTENSIONS = /\.(mp4|mov|avi|mkv|webm|mts|m2ts|mxf|ts|mpg|mpeg)$/i
  const isGraphic = asset?.misc?.category === 'S'
  const isVideo = asset?.misc?.category === 'P' || (isGraphic && VIDEO_EXTENSIONS.test(asset?.name ?? ''))
  const cat = asset ? CATEGORY_MAP[asset.misc?.category ?? ''] : null
  const videoPlayUrl = asset
    ? (asset.previewurl || (isGraphic ? getBgBase() : getVideoBase()) + encodeURIComponent(asset.name))
    : ''

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-black/50 backdrop-blur-[2px] transition-opacity duration-300 ${
          isOpen ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className={`fixed bottom-0 right-0 top-14 z-50 flex w-105 flex-col border-l border-white/10 bg-[#0b1120] shadow-2xl shadow-black/60 transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {asset && (
          <>
            {/* Header */}
            <div className="flex shrink-0 items-start justify-between gap-3 border-b border-white/8 px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-white">
                  {asset.name}
                </p>
                <div className="mt-1 flex items-center gap-1.5">
                  {cat && (
                    <span
                      className={`rounded border px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${cat.color}`}
                    >
                      {cat.label}
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={onClose}
                className="shrink-0 cursor-pointer rounded-lg p-1.5 text-white/40 transition-colors hover:bg-white/8 hover:text-white/80"
              >
                <X size={16} />
              </button>
            </div>

            {/* Preview area */}
            <div className="shrink-0 bg-black" style={{ aspectRatio: '16/9' }}>
              {isVideo ? (
                <VideoPreview src={videoPlayUrl} />
              ) : (
                <ImagePreview
                  src={asset.misc?.posterPath || asset.previewurl}
                  name={asset.name}
                />
              )}
            </div>

            {/* Details */}
            <div className="flex-1 overflow-y-auto px-4 py-2">
              <div className="divide-y divide-white/5">
                {asset.asset_duration > 0 && (
                  <DetailRow
                    icon={<Clock size={13} />}
                    label="Duration"
                    value={<span className="font-mono">{formatDuration(asset.fps > 0 ? asset.asset_duration / asset.fps : asset.asset_duration)}</span>}
                  />
                )}
                <DetailRow
                  icon={<HardDrive size={13} />}
                  label="File Size"
                  value={formatFileSize(asset.filesize)}
                />
                {asset.fps > 0 && (
                  <DetailRow
                    icon={<MonitorPlay size={13} />}
                    label="FPS"
                    value={`${asset.fps} fps`}
                  />
                )}
                {asset.bitrate > 0 && (
                  <DetailRow
                    icon={<Gauge size={13} />}
                    label="Bitrate"
                    value={`${(asset.bitrate / 1000).toFixed(0)} kbps`}
                  />
                )}
                <DetailRow
                  icon={<Upload size={13} />}
                  label="Uploaded"
                  value={formatEpoch(asset.uploadedon)}
                />
                <DetailRow
                  icon={<Calendar size={13} />}
                  label="Created"
                  value={formatEpoch(asset.createdon)}
                />
                {asset.misc?.seriesName && (
                  <DetailRow
                    icon={<Tv2 size={13} />}
                    label="Series"
                    value={
                      <span>
                        {asset.misc.seriesName}
                        {asset.misc.season > 0 && (
                          <span className="text-white/40">
                            {' '}S{asset.misc.season}
                            {asset.misc.episode > 0 && ` E${asset.misc.episode}`}
                          </span>
                        )}
                      </span>
                    }
                  />
                )}
                {asset.misc?.tags && (
                  <DetailRow
                    icon={<Tag size={13} />}
                    label="Tags"
                    value={
                      <div className="flex flex-wrap gap-1">
                        {asset.misc.tags.split(',').map((t) => t.trim()).filter(Boolean).map((t) => (
                          <span
                            key={t}
                            className="rounded-md border border-white/10 bg-white/5 px-1.5 py-0.5 text-[11px] text-white/60"
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    }
                  />
                )}
                {asset.misc?.remarks && (
                  <DetailRow
                    icon={<BookOpen size={13} />}
                    label="Remarks"
                    value={<span className="text-white/60">{asset.misc.remarks}</span>}
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
