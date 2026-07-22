import { useRef } from 'react'
import { cn } from '../../lib/utils'
import { snapVal } from './useLayoutBuilder'
import { CAPTION_VERTICAL_PADDING } from './layoutBuilderApi'
import type { Source } from '../../types/layoutBuilder'

type ResizeDir = 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | 'nw'

interface CanvasSourceProps {
  source: Source
  scale: number
  selected: boolean
  onSelect: (id: string) => void
  onMove: (id: string, x: number, y: number) => void
  onResizeTransform: (id: string, x: number, y: number, w: number, h: number) => void
}

// Tailwind classes per direction: position + size + cursor
const HANDLE_CLASSES: Record<ResizeDir, string> = {
  nw: 'top-0 left-0 w-2.5 h-2.5 cursor-nw-resize',
  n:  'top-0 left-1/2 -translate-x-1/2 w-6 h-1.5 cursor-n-resize',
  ne: 'top-0 right-0 w-2.5 h-2.5 cursor-ne-resize',
  e:  'top-1/2 right-0 -translate-y-1/2 w-1.5 h-6 cursor-e-resize',
  se: 'bottom-0 right-0 w-2.5 h-2.5 cursor-se-resize',
  s:  'bottom-0 left-1/2 -translate-x-1/2 w-6 h-1.5 cursor-s-resize',
  sw: 'bottom-0 left-0 w-2.5 h-2.5 cursor-sw-resize',
  w:  'top-1/2 left-0 -translate-y-1/2 w-1.5 h-6 cursor-w-resize',
}

const ALL_DIRS: ResizeDir[] = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w']

