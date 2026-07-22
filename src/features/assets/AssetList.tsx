import { useState, memo } from 'react'
import { Film, FolderOpen, Check, Pencil, Trash2, Download, Upload, Radio } from 'lucide-react'
import type { Asset } from '../../types/asset'
import { formatDuration, formatFileSize, formatEpoch, CATEGORY_MAP } from './assetUtils'
import { AssetMoreMenu } from './AssetMoreMenu'

type ColumnKey =
  | 'thumbnail'
  | 'name'
  | 'category'
  | 'subCategory'
  | 'duration'
  | 'filesize'
  | 'fps'
  | 'bitrate'
  | 'uploadedon'
  | 'createdon'

interface ColumnDef {
  key: ColumnKey
  label: string
  defaultVisible: boolean
}

const ALL_COLUMNS: ColumnDef[] = [
  { key: 'thumbnail', label: 'Thumbnail', defaultVisible: true },
  { key: 'name', label: 'Name', defaultVisible: true },
  { key: 'category', label: 'Type', defaultVisible: true },
  { key: 'subCategory', label: 'Sub Category', defaultVisible: true },
  { key: 'duration', label: 'Duration', defaultVisible: true },
  { key: 'filesize', label: 'File Size', defaultVisible: true },
  { key: 'fps', label: 'FPS', defaultVisible: false },
  { key: 'bitrate', label: 'Bitrate', defaultVisible: false },
  { key: 'uploadedon', label: 'Uploaded', defaultVisible: true },
  { key: 'createdon', label: 'Created', defaultVisible: false },
]

const DEFAULT_VISIBLE = new Set<ColumnKey>(
  ALL_COLUMNS.filter((c) => c.defaultVisible).map((c) => c.key),
)

interface RowThumbnailProps {
  posterPath: string
  name: string
}

function RowThumbnail({ posterPath, name }: RowThumbnailProps) {
  const [errored, setErrored] = useState(false)

  if (!posterPath || errored) {
    return (
      <div className="flex h-11 w-20 items-center justify-center rounded bg-white/5">
        <Film size={18} className="text-white/20" />
      </div>
    )
  }

  return (
    <img
      src={posterPath}
      alt={name}
      className="h-11 w-20 rounded object-cover"
      onError={() => setErrored(true)}
    />
  )
}

function SkeletonRow({ colCount }: { colCount: number }) {
  return (
    <tr className="animate-pulse border-b border-white/5">
      {Array.from({ length: colCount }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="h-3 w-3/4 rounded bg-white/8" />
        </td>
      ))}
    </tr>
  )
}

export type { ColumnKey }
export { ALL_COLUMNS, DEFAULT_VISIBLE }

interface AssetRowProps {
  asset: Asset
  visibleDefs: ColumnDef[]
  isSelected: boolean
  isChecked: boolean
  showCheckbox: boolean
  onSelect?: (asset: Asset) => void
  onCheck?: (asset: Asset) => void
  onMenuRename?: (asset: Asset) => void
  onMenuDelete?: (asset: Asset) => void
  onMenuDownload?: (asset: Asset) => void
  onMenuPublish?: (asset: Asset) => void
  onMenuPublishAsLive?: (asset: Asset) => void
}

const AssetRow = memo(function AssetRow({ asset, visibleDefs, isSelected, isChecked, showCheckbox, onSelect, onCheck, onMenuRename, onMenuDelete, onMenuDownload, onMenuPublish, onMenuPublishAsLive }: AssetRowProps) {
  function renderCell(key: ColumnKey) {
    switch (key) {
      case 'thumbnail':
        return <RowThumbnail posterPath={asset.misc?.posterPath ?? ''} name={asset.name} />
      case 'name':
        return (
          <div>
            <p className="line-clamp-1 text-base font-medium text-white/90">{asset.name}</p>
            {asset.misc?.seriesName && (
              <p className="text-sm text-white/72">{asset.misc.seriesName}</p>
            )}
          </div>
        )
      case 'category': {
        const cat = CATEGORY_MAP[asset.misc?.category ?? '']
        return cat ? (
          <span className={`inline-flex rounded border px-1.5 py-0.5 text-sm font-semibold uppercase tracking-wider ${cat.color}`}>
            {cat.label}
          </span>
        ) : (
          <span className="text-white/55">—</span>
        )
      }
      case 'subCategory':
        return (
          <span className="capitalize text-base text-white/80">
            {asset.misc?.subCategory || <span className="text-white/55">—</span>}
          </span>
        )
      case 'duration':
        return (
          <span className="font-mono text-base text-white/85">
            {asset.asset_duration ? formatDuration(asset.fps > 0 ? asset.asset_duration / asset.fps : asset.asset_duration) : '—'}
          </span>
        )
      case 'filesize':
        return <span className="text-base text-white/85">{formatFileSize(asset.filesize)}</span>
      case 'fps':
        return <span className="text-base text-white/80">{asset.fps > 0 ? `${asset.fps} fps` : '—'}</span>
      case 'bitrate':
        return (
          <span className="text-base text-white/80">
            {asset.bitrate > 0 ? `${(asset.bitrate / 1000).toFixed(0)} kbps` : '—'}
          </span>
        )
      case 'uploadedon':
        return <span className="text-base text-white/80">{formatEpoch(asset.uploadedon)}</span>
      case 'createdon':
        return <span className="text-base text-white/80">{formatEpoch(asset.createdon)}</span>
      default:
        return null
    }
  }

  return (
    <tr
      onClick={() => onSelect?.(asset)}
      className={`group cursor-pointer border-b border-white/5 transition-colors last:border-0 hover:bg-white/4 ${
        isSelected ? 'bg-blue-500/8' : isChecked ? 'bg-blue-500/5' : ''
      }`}
    >
      {showCheckbox && (
        <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
          <div
            role="checkbox"
            aria-checked={isChecked}
            tabIndex={-1}
            onClick={() => onCheck?.(asset)}
            className={`flex h-5 w-5 cursor-pointer items-center justify-center rounded border-2 transition-colors ${
              isChecked ? 'border-blue-500 bg-blue-500' : 'border-white/30 hover:border-white/60'
            }`}
          >
            {isChecked && <Check size={12} className="text-white" />}
          </div>
        </td>
      )}
      {visibleDefs.map((col) => (
        <td key={col.key} className="px-4 py-3">
          {renderCell(col.key)}
        </td>
      ))}
      <td className="px-2 py-3" onClick={(e) => e.stopPropagation()}>
        {(onMenuRename || onMenuDelete || onMenuDownload || onMenuPublish || onMenuPublishAsLive) && (
          <AssetMoreMenu
            triggerId={`assets-list-btn-more-${asset.aid}`}
            triggerClassName="cursor-pointer rounded p-1 text-white/30 opacity-0 transition-all group-hover:opacity-100 hover:bg-white/10 hover:text-white/70 focus-visible:outline-none focus-visible:opacity-100"
            items={[
              ...(onMenuDownload ? [{ label: 'Download', icon: <Download size={13} />, onClick: () => onMenuDownload(asset) }] : []),
              ...(onMenuPublish && asset.misc?.category === 'P' ? [{ label: 'Media Publish', icon: <Upload size={13} />, onClick: () => onMenuPublish(asset) }] : []),
              ...(onMenuPublishAsLive && asset.misc?.category === 'P' ? [{ label: 'Publish as Live', icon: <Radio size={13} />, onClick: () => onMenuPublishAsLive(asset) }] : []),
              ...(onMenuRename ? [{ label: 'Rename', icon: <Pencil size={13} />, onClick: () => onMenuRename(asset) }] : []),
              ...(onMenuDelete ? [{ label: 'Delete', icon: <Trash2 size={13} />, onClick: () => onMenuDelete(asset), danger: true }] : []),
            ]}
          />
        )}
      </td>
    </tr>
  )
})

