import { useRef, useState, useEffect, useCallback } from 'react'
import { Film, Move } from 'lucide-react'
import { OverlayLayer } from './OverlayLayer'
import type { VideoEditorHook } from './useVideoEditor'
import { AR_MAP } from './VideoEditorTypes'

interface Props {
  editor: VideoEditorHook
}

export function VideoPreview({ editor }: Props) {
  const {
    videoRef,
    imageElsRef,
    videoLoaded,
    currentTime,
    overlays,
    selectedOverlayId,
    markIn,
    markOut,
    aspectRatio,
    arCropCenterX,
    arCropCenterY,
    selectOverlay,
    updateOverlayPartial,
    loadVideo,
    setArCropCenter,
  } = editor

  // Inner container ref - Konva stage and AR frame are sized to this
  const innerRef = useRef<HTMLDivElement>(null)
  const [stageSize, setStageSize] = useState({ w: 0, h: 0 })
  const [isDragOver, setIsDragOver] = useState(false)

  // Track the inner container size (excludes outer padding)
  useEffect(() => {
    const el = innerRef.current
    if (!el) return
    const ro = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect
      setStageSize({ w: Math.round(width), h: Math.round(height) })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Compute AR frame rect using the draggable crop center
  const getARFrame = useCallback(() => {
    if (aspectRatio === 'free' || stageSize.w === 0 || stageSize.h === 0) return null
    const ratio = AR_MAP[aspectRatio]
    let frameWidth: number, frameHeight: number
    if (stageSize.w / stageSize.h > ratio) {
      frameHeight = stageSize.h
      frameWidth = Math.round(frameHeight * ratio)
    } else {
      frameWidth = stageSize.w
      frameHeight = Math.round(frameWidth / ratio)
    }
    // Clamp so the frame never goes outside the inner container
    const frameX = Math.round(Math.max(0, Math.min(stageSize.w - frameWidth, arCropCenterX * stageSize.w - frameWidth / 2)))
    const frameY = Math.round(Math.max(0, Math.min(stageSize.h - frameHeight, arCropCenterY * stageSize.h - frameHeight / 2)))
    return { frameX, frameY, frameWidth, frameHeight }
  }, [aspectRatio, stageSize, arCropCenterX, arCropCenterY])

  const arFrame = getARFrame()

  const hasSelection = markIn != null && markOut != null
  const selectionDuration = hasSelection ? (markOut! - markIn!) : 0

  // ── AR frame drag (captured at mousedown to avoid stale closure issues) ──────
  const handleArFrameDragStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!arFrame || !innerRef.current) return

    const startMouseX = e.clientX
    const startMouseY = e.clientY
    const startCenterX = arCropCenterX
    const startCenterY = arCropCenterY
    // Precompute min/max center values so the frame stays inside bounds
    const halfFrameWidthFraction = arFrame.frameWidth / stageSize.w / 2
    const halfFrameHeightFraction = arFrame.frameHeight / stageSize.h / 2

    const onMouseMove = (moveEvent: MouseEvent) => {
      const inner = innerRef.current
      if (!inner) return
      const dx = (moveEvent.clientX - startMouseX) / inner.offsetWidth
      const dy = (moveEvent.clientY - startMouseY) / inner.offsetHeight
      const newCenterX = Math.max(halfFrameWidthFraction, Math.min(1 - halfFrameWidthFraction, startCenterX + dx))
      const newCenterY = Math.max(halfFrameHeightFraction, Math.min(1 - halfFrameHeightFraction, startCenterY + dy))
      setArCropCenter(newCenterX, newCenterY)
    }

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
    }

    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
  }, [arFrame, arCropCenterX, arCropCenterY, stageSize, setArCropCenter])

  // ── Drag-and-drop video file onto preview ────────────────────────────────────
  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    if (e.relatedTarget === null || !e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragOver(false)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragOver(false)
    const droppedVideoFile = Array.from(e.dataTransfer.files).find(f => f.type.startsWith('video/'))
    if (droppedVideoFile) loadVideo(droppedVideoFile)
  }, [loadVideo])

  return (
    // Outer container: flex-col so inner uses flex-1 to fill height.
    // p-4 ensures AR outlines and video edges are never flush against the shell.
    <div
      id="ve-preview-wrap"
      className={`relative flex flex-1 flex-col bg-black p-4 transition-colors ${isDragOver ? 'bg-blue-950/40' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Drag-over overlay */}
      {isDragOver && (
        <div id="ve-drag-overlay" className="pointer-events-none absolute inset-0 z-50 flex items-center justify-center border-2 border-dashed border-blue-500">
          <div className="rounded-xl bg-blue-500/20 px-6 py-4 text-center">
            <Film size={32} className="mx-auto mb-2 text-blue-400" />
            <p className="text-sm font-semibold text-blue-300">Drop video here</p>
          </div>
        </div>
      )}

      {/* Inner container: ResizeObserver target, Konva stage sized to this */}
      <div
        id="ve-preview-inner"
        ref={innerRef}
        className="relative flex flex-1 items-center justify-center overflow-hidden"
      >
        {/* No video placeholder */}
        {!videoLoaded && (
          <div id="ve-no-video-placeholder" className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center gap-3">
            <Film size={48} className="text-slate-700" />
            <p className="text-xs text-slate-600">Import a video to get started</p>
            <p className="mt-0.5 text-[11px] text-slate-700">or drag &amp; drop a video file here</p>
          </div>
        )}

        {/* Video element - max-h-full max-w-full preserves natural aspect ratio */}
        <video
          id="ve-video"
          ref={videoRef}
          preload="auto"
          className="relative z-[1] block max-h-full max-w-full"
          style={{ display: videoLoaded ? 'block' : 'none', pointerEvents: 'none' }}
        />

        {/* Konva overlay stage - z-index 2 (set in OverlayLayer) */}
        {videoLoaded && (
          <OverlayLayer
            overlays={overlays}
            selectedId={selectedOverlayId}
            currentTime={currentTime}
            stageWidth={stageSize.w}
            stageHeight={stageSize.h}
            imageEls={imageElsRef.current}
            onSelect={selectOverlay}
            onUpdateOverlay={(id, patch) => updateOverlayPartial(id, patch)}
          />
        )}

        {/* AR crop frame - z-[3] so it renders above the Konva stage.
            pointer-events-none so clicks inside the crop area reach Konva.
            Drag handle is the only interactive part. */}
        {arFrame && (
          <div
            id="ve-ar-frame"
            className="pointer-events-none absolute z-[3]"
            style={{
              left: arFrame.frameX,
              top: arFrame.frameY,
              width: arFrame.frameWidth,
              height: arFrame.frameHeight,
              // inset draws the border inside the element so overflow-hidden never clips it
              boxShadow: 'inset 0 0 0 2px rgba(59,130,246,0.8), 0 0 0 9999px rgba(0,0,0,0.55)',
            }}
          >
            {/* Drag handle - centered at the top edge of the crop frame */}
            <div
              id="ve-ar-frame-handle"
              className="pointer-events-auto absolute left-1/2 top-1 z-10 flex -translate-x-1/2 cursor-move items-center gap-1 rounded-sm bg-blue-500/80 px-2 py-0.5 text-[10px] font-semibold text-white hover:bg-blue-500"
              onMouseDown={handleArFrameDragStart}
              title="Drag to reposition crop area"
            >
              <Move size={10} />
              drag to reposition
            </div>
          </div>
        )}

        {/* Selection duration badge */}
        {hasSelection && (
          <div id="ve-selection-badge" className="pointer-events-none absolute left-2 top-2 z-[4] flex items-center gap-1.5 rounded-md bg-black/70 px-2 py-1">
            <div className="h-2 w-2 rounded-full bg-[#3031cb]" />
            <span className="text-xs font-semibold text-white">
              {fmtSec(selectionDuration)} Selected
            </span>
          </div>
        )}

        {/* Active AR ratio label */}
        {aspectRatio !== 'free' && (
          <div id="ve-ar-label" className="pointer-events-none absolute right-3 top-2 z-[4] rounded bg-black/65 px-2 py-0.5 text-xs font-bold text-blue-400">
            {aspectRatio}
          </div>
        )}
      </div>
    </div>
  )
}

function fmtSec(s: number): string {
  s = Math.max(0, s)
  const m = Math.floor(s / 60)
  const sec = Math.floor(s % 60)
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
}
