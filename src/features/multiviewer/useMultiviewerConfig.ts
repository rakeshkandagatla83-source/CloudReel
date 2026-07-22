import { useState, useCallback, useMemo } from 'react'
import { getStorage, setStorage } from '../../lib/storage'
import {
  getStudioChannel,
  RTMP_API,
  RTMP_PREVIEW_BASE,
  WEBRTC_PREVIEW_BASE,
  PARTICIPANTS_API,
} from '../../lib/studioConfig'
import type { Frame, FrameType, LayoutType, MultiviewerConfig } from './types'

const FRAMES_KEY = 'pcr_mv_frames'
const LAYOUT_KEY = 'pcr_mv_layout'

export function useMultiviewerConfig() {
  const config = useMemo<MultiviewerConfig>(() => ({
    channel: getStudioChannel() ?? '',
    webrtcBase: WEBRTC_PREVIEW_BASE,
    rtmpBase: RTMP_PREVIEW_BASE,
    rtmpApi: RTMP_API,
    rtmpToken: getStorage<string>('pcr_token') ?? '',
    participantsApi: PARTICIPANTS_API,
  }), [])

  const [frames, setFramesState] = useState<Frame[]>(
    () => getStorage<Frame[]>(FRAMES_KEY) ?? [],
  )
  const [layout, setLayoutState] = useState<LayoutType>(
    () => getStorage<LayoutType>(LAYOUT_KEY) ?? 'auto',
  )

  const addFrame = useCallback(() => {
    setFramesState(prev => {
      const id = prev.length > 0 ? Math.max(...prev.map(f => f.id)) + 1 : 1
      const next = [...prev, { id, type: '' as FrameType, source: '', label: '' }]
      setStorage(FRAMES_KEY, next)
      return next
    })
  }, [])

  const removeFrame = useCallback((id: number) => {
    setFramesState(prev => {
      const next = prev.filter(f => f.id !== id)
      setStorage(FRAMES_KEY, next)
      return next
    })
  }, [])

  const updateFrame = useCallback((id: number, patch: Partial<Frame>) => {
    setFramesState(prev => {
      const next = prev.map(f => f.id === id ? { ...f, ...patch } : f)
      setStorage(FRAMES_KEY, next)
      return next
    })
  }, [])

  const clearFrames = useCallback(() => {
    setFramesState([])
    setStorage(FRAMES_KEY, [])
  }, [])

  const reorderFrames = useCallback((fromIdx: number, toIdx: number) => {
    setFramesState(prev => {
      const next = [...prev]
      const [moved] = next.splice(fromIdx, 1)
      next.splice(toIdx, 0, moved)
      setStorage(FRAMES_KEY, next)
      return next
    })
  }, [])

  const saveLayout = useCallback((next: LayoutType) => {
    setLayoutState(next)
    setStorage(LAYOUT_KEY, next)
  }, [])

  return {
    config,
    frames, addFrame, removeFrame, updateFrame, clearFrames, reorderFrames,
    layout, saveLayout,
  }
}
