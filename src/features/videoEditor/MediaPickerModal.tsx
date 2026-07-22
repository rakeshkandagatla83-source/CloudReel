import { useState, useCallback, useEffect } from 'react'
import { X, Search, ChevronLeft, ChevronRight, Film, Image as ImageIcon, Check } from 'lucide-react'
import { useAssets } from '../assets/useAssets'
import type { Asset } from '../../types/asset'
import { CATEGORY_MAP, formatDuration } from '../assets/assetUtils'

export type PickerMode = 'video' | 'image'

interface Props {
  mode: PickerMode
  onAsset: (url: string, name: string) => void
  onClose: () => void
}

function AssetThumb({ asset }: { asset: Asset }) {
  const [err, setErr] = useState(false)
  const src = asset.misc?.posterPath
  if (!src || err) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-white/5">
        {asset.misc?.category === 'S'
          ? <ImageIcon size={22} className="text-white/20" />
          : <Film size={22} className="text-white/20" />}
      </div>
    )
  }
  return <img src={src} alt={asset.displayname} className="absolute inset-0 h-full w-full object-cover" onError={() => setErr(true)} />
}

function resolveAssetUrl(asset: Asset, mode: PickerMode): string {
  if (mode === 'video') {
    return asset.misc?.playbackurl || asset.previewurl || ''
  }
  return asset.misc?.posterPath || asset.previewurl || ''
}

