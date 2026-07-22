import { useState, useEffect, useRef } from 'react'
import * as RadixDialog from '@radix-ui/react-dialog'
import { X, Loader2 } from 'lucide-react'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { GfxDraggableContent } from './GfxDraggableContent'
import { Select, SelectItem } from '../../components/ui/Select'
import { GFX_FONTS, BANDS_WITH_ANIMATION } from '../../lib/studioConfig'
import type { GfxBandLayout } from '../../types/studio'

const ANIMATIONS = [
  { label: 'None', value: '' },
  { label: 'Slide Up', value: 'slide-up' },
  { label: 'Typed Out', value: 'typed-out' },
  { label: 'Light speed in bottom', value: 'light-speed-in-bottom' },
  { label: 'Flip In X', value: 'flip-in-x' },
  { label: 'Rotate Horizontal', value: 'rotate-horizontal' },
]

const DEFAULT_LAYOUT: GfxBandLayout = {
  bg_color: '',
  font_color: '#ffffff',
  font_family: 'Arial, Helvetica, sans-serif',
  font_size: '24px',
  animation: '',
}

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  bandKey: string
  label: string
  onLoad: () => Promise<GfxBandLayout | null>
  onSave: (layout: GfxBandLayout) => Promise<boolean>
  onPreview?: (layout: GfxBandLayout) => void
}

const selClass = 'w-full'
const labelClass = 'text-sm text-white/55 font-semibold uppercase tracking-wider'

// font_size is stored/sent as "30px" — strip px for the number input
function parseFontSize(v: string | number | undefined): number {
  if (typeof v === 'number') return v
  if (!v) return 24
  return parseInt(String(v), 10) || 24
}

