import { useEffect, useRef, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Toaster } from '../components/ui/Toast'
import { ErrorBoundary } from '../components/ui/ErrorBoundary'
import { StudioPanel } from '../features/studio/StudioPanel'
import { getStudioChannel, getStudioCid, clearEventScopedStudioState } from '../lib/studioConfig'
import { getStorage, setStorage, removeStorage } from '../lib/storage'
import { http } from '../lib/http'
import { apiConfig } from '../lib/apiConfig'
import type { ToastState } from '../types/studio'

const MEETING_NOTIFY_WS = 'wss://recording.janya.video'
const WS_RECONNECT_DELAY_INITIAL_MS = 5_000
const WS_RECONNECT_DELAY_MAX_MS = 30_000

interface WsPacket {
  // Meeting end notification
  ApplicationType?: string
  ChannelId?: number
  Command?: string
  MeetingEndTime?: string
  // WebRTC room events
  EventType?: number
  EventInfo?: { RoomId?: string; UserId?: string; Role?: number; EventMsTs?: number }
}

interface StudioLocationState {
  masterUUID?: string
  eventId?: string
  eventTitle?: string
  eventDescription?: string
  eventThumbnailUrl?: string
}

function isStudioLocationState(value: unknown): value is StudioLocationState {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function StudioPage() {
  useEffect(() => {
    document.title = 'CloudReel - Studio'
    return () => { document.title = 'CloudReel' }
  }, [])

  const navigate = useNavigate()
  const { state } = useLocation()

  const channel = getStudioChannel()
  const cid = getStudioCid()
  const isChannelIdValid = cid !== null && !isNaN(Number(cid))
  const cidNum = isChannelIdValid ? Number(cid) : 0
  const configMissing = !channel || !isChannelIdValid

  const locationState = isStudioLocationState(state) ? state : null
  const initialMeetingUrl = locationState?.masterUUID && apiConfig.meetingHostBase
    ? `${apiConfig.meetingHostBase}/host?id=${locationState.masterUUID}`
    : ''

  const [sessionStatus, setSessionStatus] = useState<'checking' | 'valid'>('checking')
  const refreshSourcesRef = useRef<(() => void) | null>(null)
  const addParticipantRef = useRef<((userId: string, joinTimestampMs: number) => void) | null>(null)
  const removeParticipantRef = useRef<((userId: string) => void) | null>(null)
  const meetingEndRedirectRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const hasShownCheckFailureRef = useRef(false)
  const configRedirectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const stopSessionPollRef = useRef<(() => void) | null>(null)
  const webrtcRefreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [toast, setToast] = useState<ToastState>({ open: false, title: '', description: '', variant: 'warning' })
  const [notifyWsReconnecting, setNotifyWsReconnecting] = useState(false)
  const [configRedirectCountdown, setConfigRedirectCountdown] = useState(3)

  useEffect(() => {
    if (!configMissing) return
    setConfigRedirectCountdown(3)
    const countdownInterval = setInterval(() => {
      setConfigRedirectCountdown(prev => Math.max(0, prev - 1))
    }, 1000)
    configRedirectTimerRef.current = setTimeout(() => navigate('/events'), 3000)
    return () => {
      clearInterval(countdownInterval)
      if (configRedirectTimerRef.current) {
        clearTimeout(configRedirectTimerRef.current)
        configRedirectTimerRef.current = null
      }
    }
  }, [configMissing, navigate])

  useEffect(() => {
    if (configMissing) return
    if (typeof locationState?.eventId === 'string') setStorage('studio_event_id', locationState.eventId)
    if (typeof locationState?.eventTitle === 'string') setStorage('studio_event_title', locationState.eventTitle)
    if (typeof locationState?.eventDescription === 'string') setStorage('studio_event_description', locationState.eventDescription)
    if (typeof locationState?.eventThumbnailUrl === 'string') setStorage('studio_event_thumbnail', locationState.eventThumbnailUrl)
  }, [configMissing, locationState])

  // Session guard — validate the cloud instance is still running on every mount.
  // We cannot rely on stored meeting URL because the WS may have missed the MeetingEnded
  // event if the user navigated away while the meeting was ending.
  useEffect(() => {
    if (configMissing) return
    let isMounted = true
    let sessionPollInterval: ReturnType<typeof setInterval> | null = null

    function stopPoll() {
      if (sessionPollInterval) { clearInterval(sessionPollInterval); sessionPollInterval = null }
    }

    async function checkSession() {
      try {
        const check = await http.get<{ data?: Record<string, unknown> | null }>(
          apiConfig.dotnetApiBase,
          `v2/Channel/GetCloudInstanceDetailsByChid?chid=${cidNum}`,
          { timeout: 10_000 },
        )
        if (!isMounted) return
        const statusValue = String((check.data?.['Status'] ?? check.data?.['status']) ?? '').toUpperCase()
        if (check.data && statusValue === 'RUNNING') {
          setSessionStatus('valid')
          return
        }
        stopPoll()
        clearEventScopedStudioState(String(cidNum), getStorage<string>('studio_event_id') ?? '')
        removeStorage('studio_meeting_url')
        removeStorage('studio_event_id')
        removeStorage('studio_event_title')
        removeStorage('studio_event_description')
        removeStorage('studio_event_thumbnail')
        setToast({
          open: true,
          title: 'Session Unavailable',
          description: 'This session is no longer running. Redirecting to Events…',
          variant: 'error',
        })
        if (meetingEndRedirectRef.current) clearTimeout(meetingEndRedirectRef.current)
        meetingEndRedirectRef.current = setTimeout(() => navigate('/events', { replace: true }), 3000)
      } catch {
        if (!isMounted) return
        if (!hasShownCheckFailureRef.current) {
          hasShownCheckFailureRef.current = true
          setToast({
            open: true,
            title: 'Session Check Failed',
            description: 'Could not verify the session status. Proceeding with caution.',
            variant: 'warning',
          })
        }
        setSessionStatus('valid')
      }
    }

    void checkSession()
    sessionPollInterval = setInterval(() => { void checkSession() }, 60_000)
    stopSessionPollRef.current = stopPoll
    return () => {
      isMounted = false
      stopPoll()
      stopSessionPollRef.current = null
    }
  }, [configMissing, cidNum, navigate])

useEffect(() => {
    if (configMissing || sessionStatus !== 'valid') return
    let ws: WebSocket | null = null
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null
    let heartbeatTimer: ReturnType<typeof setInterval> | null = null
    let destroyed = false
    let reconnectDelay = WS_RECONNECT_DELAY_INITIAL_MS

    function connect() {
      ws = new WebSocket(MEETING_NOTIFY_WS)

      ws.onopen = () => {
        reconnectDelay = WS_RECONNECT_DELAY_INITIAL_MS
        setNotifyWsReconnecting(false)
        heartbeatTimer = setInterval(() => {
          if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: 'Heartbeat', channel }))
        }, 30_000)
      }

      ws.onerror = () => { ws?.close() }

      ws.onmessage = (event: MessageEvent) => {
        try {
          const msg = JSON.parse(event.data as string) as WsPacket

          // ── Meeting end notifications ────────────────────────────────────
          if (msg.ApplicationType === 'MeetingEndNotify' && msg.ChannelId === cidNum) {
            if (msg.Command === 'MeetingAboutToEnd') {
              const endTimeMs = msg.MeetingEndTime ? new Date(msg.MeetingEndTime).getTime() : NaN
              const remainingMinutes = !isNaN(endTimeMs) ? Math.max(0, Math.round((endTimeMs - Date.now()) / 60_000)) : null
              const endDescription = remainingMinutes !== null
                ? `This meeting will end in approximately ${remainingMinutes} minute${remainingMinutes === 1 ? '' : 's'}.`
                : 'This meeting is about to end shortly.'
              setToast({ open: true, title: 'Meeting Ending Soon', description: endDescription, variant: 'warning' })
            } else if (msg.Command === 'MeetingEnded') {
              stopSessionPollRef.current?.()
              clearEventScopedStudioState(String(cidNum), getStorage<string>('studio_event_id') ?? '')
              removeStorage('studio_meeting_url')
              removeStorage('studio_event_id')
              removeStorage('studio_event_title')
              removeStorage('studio_event_description')
              removeStorage('studio_event_thumbnail')
              if (meetingEndRedirectRef.current) clearTimeout(meetingEndRedirectRef.current)
              setToast({ open: true, title: 'Meeting Ended', description: 'The meeting has ended. Redirecting to events in 5 seconds…', variant: 'error' })
              meetingEndRedirectRef.current = setTimeout(() => navigate('/events'), 5000)
            }
            return
          }

          // ── WebRTC room events ───────────────────────────────────────────
          if (msg.EventInfo?.RoomId !== channel) return
          const scheduleRefresh = (delayMs: number) => {
            if (webrtcRefreshTimerRef.current) clearTimeout(webrtcRefreshTimerRef.current)
            webrtcRefreshTimerRef.current = setTimeout(() => refreshSourcesRef.current?.(), delayMs)
          }
          const isRealUser = msg.EventInfo?.Role === 20
          switch (msg.EventType) {
            case 103: // user entered
              if (isRealUser && msg.EventInfo?.UserId) {
                addParticipantRef.current?.(msg.EventInfo.UserId, msg.EventInfo.EventMsTs ?? Date.now())
              } else {
                scheduleRefresh(2000) // system/RTMP user - API sync for screen shares etc.
              }
              break
            case 104: // user left
              if (msg.EventInfo?.UserId) removeParticipantRef.current?.(msg.EventInfo.UserId)
              break
            case 101: // room created
            case 102: // room closed
            case 205: // screen share started
            case 206: // screen share stopped
              scheduleRefresh(2000); break
          }
        } catch { /* ignore malformed packets */ }
      }

      ws.onclose = () => {
        if (heartbeatTimer) { clearInterval(heartbeatTimer); heartbeatTimer = null }
        if (!destroyed) {
          setNotifyWsReconnecting(true)
          reconnectTimer = setTimeout(connect, reconnectDelay)
          reconnectDelay = Math.min(reconnectDelay * 2, WS_RECONNECT_DELAY_MAX_MS)
        }
      }
    }

    connect()

    return () => {
      destroyed = true
      ws?.close()
      if (heartbeatTimer) clearInterval(heartbeatTimer)
      if (reconnectTimer) clearTimeout(reconnectTimer)
    }
  }, [configMissing, sessionStatus, channel, cid, navigate])

  // Auto-load WebRTC sources once the session is valid and StudioPanel has mounted.
  // Children effects fire before parent effects, so refreshSourcesRef is already set by StudioPanel.
  useEffect(() => {
    if (sessionStatus !== 'valid') return
    refreshSourcesRef.current?.()
  }, [sessionStatus])

  // Clear the meeting-end redirect only on full component unmount, not on WS effect re-runs.
  useEffect(() => {
    return () => {
      if (meetingEndRedirectRef.current) clearTimeout(meetingEndRedirectRef.current)
    }
  }, [])

  const toaster = (
    <Toaster
      open={toast.open}
      onOpenChange={open => setToast(prev => ({ ...prev, open }))}
      title={toast.title}
      description={toast.description}
      variant={toast.variant}
      viewportClassName="bottom-24 right-6"
    />
  )

  if (configMissing) {
    return (
      <>
        <div id="studio-no-config-banner" className="flex h-full flex-col items-center justify-center gap-3 text-center">
          <p id="studio-no-config-title" className="text-lg font-semibold text-white">No event selected</p>
          <p id="studio-no-config-description" className="text-sm text-white/50">Please go to Events and launch a session first. Redirecting in {configRedirectCountdown}…</p>
          <button
            id="studio-btn-go-to-events"
            type="button"
            onClick={() => {
              if (configRedirectTimerRef.current) clearTimeout(configRedirectTimerRef.current)
              navigate('/events')
            }}
            className="mt-1 px-4 py-1.5 rounded-lg bg-[#3031cb] hover:bg-[#2829b0] text-white text-sm font-semibold cursor-pointer transition-colors"
          >
            Go to Events
          </button>
        </div>
        {toaster}
      </>
    )
  }

  if (sessionStatus === 'checking') {
    return (
      <>
        <div id="studio-session-check-banner" role="status" aria-live="polite" className="flex h-full flex-col items-center justify-center gap-3 text-center">
          <div id="studio-session-check-spinner" aria-label="Verifying session" className="h-6 w-6 animate-spin rounded-full border-2 border-white/20 border-t-white" />
          <p id="studio-session-check-label" className="text-sm text-white/50">Verifying session…</p>
        </div>
        {toaster}
      </>
    )
  }

  return (
    <>
      <ErrorBoundary>
        <StudioPanel refreshSourcesRef={refreshSourcesRef} addParticipantRef={addParticipantRef} removeParticipantRef={removeParticipantRef} initialMeetingUrl={initialMeetingUrl} />
      </ErrorBoundary>
      {notifyWsReconnecting && (
        <div id="studio-notify-ws-reconnecting-banner" className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-950/80 border border-amber-400/30 text-amber-400 text-[11px] font-medium shadow-lg backdrop-blur-sm pointer-events-none">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse shrink-0" />
          Notification channel reconnecting — meeting-end alerts may be delayed
        </div>
      )}
      {toaster}
    </>
  )
}
