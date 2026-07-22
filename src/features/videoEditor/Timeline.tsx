import { useRef, useEffect, useCallback, useState } from 'react'
import { AudioTrackRow } from './AudioTrackRow'
import type { VideoEditorHook } from './useVideoEditor'
import { fmtTime } from './VideoEditorTypes'

const FRAME_COUNT = 16
const OV_COLORS = ['#1a4a8a', '#1a6a3a', '#6a1a4a', '#5a4a1a', '#1a5a5a']
const MIN_VISIBLE_SECONDS = 2

interface Props {
  editor: VideoEditorHook
}

export function Timeline({ editor }: Props) {
  const {
    videoRef,
    videoLoaded,
    videoDuration,
    currentTime,
    markIn,
    markOut,
    overlays,
    audioTracks,
    selectedOverlayId,
    selectedAudioId,
    seekTo,
    selectOverlay,
    selectAudio,
    updateOverlayPartial,
    updateAudioTrack,
  } = editor

  const timelineRef = useRef<HTMLDivElement>(null)
  const rulerRef = useRef<HTMLCanvasElement>(null)
  const filmstripRef = useRef<HTMLDivElement>(null)
  const videoTrackRef = useRef<HTMLDivElement>(null)
  const rulerDragRef = useRef<{ startX: number; startVisibleStart: number; snapVisibleDuration: number } | null>(null)
  const filmstripDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [dragging, setDragging] = useState<{ type: 'in' | 'out' | 'move'; startX: number; startIn: number; startOut: number } | null>(null)
  const [ovDrag, setOvDrag] = useState<{ id: number; startFrom: number; startTo: number; startX: number } | null>(null)
  const [audioDrag, setAudioDrag] = useState<{ id: number; startTime: number; startX: number; isTrim: boolean } | null>(null)

  // ── Visible window ───────────────────────────────────────────────────────
  const [visibleStart, setVisibleStart] = useState(0)
  const [visibleEnd, setVisibleEnd] = useState(0)
  // Filmstrip window is debounced so frames only regenerate after scrolling stops
  const [filmstripStart, setFilmstripStart] = useState(0)
  const [filmstripEnd, setFilmstripEnd] = useState(0)

  useEffect(() => {
    if (videoLoaded && videoDuration > 0) {
      setVisibleStart(0)
      setVisibleEnd(videoDuration)
      setFilmstripStart(0)
      setFilmstripEnd(videoDuration)
    } else if (!videoLoaded) {
      setVisibleStart(0)
      setVisibleEnd(0)
    }
  }, [videoLoaded, videoDuration])

  const visibleDuration = visibleEnd - visibleStart

  const timeToPercent = useCallback(
    (t: number) => (visibleDuration > 0 ? ((t - visibleStart) / visibleDuration) * 100 : 0),
    [visibleDuration, visibleStart]
  )

  const scheduleFilmstripUpdate = useCallback((start: number, end: number) => {
    if (filmstripDebounceRef.current) clearTimeout(filmstripDebounceRef.current)
    filmstripDebounceRef.current = setTimeout(() => {
      setFilmstripStart(start)
      setFilmstripEnd(end)
    }, 350)
  }, [])

  // ── Wheel zoom + pan (non-passive to allow preventDefault) ───────────────
  // Store latest values in refs so the stable listener can read them
  const visibleStartRef = useRef(visibleStart)
  const visibleEndRef = useRef(visibleEnd)
  const videoDurationRef = useRef(videoDuration)
  useEffect(() => { visibleStartRef.current = visibleStart }, [visibleStart])
  useEffect(() => { visibleEndRef.current = visibleEnd }, [visibleEnd])
  useEffect(() => { videoDurationRef.current = videoDuration }, [videoDuration])

  useEffect(() => {
    const el = timelineRef.current
    if (!el) return
    const handler = (e: WheelEvent) => {
      e.preventDefault()
      const dur = videoDurationRef.current
      const vStart = visibleStartRef.current
      const vEnd = visibleEndRef.current
      const vDur = vEnd - vStart
      if (!dur || vDur <= 0) return

      if (e.shiftKey) {
        // Pan left/right
        const panStep = vDur * 0.15 * Math.sign(e.deltaY)
        const newStart = Math.max(0, Math.min(dur - vDur, vStart + panStep))
        const newEnd = newStart + vDur
        setVisibleStart(newStart)
        setVisibleEnd(newEnd)
        scheduleFilmstripUpdate(newStart, newEnd)
      } else {
        // Zoom centered on cursor
        const track = videoTrackRef.current
        if (!track) return
        const rect = track.getBoundingClientRect()
        const cursorRatio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
        const cursorTime = vStart + cursorRatio * vDur

        const factor = e.deltaY > 0 ? 1.3 : 1 / 1.3
        const newDuration = Math.min(dur, Math.max(MIN_VISIBLE_SECONDS, vDur * factor))

        let newStart = cursorTime - cursorRatio * newDuration
        let newEnd = newStart + newDuration

        if (newStart < 0) { newStart = 0; newEnd = newDuration }
        if (newEnd > dur) { newEnd = dur; newStart = newEnd - newDuration }
        newStart = Math.max(0, newStart)

        setVisibleStart(newStart)
        setVisibleEnd(newEnd)
        scheduleFilmstripUpdate(newStart, newEnd)
      }
    }
    el.addEventListener('wheel', handler, { passive: false })
    return () => el.removeEventListener('wheel', handler)
  }, [scheduleFilmstripUpdate])

  // ── Ruler drag: pan ──────────────────────────────────────────────────────
  const handleRulerMouseDown = useCallback((e: React.MouseEvent) => {
    if (!videoLoaded || visibleDuration <= 0) return
    rulerDragRef.current = { startX: e.clientX, startVisibleStart: visibleStart, snapVisibleDuration: visibleDuration }
    const onMove = (ev: MouseEvent) => {
      const drag = rulerDragRef.current
      if (!drag) return
      const dur = videoDurationRef.current
      const trackWidth = videoTrackRef.current?.offsetWidth || 600
      const dx = ((ev.clientX - drag.startX) / trackWidth) * drag.snapVisibleDuration
      const newStart = Math.max(0, Math.min(dur - drag.snapVisibleDuration, drag.startVisibleStart - dx))
      const newEnd = newStart + drag.snapVisibleDuration
      setVisibleStart(newStart)
      setVisibleEnd(newEnd)
      scheduleFilmstripUpdate(newStart, newEnd)
    }
    const onUp = () => {
      rulerDragRef.current = null
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
  }, [videoLoaded, visibleDuration, visibleStart, scheduleFilmstripUpdate])

  // ── Ruler ────────────────────────────────────────────────────────────────
  const drawRuler = useCallback(() => {
    const cv = rulerRef.current
    if (!cv) return
    const W = videoTrackRef.current?.offsetWidth || cv.offsetWidth || 600
    cv.width = W
    cv.height = 16
    const ctx = cv.getContext('2d')!
    ctx.fillStyle = '#060b14'
    ctx.fillRect(0, 0, W, 16)
    if (!visibleDuration) return
    const step = visibleDuration <= 5 ? 1 : visibleDuration <= 30 ? 5 : visibleDuration <= 120 ? 10 : visibleDuration <= 600 ? 30 : 60
    const firstTick = Math.ceil(visibleStart / step) * step
    for (let t = firstTick; t <= visibleEnd + 0.001; t += step) {
      const x = ((t - visibleStart) / visibleDuration) * W
      const inSel = markIn != null && markOut != null && t >= markIn && t <= markOut
      ctx.fillStyle = '#1e2d40'
      ctx.fillRect(x, 12, 1, 4)
      ctx.fillStyle = inSel ? '#3b82f6' : '#475569'
      ctx.font = '8px system-ui'
      ctx.textAlign = x < 16 ? 'left' : x > W - 16 ? 'right' : 'center'
      ctx.fillText(fmtTime(t), x, 10)
    }
    if (markIn != null) {
      ctx.fillStyle = '#3b82f6'
      ctx.fillRect(((markIn - visibleStart) / visibleDuration) * W, 0, 2, 16)
    }
    if (markOut != null) {
      ctx.fillStyle = '#3b82f6'
      ctx.fillRect(((markOut - visibleStart) / visibleDuration) * W, 0, 2, 16)
    }
  }, [visibleDuration, visibleStart, visibleEnd, markIn, markOut])

  useEffect(() => { drawRuler() }, [drawRuler])

  // ── Filmstrip ────────────────────────────────────────────────────────────
  useEffect(() => {
    const container = filmstripRef.current
    const vid = videoRef.current
    if (!container || !vid || !videoLoaded || filmstripEnd <= filmstripStart) return
    container.innerHTML = ''
    const W = container.offsetWidth || 600
    const count = FRAME_COUNT
    const frameW = Math.floor(W / count)
    const windowStart = filmstripStart
    const windowDuration = filmstripEnd - filmstripStart

    for (let i = 0; i < count; i++) {
      const cv = document.createElement('canvas')
      cv.width = frameW
      cv.height = 52
      cv.style.cssText = `display:block;width:${frameW}px;height:52px;flex-shrink:0`
      drawColorFrame(cv, windowStart + (i / (count - 1)) * windowDuration)
      container.appendChild(cv)
    }

    const wasPaused = vid.paused
    vid.pause()
    const times = Array.from({ length: count }, (_, i) =>
      windowStart + (i / Math.max(count - 1, 1)) * windowDuration * 0.999
    )
    const frames = container.querySelectorAll('canvas')
    let idx = 0

    const go = () => {
      if (idx >= count) { vid.currentTime = 0; if (!wasPaused) vid.play().catch(() => {}); return }
      const cv = frames[idx] as HTMLCanvasElement
      const t = times[idx]
      let done = false
      const timer = setTimeout(() => {
        if (done) return; done = true
        try { cv.getContext('2d')!.drawImage(vid, 0, 0, cv.width, cv.height); overlayTC(cv, t) } catch { drawColorFrame(cv, t) }
        idx++; go()
      }, 700)
      const onS = () => {
        if (done) return; done = true; clearTimeout(timer)
        try { cv.getContext('2d')!.drawImage(vid, 0, 0, cv.width, cv.height); overlayTC(cv, t) } catch { drawColorFrame(cv, t) }
        idx++; setTimeout(go, 20)
      }
      vid.addEventListener('seeked', onS, { once: true })
      vid.currentTime = t
    }
    go()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoLoaded, filmstripStart, filmstripEnd])

  // ── Track click (seek) ───────────────────────────────────────────────────
  const handleTrackClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!videoLoaded || !visibleDuration) return
    const r = e.currentTarget.getBoundingClientRect()
    seekTo(visibleStart + ((e.clientX - r.left) / r.width) * visibleDuration)
  }, [videoLoaded, visibleDuration, visibleStart, seekTo])

  // ── Mark handle drag ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!dragging) return
    const onMove = (e: MouseEvent) => {
      const track = videoTrackRef.current
      if (!track || !visibleDuration) return
      const W = track.offsetWidth || 600
      const dx = ((e.clientX - dragging.startX) / W) * visibleDuration
      if (dragging.type === 'in') {
        const ni = Math.max(0, Math.min(dragging.startIn + dx, dragging.startOut - 0.1))
        seekTo(ni)
      } else if (dragging.type === 'out') {
        seekTo(Math.max(dragging.startIn + 0.1, Math.min(videoDuration, dragging.startOut + dx)))
      } else {
        const selectionDuration = dragging.startOut - dragging.startIn
        let ni = Math.max(0, dragging.startIn + dx)
        let no = ni + selectionDuration
        if (no > videoDuration) { no = videoDuration; ni = no - selectionDuration }
        seekTo(ni)
      }
    }
    const onUp = () => setDragging(null)
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
    return () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp) }
  }, [dragging, visibleDuration, videoDuration, seekTo, editor])

  // ── Overlay clip drag ────────────────────────────────────────────────────
  useEffect(() => {
    if (!ovDrag) return
    const onMove = (e: MouseEvent) => {
      const track = videoTrackRef.current
      if (!track || !visibleDuration) return
      const W = track.offsetWidth || 600
      const dx = ((e.clientX - ovDrag.startX) / W) * visibleDuration
      const clipDuration = ovDrag.startTo - ovDrag.startFrom
      let nf = Math.max(0, ovDrag.startFrom + dx)
      let nt = nf + clipDuration
      if (nt > videoDuration) { nt = videoDuration; nf = nt - clipDuration }
      updateOverlayPartial(ovDrag.id, { showFrom: nf, showTo: nt })
    }
    const onUp = () => setOvDrag(null)
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
    return () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp) }
  }, [ovDrag, visibleDuration, videoDuration, updateOverlayPartial])

  // ── Audio clip drag ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!audioDrag) return
    const onMove = (e: MouseEvent) => {
      const track = videoTrackRef.current
      if (!track || !visibleDuration) return
      const W = track.offsetWidth || 600
      const dx = ((e.clientX - audioDrag.startX) / W) * visibleDuration
      const ns = Math.max(0, Math.min(videoDuration - 0.1, audioDrag.startTime + dx))
      updateAudioTrack(audioDrag.id, 'startTime', ns)
    }
    const onUp = () => setAudioDrag(null)
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
    return () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp) }
  }, [audioDrag, visibleDuration, videoDuration, updateAudioTrack])

  const playheadPct = timeToPercent(currentTime)
  const selLeft = markIn != null ? timeToPercent(markIn) : 0
  const selWidth = markIn != null && markOut != null && visibleDuration > 0
    ? ((markOut - markIn) / visibleDuration) * 100 : 0

  return (
    <div
      id="ve-timeline"
      ref={timelineRef}
      className="flex shrink-0 flex-col gap-1.5 bg-[#080f1c] px-3 py-2"
    >
      {/* Ruler + Video track share a relative container so the playhead spans both */}
      <div id="ve-ruler-track-area" className="relative flex flex-col gap-1.5">
        {/* Ruler - drag to pan */}
        <div
          id="ve-ruler-wrap"
          className="flex cursor-ew-resize select-none items-center gap-1.5"
          onMouseDown={handleRulerMouseDown}
        >
          <span className="w-9 shrink-0" />
          <canvas id="ve-ruler" ref={rulerRef} className="block h-4 flex-1" />
        </div>

        {/* Video track */}
        <div id="ve-video-track-row" className="flex items-center gap-1.5">
          <span id="ve-video-track-label" className="w-9 shrink-0 text-right text-[9px] text-slate-600">Video</span>
          <div
            id="ve-video-track"
            ref={videoTrackRef}
            className="relative h-14 flex-1 cursor-pointer overflow-hidden rounded bg-primary-bg"
            onClick={handleTrackClick}
          >
            {/* Filmstrip */}
            <div id="ve-filmstrip" ref={filmstripRef} className="absolute inset-0 flex" />

            {/* Dim left */}
            {markIn != null && (
              <div className="pointer-events-none absolute bottom-0 left-0 top-0 z-10 bg-black/60" style={{ width: `${selLeft}%` }} />
            )}
            {/* Dim right */}
            {markOut != null && visibleDuration > 0 && (
              <div className="pointer-events-none absolute bottom-0 right-0 top-0 z-10 bg-black/60" style={{ width: `${100 - selLeft - selWidth}%` }} />
            )}

            {/* Selection region */}
            {markIn != null && markOut != null && (
              <div
                id="ve-selection-region"
                className="pointer-events-none absolute bottom-0 top-0 z-20 border-2 border-blue-500"
                style={{ left: `${selLeft}%`, width: `${selWidth}%` }}
              >
                <div className="absolute inset-0 bg-blue-500/10" />
                {/* In handle */}
                <div
                  id="ve-handle-in"
                  className="pointer-events-auto absolute bottom-0 left-0 top-0 z-30 flex w-2.5 cursor-ew-resize items-center justify-center bg-blue-500/40"
                  onMouseDown={e => { e.preventDefault(); e.stopPropagation(); setDragging({ type: 'in', startX: e.clientX, startIn: markIn!, startOut: markOut! }) }}
                >
                  <div className="h-2/3 w-1 rounded-full bg-blue-400" />
                </div>
                {/* Out handle */}
                <div
                  id="ve-handle-out"
                  className="pointer-events-auto absolute bottom-0 right-0 top-0 z-30 flex w-2.5 cursor-ew-resize items-center justify-center bg-blue-500/40"
                  onMouseDown={e => { e.preventDefault(); e.stopPropagation(); setDragging({ type: 'out', startX: e.clientX, startIn: markIn!, startOut: markOut! }) }}
                >
                  <div className="h-2/3 w-1 rounded-full bg-blue-400" />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Playhead - spans ruler + video track */}
        <div
          id="ve-playhead"
          className="pointer-events-none absolute bottom-0 top-0 z-40 w-0.5 bg-[#3031cb]"
          style={{ left: `calc(2.625rem + (100% - 2.625rem) * ${playheadPct / 100})` }}
        >
          <div className="absolute left-1/2 top-0 -translate-x-1/2 border-x-4 border-t-6 border-x-transparent border-t-[#3031cb]" />
        </div>
      </div>

      {/* Overlay tracks */}
      {overlays.map(ov => (
        <div key={ov.id} id={`ve-ov-track-row-${ov.id}`} className="flex items-center gap-1.5">
          <span className="w-9 shrink-0 truncate text-right text-[8px] text-slate-600" title={ov.name}>
            {ov.type === 'text' ? 'T:' : ''}{ov.name.slice(0, 5)}
          </span>
          <div className="relative h-6 flex-1 overflow-hidden rounded bg-primary-bg" style={{ minWidth: 0 }}>
            {visibleDuration > 0 && (
              <div
                id={`ve-ov-clip-${ov.id}`}
                className={`absolute bottom-0.5 top-0.5 flex cursor-pointer items-center overflow-hidden rounded-sm border border-white/15 px-1.5 text-[9px] font-semibold text-white ${
                  selectedOverlayId === ov.id ? 'outline outline-1 outline-white/60' : ''
                }`}
                style={{
                  left: `${timeToPercent(ov.showFrom)}%`,
                  width: `${((ov.showTo - ov.showFrom) / visibleDuration) * 100}%`,
                  background: ov.type === 'text' ? '#4a1a8a' : OV_COLORS[ov.id % OV_COLORS.length],
                }}
                onClick={() => selectOverlay(ov.id)}
                onMouseDown={e => {
                  e.preventDefault(); e.stopPropagation()
                  setOvDrag({ id: ov.id, startFrom: ov.showFrom, startTo: ov.showTo, startX: e.clientX })
                }}
              >
                <span className="pointer-events-none truncate">{ov.name}</span>
                <div
                  className="absolute bottom-0 left-0 top-0 w-1.5 cursor-ew-resize bg-white/20 hover:bg-white/40"
                  onMouseDown={e => { e.stopPropagation(); e.preventDefault() }}
                />
                <div
                  className="absolute bottom-0 right-0 top-0 w-1.5 cursor-ew-resize bg-white/20 hover:bg-white/40"
                  onMouseDown={e => { e.stopPropagation(); e.preventDefault() }}
                />
              </div>
            )}
          </div>
        </div>
      ))}

      {/* Audio tracks */}
      {audioTracks.map(tr => (
        <div key={tr.id} id={`ve-audio-track-row-${tr.id}`} className="flex items-center gap-1.5">
          <span className="w-9 shrink-0 truncate text-right text-[8px] text-slate-600" title={tr.name}>
            ♪ {tr.name.slice(0, 4)}
          </span>
          <div className="relative h-7 flex-1 overflow-hidden rounded bg-primary-bg">
            <AudioTrackRow
              track={tr}
              videoDuration={videoDuration}
              visibleStart={visibleStart}
              visibleDuration={visibleDuration}
              selected={selectedAudioId === tr.id}
              onSelect={() => selectAudio(tr.id)}
              onDragStart={(startTime, startX) => setAudioDrag({ id: tr.id, startTime, startX, isTrim: false })}
              onTrimStart={(startTime, startX) => setAudioDrag({ id: tr.id, startTime, startX, isTrim: true })}
            />
          </div>
        </div>
      ))}

    </div>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function overlayTC(cv: HTMLCanvasElement, t: number) {
  const ctx = cv.getContext('2d')!
  ctx.fillStyle = 'rgba(0,0,0,0.55)'
  ctx.fillRect(0, cv.height - 14, cv.width, 14)
  ctx.fillStyle = 'rgba(255,255,255,0.9)'
  ctx.font = 'bold 8px system-ui'
  ctx.textAlign = 'center'
  const m = Math.floor(t / 60)
  const s = Math.floor(t % 60)
  ctx.fillText(`${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`, cv.width / 2, cv.height - 4)
}

function drawColorFrame(cv: HTMLCanvasElement, t: number) {
  const ctx = cv.getContext('2d')!
  const g = ctx.createLinearGradient(0, 0, 0, cv.height)
  g.addColorStop(0, '#0d1f2d')
  g.addColorStop(1, '#060b14')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, cv.width, cv.height)
  overlayTC(cv, t)
}
