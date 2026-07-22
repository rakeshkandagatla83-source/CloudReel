import { useState, useRef, useEffect, useCallback } from 'react'
import { X, Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, Maximize, Repeat, Film } from 'lucide-react'
import { cn } from '../../lib/utils'
import type { VideoPopupState } from '../../types/studio'

interface Props {
  state: VideoPopupState | null
  onClose: () => void
}

function fmtTime(s: number): string {
  if (!isFinite(s)) return '0:00'
  const m = Math.floor(s / 60), sec = Math.floor(s % 60)
  return `${m}:${sec.toString().padStart(2, '0')}`
}

export function VideoPlayerPopup({ state, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [paused, setPaused] = useState(true)
  const [progress, setProgress] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(1)
  const [muted, setMuted] = useState(false)
  const [loop, setLoop] = useState(false)
  const [speed, setSpeed] = useState(1)
  const [showIcon, setShowIcon] = useState<string | null>(null)
  const [noSource, setNoSource] = useState(false)
  const iconTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [pos, setPos] = useState(() => ({ x: window.innerWidth / 2 - 340, y: 60 }))
  const dragRef = useRef({ dragging: false, ox: 0, oy: 0 })

  const showFlash = (icon: string) => {
    setShowIcon(icon)
    if (iconTimerRef.current) clearTimeout(iconTimerRef.current)
    iconTimerRef.current = setTimeout(() => setShowIcon(null), 600)
  }

  useEffect(() => {
    if (!state || !videoRef.current) return
    const v = videoRef.current
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setNoSource(false)
    setPaused(true)
    v.src = state.url; v.load()
    v.play().catch((err: unknown) => {
      if (err instanceof DOMException && err.name === 'NotSupportedError') setNoSource(true)
    })
  }, [state])

  useEffect(() => {
    if (!state) return
    const v = videoRef.current; if (!v) return
    const onTimeUpdate = () => { setCurrentTime(v.currentTime); if (v.duration) setProgress((v.currentTime / v.duration) * 100) }
    const onMeta = () => setDuration(v.duration)
    const onPlay = () => setPaused(false)
    const onPause = () => setPaused(true)
    v.addEventListener('timeupdate', onTimeUpdate); v.addEventListener('loadedmetadata', onMeta)
    v.addEventListener('play', onPlay); v.addEventListener('pause', onPause)
    return () => {
      v.removeEventListener('timeupdate', onTimeUpdate); v.removeEventListener('loadedmetadata', onMeta)
      v.removeEventListener('play', onPlay); v.removeEventListener('pause', onPause)
    }
  }, [state])

  const togglePlay = useCallback(() => {
    const v = videoRef.current; if (!v) return
    if (v.paused) { v.play().catch(() => {}); showFlash('▶') } else { v.pause(); showFlash('⏸') }
  }, [])

  const skip = useCallback((sec: number) => {
    const v = videoRef.current; if (!v) return
    v.currentTime = Math.max(0, Math.min(v.duration || 0, v.currentTime + sec))
  }, [])

  const setPlaybackSpeed = useCallback((s: number) => {
    const v = videoRef.current; if (!v) return
    v.playbackRate = s; setSpeed(s)
  }, [])

  const toggleLoop = useCallback(() => {
    const v = videoRef.current; if (!v) return
    v.loop = !v.loop; setLoop(v.loop)
  }, [])

  const handleVolume = useCallback((val: number) => {
    const v = videoRef.current; if (!v) return
    v.volume = val; v.muted = false; setVolume(val); setMuted(false)
  }, [])

  const toggleMute = useCallback(() => {
    const v = videoRef.current; if (!v) return
    v.muted = !v.muted; setMuted(v.muted)
  }, [])

  const handleSeek = useCallback((val: number) => {
    const v = videoRef.current; if (!v || !v.duration) return
    v.currentTime = (val / 100) * v.duration; setProgress(val)
  }, [])

  const toggleFullscreen = useCallback(() => {
    const v = videoRef.current; if (!v) return
    if (!document.fullscreenElement) v.requestFullscreen?.()
    else document.exitFullscreen?.()
  }, [])

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!dragRef.current.dragging) return
      setPos({ x: Math.max(0, e.clientX - dragRef.current.ox), y: Math.max(0, e.clientY - dragRef.current.oy) })
    }
    const onUp = () => { dragRef.current.dragging = false }
    document.addEventListener('mousemove', onMove); document.addEventListener('mouseup', onUp)
    return () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp) }
  }, [])

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (!state) return
      const tag = (document.activeElement as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return
      switch (e.key) {
        case ' ': e.preventDefault(); togglePlay(); break
        case 'ArrowLeft': e.preventDefault(); skip(-5); break
        case 'ArrowRight': e.preventDefault(); skip(5); break
        case 'm': case 'M': toggleMute(); break
        case 'f': case 'F': toggleFullscreen(); break
        case 'Escape': onClose(); break
      }
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [state, togglePlay, skip, toggleMute, toggleFullscreen, onClose])

  if (!state) return null

  const volPct = muted ? 0 : volume
  const btnBase = 'px-2 py-1 text-[10px] border border-white/8 bg-white/3 rounded-md text-white/50 hover:text-white/90 hover:bg-white/7 cursor-pointer flex items-center gap-1 transition-colors'

  return (
    <div
      className="fixed z-600 bg-primary-bg border border-[#3031cb]/30 rounded-xl shadow-[0_8px_60px_rgba(0,0,0,0.9)] flex flex-col overflow-hidden"
      style={{ left: pos.x, top: pos.y, width: 680, minWidth: 480 }}
    >
      {/* Header */}
      <div
        className="flex items-center gap-2 px-3 py-2 bg-[#0a0a14] border-b border-white/6 cursor-move select-none shrink-0"
        onMouseDown={e => {
          if ((e.target as HTMLElement).closest('button')) return
          dragRef.current = { dragging: true, ox: e.clientX - pos.x, oy: e.clientY - pos.y }
        }}
      >
        <Film size={12} className="text-[#3031cb] shrink-0" />
        <span className="flex-1 text-xs text-white/70 font-semibold truncate">{state.name}</span>
        <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/5 text-white/35 border border-white/8">VOD</span>
        <span className="text-[9px] text-white/18 mr-1">drag to move</span>
        <button type="button" onClick={onClose} className="text-white/30 hover:text-[#3031cb] cursor-pointer p-0.5 transition-colors">
          <X size={14} />
        </button>
      </div>

      {/* Video */}
      <div className="relative bg-black shrink-0">
        <video ref={videoRef} className={cn('w-full block max-h-80 bg-black', noSource && 'invisible h-0')} preload="auto" />
        {noSource
          ? <div className="flex items-center justify-center h-32 text-[11px] text-white/35">No playable source found</div>
          : <div className="absolute inset-0 z-10 cursor-pointer flex items-center justify-center" onClick={togglePlay}>
              {showIcon && (
                <div className="bg-black/60 rounded-full w-14 h-14 flex items-center justify-center text-2xl text-white">{showIcon}</div>
              )}
            </div>
        }
      </div>

      {/* Controls */}
      {!noSource && <div className="bg-[#0a0a14] border-t border-white/6 px-3 py-2 flex flex-col gap-2 shrink-0">
        {/* Seek */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-white/35 font-mono min-w-16">{fmtTime(currentTime)} / {fmtTime(duration)}</span>
          <input
            type="range" min="0" max="100" step="0.1" value={progress}
            onChange={e => handleSeek(Number(e.target.value))}
            className="flex-1 h-1 rounded studio-seek accent-[#3031cb] cursor-pointer"
          />
        </div>

        {/* Buttons */}
        <div className="flex items-center gap-1 flex-wrap">
          <button type="button" onClick={() => skip(-10)} className={btnBase}><SkipBack size={10} />10s</button>
          <button type="button" onClick={() => skip(-5)} className={btnBase}><SkipBack size={10} />5s</button>
          <button type="button" onClick={() => skip(-1)} className={btnBase}>1s</button>
          <button type="button" onClick={togglePlay}
            className="px-3 py-1 border border-[#3031cb]/40 bg-[#3031cb]/8 text-[#3031cb] rounded-md cursor-pointer hover:bg-[#3031cb] hover:text-white transition-colors">
            {paused ? <Play size={13} /> : <Pause size={13} />}
          </button>
          <button type="button" onClick={() => skip(1)} className={btnBase}>1s</button>
          <button type="button" onClick={() => skip(5)} className={btnBase}>5s<SkipForward size={10} /></button>
          <button type="button" onClick={() => skip(10)} className={btnBase}>10s<SkipForward size={10} /></button>
          <div className="w-px h-4 bg-white/8" />
          {[0.5, 1, 2, 4].map(s => (
            <button key={s} type="button" onClick={() => setPlaybackSpeed(s)}
              className={cn('px-2 py-1 text-[10px] border rounded-md cursor-pointer transition-colors', speed === s ? 'border-[#3031cb]/40 bg-[#3031cb]/8 text-[#3031cb]' : 'border-white/8 bg-white/3 text-white/50 hover:text-white/90 hover:bg-white/7')}>
              {s}×
            </button>
          ))}
          <div className="w-px h-4 bg-white/8" />
          <button type="button" onClick={toggleLoop}
            className={cn('px-2 py-1 text-[10px] border rounded-md cursor-pointer flex items-center gap-1 transition-colors', loop ? 'border-[#3031cb]/40 bg-[#3031cb]/8 text-[#3031cb]' : 'border-white/8 bg-white/3 text-white/50 hover:text-white/90 hover:bg-white/7')}>
            <Repeat size={10} /> Loop
          </button>
          <button type="button" onClick={toggleFullscreen} className={cn(btnBase)}>
            <Maximize size={10} /> Full
          </button>
        </div>

        {/* Volume */}
        <div className="flex items-center gap-2">
          <button type="button" onClick={toggleMute} className="text-white/40 hover:text-white cursor-pointer transition-colors">
            {volPct === 0 ? <VolumeX size={13} /> : <Volume2 size={13} />}
          </button>
          <input type="range" min="0" max="1" step="0.02" value={muted ? 0 : volume}
            onChange={e => handleVolume(Number(e.target.value))}
            className="w-24 h-1 rounded accent-[#3031cb] cursor-pointer" />
          <span className="text-[10px] text-white/25 font-mono min-w-8">{Math.round(volPct * 100)}%</span>
          <div className="w-px h-4 bg-white/8" />
          <span className="text-[9px] text-white/18">Space=play ←→=5s M=mute F=full</span>
        </div>
      </div>}
    </div>
  )
}