interface AssetListProps {
  assets: Asset[]
  loading: boolean
  visibleCols: Set<ColumnKey>
  onSelect?: (asset: Asset) => void
  selectedId?: number
  checkedIds?: Set<number>
  onCheck?: (asset: Asset) => void
  onCheckAll?: () => void
  allChecked?: boolean
  someChecked?: boolean
  onMenuRename?: (asset: Asset) => void
  onMenuDelete?: (asset: Asset) => void
  onMenuDownload?: (asset: Asset) => void
  onMenuPublish?: (asset: Asset) => void
  onMenuPublishAsLive?: (asset: Asset) => void
}

export function AssetList({ assets, loading, visibleCols, onSelect, selectedId, checkedIds, onCheck, onCheckAll, allChecked, someChecked, onMenuRename, onMenuDelete, onMenuDownload, onMenuPublish, onMenuPublishAsLive }: AssetListProps) {
  const visibleDefs = ALL_COLUMNS.filter((c) => visibleCols.has(c.key))

  return (
    <div className="overflow-hidden rounded-xl border border-white/10">
      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-max border-collapse text-sm mam-table">
          <thead>
            <tr className="border-b border-white/10 bg-white/3">
              {onCheck && (
                <th className="w-10 px-4 py-3 text-left">
                  <div
                    role="checkbox"
                    aria-checked={allChecked ? true : someChecked ? 'mixed' : false}
                    tabIndex={0}
                    onClick={onCheckAll}
                    onKeyDown={(e) => e.key === ' ' && onCheckAll?.()}
                    className={`flex h-5 w-5 cursor-pointer items-center justify-center rounded border-2 transition-colors ${
                      allChecked
                        ? 'border-blue-500 bg-blue-500'
                        : someChecked
                          ? 'border-blue-500/60 bg-blue-500/20'
                          : 'border-white/30 hover:border-white/60'
                    }`}
                  >
                    {allChecked && <Check size={12} className="text-white" />}
                    {someChecked && !allChecked && <div className="h-0.5 w-2.5 bg-blue-500" />}
                  </div>
                </th>
              )}
              {visibleDefs.map((col) => (
                <th
                  key={col.key}
                  className="whitespace-nowrap px-4 py-3 text-left text-sm font-semibold uppercase tracking-widest text-white/40"
                >
                  {col.label}
                </th>
              ))}
              <th className="w-10 px-2 py-3" />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 15 }).map((_, i) => (
                <SkeletonRow key={i} colCount={visibleDefs.length + (onCheck ? 1 : 0)} />
              ))
            ) : assets.length === 0 ? (
              <tr>
                <td colSpan={visibleDefs.length + (onCheck ? 1 : 0) + 1} className="py-24 text-center">
                  <div className="flex flex-col items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-white/10 bg-white/5">
                      <FolderOpen size={22} className="text-white/30" />
                    </div>
                    <p className="text-sm text-white/40">No assets found</p>
                  </div>
                </td>
              </tr>
            ) : (
              assets.map((asset) => (
                <AssetRow
                  key={asset.aid}
                  asset={asset}
                  visibleDefs={visibleDefs}
                  isSelected={asset.aid === selectedId}
                  isChecked={checkedIds?.has(asset.aid) ?? false}
                  showCheckbox={!!onCheck}
                  onSelect={onSelect}
                  onCheck={onCheck}
                  onMenuRename={onMenuRename}
                  onMenuDelete={onMenuDelete}
                  onMenuDownload={onMenuDownload}
                  onMenuPublish={onMenuPublish}
                  onMenuPublishAsLive={onMenuPublishAsLive}
                />
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
