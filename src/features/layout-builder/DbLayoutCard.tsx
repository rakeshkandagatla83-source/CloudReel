import { useState, useRef, useEffect } from 'react'
import { Download, Braces, Trash2 } from 'lucide-react'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { cn } from '../../lib/utils'
import { CANVAS_W, CANVAS_H } from './useLayoutBuilder'
import { getBgBase } from '../../lib/studioConfig'
import type { DbLayout, MixLayoutItem, WaterMarkItem, PubnubMsg } from '../../types/layoutBuilder'

interface DbLayoutCardProps {
  layout: DbLayout
  onImport: (layout: DbLayout) => void
  onViewJson: (layout: DbLayout) => void
  onDelete: (id: number) => Promise<void>
  onToast: (msg: string, variant?: 'success' | 'error') => void
}

function apiColorToCss(raw: string): string {
  return '#' + raw.replace('0x', '').replace('#', '')
}

export function DbLayoutCard({ layout, onImport, onViewJson, onDelete, onToast }: DbLayoutCardProps) {
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const previewRef = useRef<HTMLDivElement>(null)
  const [previewScale, setPreviewScale] = useState(0.15)

  useEffect(() => {
    const el = previewRef.current
    if (!el) return
    setPreviewScale(el.getBoundingClientRect().width / CANVAS_W)
    const observer = new ResizeObserver(([entry]) => {
      setPreviewScale(entry.contentRect.width / CANVAS_W)
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  let mixList: MixLayoutItem[] = []
  let wmList: WaterMarkItem[] = []
  try {
    const parsed = JSON.parse(layout.pubnubMsg) as PubnubMsg
    mixList = parsed.MixLayoutList ?? []
    wmList = parsed.WaterMarkList ?? []
  } catch {
    // ignore malformed pubnubMsg
  }

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await onDelete(layout.id)
      onToast('Layout deleted')
    } catch (e) {
      onToast(e instanceof Error ? e.message : 'Delete failed', 'error')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <>
      <div className="bg-secondary-bg border border-white/8 rounded-xl overflow-hidden transition-colors hover:border-white/15 group">
        {/* Preview */}
        <div
          id={`lb-db-card-preview-${layout.id}`}
          ref={previewRef}
          className="relative w-full aspect-video bg-primary-bg overflow-hidden"
        >
          {/* Background asset - fills preview directly, no scaling needed */}
          {!!layout.isBG && layout.bgVideo && (
            /\.(mp4|webm|ogg|mov)$/i.test(layout.bgVideo) ? (
              <video
                src={`${getBgBase()}${layout.bgVideo}`}
                className="absolute inset-0 w-full h-full object-cover"
                autoPlay
                loop
                muted
                playsInline
              />
            ) : (
              <img
                src={`${getBgBase()}${layout.bgVideo}`}
                alt=""
                className="absolute inset-0 w-full h-full object-cover"
              />
            )
          )}

          {/*
            Scaled canvas: render at full 1920×1080 canvas units then shrink via CSS transform.
            This is identical to how BuilderCanvas works (CANVAS_SCALE = 0.45).
            All child styles use raw canvas units — border-width, border-radius, font-size,
            padding all scale uniformly without per-property fixes.
          */}
          <div
            id={`lb-db-card-canvas-${layout.id}`}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: CANVAS_W,
              height: CANVAS_H,
              transformOrigin: 'top left',
              transform: `scale(${previewScale})`,
            }}
          >
            {/* Mix (source) items */}
            {mixList.map((m, i) => (
              <div
                key={i}
                style={{
                  position: 'absolute',
                  left: m.LocationX,
                  top: m.LocationY,
                  width: m.ImageWidth,
                  height: m.ImageHeight,
                  background: apiColorToCss(m.BackGroundColor ?? '0x000000'),
                  border: `${m.BorderWidth ?? 0}px solid ${apiColorToCss(m.BorderColor ?? '0xffffff')}`,
                  borderRadius: m.BorderRadius ?? 0,
                  boxSizing: 'border-box',
                  overflow: 'hidden',
                }}
              />
            ))}

            {/* Watermark (caption) items */}
            {wmList
              .filter((w) => w.ShowCaption && w.WaterMarkWidth > 0)
              .map((w, i) => (
                <div
                  key={i}
                  style={{
                    position: 'absolute',
                    left: w.LocationX,
                    top: w.LocationY,
                    width: w.WaterMarkWidth,
                    height: w.WaterMarkHeight,
                    background: apiColorToCss(w.BackGroundColor ?? '0xffffff'),
                    color: apiColorToCss(w.FontColor ?? '0x000000'),
                    fontFamily: w.FontFamily ?? 'Arial',
                    fontSize: Number(w.FontSize) || 18,
                    border: `${w.BorderWidth ?? 0}px solid ${apiColorToCss(w.BorderColor ?? '0x000000')}`,
                    borderRadius: w.BorderRadius ?? 0,
                    padding: '1px 4px',
                    overflow: 'hidden',
                    whiteSpace: 'nowrap',
                    textOverflow: 'ellipsis',
                    boxSizing: 'border-box',
                  }}
                >
                  {w.Text}
                </div>
              ))}
          </div>

          {/* Badges - outside scaled canvas so they stay legible at any size */}
          <div className="absolute top-1.5 right-1.5 flex flex-wrap gap-1 justify-end">
            <span className="text-[8px] px-1.5 py-0.5 rounded bg-white/8 text-white/60 border border-white/15 font-semibold">
              {layout.groupName}
            </span>
            <span className="text-[8px] px-1.5 py-0.5 rounded bg-[#006ee5]/10 text-[#006ee5] border border-[#006ee5]/25 font-semibold">
              W:{layout.windowsCount}
            </span>
            {!!layout.isTransition && (
              <span className="text-[8px] px-1.5 py-0.5 rounded bg-amber-950/80 text-amber-400 border border-amber-500/25 font-semibold">
                TRANS
              </span>
            )}
            {!!layout.isSecondary && (
              <span className="text-[8px] px-1.5 py-0.5 rounded bg-white/8 text-white/50 border border-white/15 font-semibold">
                SEC
              </span>
            )}
          </div>
        </div>

        {/* Info */}
        <div id={`lb-db-card-info-${layout.id}`} className="px-3 py-2.5">
          <p className="text-[12px] font-semibold text-white/85 truncate mb-0.5" title={layout.caption}>
            {layout.caption}
          </p>
          <p className="text-[10px] text-white/30 mb-2.5">
            ID: {layout.id}
            {layout.bgVideo ? ` | BG: ${layout.bgVideo}` : ''}
          </p>

          <div id={`lb-db-card-actions-${layout.id}`} className="flex gap-1.5">
            <button
              id={`lb-db-card-btn-import-${layout.id}`}
              type="button"
              onClick={() => onImport(layout)}
              className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg border border-white/10 bg-white/5 text-white/60 text-[11px] font-semibold cursor-pointer hover:bg-white/10 hover:text-white/85 transition-colors"
            >
              <Download size={11} />
              Import
            </button>
            <button
              id={`lb-db-card-btn-json-${layout.id}`}
              type="button"
              onClick={() => onViewJson(layout)}
              className={cn(
                'flex items-center justify-center px-2.5 py-1.5 rounded-lg border border-[#006ee5]/25',
                'bg-[#006ee5]/10 text-[#006ee5] text-[11px] cursor-pointer hover:bg-[#006ee5]/20 transition-colors',
              )}
              title="View raw JSON"
            >
              <Braces size={12} />
            </button>
            <button
              id={`lb-db-card-btn-delete-${layout.id}`}
              type="button"
              disabled={deleting}
              onClick={() => setDeleteOpen(true)}
              className={cn(
                'flex items-center justify-center px-2.5 py-1.5 rounded-lg border border-[#e00000]/25',
                'bg-[#e00000]/10 text-[#e00000] text-[11px] cursor-pointer hover:bg-[#e00000]/20 transition-colors',
                'disabled:opacity-50 disabled:cursor-not-allowed',
              )}
            >
              <Trash2 size={12} />
            </button>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete Layout"
        description={`Are you sure you want to delete "${layout.caption}"? This cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
        onConfirm={handleDelete}
      />
    </>
  )
}