export function CanvasSource({ source, scale, selected, onSelect, onMove, onResizeTransform }: CanvasSourceProps) {
  const elRef = useRef<HTMLDivElement>(null)
  const coordsRef = useRef<HTMLSpanElement>(null)

  const handleBodyMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).dataset.resize) return
    e.stopPropagation()
    onSelect(source.id)

    const startX = e.clientX
    const startY = e.clientY
    const ox = source.x
    const oy = source.y

    const move = (ev: MouseEvent) => {
      const nx = snapVal(Math.max(0, ox + (ev.clientX - startX) / scale))
      const ny = snapVal(Math.max(0, oy + (ev.clientY - startY) / scale))
      if (elRef.current) {
        elRef.current.style.left = nx * scale + 'px'
        elRef.current.style.top = ny * scale + 'px'
      }
      if (coordsRef.current) {
        coordsRef.current.textContent = `${nx},${ny} ${source.w}×${source.h}`
      }
    }

    const up = (ev: MouseEvent) => {
      document.removeEventListener('mousemove', move)
      document.removeEventListener('mouseup', up)
      const nx = snapVal(Math.max(0, ox + (ev.clientX - startX) / scale))
      const ny = snapVal(Math.max(0, oy + (ev.clientY - startY) / scale))
      onMove(source.id, nx, ny)
    }

    document.addEventListener('mousemove', move)
    document.addEventListener('mouseup', up)
  }

  const handleResizeMouseDown = (e: React.MouseEvent<HTMLDivElement>, dir: ResizeDir) => {
    e.stopPropagation()
    const startX = e.clientX
    const startY = e.clientY
    const ox = source.x
    const oy = source.y
    const ow = source.w
    const oh = source.h

    const compute = (ev: MouseEvent) => {
      const rawDx = (ev.clientX - startX) / scale
      const rawDy = (ev.clientY - startY) / scale

      let newX = ox
      let newY = oy
      let newW = ow
      let newH = oh

      // Horizontal axis
      if (dir === 'e' || dir === 'ne' || dir === 'se') {
        // Right edge moves; left stays fixed
        newW = snapVal(Math.max(80, ow + rawDx))
      } else if (dir === 'w' || dir === 'nw' || dir === 'sw') {
        // Left edge moves; right stays fixed at ox + ow
        newW = snapVal(Math.max(80, ow - rawDx))
        newX = Math.max(0, ox + ow - newW)
      }

      // Vertical axis
      if (dir === 's' || dir === 'se' || dir === 'sw') {
        // Bottom edge moves; top stays fixed
        newH = snapVal(Math.max(45, oh + rawDy))
      } else if (dir === 'n' || dir === 'ne' || dir === 'nw') {
        // Top edge moves; bottom stays fixed at oy + oh
        newH = snapVal(Math.max(45, oh - rawDy))
        newY = Math.max(0, oy + oh - newH)
      }

      return { newX, newY, newW, newH }
    }

    const move = (ev: MouseEvent) => {
      const { newX, newY, newW, newH } = compute(ev)
      if (elRef.current) {
        elRef.current.style.left = newX * scale + 'px'
        elRef.current.style.top = newY * scale + 'px'
        elRef.current.style.width = newW * scale + 'px'
        elRef.current.style.height = newH * scale + 'px'
      }
      if (coordsRef.current) {
        coordsRef.current.textContent = `${newX},${newY} ${newW}×${newH}`
      }
    }

    const up = (ev: MouseEvent) => {
      document.removeEventListener('mousemove', move)
      document.removeEventListener('mouseup', up)
      const { newX, newY, newW, newH } = compute(ev)
      onResizeTransform(source.id, newX, newY, newW, newH)
    }

    document.addEventListener('mousemove', move)
    document.addEventListener('mouseup', up)
  }

  const capText = source.captionText || source.label

  return (
    <div
      id={`lb-canvas-source-${source.id}`}
      ref={elRef}
      className="absolute cursor-move select-none"
      style={{
        left: source.x * scale,
        top: source.y * scale,
        width: source.w * scale,
        height: source.h * scale,
      }}
      onMouseDown={handleBodyMouseDown}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Source box face — clips content to border-radius */}
      <div
        id={`lb-canvas-source-face-${source.id}`}
        className={cn(
          'absolute inset-0 box-border overflow-hidden',
          selected && 'shadow-[0_0_0_2px_#22d3ee,0_0_18px_rgba(34,211,238,0.25)]',
        )}
        style={{
          background: source.bgColor,
          border: `${(source.borderWidth || 0) * scale}px solid ${source.borderColor || 'rgba(255,255,255,0.15)'}`,
          borderRadius: (source.borderRadius || 0) * scale,
        }}
      >
        {/* Source label */}
        <span
          id={`lb-canvas-source-label-${source.id}`}
          className="absolute top-0.5 left-1 font-mono font-bold pointer-events-none text-white/50 leading-none"
          style={{ fontSize: Math.max(7, 10 * scale) }}
        >
          {source.label}
        </span>

        {/* Play icon */}
        <span
          className="absolute inset-0 flex items-center justify-center text-white/10 pointer-events-none"
          style={{ fontSize: Math.max(10, 24 * scale) }}
        >
          ▶
        </span>
      </div>

      {/* Caption — sibling of source face, positioned at bottom of source area (matching CAPTION_ROTATE: y = pos.h - captionH) */}
      {source.showCaption && (
        <div
          id={`lb-canvas-source-caption-${source.id}`}
          className="absolute left-0 right-0 pointer-events-none overflow-hidden whitespace-nowrap text-ellipsis"
          style={{
            top: (source.h - source.captionFontSize - CAPTION_VERTICAL_PADDING * 2) * scale,
            height: (source.captionFontSize + CAPTION_VERTICAL_PADDING * 2) * scale,
            background: source.captionBg,
            color: source.captionColor,
            fontFamily: source.captionFont,
            fontSize: source.captionFontSize * scale,
            padding: `${CAPTION_VERTICAL_PADDING * scale}px ${3 * scale}px`,
            border: `${(source.captionBorderWidth || 0) * scale}px solid ${source.captionBorderColor || 'transparent'}`,
            borderRadius: `0 0 ${(source.captionRadius || 0) * scale}px ${(source.captionRadius || 0) * scale}px`,
            transition: source.captionAnim ? `all ${source.captionAnim}ms ease` : undefined,
          }}
        >
          {capText}
        </div>
      )}

      {/* Coords tag - visible when selected */}
      {selected && (
        <span
          ref={coordsRef}
          id={`lb-canvas-source-coords-${source.id}`}
          className="absolute top-0.5 right-1 font-mono text-white/40 pointer-events-none leading-none z-20"
          style={{ fontSize: Math.max(6, 8 * scale) }}
        >
          {source.x},{source.y} {source.w}×{source.h}
        </span>
      )}

      {/* 8-directional resize handles - visible only when selected */}
      {selected &&
        ALL_DIRS.map((dir) => (
          <div
            key={dir}
            id={`lb-resize-handle-${dir}-${source.id}`}
            data-resize={dir}
            className={cn('absolute z-10 bg-[#3031cb]', HANDLE_CLASSES[dir])}
            onMouseDown={(e) => handleResizeMouseDown(e, dir)}
          />
        ))}
    </div>
  )
}
