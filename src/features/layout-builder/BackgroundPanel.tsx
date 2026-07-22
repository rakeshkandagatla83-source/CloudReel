import { useState, useEffect, useMemo } from 'react'
import { X, ImageOff, Search } from 'lucide-react'
import { cn } from '../../lib/utils'
import { http } from '../../lib/http'
import { apiConfig } from '../../lib/apiConfig'
import { getStorage } from '../../lib/storage'
import { GFX_ASSETS_API, getBgBase, getStudioCid } from '../../lib/studioConfig'
import type { Background } from '../../types/layoutBuilder'

interface BgLibraryAsset {
  name: string
  type: 'image' | 'video'
  previewUrl: string
  assetUrl: string
}

interface BackgroundPanelProps {
  bg: Background
  isBg: boolean
  onUpdate: (patch: Partial<Background>) => void
  onToggleIsBg: (v: boolean) => void
  onClose: () => void
}

export function BackgroundPanel({ bg, isBg, onUpdate, onToggleIsBg, onClose }: BackgroundPanelProps) {
  const [libraryAssets, setLibraryAssets] = useState<BgLibraryAsset[]>([])
  const [isLoadingAssets, setIsLoadingAssets] = useState(false)
  const [brokenAssetIndices, setBrokenAssetIndices] = useState<Set<number>>(new Set())
  const [assetSearchQuery, setAssetSearchQuery] = useState('')

  const sortedAssets = useMemo(() => {
    const query = assetSearchQuery.trim().toLowerCase()
    const filtered = query
      ? libraryAssets.filter((a) => a.name.toLowerCase().includes(query))
      : libraryAssets
    return [...filtered].sort((a, b) => {
      if (a.name === bg.bgAssetName) return -1
      if (b.name === bg.bgAssetName) return 1
      return 0
    })
  }, [libraryAssets, bg.bgAssetName, assetSearchQuery])

  useEffect(() => {
    let cancelled = false
    setIsLoadingAssets(true)

    const cid = getStudioCid() ?? ''
    const token = getStorage<string>('pcr_token') ?? ''

    async function loadAssets() {
      try {
        const payload = new URLSearchParams({ cid, status: 'A', pgno: '0', pgsize: '0', category: 'S' })
        const json = await http.post<{ assets?: Array<{ name: string; type: string; mode: string; previewurl: string; s3path?: string }> }>(
          apiConfig.scalaApiBase,
          GFX_ASSETS_API,
          payload.toString(),
          { headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'x-auth-token': token, 'x-channel-id': cid } },
        )
        if (cancelled) return
        const fallbackBase = getBgBase()
        const assets = (json.assets ?? [])
          .filter(a => a.mode === '')
          .map(a => ({
            name: a.name,
            type: a.type as 'image' | 'video',
            previewUrl: a.previewurl || a.s3path || '',
            assetUrl: a.s3path || `${fallbackBase}${a.name}`,
          }))
        setLibraryAssets(assets)
      } catch {
        // non-critical - grid stays empty
      } finally {
        if (!cancelled) setIsLoadingAssets(false)
      }
    }

    void loadAssets()
    return () => { cancelled = true }
  }, [])

  function handleAssetClick(asset: BgLibraryAsset) {
    const isAlreadySelected = bg.bgAssetName === asset.name
    if (isAlreadySelected) {
      onUpdate({ bgAssetName: '', imageUrl: '' })
    } else {
      onUpdate({ bgAssetName: asset.name, imageUrl: asset.previewUrl })
    }
  }

  return (
    <div id="lb-bg-panel" className="w-72 shrink-0 bg-secondary-bg border-l border-white/8 flex flex-col overflow-hidden">
      {/* Header */}
      <div id="lb-bg-panel-header" className="flex items-center justify-between px-4 py-3 border-b border-white/8 shrink-0 bg-primary-bg">
        <span className="text-sm font-bold text-white/70 uppercase tracking-wider">
          Background
        </span>
        <button
          id="lb-bg-panel-btn-close"
          type="button"
          onClick={onClose}
          className="flex h-8 w-8 items-center justify-center text-white/40 hover:text-white/80 transition-colors cursor-pointer rounded-md hover:bg-white/8"
        >
          <X size={15} />
        </button>
      </div>

      {/* Static controls — no scroll */}
      <div id="lb-bg-panel-static" className="shrink-0 px-4 pt-4 pb-3 flex flex-col gap-3.5">

        {/* BG Required toggle */}
        <div id="lb-bg-panel-required-row" className="flex items-center justify-between">
          <span className="text-sm font-medium text-white/70">Background Required</span>
          <button
            id="lb-bg-panel-btn-toggle-isbg"
            type="button"
            role="switch"
            aria-checked={isBg}
            onClick={() => onToggleIsBg(!isBg)}
            className={cn(
              'relative w-10 h-5.5 rounded-full transition-colors cursor-pointer shrink-0',
              isBg ? 'bg-amber-500' : 'bg-white/20',
            )}
          >
            <span
              className={cn(
                'absolute top-0.5 w-4.5 h-4.5 rounded-full bg-white transition-all duration-200 shadow-sm',
                isBg ? 'left-4.5' : 'left-0.5',
              )}
            />
          </button>
        </div>

        {/* Image Fit — shown only when BG on and asset selected */}
        {isBg && bg.bgAssetName && (
          <div id="lb-bg-panel-fit-row" className="flex items-center justify-between gap-2">
            <label id="lb-bg-panel-fit-label" className="text-sm font-medium text-white/65 shrink-0">Image Fit</label>
            <select
              id="lb-bg-panel-fit-select"
              value={bg.imageFit}
              onChange={(e) => onUpdate({ imageFit: e.target.value as Background['imageFit'] })}
              className="flex-1 min-w-0 h-10 px-3 rounded-lg bg-white/5 border border-white/12 text-white text-base outline-none focus:border-white/30 cursor-pointer"
            >
              <option value="cover" className="bg-secondary-bg">Cover</option>
              <option value="contain" className="bg-secondary-bg">Contain</option>
              <option value="fill" className="bg-secondary-bg">Fill</option>
              <option value="none" className="bg-secondary-bg">None</option>
            </select>
          </div>
        )}

        {/* BG Color */}
        <div id="lb-bg-panel-color-section" className="flex items-center justify-between gap-2">
          <label id="lb-bg-panel-color-label" className="text-sm font-medium text-white/65 shrink-0">Canvas Color</label>
          <div id="lb-bg-panel-color-row" className="flex flex-1 min-w-0 gap-2 items-center">
            <input
              id="lb-bg-panel-color-picker"
              type="color"
              value={bg.color}
              onChange={(e) => onUpdate({ color: e.target.value })}
              className="w-10 h-10 rounded-lg border border-white/12 cursor-pointer bg-transparent p-0.5 shrink-0"
            />
            <input
              id="lb-bg-panel-color-hex"
              type="text"
              value={bg.color}
              onChange={(e) => {
                if (/^#[0-9a-fA-F]{0,6}$/.test(e.target.value)) onUpdate({ color: e.target.value })
              }}
              className="flex-1 min-w-0 h-10 px-3 rounded-lg bg-white/5 border border-white/12 text-white text-base outline-none focus:border-white/30 font-mono"
            />
          </div>
        </div>

        {/* Asset library header */}
        {isBg && (
          <div id="lb-bg-panel-library-header" className="flex flex-col gap-2 border-t border-white/8 pt-3">
            <div id="lb-bg-panel-library-header-row" className="flex items-center justify-between">
              <p className="text-sm font-bold text-white/60 uppercase tracking-widest">
                Library
                {libraryAssets.length > 0 && (
                  <span className="ml-1.5 text-white/35 normal-case tracking-normal font-normal">({libraryAssets.length})</span>
                )}
              </p>
              {bg.bgAssetName && (
                <button
                  id="lb-bg-panel-btn-clear-asset"
                  type="button"
                  onClick={() => onUpdate({ bgAssetName: '', imageUrl: '' })}
                  className="text-sm text-white/50 hover:text-white/80 transition-colors cursor-pointer"
                >
                  Clear
                </button>
              )}
            </div>
            <div id="lb-bg-panel-search-row" className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/35 pointer-events-none" />
              <input
                id="lb-bg-panel-search-input"
                type="text"
                value={assetSearchQuery}
                onChange={(e) => setAssetSearchQuery(e.target.value)}
                placeholder="Search assets…"
                className="w-full h-10 pl-9 pr-8 rounded-lg bg-white/5 border border-white/12 text-white text-base outline-none focus:border-white/30 placeholder:text-white/35"
              />
              {assetSearchQuery && (
                <button
                  id="lb-bg-panel-search-clear"
                  type="button"
                  onClick={() => setAssetSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors cursor-pointer"
                >
                  <X size={13} />
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Scrollable asset grid — only when BG Required is on */}
      {isBg && (
        <div id="lb-bg-panel-library-scroll" className="flex-1 overflow-y-auto px-4 pb-4 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:bg-white/10 [&::-webkit-scrollbar-thumb]:rounded will-change-scroll">
          {isLoadingAssets ? (
            <div id="lb-bg-panel-library-loading" className="flex items-center justify-center gap-2 h-24 rounded-lg border border-white/6 bg-white/1">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/15 border-t-white/60" />
              <span className="text-sm text-white/50">Loading…</span>
            </div>
          ) : libraryAssets.length === 0 ? (
            <div id="lb-bg-panel-library-empty" className="flex flex-col items-center justify-center gap-2 h-24 rounded-lg border border-white/6 bg-white/1">
              <ImageOff size={18} className="text-white/25" />
              <span className="text-sm text-white/45">No assets available</span>
            </div>
          ) : sortedAssets.length === 0 ? (
            <div id="lb-bg-panel-library-no-results" className="flex flex-col items-center justify-center gap-1.5 h-20 rounded-lg border border-white/6 bg-white/1">
              <span className="text-sm text-white/45">No results for "{assetSearchQuery}"</span>
            </div>
          ) : (
            <div id="lb-bg-panel-library-grid" className="grid grid-cols-2 gap-2">
              {sortedAssets.map((asset, assetIndex) => {
                const isSelected = bg.bgAssetName === asset.name
                return (
                  <button
                    key={`${asset.name}-${assetIndex}`}
                    id={`lb-bg-panel-asset-${assetIndex}`}
                    type="button"
                    title={asset.name}
                    onClick={() => handleAssetClick(asset)}
                    className={cn(
                      'group relative flex flex-col items-center gap-1.5 p-1.5 rounded-lg border transition-colors duration-150 cursor-pointer',
                      isSelected
                        ? 'border-blue-500/50 bg-blue-500/8 ring-1 ring-blue-500/25'
                        : 'border-white/8 bg-white/2 hover:bg-white/6 hover:border-white/18',
                    )}
                  >
                    {asset.type === 'video' ? (
                      <div id={`lb-bg-panel-asset-thumb-${assetIndex}`} className="relative w-full aspect-video rounded overflow-hidden bg-black/40">
                        <video
                          src={asset.previewUrl}
                          className="w-full h-full object-cover"
                          muted
                          playsInline
                          preload="none"
                        />
                        <span className="absolute bottom-1 right-1 text-xs font-bold bg-black/60 text-white/80 px-1 rounded leading-tight">
                          VID
                        </span>
                      </div>
                    ) : brokenAssetIndices.has(assetIndex) ? (
                      <div
                        id={`lb-bg-panel-asset-broken-${assetIndex}`}
                        className="w-full aspect-video rounded bg-white/4 border border-white/8 flex items-center justify-center"
                      >
                        <ImageOff size={14} className="text-white/25" />
                      </div>
                    ) : (
                      <img
                        src={asset.previewUrl}
                        alt={asset.name}
                        loading="lazy"
                        decoding="async"
                        className="w-full aspect-video object-cover rounded"
                        onError={() => setBrokenAssetIndices(prev => new Set(prev).add(assetIndex))}
                      />
                    )}
                    <span className="text-xs text-white/55 group-hover:text-white/75 truncate w-full text-center leading-tight transition-colors">
                      {asset.name}
                    </span>
                  </button>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
