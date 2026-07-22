import { useState, useEffect, useRef } from 'react'
import * as RadixDialog from '@radix-ui/react-dialog'
import { X, Loader2, Film, Plus, RotateCcw, AlertTriangle } from 'lucide-react'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { GfxDraggableContent } from './GfxDraggableContent'
import { Select, SelectItem } from '../../components/ui/Select'
import { GFX_ALIGNMENT_DEFAULTS } from '../../lib/studioConfig'
import type { GfxBandAlignment, BgAssetItem } from '../../types/studio'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  bandKey: string
  label: string
  onLoad: () => Promise<GfxBandAlignment | null | 'corrupted'>
  onSave: (alignment: GfxBandAlignment) => Promise<boolean>
  onPreview?: (alignment: GfxBandAlignment) => void
  onLoadBgAssets?: () => Promise<BgAssetItem[]>
}

const inputClass = 'w-full bg-white/4 border border-white/8 rounded-lg px-3 h-10 text-base text-white/80 focus:outline-none focus:border-[#3031cb]/40'
const labelClass = 'text-sm text-white/55 font-semibold uppercase tracking-wider'
const selClass = 'w-full'

// Fields that hold background media paths (shown as dropdown)
const BG_FIELDS = new Set(['bgVideo', 'bgImage'])
// Fields that are booleans
const BOOL_FIELDS = new Set(['zIndex'])
// Fields whose values are percentages — show placeholder accordingly
const WIDTH_FIELDS = new Set(['width', 'textWidth'])
// Friendly labels for known alignment fields
const FIELD_LABELS: Record<string, string> = {
  top: 'Top', bottom: 'Bottom', left: 'Left', right: 'Right',
  width: 'Width', height: 'Height',
  textTop: 'Text Top', textBottom: 'Text Bottom',
  textLeft: 'Text Left', textRight: 'Text Right',
  textWidth: 'Text Width',
  bgVideo: 'BG Feed', bgImage: 'BG Feed',
  zIndex: 'Z-Index (front)',
}

