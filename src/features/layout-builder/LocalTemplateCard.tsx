import { useState, useRef, useEffect } from 'react'
import { Pencil, Trash2 } from 'lucide-react'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { CANVAS_W, CANVAS_H } from './useLayoutBuilder'
import type { LocalTemplate } from '../../types/layoutBuilder'

interface LocalTemplateCardProps {
  template: LocalTemplate
  onEdit: (tpl: LocalTemplate) => void
  onDelete: (id: string) => void
}

export function LocalTemplateCard({ template, onEdit, onDelete }: LocalTemplateCardProps) {
  const [deleteOpen, setDeleteOpen] = useState(false)
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

  const bgStyle = template.bg.imageUrl
    ? { backgroundImage: `url('${template.bg.imageUrl}')`, backgroundSize: 'cover', backgroundPosition: 'center' }
    : { background: template.bg.color }

  return (
    <>
      <div className="bg-secondary-bg border border-white/8 rounded-xl overflow-hidden hover:border-white/15 transition-colors">
        {/* Preview */}
        <div
          id={`lb-local-card-preview-${template.id}`}
          ref={previewRef}
          className="relative w-full aspect-video overflow-hidden"
          style={bgStyle}
        >
          {/*
            Scaled canvas: identical rendering approach to the builder and DbLayoutCard.
            All child styles use raw canvas units — transform scales everything uniformly.
          */}
          <div
            id={`lb-local-card-canvas-${template.id}`}
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
            {template.sources.map((s, i) => (
              <div
                key={i}
                style={{ position: 'absolute', left: s.x, top: s.y, width: s.w, height: s.h }}
              >
                {/* Source box face */}
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    background: s.bgColor,
                    border: `${s.borderWidth ?? 0}px solid ${s.borderColor || 'rgba(255,255,255,0.15)'}`,
                    borderRadius: s.borderRadius ?? 0,
                    boxSizing: 'border-box',
                    overflow: 'hidden',
                  }}
                />
                {/* Caption — sibling of source face, at bottom of source area (matching CAPTION_ROTATE: y = pos.h - captionH) */}
                {s.showCaption && (
                  <div
                    style={{
                      position: 'absolute',
                      top: s.h - s.captionFontSize - 16,
                      left: 0,
                      right: 0,
                      height: s.captionFontSize + 16,
                      background: s.captionBg,
                      color: s.captionColor,
                      fontFamily: s.captionFont,
                      fontSize: s.captionFontSize,
                      padding: '8px 3px',
                      border: `${s.captionBorderWidth ?? 0}px solid ${s.captionBorderColor || 'transparent'}`,
                      borderRadius: `0 0 ${s.captionRadius ?? 0}px ${s.captionRadius ?? 0}px`,
                      overflow: 'hidden',
                      whiteSpace: 'nowrap',
                      textOverflow: 'ellipsis',
                      boxSizing: 'border-box',
                    }}
                  >
                    {s.captionText || s.label}
                  </div>
                )}
              </div>
            ))}
          </div>

          <span className="absolute top-1.5 right-1.5 text-[9px] px-1.5 py-0.5 rounded bg-black/50 text-white/60">
            {template.sources.length} src
          </span>
        </div>

        {/* Info */}
        <div id={`lb-local-card-info-${template.id}`} className="px-3 py-2.5">
          <p className="text-[12px] font-semibold text-white/85 mb-0.5 truncate">{template.name}</p>
          <p className="text-[10px] text-white/30 mb-2.5 flex items-center gap-1.5">
            {template.groupName && (
              <span className="bg-white/5 text-white/50 text-[9px] px-1.5 py-0.5 rounded border border-white/10">
                {template.groupName}
              </span>
            )}
            {new Date(template.updatedAt).toLocaleString()}
          </p>

          <div id={`lb-local-card-actions-${template.id}`} className="flex gap-1.5">
            <button
              id={`lb-local-card-btn-edit-${template.id}`}
              type="button"
              onClick={() => onEdit(template)}
              className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg border border-white/10 bg-white/5 text-white/70 text-[11px] font-semibold cursor-pointer hover:bg-white/10 transition-colors"
            >
              <Pencil size={11} />
              Edit
            </button>
            <button
              id={`lb-local-card-btn-delete-${template.id}`}
              type="button"
              onClick={() => setDeleteOpen(true)}
              className="flex items-center justify-center px-2.5 py-1.5 rounded-lg border border-[#e00000]/20 bg-[#e00000]/10 text-[#e00000] text-[11px] cursor-pointer hover:bg-[#e00000]/20 transition-colors"
            >
              <Trash2 size={12} />
            </button>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete Template"
        description={`Delete "${template.name}"? This cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
        onConfirm={() => onDelete(template.id)}
      />
    </>
  )
}