export function GfxLayoutDialog({ open, onOpenChange, bandKey, label, onLoad, onSave, onPreview = () => {} }: Props) {
  const [layout, setLayout] = useState<GfxBandLayout>(DEFAULT_LAYOUT)
  const [fontSizeNum, setFontSizeNum] = useState(24)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const originalLayoutRef = useRef<GfxBandLayout>(DEFAULT_LAYOUT)
  const previewTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const hasPreviewedRef = useRef(false)

  useEffect(() => {
    if (!open) return
    hasPreviewedRef.current = false
    let cancelled = false
    void (async () => {
      setLoading(true)
      try {
        const data = await onLoad()
        if (!cancelled) {
          // Merge with DEFAULT_LAYOUT so optional fields (bg_color, animation) always have safe values
          const resolved = data ? { ...DEFAULT_LAYOUT, ...data } : DEFAULT_LAYOUT
          setLayout(resolved)
          setFontSizeNum(parseFontSize(resolved.font_size))
          originalLayoutRef.current = resolved
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [open, bandKey]) // eslint-disable-line react-hooks/exhaustive-deps

  // Clean up the debounce timer on unmount
  useEffect(() => () => {
    if (previewTimerRef.current) clearTimeout(previewTimerRef.current)
  }, [])

  function debouncedPreview(updatedLayout: GfxBandLayout) {
    if (previewTimerRef.current) clearTimeout(previewTimerRef.current)
    previewTimerRef.current = setTimeout(() => {
      hasPreviewedRef.current = true
      onPreview(updatedLayout)
    }, 400)
  }

  // Only reverts if a preview WS was actually sent — safe to call multiple times (idempotent after first call)
  function revertPreviewIfNeeded() {
    if (previewTimerRef.current) { clearTimeout(previewTimerRef.current); previewTimerRef.current = null }
    if (hasPreviewedRef.current) {
      onPreview(originalLayoutRef.current)
      hasPreviewedRef.current = false
    }
  }

  function patch(key: keyof GfxBandLayout, value: string) {
    const updated = { ...layout, [key]: value }
    setLayout(updated)
    debouncedPreview(updated)
  }

  function handleFontSizeChange(val: number) {
    const clamped = Math.max(8, Math.min(200, val || 8))
    setFontSizeNum(clamped)
    const updated = { ...layout, font_size: `${clamped}px` }
    setLayout(updated)
    debouncedPreview(updated)
  }

  function handleCancel() {
    revertPreviewIfNeeded()
    onOpenChange(false)
  }

  async function handleSave() {
    setSaving(true)
    const ok = await onSave({ ...layout, font_size: `${fontSizeNum}px`, bg_color: '' })
    setSaving(false)
    if (ok) onOpenChange(false)
  }

  // Ensure font_color is a valid hex for color input
  const safeColor = (v: string) => /^#[0-9a-fA-F]{6}$/.test(v) ? v : '#ffffff'

  return (
    <>
      <RadixDialog.Root open={open} onOpenChange={val => { if (!val) revertPreviewIfNeeded(); onOpenChange(val) }} modal={false}>
        <RadixDialog.Portal>
          <GfxDraggableContent className="w-full max-w-md bg-secondary-bg border border-white/8 rounded-xl shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/6 cursor-move select-none">
              <div>
                <RadixDialog.Title className="text-base font-semibold text-white">Layout · {label}</RadixDialog.Title>
                <RadixDialog.Description className="text-sm text-white/35 mt-0.5">
                  Colors, font &amp; animation
                </RadixDialog.Description>
              </div>
              <span className="text-xs text-white/18 mr-1">drag to move</span>
              <button
                id="gfx-layout-btn-close"
                type="button"
                onClick={handleCancel}
                className="p-1.5 rounded-lg text-white/35 hover:text-white/75 hover:bg-white/6 cursor-pointer transition-colors"
              >
                <X size={14} />
              </button>
            </div>

            {loading ? (
              <div className="flex items-center justify-center gap-2 py-14 text-white/35">
                <Loader2 size={16} className="animate-spin" />
                <span className="text-sm">Loading layout…</span>
              </div>
            ) : (
              <div className="px-5 py-4 flex flex-col gap-4">
                {/* Font color */}
                <div className="flex flex-col gap-1.5">
                  <label className={labelClass}>Font Color</label>
                  <div className="flex items-center gap-2 bg-white/4 border border-white/8 rounded-lg px-3 h-10">
                    <input
                      type="color"
                      value={safeColor(layout.font_color)}
                      onChange={e => patch('font_color', e.target.value)}
                      className="w-6 h-6 rounded cursor-pointer border-0 bg-transparent p-0"
                    />
                    <input
                      type="text"
                      value={layout.font_color}
                      onChange={e => patch('font_color', e.target.value)}
                      className="flex-1 min-w-0 bg-transparent text-base text-white/70 outline-none font-mono"
                      maxLength={7}
                      placeholder="#ffffff"
                    />
                  </div>
                </div>

                {/* Font family */}
                <div className="flex flex-col gap-1.5">
                  <label className={labelClass}>Font Family</label>
                  <Select value={layout.font_family} onValueChange={v => patch('font_family', v)} className={selClass}>
                    {GFX_FONTS.map(f => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
                    {/* Show raw value if it doesn't match any known font */}
                    {!GFX_FONTS.some(f => f.value === layout.font_family) && layout.font_family && (
                      <SelectItem value={layout.font_family}>{layout.font_family}</SelectItem>
                    )}
                  </Select>
                </div>

                {/* Font size + Animation (animation only for supported bands) */}
                <div className={BANDS_WITH_ANIMATION.has(bandKey) ? 'grid grid-cols-2 gap-3' : 'flex flex-col gap-1.5'}>
                  <div className="flex flex-col gap-1.5">
                    <label className={labelClass}>Font Size (px)</label>
                    <input
                      type="number"
                      min={8}
                      max={200}
                      value={fontSizeNum}
                      onChange={e => handleFontSizeChange(Number(e.target.value))}
                      className="bg-white/4 border border-white/8 rounded-lg px-3 h-10 text-base text-white/80 focus:outline-none focus:border-[#3031cb]/40"
                    />
                  </div>
                  {BANDS_WITH_ANIMATION.has(bandKey) && (
                    <div className="flex flex-col gap-1.5">
                      <label className={labelClass}>Animation</label>
                      <Select value={layout.animation ?? ''} onValueChange={v => patch('animation', v)} className={selClass}>
                        {ANIMATIONS.map(a => <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>)}
                      </Select>
                    </div>
                  )}
                </div>

                {/* Preview */}
                <div
                  className="rounded-lg px-4 py-3 text-center overflow-hidden border border-white/5 min-h-10"
                  style={{
                    backgroundColor: layout.bg_color || 'transparent',
                    fontFamily: layout.font_family,
                    fontSize: `${fontSizeNum}px`,
                    color: layout.font_color,
                  }}
                >
                  Sample Band Text
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="flex items-center justify-end gap-2 px-5 py-3.5 border-t border-white/6 bg-white/1 rounded-b-xl">
              <button
                id="gfx-layout-btn-cancel"
                type="button"
                onClick={handleCancel}
                className="h-10 px-4 text-base text-white/40 border border-white/10 rounded-lg hover:bg-white/5 cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={saving || loading}
                onClick={() => setConfirmOpen(true)}
                className="flex items-center gap-1.5 h-10 px-4 text-base font-semibold bg-[#3031cb] hover:bg-[#2626a8] text-white rounded-lg cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving && <Loader2 size={14} className="animate-spin" />}
                Apply Layout
              </button>
            </div>
          </GfxDraggableContent>
        </RadixDialog.Portal>
      </RadixDialog.Root>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Apply layout changes?"
        description={`Update styling for "${label}". This will take effect on the live template.`}
        confirmLabel="Apply"
        onConfirm={handleSave}
      />
    </>
  )
}
