import { snapVal, CANVAS_W, CANVAS_H, CANVAS_SCALE } from './useLayoutBuilder'
import { CanvasSource } from './CanvasSource'
import { getBgBase } from '../../lib/studioConfig'
import type { Source, Background } from '../../types/layoutBuilder'

interface BuilderCanvasProps {
  sources: Source[]
  bg: Background
  isBg: boolean
  selectedId: string | null
  onSelect: (id: string | null) => void
  onMove: (id: string, x: number, y: number) => void
  onResizeTransform: (id: string, x: number, y: number, w: number, h: number) => void
  onDrop: (x: number, y: number) => void
}

function buildBgStyle(bg: Background): React.CSSProperties {
  if (bg.imageUrl) {
    return { backgroundColor: bg.color }
  }
  return {
    backgroundColor: bg.color,
    backgroundImage:
      'linear-gradient(rgba(255,255,255,.025) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.025) 1px,transparent 1px)',
    backgroundSize: '40px 22px',
  }
}

export function BuilderCanvas({
  sources,
  bg,
  isBg,
  selectedId,
  onSelect,
  onMove,
  onResizeTransform,
  onDrop,
}: BuilderCanvasProps) {
  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.currentTarget === e.target) {
      onSelect(null)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    const type = e.dataTransfer.getData('type')
    if (type !== 'source') return
    const rect = e.currentTarget.getBoundingClientRect()
    const cx = snapVal(Math.max(0, (e.clientX - rect.left) / CANVAS_SCALE - 200))
    const cy = snapVal(Math.max(0, (e.clientY - rect.top) / CANVAS_SCALE - 112))
    onDrop(cx, cy)
  }

  return (
    <div className="flex-1 overflow-auto flex items-start justify-center p-5 bg-primary-bg">
      <div
        className="relative shrink-0 border border-white/10 rounded shadow-[0_0_60px_rgba(0,0,0,0.8)]"
        style={{
          width: CANVAS_W * CANVAS_SCALE,
          height: CANVAS_H * CANVAS_SCALE,
          ...buildBgStyle(bg),
        }}
        onMouseDown={handleCanvasMouseDown}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        {/* Background asset */}
        {isBg && bg.bgAssetName && (
          /\.(mp4|webm|ogg|mov)$/i.test(bg.bgAssetName) ? (
            <video
              src={`${getBgBase()}${bg.bgAssetName}`}
              className="absolute inset-0 w-full h-full pointer-events-none"
              style={{ objectFit: bg.imageFit as React.CSSProperties['objectFit'] }}
              autoPlay
              loop
              muted
              playsInline
            />
          ) : (
            <img
              src={`${getBgBase()}${bg.bgAssetName}`}
              alt=""
              className="absolute inset-0 w-full h-full pointer-events-none"
              style={{ objectFit: bg.imageFit as React.CSSProperties['objectFit'] }}
            />
          )
        )}

        {/* Empty hint */}
        {sources.length === 0 && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-white/15 pointer-events-none gap-2">
            <span className="text-4xl">📡</span>
            <p className="text-xs">Click "Add Source" or drag from toolbox</p>
          </div>
        )}

        {/* Canvas size label */}
        <span className="absolute bottom-1 right-2 text-[9px] font-mono text-white/20 pointer-events-none">
          {CANVAS_W}×{CANVAS_H}
        </span>

        {/* Source items */}
        {sources.map((s) => (
          <CanvasSource
            key={s.id}
            source={s}
            scale={CANVAS_SCALE}
            selected={s.id === selectedId}
            onSelect={onSelect}
            onMove={onMove}
            onResizeTransform={onResizeTransform}
          />
        ))}
      </div>
    </div>
  )
}
