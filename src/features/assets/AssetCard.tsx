import { useState, memo } from 'react'
import { Film, Image as ImageIcon, Clock, HardDrive, Check, Pencil, Trash2, Download, Upload, Radio } from 'lucide-react'
import type { Asset } from '../../types/asset'
import { formatDuration, formatFileSize, formatEpoch, CATEGORY_MAP } from './assetUtils'
import { AssetMoreMenu } from './AssetMoreMenu'

interface AssetCardProps {
  asset: Asset
  onSelect?: (asset: Asset) => void
  selected?: boolean
  checked?: boolean
  onCheck?: (asset: Asset) => void
  onMenuRename?: (asset: Asset) => void
  onMenuDelete?: (asset: Asset) => void
  onMenuDownload?: (asset: Asset) => void
  onMenuPublish?: (asset: Asset) => void
  onMenuPublishAsLive?: (asset: Asset) => void
}

function Thumbnail({ previewurl, posterPath, name }: { previewurl: string; posterPath: string; name: string }) {
  const [errored, setErrored] = useState(false)

  if (previewurl && !errored) {
    return (
      <video
        src={previewurl}
        muted
        preload="none"
        poster={posterPath || undefined}
        className="absolute inset-0 h-full w-full object-cover pointer-events-none"
        onError={() => setErrored(true)}
      />
    )
  }

  if (posterPath && !errored) {
    return (
      <img
        src={posterPath}
        alt={name}
        className="absolute inset-0 h-full w-full object-cover"
        onError={() => setErrored(true)}
      />
    )
  }

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-white/5">
      <Film size={32} className="text-white/20" />
    </div>
  )
}

export const AssetCard = memo(function AssetCard({ asset, onSelect, selected = false, checked = false, onCheck, onMenuRename, onMenuDelete, onMenuDownload, onMenuPublish, onMenuPublishAsLive }: AssetCardProps) {
  const cat = CATEGORY_MAP[asset.misc?.category ?? '']
  const isGraphic = asset.misc?.category === 'S'

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelect?.(asset)}
      onKeyDown={(e) => e.key === 'Enter' && onSelect?.(asset)}
      className={`group relative flex cursor-pointer flex-col rounded-xl border bg-secondary-bg transition-all duration-200 hover:border-white/20 hover:shadow-lg hover:shadow-black/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 ${
        selected ? 'border-blue-500/60 ring-1 ring-blue-500/30' : 'border-white/8'
      }`}
    >
      {/* Thumbnail */}
      <div className="relative w-full overflow-hidden rounded-t-xl bg-black/40" style={{ paddingBottom: '56.25%' }}>
        <Thumbnail previewurl={asset.previewurl ?? ''} posterPath={asset.misc?.posterPath ?? ''} name={asset.name} />

        {/* Selection checkbox */}
        {onCheck && (
          <div
            role="checkbox"
            aria-checked={checked}
            tabIndex={-1}
            onClick={(e) => { e.stopPropagation(); onCheck(asset) }}
            className={`absolute left-1.5 top-1.5 z-20 flex h-5 w-5 cursor-pointer items-center justify-center rounded border-2 shadow shadow-black/60 transition-all duration-150 ${
              checked
                ? 'border-blue-500 bg-blue-500'
                : 'border-white/60 bg-black/50 opacity-0 group-hover:opacity-100'
            }`}
          >
            {checked && <Check size={10} className="text-white" />}
          </div>
        )}

        {/* Category badge — top-right */}
        {cat && (
          <span
            className={`absolute right-2 top-2 rounded border px-1.5 py-0.5 text-sm font-semibold uppercase tracking-wider shadow shadow-black/60 backdrop-blur-xs ${cat.color}`}
          >
            {cat.label}
          </span>
        )}

        {/* Duration — bottom-right (video only) */}
        {!isGraphic && asset.asset_duration > 0 && (
          <span className="absolute bottom-2 right-2 flex items-center gap-1 rounded bg-black/70 px-1.5 py-0.5 text-sm font-medium text-white/90 backdrop-blur-sm">
            <Clock size={10} />
            {formatDuration(asset.fps > 0 ? asset.asset_duration / asset.fps : asset.asset_duration)}
          </span>
        )}

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-blue-500/0 transition-all duration-200 group-hover:bg-blue-500/5" />
      </div>

      {/* Card body */}
      <div className="flex flex-1 flex-col gap-1.5 p-3.5">
        <div className="flex items-center gap-1">
          <p
            className="flex-1 truncate text-base font-medium leading-snug text-white/90"
            title={asset.name}
          >
            {asset.name}
          </p>
          {(onMenuRename || onMenuDelete || onMenuDownload || onMenuPublish || onMenuPublishAsLive) && (
            <AssetMoreMenu
              triggerId={`assets-card-btn-more-${asset.aid}`}
              triggerClassName="shrink-0 cursor-pointer rounded p-0.5 text-white/30 opacity-0 transition-all group-hover:opacity-100 hover:bg-white/10 hover:text-white/70 focus-visible:outline-none focus-visible:opacity-100"
              items={[
                ...(onMenuDownload ? [{ label: 'Download', icon: <Download size={13} />, onClick: () => onMenuDownload(asset) }] : []),
                ...(onMenuPublish && asset.misc?.category === 'P' ? [{ label: 'Media Publish', icon: <Upload size={13} />, onClick: () => onMenuPublish(asset) }] : []),
                ...(onMenuPublishAsLive && asset.misc?.category === 'P' ? [{ label: 'Publish as Live', icon: <Radio size={13} />, onClick: () => onMenuPublishAsLive(asset) }] : []),
                ...(onMenuRename ? [{ label: 'Rename', icon: <Pencil size={13} />, onClick: () => onMenuRename(asset) }] : []),
                ...(onMenuDelete ? [{ label: 'Delete', icon: <Trash2 size={13} />, onClick: () => onMenuDelete(asset), danger: true }] : []),
              ]}
            />
          )}
        </div>

        <div className="mt-auto flex items-center justify-between pt-1.5 text-base text-white/80">
          <span className="flex items-center gap-1">
            <HardDrive size={12} />
            {formatFileSize(asset.filesize)}
          </span>
          {asset.fps > 0 && (
            <span className="flex items-center gap-1">
              <ImageIcon size={12} />
              {asset.fps} fps
            </span>
          )}
          <span>{formatEpoch(asset.uploadedon)}</span>
        </div>
      </div>
    </div>
  )
})
