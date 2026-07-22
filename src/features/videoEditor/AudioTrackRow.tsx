import { useEffect, useRef } from 'react'
import WaveSurfer from 'wavesurfer.js'
import type { AudioTrack } from './VideoEditorTypes'

interface Props {
  track: AudioTrack
  videoDuration: number
  visibleStart: number
  visibleDuration: number
  selected: boolean
  onSelect: () => void
  onDragStart: (startTime: number, startX: number) => void
  onTrimStart: (startTime: number, startX: number) => void
}

const OV_COLORS = ['#1a4a8a', '#1a6a3a', '#6a1a4a', '#5a4a1a', '#1a5a5a']

export function AudioTrackRow({ track, videoDuration, visibleStart, visibleDuration, selected, onSelect, onDragStart, onTrimStart }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const wsRef = useRef<WaveSurfer | null>(null)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ws = WaveSurfer.create({
      container: el,
      waveColor: '#4ade80',
      progressColor: '#16a34a',
      height: 24,
      barWidth: 1,
      barGap: 0,
      normalize: true,
      interact: false,
      backend: 'WebAudio',
    })
    ws.load(track.url)
    wsRef.current = ws
    return () => { ws.destroy(); wsRef.current = null }
   
  }, [track.url])

  const left = visibleDuration > 0 ? ((track.startTime - visibleStart) / visibleDuration) * 100 : 0
  const clipDuration = Math.min(track.duration, videoDuration - track.startTime)
  const width = visibleDuration > 0 ? (clipDuration / visibleDuration) * 100 : 0

  const color = track.muted ? '#374151' : OV_COLORS[track.id % OV_COLORS.length]

  return (
    <div
      className={`absolute top-0.5 bottom-0.5 rounded-sm border cursor-pointer overflow-hidden flex items-center ${
        selected ? 'border-white/60 outline outline-1 outline-white/40' : 'border-white/15'
      }`}
      style={{ left: `${left}%`, width: `${width}%`, background: color }}
      onClick={e => { e.stopPropagation(); onSelect() }}
      onMouseDown={e => {
        if ((e.target as HTMLElement).dataset.trim) return
        e.preventDefault()
        onDragStart(track.startTime, e.clientX)
      }}
    >
      {/* Waveform */}
      <div ref={containerRef} className="absolute inset-0 opacity-50 pointer-events-none" />

      {/* Label */}
      <span className="relative z-10 truncate px-1.5 text-[9px] font-semibold text-white pointer-events-none">
        {track.muted ? '🔇 ' : '♪ '}{track.name}
      </span>

      {/* Left trim handle */}
      <div
        data-trim="left"
        className="absolute left-0 top-0 bottom-0 w-1.5 cursor-ew-resize bg-white/25 hover:bg-white/50"
        onMouseDown={e => { e.stopPropagation(); e.preventDefault(); onTrimStart(track.startTime, e.clientX) }}
      />
    </div>
  )
}
