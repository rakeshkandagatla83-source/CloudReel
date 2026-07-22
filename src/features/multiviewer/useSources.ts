import { useReducer, useEffect, useCallback, useState } from 'react'
import type { Source, MultiviewerConfig } from './types'

interface SourcesState {
  rtmpSources: Source[]
  webrtcSources: Source[]
  loading: boolean
}

type SourcesAction =
  | { type: 'fetching' }
  | { type: 'done'; rtmp: Source[]; webrtc: Source[] }

function reducer(_: SourcesState, action: SourcesAction): SourcesState {
  if (action.type === 'fetching') return { rtmpSources: [], webrtcSources: [], loading: true }
  return { rtmpSources: action.rtmp, webrtcSources: action.webrtc, loading: false }
}

async function loadRtmp(
  rtmpApi: string,
  channel: string,
  rtmpToken: string,
  signal: AbortSignal,
): Promise<Source[]> {
  try {
    const res = await fetch(
      `${rtmpApi}?channelId=11&application=${channel}&protocol=RTMP`,
      { headers: { authorization: rtmpToken }, signal },
    )
    if (!res.ok) throw new Error('rtmp api error')
    const json = await res.json()
    const streams: Array<{ id: string; stream: string; status: string }> =
      json.data?.data?.streams ?? []
    return streams.map(s => ({ id: s.stream, name: s.stream, status: s.status }))
  } catch {
    return []
  }
}

async function loadWebRTC(
  participantsApi: string,
  channel: string,
  signal: AbortSignal,
): Promise<Source[]> {
  try {
    const res = await fetch(participantsApi, { signal })
    if (!res.ok) throw new Error('webrtc api error')
    const data = await res.json()
    const pattern = new RegExp(`_${channel}_(.+?)_main$`, 'i')
    const parsed: Source[] = []
    for (const item of (data.OnlineInfo ?? [])) {
      const m = (item.StreamName ?? '').match(pattern)
      if (m?.[1]) parsed.push({ id: m[1], name: m[1] })
    }
    return parsed
  } catch {
    return []
  }
}

export function useSources(config: MultiviewerConfig) {
  const [{ rtmpSources, webrtcSources, loading }, dispatch] = useReducer(reducer, {
    rtmpSources: [],
    webrtcSources: [],
    loading: true,
  })
  const [refreshTick, setRefreshTick] = useState(0)

  const { rtmpApi, channel, rtmpToken, participantsApi } = config

  useEffect(() => {
    const controller = new AbortController()
    dispatch({ type: 'fetching' })
    Promise.all([
      loadRtmp(rtmpApi, channel, rtmpToken, controller.signal),
      loadWebRTC(participantsApi, channel, controller.signal),
    ]).then(([rtmp, webrtc]) => {
      if (!controller.signal.aborted) {
        dispatch({ type: 'done', rtmp, webrtc })
      }
    })
    return () => controller.abort()
  }, [rtmpApi, channel, rtmpToken, participantsApi, refreshTick])

  const refresh = useCallback(() => setRefreshTick(t => t + 1), [])

  return { rtmpSources, webrtcSources, loading, refresh }
}
