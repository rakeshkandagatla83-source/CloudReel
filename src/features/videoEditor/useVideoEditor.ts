import { useState, useRef, useCallback, useEffect } from 'react'
import type { Overlay, ImageOverlay, TextOverlay, AudioTrack, AspectRatio } from './VideoEditorTypes'

let _ovId = 0
let _audioId = 0

export function useVideoEditor() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const audioElsRef = useRef(new Map<number, HTMLAudioElement>())
  const imageElsRef = useRef(new Map<number, HTMLImageElement>())

  // Refs for stable access inside event handlers
  const markInRef = useRef<number | null>(null)
  const markOutRef = useRef<number | null>(null)
  const audioTracksRef = useRef<AudioTrack[]>([])

  const [videoLoaded, setVideoLoaded] = useState(false)
  const [videoDuration, setVideoDuration] = useState(0)
  const [videoLoadError, setVideoLoadError] = useState<string | null>(null)
  const [currentTime, setCurrentTime] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [markIn, setMarkIn] = useState<number | null>(null)
  const [markOut, setMarkOut] = useState<number | null>(null)
  const [overlays, setOverlays] = useState<Overlay[]>([])
  const [audioTracks, setAudioTracks] = useState<AudioTrack[]>([])
  const [selectedOverlayId, setSelectedOverlayId] = useState<number | null>(null)
  const [selectedAudioId, setSelectedAudioId] = useState<number | null>(null)
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('free')
  // Crop center as a fraction of the preview stage (0.5 = centered).
  // Stored here so ExportModal can use it for accurate crop coordinates.
  const [arCropCenterX, setArCropCenterX] = useState(0.5)
  const [arCropCenterY, setArCropCenterY] = useState(0.5)

  // Reset crop position to center whenever the ratio changes
  useEffect(() => {
    setArCropCenterX(0.5)
    setArCropCenterY(0.5)
  }, [aspectRatio])

  const setArCropCenter = useCallback((x: number, y: number) => {
    setArCropCenterX(x)
    setArCropCenterY(y)
  }, [])

  // Keep refs in sync
  useEffect(() => { markInRef.current = markIn }, [markIn])
  useEffect(() => { markOutRef.current = markOut }, [markOut])
  useEffect(() => { audioTracksRef.current = audioTracks }, [audioTracks])

  // ── Audio sync ──────────────────────────────────────────────────────────────
  const syncAudio = useCallback(() => {
    const vid = videoRef.current
    if (!vid) return
    const t = vid.currentTime
    audioTracksRef.current.forEach(tr => {
      const el = audioElsRef.current.get(tr.id)
      if (!el) return
      if (tr.muted) {
        if (!el.paused) el.pause()
        return
      }
      const lt = t - tr.startTime
      if (lt >= 0 && lt < tr.duration) {
        if (Math.abs(el.currentTime - lt) > 0.25) el.currentTime = lt
        el.volume = tr.volume / 100
        if (!vid.paused && el.paused) el.play().catch(() => {})
        if (vid.paused && !el.paused) el.pause()
      } else {
        if (!el.paused) el.pause()
      }
    })
  }, [])

  // ── Video event listeners ───────────────────────────────────────────────────
  useEffect(() => {
    const vid = videoRef.current
    if (!vid) return

    const onTimeUpdate = () => {
      const t = vid.currentTime
      setCurrentTime(t)
      // loop check
      const mi = markInRef.current
      const mo = markOutRef.current
      if (mi != null && mo != null && t >= mo) vid.currentTime = mi
      syncAudio()
    }
    const onPlay = () => setPlaying(true)
    const onPause = () => {
      setPlaying(false)
      audioElsRef.current.forEach(el => { if (!el.paused) el.pause() })
    }
    const onSeeked = () => syncAudio()
    const onEnded = () => setPlaying(false)

    vid.addEventListener('timeupdate', onTimeUpdate)
    vid.addEventListener('play', onPlay)
    vid.addEventListener('pause', onPause)
    vid.addEventListener('seeked', onSeeked)
    vid.addEventListener('ended', onEnded)
    return () => {
      vid.removeEventListener('timeupdate', onTimeUpdate)
      vid.removeEventListener('play', onPlay)
      vid.removeEventListener('pause', onPause)
      vid.removeEventListener('seeked', onSeeked)
      vid.removeEventListener('ended', onEnded)
    }
  }, [syncAudio])

  // ── Video loading ───────────────────────────────────────────────────────────
  const loadVideo = useCallback((file: File) => {
    const vid = videoRef.current
    if (!vid) return
    const url = URL.createObjectURL(file)
    vid.src = url
    vid.load()
    const onMeta = () => {
      setVideoDuration(vid.duration)
      setVideoLoaded(true)
      setMarkIn(null)
      setMarkOut(null)
      markInRef.current = null
      markOutRef.current = null
      setCurrentTime(0)
      setArCropCenterX(0.5)
      setArCropCenterY(0.5)
      vid.removeEventListener('loadedmetadata', onMeta)
    }
    vid.addEventListener('loadedmetadata', onMeta)
  }, [])

  const loadVideoFromUrl = useCallback((url: string) => {
    const vid = videoRef.current
    if (!vid) return
    setVideoLoadError(null)
    vid.src = url
    vid.load()
    const onMeta = () => {
      setVideoDuration(vid.duration)
      setVideoLoaded(true)
      setMarkIn(null)
      setMarkOut(null)
      markInRef.current = null
      markOutRef.current = null
      setCurrentTime(0)
      setArCropCenterX(0.5)
      setArCropCenterY(0.5)
      vid.removeEventListener('loadedmetadata', onMeta)
      vid.removeEventListener('error', onLoadError)
    }
    const onLoadError = () => {
      setVideoLoadError(
        'Could not load the video. The asset may be unavailable or blocked by CORS policy. ' +
        'Try downloading and importing as a local file instead.'
      )
      vid.removeEventListener('loadedmetadata', onMeta)
      vid.removeEventListener('error', onLoadError)
    }
    vid.addEventListener('loadedmetadata', onMeta)
    vid.addEventListener('error', onLoadError)
  }, [])

  const removeVideo = useCallback(() => {
    const vid = videoRef.current
    if (!vid) return
    vid.pause()
    vid.src = ''
    setVideoLoaded(false)
    setVideoDuration(0)
    setCurrentTime(0)
    setMarkIn(null)
    setMarkOut(null)
    setPlaying(false)
  }, [])

  // ── Playback ────────────────────────────────────────────────────────────────
  const togglePlay = useCallback(() => {
    const vid = videoRef.current
    if (!vid || !videoRef.current) return
    if (vid.paused) {
      const mi = markInRef.current
      const mo = markOutRef.current
      if (mi != null && vid.currentTime >= (mo ?? vid.duration)) vid.currentTime = mi
      vid.play().catch(() => {})
    } else {
      vid.pause()
    }
  }, [])

  const stepBy = useCallback((s: number) => {
    const vid = videoRef.current
    if (!vid) return
    vid.currentTime = Math.max(0, Math.min(vid.duration, vid.currentTime + s))
  }, [])

  const seekTo = useCallback((t: number) => {
    const vid = videoRef.current
    if (!vid) return
    vid.currentTime = Math.max(0, Math.min(vid.duration, t))
  }, [])

  const setVolume = useCallback((v: number) => {
    const vid = videoRef.current
    if (!vid) return
    vid.volume = v / 100
  }, [])

  // ── Marks ───────────────────────────────────────────────────────────────────
  const setMarkInPoint = useCallback(() => {
    const vid = videoRef.current
    if (!vid) return
    const t = vid.currentTime
    setMarkIn(t)
    markInRef.current = t
    setMarkOut(prev => {
      if (prev != null && t >= prev) {
        const next = Math.min(vid.duration, t + 1)
        markOutRef.current = next
        return next
      }
      return prev
    })
  }, [])

  const setMarkOutPoint = useCallback(() => {
    const vid = videoRef.current
    if (!vid) return
    const t = vid.currentTime
    setMarkOut(t)
    markOutRef.current = t
    setMarkIn(prev => {
      if (prev == null) { markInRef.current = 0; return 0 }
      if (t <= prev) {
        const next = Math.max(0, t - 1)
        markInRef.current = next
        return next
      }
      return prev
    })
  }, [])

  const clearMarks = useCallback(() => {
    setMarkIn(null)
    setMarkOut(null)
    markInRef.current = null
    markOutRef.current = null
  }, [])

  // ── Overlays ────────────────────────────────────────────────────────────────
  const makeBase = useCallback((type: 'image' | 'text', name: string) => {
    const duration = videoRef.current?.duration ?? 10
    return {
      id: ++_ovId,
      type,
      name,
      xPct: 5,
      yPct: 5,
      wPct: 20,
      opacity: 100,
      rotation: 0,
      showFrom: markInRef.current ?? 0,
      showTo: markOutRef.current ?? duration,
    }
  }, [])

  const addImageOverlayFromUrl = useCallback((url: string, name: string) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      const base = makeBase('image', name)
      const ov: ImageOverlay = { ...base, type: 'image', url }
      imageElsRef.current.set(ov.id, img)
      setOverlays(prev => [...prev, ov])
      setSelectedOverlayId(ov.id)
      setSelectedAudioId(null)
    }
    img.onerror = () => {
      const base = makeBase('image', name)
      const ov: ImageOverlay = { ...base, type: 'image', url }
      const fallback = new Image()
      fallback.src = url
      imageElsRef.current.set(ov.id, fallback)
      setOverlays(prev => [...prev, ov])
      setSelectedOverlayId(ov.id)
      setSelectedAudioId(null)
    }
    img.src = url
  }, [makeBase])

  const addImageOverlay = useCallback((file: File) => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      const base = makeBase('image', file.name.replace(/\.[^.]+$/, ''))
      const ov: ImageOverlay = { ...base, type: 'image', url }
      imageElsRef.current.set(ov.id, img)
      setOverlays(prev => [...prev, ov])
      setSelectedOverlayId(ov.id)
      setSelectedAudioId(null)
    }
    img.src = url
  }, [makeBase])

  const addTextOverlay = useCallback(() => {
    const base = makeBase('text', `Text ${_ovId + 1}`)
    const ov: TextOverlay = {
      ...base,
      type: 'text',
      text: 'Your Text Here',
      fontSize: 32,
      fontFamily: 'Arial',
      fontColor: '#ffffff',
      bgColor: '#000000',
      bgOpacity: 0,
      bold: false,
      italic: false,
      underline: false,
      align: 'center',
      letterSpacing: 0,
      lineHeight: 1.3,
      padding: 8,
      borderRadius: 4,
      strokeColor: '#000000',
      strokeWidth: 0,
      shadow: false,
      shadowColor: '#000000',
      shadowBlur: 6,
      wPct: 25,
    }
    setOverlays(prev => [...prev, ov])
    setSelectedOverlayId(ov.id)
    setSelectedAudioId(null)
  }, [makeBase])

  const updateOverlay = useCallback(<K extends keyof Overlay>(id: number, key: K, value: Overlay[K]) => {
    setOverlays(prev => prev.map(ov => ov.id === id ? { ...ov, [key]: value } : ov))
  }, [])

  const updateOverlayPartial = useCallback((id: number, patch: Partial<Overlay>) => {
    setOverlays(prev => prev.map(ov => ov.id === id ? { ...ov, ...patch } as Overlay : ov))
  }, [])

  const removeOverlay = useCallback((id: number) => {
    setOverlays(prev => prev.filter(ov => ov.id !== id))
    imageElsRef.current.delete(id)
    setSelectedOverlayId(prev => (prev === id ? null : prev))
  }, [])

  const selectOverlay = useCallback((id: number | null) => {
    setSelectedOverlayId(id)
    setSelectedAudioId(null)
  }, [])

  const moveOverlayUp = useCallback((id: number) => {
    setOverlays(prev => {
      const idx = prev.findIndex(o => o.id === id)
      if (idx < 0 || idx === prev.length - 1) return prev
      const next = [...prev]
      ;[next[idx], next[idx + 1]] = [next[idx + 1], next[idx]]
      return next
    })
  }, [])

  const moveOverlayDown = useCallback((id: number) => {
    setOverlays(prev => {
      const idx = prev.findIndex(o => o.id === id)
      if (idx <= 0) return prev
      const next = [...prev]
      ;[next[idx - 1], next[idx]] = [next[idx], next[idx - 1]]
      return next
    })
  }, [])

  // ── Audio tracks ────────────────────────────────────────────────────────────
  const addAudioTrack = useCallback((file: File) => {
    const url = URL.createObjectURL(file)
    const el = new Audio()
    el.src = url
    el.preload = 'metadata'
    const onMeta = () => {
      const id = ++_audioId
      const tr: AudioTrack = {
        id,
        name: file.name.replace(/\.[^.]+$/, ''),
        url,
        duration: el.duration,
        startTime: 0,
        volume: 100,
        muted: false,
      }
      audioElsRef.current.set(id, el)
      setAudioTracks(prev => {
        const next = [...prev, tr]
        audioTracksRef.current = next
        return next
      })
      setSelectedAudioId(id)
      setSelectedOverlayId(null)
      el.removeEventListener('loadedmetadata', onMeta)
    }
    el.addEventListener('loadedmetadata', onMeta)
    el.load()
  }, [])

  const updateAudioTrack = useCallback(<K extends keyof AudioTrack>(id: number, key: K, value: AudioTrack[K]) => {
    setAudioTracks(prev => {
      const next = prev.map(tr => tr.id === id ? { ...tr, [key]: value } : tr)
      audioTracksRef.current = next
      return next
    })
    if (key === 'volume') {
      const el = audioElsRef.current.get(id)
      if (el) el.volume = (value as number) / 100
    }
  }, [])

  const removeAudioTrack = useCallback((id: number) => {
    const el = audioElsRef.current.get(id)
    if (el) { el.pause(); el.src = '' }
    audioElsRef.current.delete(id)
    setAudioTracks(prev => {
      const next = prev.filter(tr => tr.id !== id)
      audioTracksRef.current = next
      return next
    })
    setSelectedAudioId(prev => (prev === id ? null : prev))
  }, [])

  const selectAudio = useCallback((id: number | null) => {
    setSelectedAudioId(id)
    setSelectedOverlayId(null)
  }, [])

  const clearVideoLoadError = useCallback(() => setVideoLoadError(null), [])

  return {
    // refs
    videoRef,
    imageElsRef,
    audioElsRef,
    // state
    videoLoaded,
    videoDuration,
    currentTime,
    playing,
    markIn,
    markOut,
    overlays,
    audioTracks,
    selectedOverlayId,
    selectedAudioId,
    aspectRatio,
    // video
    loadVideo,
    loadVideoFromUrl,
    addImageOverlayFromUrl,
    removeVideo,
    togglePlay,
    stepBy,
    seekTo,
    setVolume,
    // marks
    setMarkInPoint,
    setMarkOutPoint,
    clearMarks,
    // overlays
    addImageOverlay,
    addTextOverlay,
    updateOverlay,
    updateOverlayPartial,
    removeOverlay,
    selectOverlay,
    moveOverlayUp,
    moveOverlayDown,
    // audio
    addAudioTrack,
    updateAudioTrack,
    removeAudioTrack,
    selectAudio,
    // aspect ratio
    setAspectRatio,
    arCropCenterX,
    arCropCenterY,
    setArCropCenter,
    // errors
    videoLoadError,
    clearVideoLoadError,
  }
}

export type VideoEditorHook = ReturnType<typeof useVideoEditor>
