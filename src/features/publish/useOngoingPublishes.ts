import { useState, useCallback, useEffect, useRef } from 'react'
import { getStorage } from '../../lib/storage'
import {
  fetchOngoingPublishes,
  stopOngoingPublish,
  moveToHistory,
} from '../../lib/ongoingPublishService'
import {
  ytEndBroadcast,
  ytRefreshAccessToken,
  ytGetBroadcastStatus,
  ytTransitionToLive,
  YtInvalidTransitionError,
  fbStopLive,
} from '../../lib/socialAuthService'
import type { OngoingPublish } from '../../types/publishHistory'
import type { UserData } from '../../types/user'

const PL_INFO_API = 'http://13.233.229.201:8082/service/api/v1/external/approve/live/stream/request'

async function callPlInfoApi(plCid: number, action: 'stop'): Promise<void> {
  await fetch(PL_INFO_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'tenant-code': 'puralocal',
      'api-key': 'janya_live_stream',
      'api-secret': '0f34b66d-831c-491f-8b71-3be4ba50da98',
    },
    body: JSON.stringify({ channelId: plCid, action }),
  })
}

const POLL_INTERVAL_MS = 30_000

// Statuses that don't need rapid polling — stream is stable
const NEEDS_POLL_STATUSES = new Set(['starting', 'stopping', 'pending', 'queued', 'initializing', 'processing'])

function shouldPoll(records: OngoingPublish[]): boolean {
  return records.some(r => NEEDS_POLL_STATUSES.has(r.status.toLowerCase()))
}

export function useOngoingPublishes() {
  const cid = getStorage<string>('pcr_channel_id') ?? ''
  const userId = getStorage<string>('pcr_user_id') ?? ''
  const userData = getStorage<UserData>('pcr_user')
  const username = userData
    ? [userData.firstname, userData.lastname].filter(Boolean).join(' ').trim() || userData.emailAddress
    : ''

  const [records, setRecords] = useState<OngoingPublish[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [stoppingIds, setStoppingIds] = useState<Set<number>>(new Set())
  const [movingIds, setMovingIds] = useState<Set<number>>(new Set())
  const [goingLiveIds, setGoingLiveIds] = useState<Set<number>>(new Set())
  const [stopErrorMessage, setStopErrorMessage] = useState<string | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const autoCheckedRef = useRef<Set<number>>(new Set())

  const clearPoll = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
  }

  const load = useCallback(
    async (silent = false) => {
      if (!cid) {
        setError('No channel selected')
        return
      }
      if (!silent) setLoading(true)
      setError(null)
      try {
        const data = await fetchOngoingPublishes(cid)
        setRecords(data)
        clearPoll()
        if (shouldPoll(data)) {
          pollRef.current = setInterval(() => void load(true), POLL_INTERVAL_MS)
        }
        // Auto-check YouTube broadcasts that haven't been checked yet in this session
        const unchecked = data.filter(r =>
          r.platform === 'youtube' &&
          r.status.toLowerCase() === 'publishing' &&
          r.ytData?.videoId && r.ytData?.accessToken &&
          !autoCheckedRef.current.has(r.sno),
        )
        for (const r of unchecked) {
          autoCheckedRef.current.add(r.sno)
          void goLiveRecord(r)
        }
      } catch (e) {
        setError((e as Error).message)
      } finally {
        if (!silent) setLoading(false)
      }
    },
    [cid],
  )

  useEffect(() => {
    void load()
    // Always poll while tab is visible — live publishes need fresh status
    const alwaysPoll = setInterval(() => void load(true), POLL_INTERVAL_MS)
    return () => {
      clearInterval(alwaysPoll)
      clearPoll()
    }
  }, [load])

  async function goLiveRecord(record: OngoingPublish): Promise<void> {
    const { videoId, accessToken, refreshToken } = record.ytData ?? {}
    if (!videoId || !accessToken) return
    setGoingLiveIds(prev => new Set(prev).add(record.sno))
    try {
      const token = accessToken
      const doTransition = async (tok: string) => {
        const status = await ytGetBroadcastStatus(tok, videoId)
        if (status === 'live' || status === 'liveStarting' || status === 'complete') return
        if (status === 'ready' || status === 'testing' || status === 'testStarting') {
          try { await ytTransitionToLive(tok, videoId) } catch (e) {
            if (!(e instanceof YtInvalidTransitionError)) throw e
          }
        }
      }
      try {
        await doTransition(token)
      } catch {
        if (refreshToken) {
          const newToken = await ytRefreshAccessToken(refreshToken)
          await doTransition(newToken)
        }
      }
    } catch { /* best-effort — ignore */ }
    finally {
      setGoingLiveIds(prev => { const next = new Set(prev); next.delete(record.sno); return next })
    }
  }

  async function stop(record: OngoingPublish): Promise<void> {
    setStoppingIds(prev => new Set(prev).add(record.sno))
    try {
      const res = await stopOngoingPublish(record, userId, username)
      if (res.code !== 1) {
        setStopErrorMessage(res.Message ?? 'Failed to stop publish')
        return
      }
      if (res.code === 1) {
        // Mirror Angular post-stop side effects per platform
        if (record.platform === 'youtube' && record.ytData) {
          const { accessToken, videoId, refreshToken } = record.ytData
          if (accessToken && videoId) {
            try {
              await ytEndBroadcast(accessToken, videoId)
            } catch {
              // On auth failure, refresh token once and retry
              if (refreshToken) {
                try {
                  const newToken = await ytRefreshAccessToken(refreshToken)
                  await ytEndBroadcast(newToken, videoId)
                } catch {
                  // best-effort cleanup — ignore
                }
              }
            }
            if (record.plCid !== null) {
              void callPlInfoApi(record.plCid, 'stop')
            }
          }
        } else if (record.platform === 'facebook' && record.fbData) {
          const { videoId, pageToken } = record.fbData
          if (videoId && pageToken) {
            void fbStopLive({
              pageId: '',
              pageTitle: record.fbData.pageName ?? '',
              pageToken,
              pictureUrl: '',
              streaming: true,
              videoId,
            })
          }
        }
      }
      // Wait for backend to process the stop, then reload
      await new Promise<void>(resolve => setTimeout(resolve, 10_000))
      await load()
    } finally {
      setStoppingIds(prev => {
        const next = new Set(prev)
        next.delete(record.sno)
        return next
      })
    }
  }

  async function moveRecord(record: OngoingPublish): Promise<void> {
    setMovingIds(prev => new Set(prev).add(record.sno))
    try {
      await moveToHistory(record.sno, cid, record.status)
      await load()
    } finally {
      setMovingIds(prev => {
        const next = new Set(prev)
        next.delete(record.sno)
        return next
      })
    }
  }

  return {
    records,
    loading,
    error,
    stoppingIds,
    movingIds,
    goingLiveIds,
    stopErrorMessage,
    clearStopError: () => setStopErrorMessage(null),
    refresh: () => void load(),
    stop,
    moveRecord,
    goLive: goLiveRecord,
  }
}