export function GfxAlignmentDialog({ open, onOpenChange, bandKey, label, onLoad, onSave, onPreview = () => {}, onLoadBgAssets }: Props) {
  const bandDefaultAlignment = GFX_ALIGNMENT_DEFAULTS[bandKey] ?? {}
  const [alignment, setAlignment] = useState<GfxBandAlignment>(bandDefaultAlignment)
  const [isIntentionallyEmpty, setIsIntentionallyEmpty] = useState(false)
  const [isCorrupted, setIsCorrupted] = useState(false)
  const [bgAssets, setBgAssets] = useState<BgAssetItem[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const originalAlignmentRef = useRef<GfxBandAlignment>(bandDefaultAlignment)
  const previewTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const hasPreviewedRef = useRef(false)

  useEffect(() => {
    if (!open) return
    hasPreviewedRef.current = false
    let cancelled = false
    void (async () => {
      setLoading(true)
      try {
        const tasks: [Promise<GfxBandAlignment | null | 'corrupted'>, Promise<BgAssetItem[]>] = [
          onLoad(),
          onLoadBgAssets ? onLoadBgAssets() : Promise.resolve([]),
        ]
        const [data, assets] = await Promise.all(tasks)
        if (!cancelled) {
          if (data === 'corrupted') {
            setIsCorrupted(true)
            setIsIntentionallyEmpty(false)
            setAlignment(bandDefaultAlignment)
            originalAlignmentRef.current = bandDefaultAlignment
          } else {
            const hasFields = data !== null && Object.keys(data).length > 0
            const isEmpty = data !== null && Object.keys(data).length === 0
            const resolved = hasFields ? { ...bandDefaultAlignment, ...data } : bandDefaultAlignment
            setAlignment(resolved)
            setIsIntentionallyEmpty(isEmpty)
            setIsCorrupted(false)
            originalAlignmentRef.current = resolved
          }
          setBgAssets(assets)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  // Clean up the debounce timer on unmount
  useEffect(() => () => {
    if (previewTimerRef.current) clearTimeout(previewTimerRef.current)
  }, [])

  function debouncedPreview(updatedAlignment: GfxBandAlignment) {
    if (previewTimerRef.current) clearTimeout(previewTimerRef.current)
    previewTimerRef.current = setTimeout(() => {
      hasPreviewedRef.current = true
      onPreview(updatedAlignment)
    }, 400)
  }

  // Only reverts if a preview WS was actually sent — safe to call multiple times (idempotent after first call)
  function revertPreviewIfNeeded() {
    if (previewTimerRef.current) { clearTimeout(previewTimerRef.current); previewTimerRef.current = null }
    if (hasPreviewedRef.current) {
      onPreview(originalAlignmentRef.current)
      hasPreviewedRef.current = false
    }
  }

  function patchNum(key: string, value: string) {
    const updated = { ...alignment, [key]: value === '' ? 0 : Number(value) }
    setAlignment(updated)
    debouncedPreview(updated)
  }

  function patchStr(key: string, value: string) {
    const updated = { ...alignment, [key]: value }
    setAlignment(updated)
    debouncedPreview(updated)
  }

  function patchBool(key: string, value: boolean) {
    const updated = { ...alignment, [key]: value }
    setAlignment(updated)
    debouncedPreview(updated)
  }

  function handleCancel() {
    revertPreviewIfNeeded()
    onOpenChange(false)
  }

  async function handleSave() {
    setSaving(true)
    const ok = await onSave(alignment)
    setSaving(false)
    if (ok) onOpenChange(false)
  }

  const TEXT_POSITION_FIELDS = new Set(['textTop', 'textBottom', 'textLeft', 'textRight', 'textWidth'])

  const BAND_HIDDEN_FIELDS: Record<string, Set<string>> = {
    logo_band: new Set(['height']),
    l_band:    new Set(['right', 'width', 'bottom']),
  }
  const hiddenFields = BAND_HIDDEN_FIELDS[bandKey] ?? new Set<string>()

  // Split fields by type for organized display
  const positionFields     = Object.entries(alignment).filter(([k, v]) => !BG_FIELDS.has(k) && !BOOL_FIELDS.has(k) && !TEXT_POSITION_FIELDS.has(k) && !hiddenFields.has(k) && typeof v === 'number')
  const textPositionFields = Object.entries(alignment).filter(([k, v]) => TEXT_POSITION_FIELDS.has(k) && typeof v === 'number')
  const bgFields           = Object.entries(alignment).filter(([k]) => BG_FIELDS.has(k))
  const boolFields         = Object.entries(alignment).filter(([k]) => BOOL_FIELDS.has(k))

  return (
    <>
      <RadixDialog.Root open={open} onOpenChange={val => { if (!val) revertPreviewIfNeeded(); onOpenChange(val) }} modal={false}>
        <RadixDialog.Portal>
          <GfxDraggableContent className="w-full max-w-lg bg-secondary-bg border border-white/8 rounded-xl shadow-2xl flex flex-col max-h-[80vh]">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/6 cursor-move select-none">
              <div>
                <RadixDialog.Title className="text-base font-semibold text-white">Position · {label}</RadixDialog.Title>
                <RadixDialog.Description className="text-sm text-white/35 mt-0.5">
                  Band alignment on canvas
                </RadixDialog.Description>
              </div>
              <span className="text-xs text-white/18 mr-1">drag to move</span>
              <button
                id={`gfx-alignment-btn-close-${bandKey}`}
                type="button"
                onClick={handleCancel}
                className="p-1.5 rounded-lg text-white/35 hover:text-white/75 hover:bg-white/6 cursor-pointer transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center gap-2 py-14 text-white/35">
                  <Loader2 size={16} className="animate-spin" />
                  <span className="text-sm">Loading position…</span>
                </div>
              ) : isCorrupted ? (
                <div className="flex flex-col items-center justify-center gap-3 py-12 px-5">
                  <AlertTriangle size={24} className="text-amber-400/70" />
                  <div className="text-center">
                    <p className="text-sm text-amber-400/80 font-medium">Position data is corrupted</p>
                    <p className="text-sm text-white/30 mt-1">The stored value cannot be displayed. Reset to apply band defaults.</p>
                  </div>
                  <button
                    id={`gfx-alignment-btn-reset-${bandKey}`}
                    type="button"
                    onClick={() => { setAlignment(bandDefaultAlignment); setIsCorrupted(false) }}
                    className="flex items-center gap-1.5 h-10 px-4 text-base text-amber-400/70 border border-amber-400/25 rounded-lg hover:bg-amber-950/25 hover:text-amber-300 hover:border-amber-400/45 cursor-pointer transition-colors"
                  >
                    <RotateCcw size={16} />
                    Reset to defaults
                  </button>
                </div>
              ) : isIntentionallyEmpty ? (
                <div className="flex flex-col items-center justify-center gap-3 py-12 px-5">
                  <p className="text-sm text-white/35 text-center">No position configured for this band.</p>
                  <button
                    id={`gfx-alignment-btn-configure-${bandKey}`}
                    type="button"
                    onClick={() => { setAlignment(bandDefaultAlignment); setIsIntentionallyEmpty(false) }}
                    className="flex items-center gap-1.5 h-10 px-4 text-base text-white/60 border border-white/12 rounded-lg hover:bg-white/6 hover:text-white/80 cursor-pointer transition-colors"
                  >
                    <Plus size={16} />
                    Configure position
                  </button>
                </div>
              ) : (
                <div className="px-5 py-4 flex flex-col gap-4">
                  {/* Position & dimension fields (top, bottom, left, right, width, height, …) */}
                  {positionFields.length > 0 && (
                    <div className="flex flex-col gap-2">
                      <span className={labelClass}>Position &amp; Dimensions</span>
                      <div className="flex flex-wrap gap-2.5">
                        {positionFields.map(([key, val]) => (
                          <div key={key} className="flex flex-col gap-1.5 min-w-20 flex-1">
                            <label className={labelClass}>{FIELD_LABELS[key] ?? key}</label>
                            <input
                              type="number"
                              value={val as number}
                              onChange={e => patchNum(key, e.target.value)}
                              placeholder={WIDTH_FIELDS.has(key) ? 'Enter width in %' : undefined}
                              className={inputClass}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Text position fields (textTop, textBottom, textLeft, textRight, textWidth) */}
                  {textPositionFields.length > 0 && (
                    <div className="flex flex-col gap-2">
                      <span className={labelClass}>Text Position</span>
                      <div className="flex flex-wrap gap-2.5">
                        {textPositionFields.map(([key, val]) => (
                          <div key={key} className="flex flex-col gap-1.5 min-w-20 flex-1">
                            <label className={labelClass}>{FIELD_LABELS[key] ?? key}</label>
                            <input
                              type="number"
                              value={val as number}
                              onChange={e => patchNum(key, e.target.value)}
                              placeholder={WIDTH_FIELDS.has(key) ? 'Enter width in %' : undefined}
                              className={inputClass}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* BG Feed dropdown (bgVideo / bgImage) */}
                  {bgFields.length > 0 && (
                    <div className="flex flex-col gap-2">
                      <span className={labelClass}>Background Media</span>
                      {bgFields.map(([key, val]) => {
                        const path = val as string
                        const isVideo = /\.(mp4|webm)$/i.test(path)
                        return (
                        <div key={key} className="flex flex-col gap-1.5">
                          <label className={labelClass}>{FIELD_LABELS[key] ?? key}</label>
                          <Select
                            value={path}
                            onValueChange={v => patchStr(key, v)}
                            className={selClass}
                          >
                            <SelectItem value="">— No background —</SelectItem>
                            {bgAssets.map((asset, index) => (
                              <SelectItem key={`${asset.name}-${index}`} value={asset.path}>{asset.name}</SelectItem>
                            ))}
                            {/* Keep current value selectable even if not in loaded list */}
                            {path && !bgAssets.some(a => a.path === path) && (
                              <SelectItem value={path}>{path.split('/').pop()}</SelectItem>
                            )}
                          </Select>
                          {/* Preview thumbnail */}
                          {path && (
                            <div className="rounded-lg overflow-hidden border border-white/8 bg-black/40 aspect-video w-full max-w-xs">
                              {isVideo ? (
                                <video
                                  key={path}
                                  src={path}
                                  muted
                                  loop
                                  autoPlay
                                  playsInline
                                  className="w-full h-full object-contain"
                                  onError={e => { (e.currentTarget as HTMLVideoElement).style.display = 'none' }}
                                />
                              ) : (
                                <img
                                  src={path}
                                  alt=""
                                  className="w-full h-full object-contain"
                                  onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
                                />
                              )}
                            </div>
                          )}
                          {path && isVideo && (
                            <p className="flex items-center gap-1 text-[10px] text-white/35">
                              <Film size={10} /> Video asset
                            </p>
                          )}
                        </div>
                        )
                      })}
                    </div>
                  )}

                  {/* Boolean fields (zIndex) */}
                  {boolFields.length > 0 && (
                    <div className="flex flex-col gap-2">
                      <span className={labelClass}>Options</span>
                      {boolFields.map(([key, val]) => (
                        <label key={key} className="flex items-center gap-2.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={val as boolean}
                            onChange={e => patchBool(key, e.target.checked)}
                            className="w-5 h-5 accent-blue-500 cursor-pointer"
                          />
                          <span className="text-base text-white/70">{FIELD_LABELS[key] ?? key}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2 px-5 py-3.5 border-t border-white/6 bg-white/1 rounded-b-xl">
              <button
                id={`gfx-alignment-btn-cancel-${bandKey}`}
                type="button"
                onClick={handleCancel}
                className="h-10 px-4 text-base text-white/40 border border-white/10 rounded-lg hover:bg-white/5 cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={saving || loading || isIntentionallyEmpty || isCorrupted}
                onClick={() => setConfirmOpen(true)}
                className="flex items-center gap-1.5 h-10 px-4 text-base font-semibold bg-[#3031cb] hover:bg-[#2829b0] text-white rounded-lg cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving && <Loader2 size={14} className="animate-spin" />}
                Apply Position
              </button>
            </div>
          </GfxDraggableContent>
        </RadixDialog.Portal>
      </RadixDialog.Root>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Apply position changes?"
        description={`Update alignment for "${label}". This repositions the band on the live template.`}
        confirmLabel="Apply"
        onConfirm={handleSave}
      />
    </>
  )
}
