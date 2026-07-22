import { useState, useCallback } from 'react'
import { RefreshCw, Loader2, Pencil, Palette, MoveUpRight, Image } from 'lucide-react'
import { cn } from '../../lib/utils'
import { useStudioCtx } from './StudioContext'
import { bandLabel, TEXT_BANDS, ASSET_BANDS, LAYOUT_BANDS, BAND_TEXT_MAX_LENGTH, GFX_BAND_DISPLAY_ORDER } from '../../lib/studioConfig'
import { GfxBandEditDialog } from './GfxBandEditDialog'
import { GfxAssetDialog } from './GfxAssetDialog'
import { GfxLayoutDialog } from './GfxLayoutDialog'
import { GfxAlignmentDialog } from './GfxAlignmentDialog'
import { GfxLocationDialog } from './GfxLocationDialog'
import type { GfxNewsItem, GfxAssetItem, GfxBandLayout, GfxBandAlignment, BgAssetItem } from '../../types/studio'

type DialogType = 'content' | 'layout' | 'alignment'

interface ActiveDialog {
  bandKey: string
  type: DialogType
}

export function GfxPanel() {
  const {
    gfxData, gfxTemplateName, gfxBusy, fetchGraphics, toggleGfxBand, gfxStatus,
    fetchGfxBandContent, updateGfxBandContent, updateGfxBandLayout, updateGfxBandAlignment,
    previewGfxBandLayout, previewGfxBandAlignment,
    fetchGfxBandLocation, updateGfxBandLocation,
    fetchGfxBandAsset, fetchGfxAssets, fetchGfxBgAssets, updateGfxBandAsset,
    getGfxBandLayout, getGfxBandPosition, gfxAlignmentCache, gfxBandContent,
  } = useStudioCtx()

  function getContentWarning(key: string): string | null {
    if (key === 'location_band') return null
    const cached = gfxBandContent[key]
    if (cached === undefined) return null
    if (cached.length === 0) return 'No content items — band will show empty'
    return null
  }

  function getLayoutWarning(key: string): string | null {
    const raw = gfxAlignmentCache.layout[key]
    if (raw === undefined) return null
    if (raw !== null && typeof raw === 'object' && Object.keys(raw as object).length === 0) return 'No layout configured for this band'
    const layout = getGfxBandLayout(key)
    if (layout === null) return 'Layout data is corrupted — open to recover'
    return null
  }

  function getPositionWarning(key: string): string | null {
    const raw = gfxAlignmentCache.alignment[key]
    if (raw === undefined) return null
    if (raw !== null && typeof raw === 'object' && Object.keys(raw as object).length === 0) return 'No position configured for this band'
    const pos = getGfxBandPosition(key)
    if (pos === 'corrupted') return 'Position data is corrupted — open to reset'
    if (pos === null) return 'Position data is missing'
    return null
  }
  const bands = gfxTemplateName ? (gfxData[gfxTemplateName] ?? {}) : {}
  const bandKeys = Object.keys(bands)
    .filter(key => {
      const raw = gfxAlignmentCache.alignment[key]
      return !(raw !== null && raw !== undefined && typeof raw === 'object' && Object.keys(raw as object).length === 0)
    })
    .sort((keyA, keyB) => {
      const indexA = GFX_BAND_DISPLAY_ORDER.indexOf(keyA)
      const indexB = GFX_BAND_DISPLAY_ORDER.indexOf(keyB)
      const orderA = indexA === -1 ? GFX_BAND_DISPLAY_ORDER.length : indexA
      const orderB = indexB === -1 ? GFX_BAND_DISPLAY_ORDER.length : indexB
      return orderA - orderB
    })
  const [activeDialog, setActiveDialog] = useState<ActiveDialog | null>(null)

  const openDialog = useCallback((bandKey: string, type: DialogType) => {
    setActiveDialog({ bandKey, type })
  }, [])
  const closeDialog = useCallback(() => setActiveDialog(null), [])

  // Location band callbacks
  const loadLocation = useCallback((): Promise<string> => fetchGfxBandLocation(), [fetchGfxBandLocation])
  const saveLocation = useCallback((text: string): Promise<boolean> => updateGfxBandLocation(text), [updateGfxBandLocation])

  // Text band callbacks
  const loadContent = useCallback((): Promise<GfxNewsItem[]> => {
    if (!activeDialog) return Promise.resolve([])
    return fetchGfxBandContent(activeDialog.bandKey)
  }, [activeDialog, fetchGfxBandContent])

  const saveContent = useCallback((items: GfxNewsItem[]) => {
    if (!activeDialog) return Promise.resolve(false)
    return updateGfxBandContent(activeDialog.bandKey, items)
  }, [activeDialog, updateGfxBandContent])

  // Asset band callbacks
  const loadAssetSelection = useCallback((): Promise<GfxAssetItem[]> => {
    if (!activeDialog) return Promise.resolve([])
    return fetchGfxBandAsset(activeDialog.bandKey)
  }, [activeDialog, fetchGfxBandAsset])

  const loadAssetLibrary = useCallback((): Promise<GfxAssetItem[]> => {
    if (!activeDialog) return Promise.resolve([])
    return fetchGfxAssets(activeDialog.bandKey)
  }, [activeDialog, fetchGfxAssets])

  const saveAsset = useCallback((items: GfxAssetItem[]) => {
    if (!activeDialog) return Promise.resolve(false)
    return updateGfxBandAsset(activeDialog.bandKey, items)
  }, [activeDialog, updateGfxBandAsset])

  const loadLayout = useCallback((): Promise<GfxBandLayout | null> => {
    if (!activeDialog) return Promise.resolve(null)
    return Promise.resolve(getGfxBandLayout(activeDialog.bandKey))
  }, [activeDialog, getGfxBandLayout])

  const saveLayout = useCallback((layout: GfxBandLayout) => {
    if (!activeDialog) return Promise.resolve(false)
    return updateGfxBandLayout(activeDialog.bandKey, layout)
  }, [activeDialog, updateGfxBandLayout])

  const previewLayout = useCallback((layout: GfxBandLayout) => {
    if (!activeDialog) return
    previewGfxBandLayout(activeDialog.bandKey, layout)
  }, [activeDialog, previewGfxBandLayout])

  const loadAlignment = useCallback((): Promise<GfxBandAlignment | null | 'corrupted'> => {
    if (!activeDialog) return Promise.resolve(null)
    return Promise.resolve(getGfxBandPosition(activeDialog.bandKey))
  }, [activeDialog, getGfxBandPosition])

  const previewAlignment = useCallback((alignment: GfxBandAlignment) => {
    if (!activeDialog) return
    previewGfxBandAlignment(activeDialog.bandKey, alignment)
  }, [activeDialog, previewGfxBandAlignment])

  const loadBgAssets = useCallback((): Promise<BgAssetItem[]> => {
    if (!activeDialog) return Promise.resolve([])
    return fetchGfxBgAssets(activeDialog.bandKey)
  }, [activeDialog, fetchGfxBgAssets])

  const saveAlignment = useCallback((alignment: GfxBandAlignment) => {
    if (!activeDialog) return Promise.resolve(false)
    return updateGfxBandAlignment(activeDialog.bandKey, alignment)
  }, [activeDialog, updateGfxBandAlignment])

  const activeBandLabel = activeDialog ? bandLabel(activeDialog.bandKey) : ''
  const hasContent = (key: string) => TEXT_BANDS.has(key) || ASSET_BANDS.has(key)

  return (
    <>
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="shrink-0 flex items-center justify-between px-2 py-1.5 border-b border-primary-border">
          <span className="text-[10px] text-secondary-text font-semibold uppercase tracking-wider">Graphics Bands</span>
          <div className="flex items-center gap-1.5">
            {bandKeys.length > 0 && (
              <span className="px-1.5 py-0.5 rounded text-[9px] font-medium text-[#24dd6e] bg-[#24dd6e]/10 border border-[#24dd6e]/30 tabular-nums">{bandKeys.length}</span>
            )}
            {gfxStatus.type === 'err' && gfxStatus.text && (
              <span className="text-[9px] text-red-700">{gfxStatus.text}</span>
            )}
            <button
              id="gfx-btn-refresh"
              type="button"
              onClick={fetchGraphics}
              disabled={gfxStatus.type === 'loading'}
              className="flex items-center gap-1 px-2 py-0.5 text-[10px] rounded-lg border border-primary-border bg-surface text-secondary-text hover:text-primary-text hover:bg-surface-2 cursor-pointer transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <RefreshCw size={9} className={gfxStatus.type === 'loading' ? 'animate-spin' : ''} /> Refresh
            </button>
          </div>
        </div>

        {/* Bands list */}
        <div className="flex-1 overflow-y-auto p-2 flex flex-col gap-1.5">
          {bandKeys.length === 0 ? (
            <div className="text-center text-[11px] text-secondary-text pt-8">Click ⟳ Refresh to load graphics</div>
          ) : (
            <>
              {gfxTemplateName && (
                <div className="text-[9px] text-secondary-text uppercase tracking-wider font-semibold mb-0.5 px-0.5">{gfxTemplateName}</div>
              )}
              {bandKeys.map(key => {
                const isOn = bands[key]
                const isBusy = gfxBusy.has(key)
                const rawAlignmentForBand = gfxAlignmentCache.alignment[key]
                const isBandCorrupted = typeof rawAlignmentForBand === 'number' || typeof rawAlignmentForBand === 'string'
                const toggleDisabled = isBusy || (isBandCorrupted && !isOn)
                return (
                  <div
                    key={key}
                    className={cn(
                      'flex flex-col gap-1.5 px-2.5 py-2 rounded-lg border transition-all',
                      isBandCorrupted ? 'bg-amber-50 border-amber-200' :
                      isOn ? 'bg-[#24dd6e]/5 border-[#24dd6e]/30' : 'bg-surface border-primary-border hover:bg-surface-2',
                      isBusy && 'opacity-40 pointer-events-none',
                    )}
                  >
                    {/* Band name + toggle */}
                    <div className="flex items-center justify-between">
                      <div>
                        <p className={cn('text-[11px] font-semibold', isBandCorrupted ? 'text-amber-700' : isOn ? 'text-[#24dd6e]' : 'text-primary-text')}>{bandLabel(key)}</p>
                      </div>
                      <label className={cn('relative w-9 h-5 shrink-0', toggleDisabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer')}>
                        <input
                          type="checkbox"
                          className="sr-only"
                          checked={isOn}
                          disabled={toggleDisabled}
                          onChange={e => toggleGfxBand(key, e.target.checked)}
                        />
                        <span className={cn('absolute inset-0 rounded-full transition-colors border', isOn ? 'bg-[#24dd6e]/20 border-[#24dd6e]/40' : 'bg-surface-2 border-primary-border')} />
                        <span className={cn('absolute top-0.5 left-0.5 w-4 h-4 rounded-full transition-all', isOn ? 'translate-x-4 bg-[#24dd6e] shadow-sm' : 'bg-secondary-text/50')} />
                        {isBusy && <Loader2 size={10} className="absolute inset-0 m-auto animate-spin text-secondary-text" />}
                      </label>
                    </div>

                    {/* Action buttons */}
                    {(() => {
                      const contentWarning  = hasContent(key) ? getContentWarning(key) : null
                      const layoutWarning   = LAYOUT_BANDS.has(key) ? getLayoutWarning(key) : null
                      const positionWarning = getPositionWarning(key)
                      const rawAlignment = gfxAlignmentCache.alignment[key]
                      const hasPosition = typeof rawAlignment === 'number'
                        || typeof rawAlignment === 'string'
                        || (rawAlignment !== null && rawAlignment !== undefined && typeof rawAlignment === 'object' && Object.keys(rawAlignment as object).length > 0)
                      const warnCls = 'border-amber-200 bg-amber-50 text-amber-700 hover:text-amber-800 hover:bg-amber-100 hover:border-amber-300'
                      const normCls = 'border-primary-border bg-surface text-secondary-text hover:text-primary-text hover:bg-surface-2'
                      return (
                        <div className="flex items-center gap-1">
                          {hasContent(key) && (
                            <button
                              id={`gfx-btn-content-${key}`}
                              type="button"
                              onClick={() => openDialog(key, 'content')}
                              title={contentWarning ?? 'Edit content'}
                              className={cn('flex items-center gap-1 px-1.5 py-0.5 rounded border text-[9px] cursor-pointer transition-colors', contentWarning ? warnCls : normCls)}
                            >
                              {ASSET_BANDS.has(key) ? <Image size={8} /> : <Pencil size={8} />}
                              Content
                              {contentWarning && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />}
                            </button>
                          )}
                          {LAYOUT_BANDS.has(key) && (
                            <button
                              id={`gfx-btn-layout-${key}`}
                              type="button"
                              onClick={() => openDialog(key, 'layout')}
                              title={layoutWarning ?? 'Edit layout'}
                              className={cn('flex items-center gap-1 px-1.5 py-0.5 rounded border text-[9px] cursor-pointer transition-colors', layoutWarning ? warnCls : normCls)}
                            >
                              <Palette size={8} />
                              Layout
                              {layoutWarning && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />}
                            </button>
                          )}
                          {hasPosition && (
                            <button
                              id={`gfx-btn-position-${key}`}
                              type="button"
                              onClick={() => openDialog(key, 'alignment')}
                              title={positionWarning ?? 'Edit position'}
                              className={cn('flex items-center gap-1 px-1.5 py-0.5 rounded border text-[9px] cursor-pointer transition-colors', positionWarning ? warnCls : normCls)}
                            >
                              <MoveUpRight size={8} />
                              Position
                              {positionWarning && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />}
                            </button>
                          )}
                        </div>
                      )
                    })()}
                  </div>
                )
              })}
            </>
          )}
        </div>
      </div>

      {activeDialog?.type === 'content' && TEXT_BANDS.has(activeDialog.bandKey) && activeDialog.bandKey !== 'location_band' && (
        <GfxBandEditDialog
          open
          onOpenChange={open => { if (!open) closeDialog() }}
          label={activeBandLabel}
          maxLength={BAND_TEXT_MAX_LENGTH[activeDialog.bandKey]}
          onLoad={loadContent}
          onSave={saveContent}
        />
      )}

      {activeDialog?.type === 'content' && activeDialog.bandKey === 'location_band' && (
        <GfxLocationDialog
          open
          onOpenChange={open => { if (!open) closeDialog() }}
          onLoad={loadLocation}
          onSave={saveLocation}
        />
      )}

      {activeDialog?.type === 'content' && ASSET_BANDS.has(activeDialog.bandKey) && (
        <GfxAssetDialog
          open
          onOpenChange={open => { if (!open) closeDialog() }}
          bandKey={activeDialog.bandKey}
          label={activeBandLabel}
          onLoadSelection={loadAssetSelection}
          onLoadLibrary={loadAssetLibrary}
          onSave={saveAsset}
        />
      )}

      {activeDialog?.type === 'layout' && (
        <GfxLayoutDialog
          open
          onOpenChange={open => { if (!open) closeDialog() }}
          bandKey={activeDialog.bandKey}
          label={activeBandLabel}
          onLoad={loadLayout}
          onSave={saveLayout}
          onPreview={previewLayout}
        />
      )}

      {activeDialog?.type === 'alignment' && (
        <GfxAlignmentDialog
          open
          onOpenChange={open => { if (!open) closeDialog() }}
          bandKey={activeDialog.bandKey}
          label={activeBandLabel}
          onLoad={loadAlignment}
          onSave={saveAlignment}
          onPreview={previewAlignment}
          onLoadBgAssets={loadBgAssets}
        />
      )}
    </>
  )
}
