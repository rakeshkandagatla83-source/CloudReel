import { useEffect, useRef, useState } from 'react'
import { X, Download } from 'lucide-react'
import type { Overlay, TextOverlay } from './VideoEditorTypes'
import { AR_MAP } from './VideoEditorTypes'
import type { AspectRatio } from './VideoEditorTypes'

interface Props {
  videoEl: HTMLVideoElement | null
  markIn: number
  markOut: number
  overlays: Overlay[]
  imageEls: Map<number, HTMLImageElement>
  aspectRatio: AspectRatio
  // Crop center as fraction (0–1) of video dimensions; matches what was shown in preview
  arCropCenterX: number
  arCropCenterY: number
  onClose: () => void
}

type Status = 'rendering' | 'done' | 'failed' | 'cancelled'

export function ExportModal({ videoEl, markIn, markOut, overlays, imageEls, aspectRatio, arCropCenterX, arCropCenterY, onClose }: Props) {
  const [progress, setProgress] = useState(0)
  const [status, setStatus] = useState<Status>('rendering')
  const [detail, setDetail] = useState('Starting…')
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null)
  const [outputInfo, setOutputInfo] = useState('')
  const cancelledRef = useRef(false)
  const recRef = useRef<MediaRecorder | null>(null)

  useEffect(() => {
    if (!videoEl) return
    cancelledRef.current = false
    runExport()
    return () => { cancelledRef.current = true; recRef.current?.stop() }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const runExport = () => {
    if (!videoEl) return
    const FPS = 30
    const sel = markOut - markIn
    const total = Math.ceil(sel * FPS)
    const vw = videoEl.videoWidth || 1280
    const vh = videoEl.videoHeight || 720

    let outW = vw, outH = vh, cropX = 0, cropY = 0
    if (aspectRatio !== 'free') {
      const ratio = AR_MAP[aspectRatio]
      if (vw / vh > ratio) { outH = vh; outW = Math.round(vh * ratio) }
      else { outW = vw; outH = Math.round(vw / ratio) }
      // Use the crop center the user positioned in the preview (clamped to valid range)
      cropX = Math.round(Math.max(0, Math.min(vw - outW, arCropCenterX * vw - outW / 2)))
      cropY = Math.round(Math.max(0, Math.min(vh - outH, arCropCenterY * vh - outH / 2)))
    }

    const oc = document.createElement('canvas')
    oc.width = outW; oc.height = outH
    const ctx = oc.getContext('2d')!

    let stream: MediaStream
    try { stream = oc.captureStream(FPS) } catch {
      setStatus('failed'); setDetail('captureStream not supported. Use Chrome.')
      return
    }

    const mimes = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm', 'video/mp4']
    const mime = mimes.find(m => MediaRecorder.isTypeSupported(m)) ?? ''
    if (!mime) { setStatus('failed'); setDetail('MediaRecorder not supported in this browser.'); return }

    const chunks: Blob[] = []
    const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 8_000_000 })
    recRef.current = rec
    rec.ondataavailable = e => { if (e.data?.size > 0) chunks.push(e.data) }
    rec.onstop = () => {
      if (cancelledRef.current) return
      const blob = new Blob(chunks, { type: mime })
      const url = URL.createObjectURL(blob)
      const ext = mime.includes('mp4') ? 'mp4' : 'webm'
      setDownloadUrl(url)
      setOutputInfo(`${outW}x${outH} · ${aspectRatio} · ${(blob.size / 1024 / 1024).toFixed(1)} MB · .${ext}`)
      setStatus('done')
      setProgress(100)
      setDetail('Click Download to save.')
    }

    const wasPaused = videoEl.paused
    videoEl.pause()
    rec.start()
    let fi = 0

    const next = () => {
      if (cancelledRef.current) { rec.stop(); if (!wasPaused) videoEl.play().catch(() => {}); return }
      if (fi >= total) { rec.stop(); if (!wasPaused) videoEl.play().catch(() => {}); return }

      const t = markIn + fi / FPS
      videoEl.currentTime = t

      let done = false
      const timer = setTimeout(() => {
        if (done) return; done = true
        drawFrame(ctx, videoEl, overlays, imageEls, outW, outH, cropX, cropY, vw, vh, t)
        setProgress(Math.round((fi / total) * 100))
        setDetail(`Frame ${fi + 1}/${total}`)
        fi++; setTimeout(next, 1000 / FPS)
      }, 500)

      const onS = () => {
        if (done) return; done = true; clearTimeout(timer)
        videoEl.removeEventListener('seeked', onS)
        drawFrame(ctx, videoEl, overlays, imageEls, outW, outH, cropX, cropY, vw, vh, t)
        setProgress(Math.round((fi / total) * 100))
        setDetail(`Frame ${fi + 1}/${total}`)
        fi++; setTimeout(next, 1000 / FPS)
      }
      videoEl.addEventListener('seeked', onS, { once: true })
    }
    next()
  }

  const handleCancel = () => {
    cancelledRef.current = true
    recRef.current?.stop()
    setStatus('cancelled')
    onClose()
  }

  return (
    <div id="ve-export-backdrop" className="fixed inset-0 z-50 flex items-center justify-center bg-black/82">
      <div id="ve-export-modal" className="w-96 rounded-xl border border-[#1e2d40] bg-[#0d1625] p-7 text-center">
        <h3 id="ve-export-title" className="mb-1 text-sm font-bold text-white">
          {status === 'rendering' ? 'Exporting…' : status === 'done' ? 'Export Complete ✓' : status === 'failed' ? 'Export Failed' : 'Cancelled'}
        </h3>
        <p id="ve-export-subtitle" className="mb-4 text-xs text-slate-500">
          {status === 'rendering' ? 'Rendering frames with overlays' : outputInfo}
        </p>

        {/* Progress bar */}
        <div id="ve-export-progress-wrap" className="mb-2 h-2.5 overflow-hidden rounded-full bg-[#111c2d]">
          <div
            id="ve-export-progress-fill"
            className="h-full rounded-full bg-blue-600 transition-[width] duration-200"
            style={{ width: `${progress}%` }}
          />
        </div>

        <p id="ve-export-detail" className="mb-5 text-xs text-slate-600">{detail}</p>

        <div id="ve-export-actions" className="flex justify-center gap-2.5">
          {status === 'rendering' && (
            <button
              id="ve-btn-export-cancel"
              className="cursor-pointer rounded-md border border-[#1e2d40] bg-[#1a2535] px-5 py-2 text-sm text-slate-300 hover:bg-[#253649]"
              onClick={handleCancel}
            >
              Cancel
            </button>
          )}
          {status === 'done' && downloadUrl && (
            <a
              id="ve-btn-export-download"
              href={downloadUrl}
              download={`export_${new Date().toISOString().slice(0, 10)}.webm`}
              className="flex cursor-pointer items-center gap-1.5 rounded-md bg-green-700 px-5 py-2 text-sm font-semibold text-white hover:bg-green-600"
            >
              <Download size={14} />
              Download
            </a>
          )}
          {status !== 'rendering' && (
            <button
              id="ve-btn-export-close"
              className="flex cursor-pointer items-center gap-1.5 rounded-md border border-[#1e2d40] bg-[#1a2535] px-5 py-2 text-sm text-slate-300 hover:bg-[#253649]"
              onClick={onClose}
            >
              <X size={14} />
              Close
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Draw one export frame ─────────────────────────────────────────────────────
function drawFrame(
  ctx: CanvasRenderingContext2D,
  vid: HTMLVideoElement,
  overlays: Overlay[],
  imageEls: Map<number, HTMLImageElement>,
  outW: number, outH: number,
  cropX: number, cropY: number,
  vw: number, vh: number,
  t: number,
) {
  ctx.clearRect(0, 0, outW, outH)
  ctx.drawImage(vid, cropX, cropY, outW, outH, 0, 0, outW, outH)

  overlays.forEach(ov => {
    if (t < ov.showFrom || t >= ov.showTo) return
    const x = (ov.xPct / 100) * vw - cropX
    const y = (ov.yPct / 100) * vh - cropY
    const w = (ov.wPct / 100) * vw
    ctx.save()
    ctx.globalAlpha = ov.opacity / 100
    ctx.translate(x, y)
    ctx.rotate((ov.rotation * Math.PI) / 180)
    if (ov.type === 'image') {
      const img = imageEls.get(ov.id)
      if (img) ctx.drawImage(img, 0, 0, w, w * (img.naturalHeight / img.naturalWidth))
    } else {
      drawTextFrame(ctx, ov as TextOverlay, w)
    }
    ctx.restore()
  })
}

function drawTextFrame(ctx: CanvasRenderingContext2D, ov: TextOverlay, w: number) {
  const fs = ov.fontSize
  const lh = fs * ov.lineHeight
  const pad = ov.padding
  const style = `${ov.italic ? 'italic ' : ''}${ov.bold ? 'bold ' : ''}${fs}px ${ov.fontFamily}`
  ctx.font = style
  const lines = ov.text.split('\n')
  let maxW = 0
  lines.forEach(l => { const m = ctx.measureText(l).width; if (m > maxW) maxW = m })
  const bw = Math.min(w, maxW + pad * 2)
  const bh = lines.length * lh + pad * 2
  if (ov.bgOpacity > 0) {
    ctx.fillStyle = hexRgba(ov.bgColor, ov.bgOpacity / 100)
    ctx.fillRect(0, 0, bw, bh)
  }
  if (ov.shadow) { ctx.shadowColor = ov.shadowColor; ctx.shadowBlur = ov.shadowBlur }
  lines.forEach((line, i) => {
    const ty = pad + i * lh + fs
    const tx = ov.align === 'center' ? bw / 2 : ov.align === 'right' ? bw - pad : pad
    ctx.textAlign = ov.align
    if (ov.strokeWidth > 0) {
      ctx.strokeStyle = ov.strokeColor; ctx.lineWidth = ov.strokeWidth * 2
      ctx.strokeText(line, tx, ty)
    }
    ctx.fillStyle = ov.fontColor
    ctx.fillText(line, tx, ty)
  })
  ctx.shadowBlur = 0; ctx.shadowColor = 'transparent'
}

function hexRgba(hex: string, a: number): string {
  hex = hex.replace('#', '')
  if (hex.length === 3) hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2]
  const r = parseInt(hex.slice(0, 2), 16)
  const g = parseInt(hex.slice(2, 4), 16)
  const b = parseInt(hex.slice(4, 6), 16)
  return `rgba(${r},${g},${b},${a})`
}
