import { FolderOpen } from 'lucide-react'
import type { Asset } from '../../types/asset'
import { AssetCard } from './AssetCard'

export type GridSize = 'sm' | 'md' | 'lg'

const GRID_COLS: Record<GridSize, string> = {
  sm: 'grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8',
  md: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5',
  lg: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
}

interface AssetGridProps {
  assets: Asset[]
  loading: boolean
  gridSize?: GridSize
  onSelect?: (asset: Asset) => void
  selectedId?: number
  checkedIds?: Set<number>
  onCheck?: (asset: Asset) => void
  onMenuRename?: (asset: Asset) => void
  onMenuDelete?: (asset: Asset) => void
  onMenuDownload?: (asset: Asset) => void
  onMenuPublish?: (asset: Asset) => void
  onMenuPublishAsLive?: (asset: Asset) => void
}

function SkeletonCard() {
  return (
    <div className="animate-pulse rounded-xl border border-white/8 bg-secondary-bg">
      <div className="w-full rounded-t-xl bg-white/5" style={{ paddingBottom: '56.25%' }} />
      <div className="flex flex-col gap-2 p-3">
        <div className="h-3 w-3/4 rounded bg-white/8" />
        <div className="h-3 w-1/2 rounded bg-white/5" />
        <div className="mt-2 flex justify-between">
          <div className="h-2.5 w-1/4 rounded bg-white/5" />
          <div className="h-2.5 w-1/4 rounded bg-white/5" />
        </div>
      </div>
    </div>
  )
}

export function AssetGrid({ assets, loading, gridSize = 'md', onSelect, selectedId, checkedIds, onCheck, onMenuRename, onMenuDelete, onMenuDownload, onMenuPublish, onMenuPublishAsLive }: AssetGridProps) {
  const cols = GRID_COLS[gridSize]

  if (loading) {
    return (
      <div className={`grid gap-4 ${cols}`}>
        {Array.from({ length: 20 }).map((_, i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    )
  }

  if (assets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-white/10 bg-white/5">
          <FolderOpen size={28} className="text-white/30" />
        </div>
        <div>
          <p className="text-sm font-medium text-white/60">No assets found</p>
          <p className="mt-1 text-xs text-white/30">Try adjusting your filters or search terms</p>
        </div>
      </div>
    )
  }

  return (
    <div className={`grid gap-4 ${cols}`}>
      {assets.map((asset) => (
        <AssetCard
          key={asset.aid}
          asset={asset}
          onSelect={onSelect}
          selected={asset.aid === selectedId}
          checked={checkedIds?.has(asset.aid)}
          onCheck={onCheck}
          onMenuRename={onMenuRename}
          onMenuDelete={onMenuDelete}
          onMenuDownload={onMenuDownload}
          onMenuPublish={onMenuPublish}
          onMenuPublishAsLive={onMenuPublishAsLive}
        />
      ))}
    </div>
  )
}