export function MediaPickerModal({ mode, onAsset, onClose }: Props) {
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Asset | null>(null)
  const [assetUrlError, setAssetUrlError] = useState<string | null>(null)

  const category = mode === 'video' ? 'P' : 'S'
  const { assets, loading, filters, applyFilters, goToPage, totalPages } = useAssets()

  useEffect(() => {
    applyFilters({ category, name: '' })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSearch = useCallback((val: string) => {
    setSearch(val)
    applyFilters({ name: val, category })
  }, [applyFilters, category])

  const handleConfirm = useCallback(() => {
    if (!selected) return
    const url = resolveAssetUrl(selected, mode)
    if (!url) {
      setAssetUrlError('No playback URL is available for this asset. Contact your MAM administrator.')
      return
    }
    setAssetUrlError(null)
    onAsset(url, selected.displayname || selected.name)
  }, [selected, mode, onAsset])

  const title = mode === 'video' ? 'Import Video' : 'Add Logo'

  return (
    <div id="ve-picker-backdrop" className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs">
      <div id="ve-picker-modal" className="flex h-[80vh] w-[860px] flex-col overflow-hidden rounded-xl border border-[#1e2d40] bg-[#0d1625] shadow-2xl">

        {/* Header */}
        <div id="ve-picker-header" className="flex shrink-0 items-center justify-between border-b border-[#1e2d40] px-5 py-3.5">
          <div className="flex items-center gap-2">
            <span id="ve-picker-title" className="text-sm font-semibold text-white">{title}</span>
            <span className="rounded bg-[#1e2d40] px-1.5 py-0.5 text-[10px] font-semibold text-slate-400">
              {mode === 'video' ? 'Videos' : 'Graphics'}
            </span>
          </div>
          <button
            id="ve-btn-picker-close"
            className="flex h-6 w-6 cursor-pointer items-center justify-center rounded text-slate-500 hover:bg-[#1e2d40] hover:text-white"
            onClick={onClose}
          >
            <X size={15} />
          </button>
        </div>

        {/* Search bar */}
        <div id="ve-picker-search-wrap" className="shrink-0 border-b border-[#1e2d40] px-4 py-3">
          <div className="flex items-center gap-2 rounded-lg border border-[#1e2d40] bg-primary-bg px-3 py-2 focus-within:border-blue-500/60">
            <Search size={14} className="shrink-0 text-slate-500" />
            <input
              id="ve-picker-search"
              type="text"
              placeholder={`Search ${mode === 'video' ? 'videos' : 'graphics'}…`}
              value={search}
              className="flex-1 bg-transparent text-sm text-white outline-hidden placeholder:text-slate-600"
              onChange={e => handleSearch(e.target.value)}
            />
          </div>
        </div>

        {/* Grid */}
        <div id="ve-picker-grid" className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="animate-pulse overflow-hidden rounded-lg border border-white/8 bg-[#111c2d]">
                  <div className="w-full bg-white/5" style={{ paddingBottom: '56.25%' }} />
                  <div className="p-2">
                    <div className="h-3 w-3/4 rounded bg-white/8" />
                  </div>
                </div>
              ))}
            </div>
          ) : assets.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-xl border border-white/10 bg-white/5">
                {mode === 'video' ? <Film size={24} className="text-white/25" /> : <ImageIcon size={24} className="text-white/25" />}
              </div>
              <p className="text-sm text-slate-500">No {mode === 'video' ? 'videos' : 'graphics'} found</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
              {assets.map(asset => {
                const isSelected = selected?.aid === asset.aid
                const cat = CATEGORY_MAP[asset.misc?.category ?? '']
                const dur = asset.asset_duration > 0
                  ? formatDuration(asset.fps > 0 ? asset.asset_duration / asset.fps : asset.asset_duration)
                  : null

                return (
                  <div
                    key={asset.aid}
                    id={`ve-picker-asset-${asset.aid}`}
                    onClick={() => setSelected(isSelected ? null : asset)}
                    className={`group relative cursor-pointer overflow-hidden rounded-lg border transition-all ${
                      isSelected
                        ? 'border-blue-500 ring-1 ring-blue-500/40'
                        : 'border-[#1e2d40] hover:border-slate-500'
                    }`}
                  >
                    <div className="relative w-full bg-black/40" style={{ paddingBottom: '56.25%' }}>
                      <AssetThumb asset={asset} />
                      {cat && (
                        <span className={`absolute left-1.5 top-1.5 rounded border px-1 py-px text-[9px] font-semibold uppercase tracking-wide shadow shadow-black/60 ${cat.color}`}>
                          {cat.label}
                        </span>
                      )}
                      {dur && (
                        <span className="absolute bottom-1.5 right-1.5 rounded bg-black/70 px-1 py-px text-[9px] text-white/80">
                          {dur}
                        </span>
                      )}
                      {isSelected && (
                        <div className="absolute inset-0 flex items-center justify-center bg-blue-500/20">
                          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-500">
                            <Check size={14} className="text-white" />
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="px-2 py-1.5">
                      <p className="truncate text-[11px] text-slate-300" title={asset.displayname || asset.name}>
                        {asset.displayname || asset.name}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Asset URL error */}
        {assetUrlError && (
          <div id="ve-picker-asset-url-error" className="shrink-0 border-t border-red-900/40 bg-red-950/40 px-4 py-2 text-xs text-red-400">
            {assetUrlError}
          </div>
        )}

        {/* Footer - pagination + confirm */}
        <div id="ve-picker-footer" className="flex shrink-0 items-center justify-between border-t border-[#1e2d40] px-4 py-3">
          <div id="ve-picker-pagination" className="flex items-center gap-1.5">
            <button
              id="ve-btn-picker-prev"
              disabled={filters.pgno <= 1}
              onClick={() => goToPage(filters.pgno - 1)}
              className="flex h-7 w-7 cursor-pointer items-center justify-center rounded border border-[#1e2d40] text-slate-400 hover:bg-[#1e2d40] hover:text-white disabled:cursor-default disabled:opacity-35"
            >
              <ChevronLeft size={14} />
            </button>
            <span id="ve-picker-page" className="text-xs text-slate-500">
              Page {filters.pgno}{totalPages ? ` of ${totalPages}` : ''}
            </span>
            <button
              id="ve-btn-picker-next"
              disabled={totalPages != null && filters.pgno >= totalPages}
              onClick={() => goToPage(filters.pgno + 1)}
              className="flex h-7 w-7 cursor-pointer items-center justify-center rounded border border-[#1e2d40] text-slate-400 hover:bg-[#1e2d40] hover:text-white disabled:cursor-default disabled:opacity-35"
            >
              <ChevronRight size={14} />
            </button>
          </div>

          <div className="flex items-center gap-2">
            {selected && (
              <span className="max-w-40 truncate text-xs text-slate-400">
                {selected.displayname || selected.name}
              </span>
            )}
            <button
              id="ve-btn-picker-cancel"
              onClick={onClose}
              className="cursor-pointer rounded-lg border border-[#1e2d40] px-4 py-1.5 text-xs text-slate-400 hover:bg-[#1e2d40] hover:text-white"
            >
              Cancel
            </button>
            <button
              id="ve-btn-picker-select"
              disabled={!selected}
              onClick={handleConfirm}
              className="cursor-pointer rounded-lg bg-[#3031cb] px-4 py-1.5 text-xs font-semibold text-white hover:bg-[#2626a8] disabled:cursor-default disabled:opacity-40"
            >
              Select
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
