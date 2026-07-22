import { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import type {
  LayoutEntry, AnySource, ParticipantSource, RtmpSource, VideoAsset, GfxData, Destination,
  LogType, WsStatus, StudioTab, RightTab, StudioMode, RowState, VideoPopupState,
  ParticipantsResponse, GfxNewsItem, GfxBandLayout, GfxBandAlignment, GfxAssetItem, GfxAlignmentCache, BgAssetItem,
  SourceSlot, SourceLocation, ToastState, VirtualSource,
} from '../../types/studio'
import { MAX_SOURCE_SLOTS, MAX_TYPE_SOURCE_SLOTS } from '../../types/studio'
import {
  STUDIO_WS_URL, CONTROL_WS_URL, getPreviewUrl, getMasterUrl, getStudioChannel, getStudioCid,
  getBgBase, getVideoBase, DEFAULT_BG_COVER_URL, PARTICIPANTS_API, GUEST_PARTICIPANTS_API, LAYOUT_API, RTMP_API,
  RTMP_APPLICATION_API, RTMP_PREVIEW_BASE, WEBRTC_PREVIEW_BASE, VIDEOS_API, SLDP_WSS_BASE,
  GFX_API, GFX_SET_API, GFX_GETVALUE_API, GFX_GETALIGNMENT_API, GFX_ASSETS_API,
  DEST_STORAGE_KEY, RECORDING_WS_URL, bandLabel,
  GFX_CONTENT_WS_TYPE, GFX_CONTENT_WS_PAYLOAD,
  GFX_ALIGNMENT_WS_TYPE, GFX_ALIGNMENT_WS_PAYLOAD,
  BG_VIDEO_BANDS, BG_IMAGE_BANDS, TEXT_BANDS,
  GFX_DEFAULT_BAND_KEYS, GFX_ALIGNMENT_DEFAULTS, GFX_DEFAULT_LAYOUT, LAYOUT_BANDS,
} from '../../lib/studioConfig'
import { getStorage, setStorage } from '../../lib/storage'
import type { UserData } from '../../types/user'

type PresenceMethodType = 'logged_in' | 'logged_out' | 'access_request' | 'force_access' | 'access_granted' | 'access_denied'
import { http } from '../../lib/http'
import { apiConfig } from '../../lib/apiConfig'
import { fetchGfxAssets as fetchGfxAssetsLib } from '../../lib/gfxAssets'


// Known GFX band keys — used to detect and strip corrupted nested band data from alignment/layout cache
const KNOWN_BAND_KEYS = new Set([
  'lower_band', 'bottom_ticker_band', 'clock_band', 'ticker_band', 'logo_band',
  'coming_up_band', 'location_band', 'top_band', 'date_band', 'breaking_news_band', 'l_band',
])

// The server may have stored the full LayoutDesg/alignment map as the value for a band (due to a
// previous bug where data: JSON.stringify(wsPacket) was used instead of data: JSON.stringify(bandData)).
// This helper unwraps one level of nesting (if the same band key appears as a sub-key) and strips
// any known band sub-keys, leaving only the band's own flat properties.
function unwrapBandData<T extends Record<string, unknown>>(raw: unknown, bandKey: string): T | null {
  if (raw === null || typeof raw !== 'object') return null
  let value = raw as Record<string, unknown>
  if (bandKey in value && value[bandKey] !== null && typeof value[bandKey] === 'object') {
    value = value[bandKey] as Record<string, unknown>
  }
  return Object.fromEntries(Object.entries(value).filter(([k]) => !KNOWN_BAND_KEYS.has(k))) as T
}

function makeRow(): RowState {
  return { captionId: '', sources: [], gfxStart: [], gfxStop: [] }
}

function normalizeSlot(s: SourceSlot): SourceSlot {
  return { ...s, slotKey: s.slotKey ?? uid(), volume: s.volume ?? 100, panX: s.panX ?? 0, panY: s.panY ?? 0, zoom: s.zoom ?? 1, loop: s.loop ?? false }
}
const isOdd = (q: number) => q % 2 !== 0
const videoUrl = (f: string) => `${getVideoBase()}${f}`
const bgUrlFn = (f: string) => `${getBgBase()}${f}`
const VIDEO_EXTENSIONS = ['.mp4', '.webm', '.mov', '.m4v']
const bgMode = (url: string): 'video' | 'image' =>
  VIDEO_EXTENSIONS.some(ext => url.split('?')[0].toLowerCase().endsWith(ext)) ? 'video' : 'image'

// VOD userId: odd Q rows use ext1, ext3, ext5...  even Q rows use ext2, ext4, ext6...
// Keeps adjacent Q rows on non-overlapping ext IDs so preloading the next row
// never overwrites the currently active row's video stream.
const extIdForVodSlot = (q: number, vodSlotIndex: number) => `ext${vodSlotIndex * 2 + (isOdd(q) ? 1 : 2)}`

// RTMP userId: same odd/even scheme — odd Q rows use rtmp1, rtmp3, rtmp5...
// even Q rows use rtmp2, rtmp4, rtmp6... preventing preload from overwriting active RTMP streams.
const rtmpIdForSlot = (q: number, rtmpSlotIndex: number) => `rtmp${rtmpSlotIndex * 2 + (isOdd(q) ? 1 : 2)}`

function parseMixLayout(entry: LayoutEntry) {
  try {
    const list = (JSON.parse(entry.pubnubMsg).MixLayoutList || []) as Array<{
      LocationX: number; LocationY: number; ImageWidth: number; ImageHeight: number
      BorderColor?: string; BorderWidth?: number; BorderRadius?: number
    }>
    return list.map(i => ({
      x: i.LocationX, y: i.LocationY, w: i.ImageWidth, h: i.ImageHeight,
      border: {
        width: i.BorderWidth ?? 0,
        color: waterMarkHexToColor(i.BorderColor ?? '0x000000'),
        radius: i.BorderRadius ?? 0,
      },
    }))
  } catch { return [] }
}

// Converts WaterMarkList hex color string (e.g. "0xFFFFFF") to CSS hex (e.g. "#FFFFFF")
function waterMarkHexToColor(hex: string): string {
  return '#' + hex.replace(/^0x/i, '').padStart(6, '0').toUpperCase()
}

interface WaterMarkStyle {
  background: string
  color: string
  fontSize: number
  radius: number
  'font-weight': number
}

interface WaterMarkConfig {
  style: WaterMarkStyle
  animationInterval: number
}


const CAPTION_VERTICAL_PADDING = 8 // px per side (top + bottom), matches layout builder WaterMarkHeight

// Returns a map of window index (1-based count) → style and animation config from WaterMarkList.
function parseWaterMarkStyles(entry: LayoutEntry): Map<number, WaterMarkConfig> {
  try {
    const list = (JSON.parse(entry.pubnubMsg).WaterMarkList || []) as Array<{
      count: number
      FontColor?: string
      FontSize?: string
      BackGroundColor?: string
      BorderRadius?: number
      Animation?: number
    }>
    return new Map(list.map(item => [
      item.count,
      {
        style: {
          background: waterMarkHexToColor(item.BackGroundColor ?? '0xFFFFFF'),
          color: waterMarkHexToColor(item.FontColor ?? '0x000000'),
          fontSize: parseInt(item.FontSize ?? '22', 10),
          radius: item.BorderRadius ?? 0,
          'font-weight': 300,
        },
        animationInterval: item.Animation ?? 3000,
      },
    ]))
  } catch { return new Map() }
}

export function uid() { return Date.now() + '_' + Math.random().toString(36).slice(2, 7) }

// Stable no-op used as the default addLog so hook deps remain stable when called without args
const _noop: (msg: string, type?: LogType) => void = () => { }

export function useStudio(addLog: (msg: string, type?: LogType) => void = _noop, initialMeetingUrl = '') {
  const channel = getStudioChannel() ?? ''
  const cid = getStudioCid() ?? ''
  // Computed before any hooks — used as localStorage key suffix for all event-scoped state
  const eventScopedKeyPrefix = `${cid}_${getStorage<string>('studio_event_id') ?? ''}`
  const [token] = useState(() => getStorage<string>('pcr_token') ?? '')

  // ── WS ───────────────────────────────────────────────────────
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const heartbeatIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const reconnectAttemptRef = useRef(0)
  const manualDisconnectRef = useRef(false)
  const claimChannelTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const controlWsRef = useRef<WebSocket | null>(null)
  const controlHeartbeatIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const connectControlWsRef = useRef<(() => void) | null>(null)
  const logoutPayloadRef = useRef<string>('')
  const [wsStatus, setWsStatus] = useState<WsStatus>('disconnected')
  const [activeChannelUser, setActiveChannelUser] = useState<{ userId: string; userName: string } | null>(null)
  const [isRestricted, setIsRestricted] = useState(false)
  const [pendingAccessRequest, setPendingAccessRequest] = useState<{ userId: string; userName: string } | null>(null)
  const [isAccessRequestPending, setIsAccessRequestPending] = useState(false)
  const [isClaimingChannel, setIsClaimingChannel] = useState(false)

  // ── Data ─────────────────────────────────────────────────────
  const [participants, setParticipants] = useState<string[]>([])
  const [participantImageMap, setParticipantImageMap] = useState<Record<string, string>>({})
  const [participantMuteMap, setParticipantMuteMap] = useState<Record<string, boolean>>({})
  const [webrtcSources, setWebrtcSources] = useState<ParticipantSource[]>([])
  const [virtualSources, setVirtualSources] = useState<VirtualSource[]>(() => {
    if (!cid || !getStorage<string>('studio_event_id')) return []
    return getStorage<VirtualSource[]>(`studio_virtual_sources_${eventScopedKeyPrefix}`) ?? []
  })
  const [rtmpSources, setRtmpSources] = useState<RtmpSource[]>([])
  const participantsRef = useRef<string[]>([])
  const rtmpSourcesRef = useRef<RtmpSource[]>([])
  const rtmpRefetchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [videoAssets, setVideoAssets] = useState<VideoAsset[]>([])
  const [isLoadingVideoAssets, setIsLoadingVideoAssets] = useState(true)
  const [sourceLocations, setSourceLocations] = useState<Record<string, SourceLocation[]>>(() => {
    if (!cid || !getStorage<string>('studio_event_id')) return {}
    const stored = getStorage<Record<string, Array<SourceLocation | string>>>(`studio_source_locations_${eventScopedKeyPrefix}`) ?? {}
    // Migrate old string[] format to SourceLocation[] format
    const normalized: Record<string, SourceLocation[]> = {}
    for (const sourceName of Object.keys(stored)) {
      normalized[sourceName] = stored[sourceName].map(item =>
        typeof item === 'string' ? { label: item, enabled: true } : item,
      )
    }
    return normalized
  })
  const [layoutData, setLayoutData] = useState<LayoutEntry[]>([])
  const [gfxData, setGfxData] = useState<GfxData>({})
  const [gfxTemplateName, setGfxTemplateName] = useState('')
  const [gfxBusy, setGfxBusy] = useState<Set<string>>(new Set())
  const [gfxBandContent, setGfxBandContent] = useState<Record<string, GfxNewsItem[]>>({})
  const [gfxAlignmentCache, setGfxAlignmentCache] = useState<GfxAlignmentCache>({ layout: {}, alignment: {} })
  const gfxAlignmentCacheRef = useRef<GfxAlignmentCache>({ layout: {}, alignment: {} })
  gfxAlignmentCacheRef.current = gfxAlignmentCache
  const gfxBgAssetsCacheRef = useRef<Record<string, BgAssetItem[]>>({})
  // ── UI State ─────────────────────────────────────────────────
  const [studioToast, setStudioToast] = useState<ToastState>({ open: false, title: '', description: '', variant: 'warning' })
  const [studioToastNonce, setStudioToastNonce] = useState(0)
  const showToast = useCallback((title: string, description: string | undefined = undefined, variant: 'error' | 'warning' | 'success' = 'warning') => {
    setStudioToast({ open: true, title, description, variant })
    setStudioToastNonce(n => n + 1)
  }, [])

  const [currentTab, setCurrentTab] = useState<StudioTab>(() => getStorage<StudioTab>('studio_left_tab') ?? 'webrtc')
  const [currentRightTab, setCurrentRightTab] = useState<RightTab>(() => getStorage<RightTab>('studio_right_tab') ?? 'graphics')
  // On viewports narrower than 1280px (tablets, small laptops) always start with the
  // left sidebar collapsed to give the main content area enough room. Stored preferences
  // are only honoured on wide screens where both panels can coexist comfortably.
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(() =>
    window.innerWidth >= 1280 ? (getStorage<boolean>('studio_left_open') ?? true) : false
  )
  const [rightSidebarOpen, setRightSidebarOpen] = useState(() =>
    window.innerWidth >= 1024 ? (getStorage<boolean>('studio_right_open') ?? true) : false
  )
  const [studioLayout, setStudioLayoutState] = useState<'studio' | 'compact'>(() => getStorage<'studio' | 'compact'>('studio_layout') ?? 'studio')
  const setStudioLayout = useCallback((layout: 'studio' | 'compact') => {
    setStudioLayoutState(layout)
    setStorage('studio_layout', layout)
  }, [])
  const [mode, setMode] = useState<StudioMode>('preview')
  const [selectedGroup, setSelectedGroup] = useState(
    () => (cid && getStorage<string>('studio_event_id')) ? (getStorage<string>(`studio_group_${eventScopedKeyPrefix}`) ?? '') : '',
  )
  const prevSelectedGroupRef = useRef(selectedGroup)
  useEffect(() => {
    if (prevSelectedGroupRef.current === selectedGroup) return
    prevSelectedGroupRef.current = selectedGroup
    setRows(prev => prev.map(r => ({ ...r, captionId: '', sources: [] })))
  }, [selectedGroup])
  const rowsStorageKey = useRef(`studio_rows_${eventScopedKeyPrefix}`)
  const [rows, setRows] = useState<RowState[]>(() => {
    const key = rowsStorageKey.current
    if (!cid || key === `studio_rows_${cid}_`) return Array.from({ length: 10 }, makeRow)
    const stored = getStorage<RowState[]>(key) ?? Array.from({ length: 10 }, makeRow)
    return stored.map(r => ({ ...r, sources: r.sources.map(normalizeSlot) }))
  })
  const [activeRowIdx, setActiveRowIdx] = useState<number | null>(
    () => (cid && getStorage<string>('studio_event_id')) ? (getStorage<number | null>(`studio_active_row_${eventScopedKeyPrefix}`) ?? null) : null,
  )
  const activeRowIdxRef = useRef(activeRowIdx)
  useEffect(() => { activeRowIdxRef.current = activeRowIdx }, [activeRowIdx])
  const lastFiredRowSourcesRef = useRef<Record<number, SourceSlot[]>>({})
  // Tracks sources last fired to each compact Q (Q11/Q12) so cross-Q muting
  // uses the fire-time snapshot rather than the current pool state.
  // Saved on every fire (preview + master) so TAKE and direct master fires both
  // have an accurate ref to work from.
  const compactLastFiredSourcesRef = useRef<Record<11 | 12, SourceSlot[]>>({ 11: [], 12: [] })
  // Per-bus snapshot of what each bus is currently displaying. Updated on every fire
  // and TAKE. Read by add/removeParticipant to refire only the bus(es) that actually
  // contain the leaving/rejoining user — `mode` and `activeRowIdx` alone cannot
  // describe the two buses independently (master and preview can hold different
  // layouts, from different kinds, simultaneously).
  type BusSnapshot = { kind: 'row' | 'compact'; q: number; entry: LayoutEntry; sources: SourceSlot[] }
  const masterBusSnapshotRef = useRef<BusSnapshot | null>(null)
  const previewBusSnapshotRef = useRef<BusSnapshot | null>(null)
  // Tracks what each sourceId had preloaded so fire() can skip redundant packets.
  // qRow: the Q row number that triggered the preload — used to detect when a different row
  //   has since overwritten the same extId (Q1 and Q3 share ext1; Q5's preload must not
  //   fool Q3's fire into thinking Q3 is still preloaded).
  // bgImageKey: participant thumbnail URL, or 'default' for the channel default bg.
  // vodSourceValue / rtmpSourceValue: raw source filename / stream name (not the full URL).
  const preloadTrackerRef = useRef<Map<string, { qRow: number; bgImageKey: string; vodSourceValue?: string; rtmpSourceValue?: string }>>(new Map())
  const [lastFiredInfo, setLastFiredInfo] = useState('')
  const [destinations, setDestinations] = useState<Destination[]>(() => {
    try { const s = getStorage<Destination[]>(DEST_STORAGE_KEY); return (s || []).map(d => ({ ...d, streaming: false })) } catch { return [] }
  })
  const [videoPopup, setVideoPopup] = useState<VideoPopupState | null>(null)
  const [isRecording, setIsRecording] = useState(false)
  const [isRecordingBusy, setIsRecordingBusy] = useState(false)
  const [isResetBusy, setIsResetBusy] = useState(false)
  const [meetingUrl, setMeetingUrlState] = useState(
    () => initialMeetingUrl || getStorage<string>('studio_meeting_url') || '',
  )
  const setMeetingUrl = useCallback((url: string) => {
    setMeetingUrlState(url)
    setStorage('studio_meeting_url', url)
  }, [])
  useEffect(() => {
    if (initialMeetingUrl) { setMeetingUrl(initialMeetingUrl); return }
    const eventId = getStorage<string>('studio_event_id')
    if (!eventId) return
    void http.get<{ code: number; data: Array<{ masterUUID: string }> }>(
      apiConfig.dotnetApiBase,
      `v1/producer/get-videoconference-info-by-event?eventId=${eventId}`,
    ).then(res => {
      if (res.code === 1 && Array.isArray(res.data) && res.data.length > 0) {
        setMeetingUrl(`${apiConfig.meetingHostBase}/host?id=${res.data[0].masterUUID}`)
      }
    })
  }, [initialMeetingUrl, setMeetingUrl])

  // ── Status text ──────────────────────────────────────────────
  const [sbStatus, setSbStatusState] = useState({ text: '', type: '' })
  const [layoutStatus, setLayoutStatus] = useState({ text: '', type: '' })
  const [participantStatus, setParticipantStatus] = useState({ text: '', type: '' })
  const [gfxStatus, setGfxStatus] = useState({ text: '', type: '' })

  const heartBeat = useMemo(() => { return JSON.stringify({ type: "Heartbeat" }) }, [])

  const sendWs = useCallback((obj: object, logType: LogType = 'sent') => {
    addLog(JSON.stringify(obj, null, 2), logType)
    if (wsRef.current?.readyState === WebSocket.OPEN) wsRef.current.send(JSON.stringify(obj))
    else addLog('⚠ Not connected.', 'warn')
  }, [addLog])

  const sendControlWs = useCallback((obj: object) => {
    addLog(JSON.stringify(obj, null, 2), 'sent')
    if (controlWsRef.current?.readyState === WebSocket.OPEN) controlWsRef.current.send(JSON.stringify(obj))
    else addLog('⚠ Control WS not connected.', 'warn')
  }, [addLog])

  const sendCellChange = useCallback((sourceUser: string, targetUser: string, enabled: boolean, matrixType: 'audio' | 'video') => {
    const msgType = matrixType === 'video'
      ? (enabled ? 'vodEnable_user' : 'vodDisable_user')
      : (enabled ? 'unmute_user' : 'mute_user')
    sendControlWs({ type: msgType, strRoomId: channel, sourceUser, targetUser })
  }, [sendControlWs, channel])

  const sendMatrixChange = useCallback((controller: 'audio' | 'video', userIds: string[]) => {
    sendControlWs({ type: 'update-user-video', controller, strRoomId: channel, userIds })
  }, [sendControlWs, channel])

  const sendPresencePacket = useCallback((methodType: PresenceMethodType) => {
    if (wsRef.current?.readyState !== WebSocket.OPEN) return
    const userData = getStorage<UserData>('pcr_user')
    const userId = getStorage<string>('pcr_user_id') ?? ''
    const userName = userData ? `${userData.firstname} ${userData.lastname}`.trim() : ''
    const targetFields =
      methodType === 'access_request' && activeChannelUser
        ? { targetUserId: Number(activeChannelUser.userId), targetUserName: activeChannelUser.userName }
        : (methodType === 'access_denied' || methodType === 'access_granted') && pendingAccessRequest
          ? { targetUserId: Number(pendingAccessRequest.userId), targetUserName: pendingAccessRequest.userName }
          : {}
    wsRef.current.send(JSON.stringify({
      userId: Number(userId),
      userName,
      type: 'current_user',
      channelId: Number(cid),
      channel,
      methodType,
      ...targetFields,
      timestamp: Math.floor(Date.now() / 1000),
    }))
  }, [cid, channel, activeChannelUser, pendingAccessRequest])

  const requestAccess = useCallback(() => {
    sendPresencePacket('access_request')
    setIsAccessRequestPending(true)
  }, [sendPresencePacket])

  const forceAccess = useCallback(() => {
    sendPresencePacket('force_access')
    setIsRestricted(false)
    setActiveChannelUser(null)
  }, [sendPresencePacket])

  const acceptAccessRequest = useCallback(() => {
    if (!pendingAccessRequest) return
    sendPresencePacket('access_granted')
    setIsRestricted(true)
    setActiveChannelUser(pendingAccessRequest)
    setPendingAccessRequest(null)
  }, [pendingAccessRequest, sendPresencePacket])

  const denyAccessRequest = useCallback(() => {
    if (!pendingAccessRequest) return
    sendPresencePacket('access_denied')
    setPendingAccessRequest(null)
  }, [pendingAccessRequest, sendPresencePacket])

  // ── WebSocket ────────────────────────────────────────────────
  const scheduleReconnectRef = useRef<(() => void) | null>(null)

  const connectWS = useCallback(() => {
    if (!channel) return
    // Tear down any existing connection before opening a new one
    if (wsRef.current) {
      wsRef.current.onopen = null
      wsRef.current.onclose = null
      wsRef.current.onerror = null
      wsRef.current.close()
      wsRef.current = null
    }
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current)
      heartbeatIntervalRef.current = null
    }

    try {
      const ws = new WebSocket(STUDIO_WS_URL)
      wsRef.current = ws

      ws.onopen = () => {
        reconnectAttemptRef.current = 0
        if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current)
        setWsStatus('connected')
        addLog(`Connected to ${STUDIO_WS_URL}`, 'info')
        heartbeatIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) ws.send(heartBeat)
        }, 40_000)

        sendPresencePacket('logged_in')
      }

      ws.onclose = () => {
        if (heartbeatIntervalRef.current) {
          clearInterval(heartbeatIntervalRef.current)
          heartbeatIntervalRef.current = null
        }
        setWsStatus('disconnected')
        addLog('Disconnected.', 'info')
        if (!manualDisconnectRef.current) scheduleReconnectRef.current?.()
      }

      ws.onerror = () => addLog('WS error.', 'err')

      ws.onmessage = (event: MessageEvent) => {
        try {
          const msg = JSON.parse(event.data as string) as Record<string, unknown>
          if (msg.type === 'AUDIO_CONTROL' && msg.source === 'TRTC' && typeof msg.userId === 'string') {
            setParticipantMuteMap(prev => ({ ...prev, [msg.userId as string]: msg.mute === true }))
          }
          if (msg.Type === 'upd_display' && msg.methodType === 'preview' && msg.channel === channel) {
            const tpl = String(msg.template_type || 'template1')
            const key = String(msg.tempType || '')
            const val = msg.displayType === true || msg.displayType === 'true' || msg.displayType === 'True'
            if (key) setGfxData(prev => ({ ...prev, [tpl]: { ...prev[tpl], [key]: val } }))
          }
          if (
            msg.type === 'current_user' &&
            Number(msg.channelId) === Number(cid) &&
            Number(msg.userId) !== Number(getStorage<string>('pcr_user_id') ?? 0)
          ) {
            const otherUser = { userId: String(msg.userId), userName: String(msg.userName ?? '') }
            const displayName = otherUser.userName || otherUser.userId
            const methodType = String(msg.methodType) as PresenceMethodType
            switch (methodType) {
              case 'logged_in':
                if (claimChannelTimerRef.current) {
                  clearTimeout(claimChannelTimerRef.current)
                  claimChannelTimerRef.current = null
                }
                setIsClaimingChannel(false)
                setActiveChannelUser(otherUser)
                setIsRestricted(true)
                showToast(`${displayName} is currently active on this channel`, undefined, 'warning')
                break
              case 'access_request': {
                const currentUserId = Number(getStorage<string>('pcr_user_id') ?? 0)
                if (Number(msg.targetUserId) === currentUserId) {
                  setPendingAccessRequest(otherUser)
                }
                break
              }
              case 'force_access':
                setActiveChannelUser(otherUser)
                setIsRestricted(true)
                showToast(`${displayName} has forcefully taken over this session`, undefined, 'error')
                break
              case 'access_granted': {
                const currentUserId = Number(getStorage<string>('pcr_user_id') ?? 0)
                if (Number(msg.targetUserId) === currentUserId) {
                  setIsRestricted(false)
                  setActiveChannelUser(null)
                  setIsAccessRequestPending(false)
                  showToast(`Access granted by ${displayName}`, undefined, 'success')
                }
                break
              }
              case 'access_denied': {
                const currentUserId = Number(getStorage<string>('pcr_user_id') ?? 0)
                if (Number(msg.targetUserId) === currentUserId) {
                  setIsAccessRequestPending(false)
                  showToast(`Access denied by ${displayName}`, undefined, 'error')
                }
                break
              }
              case 'logged_out':
                setIsAccessRequestPending(false)
                setIsClaimingChannel(true)
                showToast(`${displayName} has left. Waiting to claim channel...`, undefined, 'warning')
                if (claimChannelTimerRef.current) clearTimeout(claimChannelTimerRef.current)
                claimChannelTimerRef.current = setTimeout(() => {
                  claimChannelTimerRef.current = null
                  setIsClaimingChannel(false)
                  sendPresencePacket('logged_in')
                  setIsRestricted(false)
                  setActiveChannelUser(null)
                }, 5000)
                break
            }
          }
        } catch { /* ignore malformed messages */ }
      }
    } catch {
      addLog('Invalid WS URL.', 'err')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addLog, channel])

  const scheduleReconnect = useCallback(() => {
    const delay = Math.min(1000 * Math.pow(2, reconnectAttemptRef.current), 30000)
    reconnectAttemptRef.current++
    setWsStatus('reconnecting')
    addLog(`Reconnect in ${Math.round(delay / 1000)}s…`, 'warn')
    reconnectTimerRef.current = setTimeout(() => { if (!manualDisconnectRef.current) connectWS() }, delay)
  }, [connectWS, addLog])

  scheduleReconnectRef.current = scheduleReconnect

  const toggleConnect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      sendPresencePacket('logged_out')
      manualDisconnectRef.current = true
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current)
      wsRef.current.close()
      if (controlWsRef.current) { controlWsRef.current.close(); controlWsRef.current = null }
    } else { manualDisconnectRef.current = false; connectWS() }
  }, [connectWS, sendPresencePacket])

  const connectControlWs = useCallback(() => {
    if (!channel) return
    if (controlWsRef.current) {
      controlWsRef.current.onopen = null
      controlWsRef.current.onclose = null
      controlWsRef.current.onerror = null
      controlWsRef.current.close()
      controlWsRef.current = null
    }
    if (controlHeartbeatIntervalRef.current) {
      clearInterval(controlHeartbeatIntervalRef.current)
      controlHeartbeatIntervalRef.current = null
    }
    try {
      const ws = new WebSocket(CONTROL_WS_URL)
      controlWsRef.current = ws
      ws.onopen = () => {
        addLog(`Connected to ${CONTROL_WS_URL}`, 'info')
        controlHeartbeatIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) ws.send(heartBeat)
        }, 40_000)
      }
      ws.onclose = () => {
        if (controlHeartbeatIntervalRef.current) {
          clearInterval(controlHeartbeatIntervalRef.current)
          controlHeartbeatIntervalRef.current = null
        }
        if (!manualDisconnectRef.current) setTimeout(() => connectControlWsRef.current?.(), 3000)
      }
      ws.onerror = () => addLog('Control WS error.', 'err')
    } catch {
      addLog('Invalid Control WS URL.', 'err')
    }
  }, [channel, addLog, heartBeat])

  connectControlWsRef.current = connectControlWs

  // ── Layouts ──────────────────────────────────────────────────
  const fetchLayouts = useCallback(async () => {
    setLayoutStatus({ text: '...', type: 'loading' })
    try {
      const json = await http.get<{ data?: LayoutEntry[] }>('', `${LAYOUT_API}?cid=${cid}`)
      const data = json.data || []
      if (!data.length) throw new Error('No data')
      setLayoutData(data); setLayoutStatus({ text: `✓ ${data.length}`, type: 'ok' }); addLog(`Layouts: ${data.length}`, 'info')
    } catch (e) { setLayoutStatus({ text: 'Failed', type: 'err' }); addLog(`Layout fetch failed: ${(e as Error).message}`, 'err') }
  }, [cid, addLog])

  const groupLayouts = useMemo(() => layoutData.filter(l => l.groupName === selectedGroup), [layoutData, selectedGroup])
  const groups = useMemo(() => [...new Set(layoutData.map(l => l.groupName).filter(Boolean))], [layoutData])

  // ── Participants ─────────────────────────────────────────────
  const fetchParticipants = useCallback(async () => {
    setParticipantStatus({ text: '...', type: 'loading' })
    try {
      const data = await http.get<ParticipantsResponse>('', PARTICIPANTS_API)
      const sources: ParticipantSource[] = [];
      (data.OnlineInfo || []).forEach(item => {
        const mainMatch = item.StreamName.match(new RegExp(`_${channel}_(.+?)_main$`, 'i'))
        const auxMatch = item.StreamName.match(new RegExp(`_${channel}_(.+?)_aux$`, 'i'))
        const m = mainMatch || auxMatch
        const isScreenShare = !!auxMatch
        if (m?.[1]) {
          sources.push({
            id: m[1],
            name: m[1],
            protocol: 'WebRTC',
            status: 'online',
            publishTime: item.PublishTimeList[0]?.PublishTime,
            isScreenShare,
          })
        }
      })
      setParticipants(sources.map(s => s.name))
      setWebrtcSources(sources)
      if (!sources.length) { setParticipantStatus({ text: 'None', type: 'err' }); return }
      setParticipantStatus({ text: `✓ ${sources.length}`, type: 'ok' })
      addLog(`Participants: ${sources.map(s => s.name).join(', ')}`, 'info')
      sendWs({ type: 'CONTEXT_REQUEST', channel, methodType: 'preview' })
    } catch (e) { setParticipantStatus({ text: 'Error', type: 'err' }); addLog(`Participant error: ${(e as Error).message}`, 'err') }
  }, [channel, addLog, sendWs])

  // Rebuilds the full LAYOUT.items + CAPTION_ROTATE.users arrays from a fire-time
  // snapshot, matching fire()/fireCompact() output exactly. A full refire is needed
  // (rather than a one-item targeted packet) because the middle server caches the
  // last LAYOUT blob as a whole and replays it to viewers on reconnect — a partial
  // packet would become the new cached state and strand every other userId.
  //
  // When hiddenUserId is provided, that userId's webrtc slot is emitted with zero
  // geometry instead of its real position, keeping the rest of the layout intact.
  const buildFullLayoutFromSnapshot = useCallback((params: {
    q: number
    oppositeQ: number
    entry: LayoutEntry
    sources: SourceSlot[]
    hiddenUserId?: string
    participantsList: string[]
  }): { layoutItems: object[]; captionUsers: object[] } => {
    const { q, oppositeQ, entry, sources, hiddenUserId, participantsList } = params
    const hiddenBorder = { width: 0, color: '#00000000', radius: 0 }
    const emptyCaptionPacket = { position: { x: 0, y: 0, w: 0, h: 0 }, style: {}, animation: { interval: 3000 }, items: [''] }

    const virtualSourceMap = new Map(virtualSources.map(v => [v.id, v]))
    const isVirtualId = (id: string) => virtualSourceMap.has(id)

    const webrtcSlots = sources.filter(s => s.sourceType === 'webrtc' && s.sourceValue && !isVirtualId(s.sourceValue))
    const virtualSlots = sources.filter(s => s.sourceType === 'webrtc' && s.sourceValue && isVirtualId(s.sourceValue))
    const rtmpSlots = sources.filter(s => s.sourceType === 'rtmp' && s.sourceValue)
    const vodSlots = sources.filter(s => s.sourceType === 'vod' && s.sourceValue)
      .map((slot, vodIndex) => ({ slot, extId: extIdForVodSlot(q, vodIndex) }))

    const selectedWebrtcUserIds = webrtcSlots.map(s => s.sourceValue)
    const realIdsFromVirtualSlots = [...new Set(
      virtualSlots.map(s => virtualSourceMap.get(s.sourceValue)?.sourceUserId).filter((id): id is string => !!id),
    )]
    const allProtectedRealIds = new Set([...selectedWebrtcUserIds, ...realIdsFromVirtualSlots])

    const coords = parseMixLayout(entry)
    const waterMarkStyles = parseWaterMarkStyles(entry)
    const layoutItems: object[] = []
    const captionUsers: object[] = []
    let windowIndex = 0

    sources
      .filter(s => s.sourceType === 'webrtc' && s.sourceValue)
      .forEach(slot => {
        const pos = coords[windowIndex++] ?? { x: 0, y: 0, w: 0, h: 0, border: hiddenBorder }
        const isHidden = hiddenUserId !== undefined && slot.sourceValue === hiddenUserId
        const effPos = isHidden ? { x: 0, y: 0, w: 0, h: 0, border: hiddenBorder } : pos
        if (isVirtualId(slot.sourceValue)) {
          const virtualSrc = virtualSourceMap.get(slot.sourceValue)!
          layoutItems.push({
            userId: virtualSrc.id,
            x: effPos.x, y: effPos.y, w: effPos.w, h: effPos.h,
            border: effPos.border,
            sourceUserId: virtualSrc.sourceUserId,
            crop: virtualSrc.crop,
          })
          if (isHidden) {
            captionUsers.push({ userId: virtualSrc.id, ...emptyCaptionPacket })
          } else {
            const enabledDupLabels = (sourceLocations[virtualSrc.id] ?? []).filter(l => l.enabled).map(l => l.label)
            const dupWmConfig = waterMarkStyles.get(windowIndex)
            if (enabledDupLabels.length > 0) {
              const captionH = Math.round((dupWmConfig?.style.fontSize ?? 22) + CAPTION_VERTICAL_PADDING * 2)
              captionUsers.push({
                userId: virtualSrc.id,
                position: { x: 0, y: pos.h - captionH, w: pos.w, h: captionH },
                style: dupWmConfig?.style ?? {},
                animation: { interval: dupWmConfig?.animationInterval ?? 3000 },
                items: enabledDupLabels,
              })
            } else {
              captionUsers.push({ userId: virtualSrc.id, ...emptyCaptionPacket })
            }
          }
        } else {
          layoutItems.push({ userId: slot.sourceValue, x: effPos.x, y: effPos.y, w: effPos.w, h: effPos.h, border: effPos.border })
          if (isHidden) {
            captionUsers.push({ userId: slot.sourceValue, ...emptyCaptionPacket })
          } else {
            const enabledLabels = (sourceLocations[slot.sourceValue] ?? []).filter(l => l.enabled).map(l => l.label)
            const wmConfig = waterMarkStyles.get(windowIndex)
            if (enabledLabels.length > 0) {
              const captionH = Math.round((wmConfig?.style.fontSize ?? 22) + CAPTION_VERTICAL_PADDING * 2)
              captionUsers.push({
                userId: slot.sourceValue,
                position: { x: 0, y: pos.h - captionH, w: pos.w, h: captionH },
                style: wmConfig?.style ?? {},
                animation: { interval: wmConfig?.animationInterval ?? 3000 },
                items: enabledLabels,
              })
            } else {
              captionUsers.push({ userId: slot.sourceValue, ...emptyCaptionPacket })
            }
          }
        }
      })

    rtmpSlots.forEach((slot, rtmpIndex) => {
      const rtmpUserId = rtmpIdForSlot(q, rtmpIndex)
      const pos = coords[windowIndex++] ?? { x: 0, y: 0, w: 0, h: 0, border: hiddenBorder }
      layoutItems.push({ userId: rtmpUserId, x: pos.x, y: pos.y, w: pos.w, h: pos.h, border: pos.border })
      const enabledLabels = (sourceLocations[slot.sourceValue] ?? []).filter(l => l.enabled).map(l => l.label)
      const wmConfig = waterMarkStyles.get(windowIndex)
      if (enabledLabels.length > 0) {
        const captionH = Math.round((wmConfig?.style.fontSize ?? 22) + CAPTION_VERTICAL_PADDING * 2)
        captionUsers.push({
          userId: rtmpUserId,
          position: { x: 0, y: pos.h - captionH, w: pos.w, h: captionH },
          style: wmConfig?.style ?? {},
          animation: { interval: wmConfig?.animationInterval ?? 3000 },
          items: enabledLabels,
        })
      } else {
        captionUsers.push({ userId: rtmpUserId, ...emptyCaptionPacket })
      }
    })

    vodSlots.forEach(({ slot: vodSlot, extId }) => {
      const pos = coords[windowIndex++] ?? { x: 0, y: 0, w: 0, h: 0, border: hiddenBorder }
      layoutItems.push({ userId: extId, x: pos.x, y: pos.y, w: pos.w, h: pos.h, border: pos.border })
      const enabledLabels = (sourceLocations[vodSlot.sourceValue] ?? []).filter(l => l.enabled).map(l => l.label)
      const wmConfig = waterMarkStyles.get(windowIndex)
      if (enabledLabels.length > 0) {
        const captionH = Math.round((wmConfig?.style.fontSize ?? 22) + CAPTION_VERTICAL_PADDING * 2)
        captionUsers.push({
          userId: extId,
          position: { x: 0, y: pos.h - captionH, w: pos.w, h: captionH },
          style: wmConfig?.style ?? {},
          animation: { interval: wmConfig?.animationInterval ?? 3000 },
          items: enabledLabels,
        })
      } else {
        captionUsers.push({ userId: extId, ...emptyCaptionPacket })
      }
    })

    // Hide unused virtual IDs
    virtualSources.forEach(v => {
      if (!virtualSlots.some(s => s.sourceValue === v.id)) {
        layoutItems.push({ userId: v.id, x: 0, y: 0, w: 0, h: 0, border: hiddenBorder })
      }
    })

    // Real users referenced only via dup sources
    realIdsFromVirtualSlots.forEach(realUserId => {
      if (!selectedWebrtcUserIds.includes(realUserId)) {
        layoutItems.push({ userId: realUserId, x: 0, y: 0, w: 0, h: 0, border: hiddenBorder, caption: { enabled: false } })
      }
    })

    // Hide all non-selected participants from the provided participants list.
    // The list is passed in (rather than read from closure) so the caller can
    // supply the post-leave / post-join projection synchronously.
    participantsList.forEach(participantUserId => {
      if (!allProtectedRealIds.has(participantUserId)) {
        layoutItems.push({ userId: participantUserId, x: 0, y: 0, w: 0, h: 0, border: hiddenBorder, caption: { enabled: false } })
      }
    })

    // Hide VOD ext IDs for the opposite Q (parity for studio, other compact Q for compact)
    // and same-Q excess beyond current vodSlots.
    for (let vodIndex = 0; vodIndex < MAX_TYPE_SOURCE_SLOTS; vodIndex++) {
      layoutItems.push({ userId: extIdForVodSlot(oppositeQ, vodIndex), x: 0, y: 0, w: 0, h: 0, border: hiddenBorder, caption: { enabled: false } })
      if (vodIndex >= vodSlots.length) {
        layoutItems.push({ userId: extIdForVodSlot(q, vodIndex), x: 0, y: 0, w: 0, h: 0, border: hiddenBorder, caption: { enabled: false } })
      }
    }

    // Hide RTMP IDs likewise.
    for (let rtmpIndex = 0; rtmpIndex < MAX_TYPE_SOURCE_SLOTS; rtmpIndex++) {
      layoutItems.push({ userId: rtmpIdForSlot(oppositeQ, rtmpIndex), x: 0, y: 0, w: 0, h: 0, border: hiddenBorder })
      if (rtmpIndex >= rtmpSlots.length) {
        layoutItems.push({ userId: rtmpIdForSlot(q, rtmpIndex), x: 0, y: 0, w: 0, h: 0, border: hiddenBorder })
      }
    }

    return { layoutItems, captionUsers }
  }, [virtualSources, sourceLocations])

  // Sends a full LAYOUT + CAPTION_ROTATE pair to exactly one bus. The caller decides
  // the target bus per-packet — no mode-based dual-send here, because leave/rejoin
  // must only refire the bus(es) whose cached layout actually contains the user.
  // Previewing from master mode will simply call this twice (once per bus) when both
  // snapshots hold the user; the symmetry is worth the extra packet.
  const sendFullLayoutPackets = useCallback((layoutItems: object[], captionUsers: object[], methodType: StudioMode, logLabel: string) => {
    if (wsRef.current?.readyState !== WebSocket.OPEN) {
      addLog(`⚠ Not connected — ${logLabel} skipped.`, 'warn')
      return
    }
    const layoutPkt = { type: 'LAYOUT', channel, methodType, layout: { items: layoutItems } }
    const captionPkt = { type: 'CAPTION_ROTATE', channel, methodType, users: captionUsers }
    addLog(JSON.stringify(layoutPkt, null, 2), 'sent')
    wsRef.current.send(JSON.stringify(layoutPkt))
    addLog(JSON.stringify(captionPkt, null, 2), 'sent')
    wsRef.current.send(JSON.stringify(captionPkt))
  }, [addLog, channel])

  // Refires whichever layout is currently cached on the targeted bus. Reads the
  // per-bus snapshot (not mode / activeRowIdx), so preview and master can hold
  // different layouts and still refire correctly. hiddenUserId collapses one slot
  // for a leave; omit it for a rejoin so the slot returns to its real geometry.
  const refireBus = useCallback((bus: StudioMode, hiddenUserId: string | undefined, participantsList: string[], logLabel: string) => {
    const snapshot = bus === 'master' ? masterBusSnapshotRef.current : previewBusSnapshotRef.current
    if (!snapshot) return
    const { kind, q, entry, sources } = snapshot
    if (sources.length === 0) return
    const oppositeQ = kind === 'row'
      ? (isOdd(q) ? q + 1 : q - 1)
      : (q === 11 ? 12 : 11)
    const { layoutItems, captionUsers } = buildFullLayoutFromSnapshot({ q, oppositeQ, entry, sources, hiddenUserId, participantsList })
    sendFullLayoutPackets(layoutItems, captionUsers, bus, logLabel)
  }, [buildFullLayoutFromSnapshot, sendFullLayoutPackets])

  const addParticipant = useCallback((userId: string, joinTimestampMs: number) => {
    setParticipants(prev => prev.includes(userId) ? prev : [...prev, userId])
    setWebrtcSources(prev =>
      prev.some(s => s.id === userId) ? prev : [
        ...prev,
        { id: userId, name: userId, protocol: 'WebRTC' as const, status: 'online' as const, publishTime: new Date(joinTimestampMs).toISOString(), isScreenShare: false },
      ]
    )

    // Post-join participants projection — refire needs the full roster as it will be
    // after this join, so the non-selected-participants hide loop matches reality.
    const nextParticipants = participants.includes(userId) ? participants : [...participants, userId]

    const isInMaster = (masterBusSnapshotRef.current?.sources ?? []).some(s => s.sourceType === 'webrtc' && s.sourceValue === userId)
    if (isInMaster) {
      refireBus('master', undefined, nextParticipants, 'rejoin refire master')
      addLog(`Participant ${userId} rejoined — master bus refired.`, 'info')
    }
    const isInPreview = (previewBusSnapshotRef.current?.sources ?? []).some(s => s.sourceType === 'webrtc' && s.sourceValue === userId)
    if (isInPreview) {
      refireBus('preview', undefined, nextParticipants, 'rejoin refire preview')
      addLog(`Participant ${userId} rejoined — preview bus refired.`, 'info')
    }
  }, [addLog, participants, refireBus])

  const removeParticipant = useCallback((userId: string) => {
    const isInMaster = (masterBusSnapshotRef.current?.sources ?? []).some(s => s.sourceType === 'webrtc' && s.sourceValue === userId)
    const isInPreview = (previewBusSnapshotRef.current?.sources ?? []).some(s => s.sourceType === 'webrtc' && s.sourceValue === userId)

    // Post-leave projection — the participant is no longer in the meeting, so they
    // must not appear in the CAPTION_ROTATE or the non-selected-participants hide
    // loop. The webrtc slots loop still emits their userId (as a zero-geometry hide
    // item, because hiddenUserId matches), so the server drops their slot cleanly.
    const nextParticipants = participants.filter(p => p !== userId)

    if (isInMaster) {
      refireBus('master', userId, nextParticipants, 'leave refire master')
      addLog(`Participant ${userId} left — master bus refired with hide.`, 'info')
    }
    if (isInPreview) {
      refireBus('preview', userId, nextParticipants, 'leave refire preview')
      addLog(`Participant ${userId} left — preview bus refired with hide.`, 'info')
    }

    setParticipants(prev => prev.filter(p => p !== userId))
    setWebrtcSources(prev => prev.filter(s => s.id !== userId))
  }, [addLog, participants, refireBus])

  useEffect(() => {
    if (participants.length === 0) setParticipantStatus({ text: 'None', type: 'err' })
    else setParticipantStatus({ text: `✓ ${participants.length}`, type: 'ok' })
  }, [participants.length])

  const fetchParticipantImages = useCallback(async () => {
    try {
      const data = await http.get<{ code: number; data?: Array<{ userId: string; imagePath: string | null }> }>(
        apiConfig.dotnetApiBase,
        `${GUEST_PARTICIPANTS_API}?chid=${channel}`,
      )
      const imageMap: Record<string, string> = {}
        ; (data.data ?? []).forEach(p => {
          if (p.imagePath && p.imagePath !== 'null') {
            imageMap[p.userId.toLowerCase()] = p.imagePath
          }
        })
      setParticipantImageMap(imageMap)
    } catch {
      // Non-critical — default background will be used as fallback
    }
  }, [channel])

  // ── Sources ──────────────────────────────────────────────────
  const fetchRtmp = useCallback(async () => {
    try {
      const json = await http.get<{ data?: { data?: { streams?: Array<{ id: string; stream: string; status: string; resolution: string }> } } }>('', `${RTMP_API}?channelId=11&application=${channel}&protocol=RTMP`, { headers: { authorization: token } })
      setRtmpSources((json.data?.data?.streams || []).map(s => ({ id: s.id, name: s.stream, protocol: 'RTMP' as const, status: s.status, resolution: s.resolution })))
    } catch (e) { addLog(`RTMP error: ${(e as Error).message}`, 'err'); setRtmpSources([]) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cid, channel, addLog])

  const createRtmpApplication = useCallback(async (name: string) => {
    if (!name) throw new Error('Name is required')
    const payload = {
      ChannelId: 11,
      name,
      protocol: 'RTMP',
      application: channel,
      push_login: '',
      push_password: '',
      protocols: ['RTMP', 'SLDP'],
      chunk_duration: 6,
      chunk_count: 4,
      dash_template: 'TIME',
      ic_enabled: false,
      mp4_thumbnails: false,
      jpg_thumbnails: false,
      alhls_enabled: false,
      tags: [],
      userId: getStorage<string>('pcr_user_id') ?? '',
    }
    type RtmpAppInner = { success?: boolean; message?: string; data?: { id?: string | number; application?: string } }
    type RtmpAppResponse = { code?: number; message?: string; success?: boolean; data?: RtmpAppInner | null }
    let response: RtmpAppResponse
    try {
      response = await http.post<RtmpAppResponse>('', RTMP_APPLICATION_API, payload, { headers: { authorization: token } })
    } catch (err) {
      const axiosLike = err as { response?: { data?: { error?: string; message?: string } }; message?: string }
      const serverMessage = axiosLike.response?.data?.error ?? axiosLike.response?.data?.message
      throw new Error(serverMessage || axiosLike.message || 'Failed to create RTMP application')
    }
    if (!response?.data) {
      throw new Error(response?.message || 'Failed to create RTMP application')
    }
    if (!response.data.success && !response.data.data) {
      throw new Error(response.data.message || 'Failed to create RTMP application')
    }
    if (rtmpRefetchTimerRef.current) clearTimeout(rtmpRefetchTimerRef.current)
    rtmpRefetchTimerRef.current = setTimeout(async () => {
      rtmpRefetchTimerRef.current = null
      await fetchRtmp()
    }, 5_000);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cid, channel, fetchRtmp])

  const fetchVideos = useCallback(async () => {
    setIsLoadingVideoAssets(true)
    try {
      const payload = new URLSearchParams({ cid, status: 'A', pgno: '1', pgsize: '50', category: 'P', name: '', createFrom: '0', createTo: '0', uploadFrom: '0', uploadTo: '0', order: '', afPath: '', subCategory: '' })
      const json = await http.post<{ assets?: VideoAsset[] }>(apiConfig.scalaApiBase, VIDEOS_API, payload.toString(), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'x-auth-token': token, 'x-channel-id': cid },
      })
      setVideoAssets((json.assets || []).filter(a => a.type === 'video')); addLog(`Video assets: ${json.assets?.length ?? 0}`, 'info')
    } catch (e) { addLog(`Videos error: ${(e as Error).message}`, 'err'); setVideoAssets([]) }
    setIsLoadingVideoAssets(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cid, addLog])

  const fetchAllSources = useCallback(async () => {
    setSbStatusState({ text: '.'.repeat(10), type: 'loading' })
    await Promise.all([fetchRtmp(), fetchVideos()])
    setSbStatusState({ text: `${participantsRef.current.length}W ${rtmpSourcesRef.current.length}R`, type: 'ok' })
  }, [fetchRtmp, fetchVideos])

  // ── GFX ──────────────────────────────────────────────────────
  const fetchGraphics = useCallback(async () => {
    setGfxStatus({ text: 'Loading...', type: 'loading' })
    try {
      // Fetch status and alignment in parallel
      const [statusRes, alignRes] = await Promise.all([
        fetch(`${GFX_API}/${channel}/-1`),
        fetch(`${GFX_GETALIGNMENT_API}/${channel}/-1`),
      ])
      if (!statusRes.ok) throw new Error(`HTTP ${statusRes.status}`)
      const rawStatusJson = await statusRes.json() as { data?: Array<{ templatetype?: string; statusType?: Record<string, unknown> }> }
      const rawAlignJson = alignRes.ok ? await alignRes.json() as { data?: Array<{ layout?: Record<string, GfxBandLayout>; alignment?: Record<string, GfxBandAlignment> }> } | null : null

      const isStatusEmpty = Object.keys(rawStatusJson as object).length === 0
      const isAlignEmpty = rawAlignJson !== null && Object.keys(rawAlignJson as object).length === 0

      let tplName: string
      let bands: Record<string, boolean>
      if (isStatusEmpty) {
        tplName = 'template1'
        bands = Object.fromEntries(GFX_DEFAULT_BAND_KEYS.map(key => [key, false]))
      } else {
        const tpl = (rawStatusJson.data || [])[0]
        if (!tpl) throw new Error('No template data')
        tplName = tpl.templatetype || 'template1'
        const raw = tpl.statusType || {}
        bands = {}
        Object.keys(raw).forEach(k => { bands[k] = raw[k] === 'True' || raw[k] === true || raw[k] === 'true' })
        // Merge in any missing standard bands with OFF state
        GFX_DEFAULT_BAND_KEYS.forEach(key => { if (!(key in bands)) bands[key] = false })
      }
      setGfxTemplateName(tplName)
      setGfxData(prev => ({ ...prev, [tplName]: bands }))
      // Pre-fetch bg assets for all relevant bands — single API call, cached in ref
      const bgBandKeys = Object.keys(bands).filter(k => BG_VIDEO_BANDS.has(k) || BG_IMAGE_BANDS.has(k))
      if (bgBandKeys.length > 0) {
        void (async () => {
          try {
            const bgPayload = new URLSearchParams({ cid, status: 'A', pgno: '0', pgsize: '0', category: 'S' })
            const bgJson = await http.post<{ assets?: Array<{ name: string; type: string; s3path?: string }> }>(
              apiConfig.scalaApiBase, GFX_ASSETS_API, bgPayload.toString(),
              { headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'x-auth-token': token, 'x-channel-id': cid } },
            )
            const rawAssets = bgJson.assets || []
            const fallbackBase = getBgBase()
            const videoExts = /\.(mp4|webm|png)$/i
            const imgExts = /\.(png|gif)$/i
            const cache: Record<string, BgAssetItem[]> = {}
            bgBandKeys.forEach(bandKey => {
              const isVideoBand = BG_VIDEO_BANDS.has(bandKey)
              cache[bandKey] = rawAssets
                .filter(a => isVideoBand
                  ? (a.type === 'gvideo' || a.type === 'image') && videoExts.test(a.s3path ?? '')
                  : a.type === 'image' && imgExts.test(a.s3path ?? ''))
                .map(a => ({ name: a.name, path: a.s3path || `${fallbackBase}${a.name}` }))
            })
            gfxBgAssetsCacheRef.current = cache
          } catch { /* non-critical, dialog will fall back to on-demand fetch */ }
        })()
      }
      // Cache alignment + layout data
      if (isAlignEmpty) {
        const defaultAlignment: Record<string, unknown> = {
          ...GFX_ALIGNMENT_DEFAULTS,
          coming_up_band: {},
          bottom_ticker_band: {},
        }
        const defaultLayout: Record<string, GfxBandLayout> = Object.fromEntries(
          [...LAYOUT_BANDS].map(key => [key, { ...GFX_DEFAULT_LAYOUT }])
        )
        setGfxAlignmentCache({ layout: defaultLayout, alignment: defaultAlignment as Record<string, GfxBandAlignment> })
      } else if (rawAlignJson) {
        const alignData = (rawAlignJson.data || [])[0]
        if (alignData) {
          const mergedAlignment = { ...alignData.alignment }
          Object.keys(GFX_ALIGNMENT_DEFAULTS).forEach(key => {
            const existing = mergedAlignment[key]
            const isEmpty = existing !== null && typeof existing === 'object' && Object.keys(existing as object).length === 0
            if (!(key in mergedAlignment) || isEmpty) mergedAlignment[key] = GFX_ALIGNMENT_DEFAULTS[key]
          })
          setGfxAlignmentCache({ layout: alignData.layout ?? {}, alignment: mergedAlignment })
        }
      }
      setGfxStatus({ text: `✓ ${Object.keys(bands).length} bands`, type: 'ok' })
      addLog(`GFX loaded: ${tplName}`, 'gfx')
    } catch (e) {
      setGfxStatus({ text: `Error: ${(e as Error).message}`, type: 'err' })
      addLog(`GFX fetch error: ${(e as Error).message}`, 'err')
    }
  }, [channel, addLog])

  // Parse getvalue response — API returns plain array OR {} for empty bands
  function parseGfxArray<T>(raw: unknown): T[] {
    if (Array.isArray(raw)) return raw as T[]
    const data = (raw as { data?: unknown }).data
    if (Array.isArray(data)) return data as T[]
    return []
  }

  const fetchGfxBandContent = useCallback(async (bandKey: string): Promise<GfxNewsItem[]> => {
    try {
      const res = await fetch(`${GFX_GETVALUE_API}/${channel}/${bandKey}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const raw: unknown = await res.json()
      let items = parseGfxArray<GfxNewsItem>(raw)
      if (items.length === 0) {
        const payloadKey = GFX_CONTENT_WS_PAYLOAD[bandKey]
        if (payloadKey) {
          const directValue = (raw as Record<string, unknown>)[payloadKey]
          if (Array.isArray(directValue)) {
            items = directValue as GfxNewsItem[]
          } else {
            const dataObj = (raw as Record<string, unknown>).data
            if (dataObj && typeof dataObj === 'object' && !Array.isArray(dataObj)) {
              const nestedValue = (dataObj as Record<string, unknown>)[payloadKey]
              if (Array.isArray(nestedValue)) items = nestedValue as GfxNewsItem[]
            }
          }
        }
      }
      setGfxBandContent(prev => ({ ...prev, [bandKey]: items }))
      return items
    } catch {
      return []
    }
  }, [channel])

  const toggleGfxBand = useCallback(async (key: string, newVal: boolean, skipContentResend = false) => {
    if (gfxBusy.has(key)) return
    setGfxBusy(prev => new Set([...prev, key]))
    const methodType = mode
    const tpl = gfxTemplateName || 'template1'
    // Angular always sends methodType:'preview' in the toggle WS packet, then sends a
    // separate goLive packet when in master mode.
    const wsPacket = { Type: 'upd_display', channel, displayValue: bandLabel(key), tempType: key, displayType: newVal, template_type: tpl, methodType: 'preview' }
    const apiPayload = { channel, operation: 'upd_display', gfxtype: key, displayname: 'T', category: methodType, data: JSON.stringify(wsPacket) }
    addLog(`=== GFX TOGGLE: ${key} → ${newVal ? 'ON' : 'OFF'} [${methodType}] ===`, 'divider')
    sendWs(wsPacket, 'gfx')
    if (mode === 'master') {
      sendWs({ Type: 'goLive', channel, methodType: 'master' }, 'gfx')
    }
    try {
      await http.post('', GFX_SET_API, apiPayload)
      setGfxData(prev => ({ ...prev, [tpl]: { ...prev[tpl], [key]: newVal } }))
      addLog(`GFX DB OK: ${key}=${newVal}`, 'gfx')
      // After toggling ON any text band, re-send the content WS packet so the renderer
      // knows what to display. Angular convention: disabled:true = active item.
      // Callers that have already sent their own content packet (e.g. SocialPanel sending
      // a WhatsApp/YouTube message) should pass skipContentResend=true to avoid overwriting
      // their content with the cached GFX editor items.
      if (newVal && !skipContentResend && TEXT_BANDS.has(key) && key !== 'location_band') {
        // Cache is populated only when the user opens the content dialog or saves content.
        // If it is empty here (e.g. user toggled the band without ever opening the editor),
        // fetch the persisted content from the API so the re-send still fires and clears any
        // stale content the viewer may be holding (e.g. a WhatsApp message from SocialPanel).
        let cachedItems = gfxBandContent[key]
        if (!cachedItems || cachedItems.length === 0) {
          cachedItems = await fetchGfxBandContent(key)
        }
        if (cachedItems && cachedItems.length > 0) {
          const wsType = GFX_CONTENT_WS_TYPE[key]
          const payloadKey = GFX_CONTENT_WS_PAYLOAD[key]
          const wsItems = cachedItems.filter(i => i.disabled)
          if (wsItems.length > 0 && wsType) {
            const contentPacket: Record<string, unknown> = {
              Type: wsType, channel, template_type: tpl, displayStyle: newVal,
              window_type: [], methodType: 'preview',
            }
            if (payloadKey) contentPacket[payloadKey] = wsItems
            sendWs(contentPacket, 'gfx')
            if (mode === 'master') sendWs({ Type: 'goLive', channel, methodType: 'master' }, 'gfx')
          }
        }
      }
    } catch (e) {
      setGfxData(prev => ({ ...prev, [tpl]: { ...prev[tpl], [key]: !newVal } }))
      addLog(`GFX DB FAILED: ${(e as Error).message}`, 'err')
    } finally {
      setGfxBusy(prev => { const s = new Set(prev); s.delete(key); return s })
    }
  }, [gfxBusy, mode, gfxTemplateName, channel, gfxBandContent, addLog, sendWs, fetchGfxBandContent])

  const fetchGfxBandLocation = useCallback(async (): Promise<string> => {
    try {
      const res = await fetch(`${GFX_GETVALUE_API}/${channel}/location_band`)
      if (!res.ok) return ''
      const raw = await res.json() as unknown
      if (typeof raw === 'string') return raw
      if (typeof raw === 'object' && raw !== null) {
        const obj = raw as Record<string, unknown>
        if (typeof obj.locNews === 'string') return obj.locNews
      }
      return ''
    } catch { return '' }
  }, [channel])

  const updateGfxBandLocation = useCallback(async (text: string): Promise<boolean> => {
    const tpl = gfxTemplateName || 'template1'
    const methodType = mode
    const locationToggle = (gfxData[tpl] ?? {})['location_band'] ?? false
    const wsPacket = { Type: 'p_location', channel, locNews: text, locationToggle, template_type: tpl, methodType: 'preview', window_type: [] }
    sendWs(wsPacket, 'gfx')
    if (mode === 'master') sendWs({ Type: 'goLive', channel, methodType: 'master' }, 'gfx')
    try {
      await http.post('', GFX_SET_API, {
        channel, operation: 'setvalue', gfxtype: 'location_band',
        displayname: 'T', category: methodType, data: JSON.stringify(wsPacket),
      })
      addLog('GFX location saved', 'gfx')
      return true
    } catch (e) {
      addLog(`GFX location save failed: ${(e as Error).message}`, 'err')
      return false
    }
  }, [channel, gfxTemplateName, mode, gfxData, addLog, sendWs])

  const fetchGfxBandAsset = useCallback(async (bandKey: string): Promise<GfxAssetItem[]> => {
    try {
      const res = await fetch(`${GFX_GETVALUE_API}/${channel}/${bandKey}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const raw = await res.json() as unknown
      // Angular saves the full WS packet as the data field; extract items from band-specific key
      const payloadKey = GFX_CONTENT_WS_PAYLOAD[bandKey]
      if (payloadKey && typeof raw === 'object' && raw !== null && !Array.isArray(raw)) {
        const nested = (raw as Record<string, unknown>)[payloadKey]
        if (Array.isArray(nested)) return nested as GfxAssetItem[]
      }
      return parseGfxArray<GfxAssetItem>(raw)
    } catch {
      return []
    }
  }, [channel])

  // bandKey determines filter — logo_band includes video assets (.mp4/.webm), others image-only
  const fetchGfxAssets = useCallback((bandKey: string): Promise<GfxAssetItem[]> => {
    return fetchGfxAssetsLib(cid, token, bandKey)
  }, [cid, token])

  // Fetch background media assets for the alignment bgVideo / bgImage dropdown
  const fetchGfxBgAssets = useCallback(async (bandKey: string): Promise<BgAssetItem[]> => {
    const cached = gfxBgAssetsCacheRef.current[bandKey]
    if (cached !== undefined) return cached
    try {
      const payload = new URLSearchParams({ cid, status: 'A', pgno: '0', pgsize: '0', category: 'S' })
      const json = await http.post<{ assets?: Array<{ name: string; type: string; s3path?: string }> }>(
        apiConfig.scalaApiBase, GFX_ASSETS_API, payload.toString(),
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'x-auth-token': token, 'x-channel-id': cid } },
      )
      const isVideoBand = BG_VIDEO_BANDS.has(bandKey)
      const fallbackBase = getBgBase()
      const videoExts = /\.(mp4|webm|png)$/i
      const imgExts = /\.(png|gif)$/i
      const result = (json.assets || [])
        .filter(a => isVideoBand
          ? (a.type === 'gvideo' || a.type === 'image') && videoExts.test(a.s3path ?? '')
          : a.type === 'image' && imgExts.test(a.s3path ?? ''))
        .map(a => ({ name: a.name, path: a.s3path || `${fallbackBase}${a.name}` }))
      gfxBgAssetsCacheRef.current = { ...gfxBgAssetsCacheRef.current, [bandKey]: result }
      return result
    } catch { return [] }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cid, token, channel])

  // Return cached layout for a band (populated from getalignment on fetchGraphics)
  // Unwraps any previously-corrupted nested data before returning.
  const getGfxBandLayout = useCallback((bandKey: string): GfxBandLayout | null => {
    const raw = gfxAlignmentCache.layout[bandKey]
    if (raw === undefined) return null
    return unwrapBandData(raw as unknown as Record<string, unknown>, bandKey) as GfxBandLayout | null
  }, [gfxAlignmentCache])

  // Return cached alignment/position for a band.
  // Returns 'corrupted' when the stored value is a scalar (e.g. lower_band:54, clock_band:"url")
  // so the dialog can show an unrecoverable state with a reset-to-defaults option.
  const getGfxBandPosition = useCallback((bandKey: string): GfxBandAlignment | null | 'corrupted' => {
    const raw = gfxAlignmentCache.alignment[bandKey]
    if (raw === undefined) return null
    if (typeof raw === 'number' || typeof raw === 'string') return 'corrupted'
    if (raw === null || typeof raw !== 'object') return null
    return unwrapBandData<GfxBandAlignment>(raw as Record<string, unknown>, bandKey)
  }, [gfxAlignmentCache])

  const updateGfxBandContent = useCallback(async (bandKey: string, items: GfxNewsItem[]): Promise<boolean> => {
    const tpl = gfxTemplateName || 'template1'
    const methodType = mode
    const wsType = GFX_CONTENT_WS_TYPE[bandKey]
    const payloadKey = GFX_CONTENT_WS_PAYLOAD[bandKey]
    const displayStyle = (gfxData[tpl] ?? {})[bandKey] ?? false
    // WS: send only active items (disabled:true = active, Angular convention).
    // API: send all items with disabled as-is.
    const wsItems = items.filter(i => i.disabled)
    const wsPayloadPart = payloadKey ? { [payloadKey]: wsItems } : {}
    const wsPacket = { Type: wsType, channel, ...wsPayloadPart, displayStyle, template_type: tpl, methodType: 'preview' }
    // Angular order: Type → channel → [payloadKey] → displayStyle → template_type (no window_type)
    const apiPayloadPart = payloadKey ? { [payloadKey]: items } : {}
    const apiDataPacket = { Type: wsType, channel, ...apiPayloadPart, displayStyle, template_type: tpl }
    if (wsType) sendWs(wsPacket, 'gfx')
    if (wsType && methodType === 'master') sendWs({ Type: 'goLive', channel, methodType: 'master' }, 'gfx')
    try {
      await http.post('', GFX_SET_API, {
        channel, operation: 'setvalue', gfxtype: bandKey,
        displayname: 'T', category: methodType, data: JSON.stringify(apiDataPacket),
      })
      setGfxBandContent(prev => ({ ...prev, [bandKey]: items }))
      addLog(`GFX content saved: ${bandKey}`, 'gfx')
      void fetchGraphics()
      return true
    } catch (e) {
      addLog(`GFX content save failed: ${(e as Error).message}`, 'err')
      return false
    }
  }, [channel, gfxTemplateName, mode, gfxData, addLog, sendWs, fetchGraphics])

  const updateGfxBandAsset = useCallback(async (bandKey: string, items: GfxAssetItem[]): Promise<boolean> => {
    const tpl = gfxTemplateName || 'template1'
    const methodType = mode
    const bandToggle = (gfxData[tpl] ?? {})[bandKey] ?? false
    const saveItems = items.map(({ id, name, url, s3path }) => ({
      id, name,
      url: bandKey === 'logo_band' ? (s3path || url) : url,
    }))
    // Angular: logo_band → { Type:'p_VODLogo', VODLogo, VODLogoToggle }
    //           l_band   → { Type:'p_Lband',   lband,   lbandToggle }
    const wsPacket: Record<string, unknown> = bandKey === 'logo_band'
      ? { Type: 'p_VODLogo', channel, VODLogo: saveItems, VODLogoToggle: bandToggle, template_type: tpl, methodType: 'preview' }
      : { Type: 'p_Lband', channel, lband: saveItems, lbandToggle: bandToggle, template_type: tpl, methodType: 'preview' }
    sendWs(wsPacket, 'gfx')
    if (mode === 'master') sendWs({ Type: 'goLive', channel, methodType: 'master' }, 'gfx')
    try {
      await http.post('', GFX_SET_API, {
        channel, operation: 'setvalue', gfxtype: bandKey,
        displayname: 'T', category: methodType, data: JSON.stringify(wsPacket),
      })
      addLog(`GFX asset saved: ${bandKey}`, 'gfx')
      void fetchGraphics()
      return true
    } catch (e) {
      addLog(`GFX asset save failed: ${(e as Error).message}`, 'err')
      return false
    }
  }, [channel, gfxTemplateName, mode, gfxData, addLog, sendWs, fetchGraphics])

  const updateGfxBandLayout = useCallback(async (bandKey: string, layout: GfxBandLayout): Promise<boolean> => {
    const tpl = gfxTemplateName || 'template1'
    const methodType = mode
    // Angular sends the full LayoutDesg (all bands merged) not just the one being edited.
    // Unwrap any corrupted nested values in the cache so the WS packet contains flat data.
    const unwrappedLayout = Object.fromEntries(
      Object.entries(gfxAlignmentCacheRef.current.layout)
        .map(([k, v]) => [k, unwrapBandData(v, k)])
        .filter(([, v]) => v !== null)
    )
    const fullLayoutDesg = { ...unwrappedLayout, [bandKey]: layout }
    const wsPacket = { Type: 'p_Layout', channel, LayoutDesg: fullLayoutDesg, template_type: tpl, methodType: 'preview' }
    sendWs(wsPacket, 'gfx')
    if (mode === 'master') {
      sendWs({ Type: 'goLive', channel, methodType: 'master' }, 'gfx')
    }
    try {
      await http.post('', GFX_SET_API, {
        channel, operation: 'setlayout', gfxtype: bandKey,
        displayname: 'T', category: methodType,
        data: JSON.stringify({ Type: 'p_Layout', channel, LayoutDesg: layout, template_type: tpl }),
      })
      setGfxAlignmentCache(prev => ({ ...prev, layout: { ...prev.layout, [bandKey]: layout } }))
      addLog(`GFX layout saved: ${bandKey}`, 'gfx')
      void fetchGraphics()
      return true
    } catch (e) {
      addLog(`GFX layout save failed: ${(e as Error).message}`, 'err')
      return false
    }
  }, [channel, gfxTemplateName, mode, addLog, sendWs, fetchGraphics])

  const updateGfxBandAlignment = useCallback(async (bandKey: string, alignment: GfxBandAlignment): Promise<boolean> => {
    const tpl = gfxTemplateName || 'template1'
    const methodType = mode
    // Angular sends a per-band WS Type and per-band payload key, NOT a generic 'p_settings_alignment'.
    // GFX_ALIGNMENT_WS_TYPE and GFX_ALIGNMENT_WS_PAYLOAD are defined in studioConfig for each band.
    const wsType = GFX_ALIGNMENT_WS_TYPE[bandKey]
    const payloadKey = GFX_ALIGNMENT_WS_PAYLOAD[bandKey]
    // Angular order: Type → channel → [payloadKey] → template_type → methodType
    const payloadPart = payloadKey
      ? { [payloadKey]: alignment }
      : { alignment: { ...gfxAlignmentCacheRef.current.alignment, [bandKey]: alignment } }
    const wsPacket = {
      Type: wsType ?? 'p_settings_alignment',
      channel,
      ...payloadPart,
      template_type: tpl,
      methodType: 'preview',
    }
    sendWs(wsPacket, 'gfx')
    if (mode === 'master') sendWs({ Type: 'goLive', channel, methodType: 'master' }, 'gfx')
    try {
      await http.post('', GFX_SET_API, {
        channel, operation: 'setalignment', gfxtype: bandKey,
        displayname: 'T', category: methodType, data: JSON.stringify(wsPacket),
      })
      setGfxAlignmentCache(prev => ({ ...prev, alignment: { ...prev.alignment, [bandKey]: alignment } }))
      addLog(`GFX alignment saved: ${bandKey}`, 'gfx')
      void fetchGraphics()
      return true
    } catch (e) {
      addLog(`GFX alignment save failed: ${(e as Error).message}`, 'err')
      return false
    }
  }, [channel, gfxTemplateName, mode, addLog, sendWs, fetchGraphics])

  const previewGfxBandLayout = useCallback((bandKey: string, layout: GfxBandLayout) => {
    const tpl = gfxTemplateName || 'template1'
    const unwrappedLayout = Object.fromEntries(
      Object.entries(gfxAlignmentCacheRef.current.layout)
        .map(([k, v]) => [k, unwrapBandData(v, k)])
        .filter(([, v]) => v !== null)
    )
    const fullLayoutDesg = { ...unwrappedLayout, [bandKey]: layout }
    sendWs({ Type: 'p_Layout', channel, LayoutDesg: fullLayoutDesg, template_type: tpl, methodType: 'preview' }, 'gfx')
  }, [channel, gfxTemplateName, sendWs])

  const previewGfxBandAlignment = useCallback((bandKey: string, alignment: GfxBandAlignment) => {
    const tpl = gfxTemplateName || 'template1'
    const wsType = GFX_ALIGNMENT_WS_TYPE[bandKey]
    const payloadKey = GFX_ALIGNMENT_WS_PAYLOAD[bandKey]
    const payloadPart = payloadKey
      ? { [payloadKey]: alignment }
      : { alignment: { ...gfxAlignmentCacheRef.current.alignment, [bandKey]: alignment } }
    sendWs({ Type: wsType ?? 'p_settings_alignment', channel, ...payloadPart, template_type: tpl, methodType: 'preview' }, 'gfx')
  }, [channel, gfxTemplateName, sendWs])

  // ── Row updates ──────────────────────────────────────────────
  const updateRow = useCallback((idx: number, patch: Partial<RowState>) => {
    setRows(prev => prev.map((r, i) => i === idx ? { ...r, ...patch } : r))
  }, [])

  // Enforce slot limit when caption changes
  const onCaptionChange = useCallback((idx: number, captionId: string) => {
    const entry = layoutData.find(l => String(l.id) === captionId)
    const maxSlots = entry ? Math.min(Math.max(1, entry.windowsCount), MAX_SOURCE_SLOTS) : 0
    if (idx === activeRowIdxRef.current) {
      const currentRow = rows[idx]
      const trimmedSlots = currentRow.sources.slice(maxSlots)
      const q = idx + 1
      trimmedSlots.forEach((slot, trimmedOffset) => {
        if (!slot.sourceValue) return
        const absoluteSlotIdx = maxSlots + trimmedOffset
        // WebRTC mute is owned exclusively by the sidebar (muteParticipant) — skip here.
        if (slot.sourceType === 'rtmp') {
          const rtmpIndex = currentRow.sources.slice(0, absoluteSlotIdx).filter(s => s.sourceType === 'rtmp').length
          sendWs({ type: 'AUDIO_CONTROL', source: 'SLDP_VIDEO', userId: rtmpIdForSlot(q, rtmpIndex), mute: true, channel, methodType: 'preview' })
        } else if (slot.sourceType === 'vod') {
          const vodIndex = currentRow.sources.slice(0, absoluteSlotIdx).filter(s => s.sourceType === 'vod').length
          sendWs({ type: 'AUDIO_CONTROL', source: 'EXTERNAL_VIDEO', userId: extIdForVodSlot(q, vodIndex), mute: true, channel, methodType: 'preview' })
        }
      })
    }
    setRows(prev => prev.map((r, i) => {
      if (i !== idx) return r
      return { ...r, captionId, sources: r.sources.slice(0, maxSlots) }
    }))
  }, [layoutData, rows, channel, sendWs])

  // ── Source slot actions ──────────────────────────────────────
  const addSource = useCallback((rowIdx: number) => {
    setRows(prev => prev.map((r, i) => {
      if (i !== rowIdx || r.sources.length >= MAX_SOURCE_SLOTS) return r
      return { ...r, sources: [...r.sources, { slotKey: uid(), sourceType: '', sourceValue: '', muted: false, volume: 100, panX: 0, panY: 0, zoom: 1, loop: false }] }
    }))
  }, [])

  const removeSource = useCallback((rowIdx: number, slotIdx: number) => {
    setRows(prev => prev.map((r, i) => {
      if (i !== rowIdx) return r
      return { ...r, sources: r.sources.filter((_, si) => si !== slotIdx) }
    }))
  }, [])

  const updateSource = useCallback((rowIdx: number, slotIdx: number, patch: Partial<SourceSlot>) => {
    setRows(prev => prev.map((r, i) => {
      if (i !== rowIdx) return r
      return { ...r, sources: r.sources.map((s, si) => si === slotIdx ? { ...s, ...patch } : s) }
    }))
  }, [])

  const muteSource = useCallback((rowIdx: number, slotIdx: number, newMuted: boolean) => {
    // Read slot data before setRows so we always have fresh values (avoids stale closure)
    const row = rows[rowIdx]
    const slot = row?.sources[slotIdx]
    setRows(prev => prev.map((r, i) => {
      if (i !== rowIdx) return r
      return { ...r, sources: r.sources.map((s, si) => si === slotIdx ? { ...s, muted: newMuted } : s) }
    }))
    // Sync participantMuteMap so the sidebar icon stays in step
    if (slot?.sourceType === 'webrtc' && slot.sourceValue && !virtualSources.some(v => v.id === slot.sourceValue)) {
      setParticipantMuteMap(prev => ({ ...prev, [slot.sourceValue]: newMuted }))
    }
    if (rowIdx !== activeRowIdxRef.current) return
    if (!slot?.sourceValue) return
    const q = rowIdx + 1
    const sendBoth = (packet: Record<string, unknown>) => {
      sendWs({ ...packet, methodType: 'preview' })
      sendWs({ ...packet, methodType: 'master' })
    }
    // WebRTC mute is owned exclusively by muteParticipant (sidebar) — never send AUDIO_CONTROL TRTC here.
    if (slot.sourceType === 'rtmp') {
      const rtmpIndex = row.sources.slice(0, slotIdx).filter(s => s.sourceType === 'rtmp').length
      sendBoth({ type: 'AUDIO_CONTROL', source: 'SLDP_VIDEO', userId: rtmpIdForSlot(q, rtmpIndex), mute: newMuted, channel })
    } else if (slot.sourceType === 'vod') {
      const vodIndex = row.sources.slice(0, slotIdx).filter(s => s.sourceType === 'vod').length
      sendBoth({ type: 'AUDIO_CONTROL', source: 'EXTERNAL_VIDEO', userId: extIdForVodSlot(q, vodIndex), mute: newMuted, channel })
    }
  }, [rows, channel, virtualSources, sendWs])

  const muteParticipant = useCallback((userId: string, isMuted: boolean) => {
    setParticipantMuteMap(prev => ({ ...prev, [userId]: isMuted }))
    // Sync slot.muted for every row that uses this participant as a webrtc source
    setRows(prev => prev.map(r => ({
      ...r,
      sources: r.sources.map(s =>
        s.sourceType === 'webrtc' && s.sourceValue === userId ? { ...s, muted: isMuted } : s
      ),
    })))
    // Send to both preview and master (consistent with muteSource behaviour)
    sendWs({ type: 'AUDIO_CONTROL', source: 'TRTC', userId, mute: isMuted, channel, methodType: 'preview' })
    sendWs({ type: 'AUDIO_CONTROL', source: 'TRTC', userId, mute: isMuted, channel, methodType: 'master' })
  }, [sendWs, channel])

  const setSourceVolume = useCallback((rowIdx: number, slotIdx: number, volume: number) => {
    setRows(prev => prev.map((r, i) => {
      if (i !== rowIdx) return r
      return { ...r, sources: r.sources.map((s, si) => si === slotIdx ? { ...s, volume } : s) }
    }))
    if (rowIdx !== activeRowIdx) return
    const row = rows[rowIdx]
    const slot = row.sources[slotIdx]
    if (!slot?.sourceValue) return
    const q = rowIdx + 1
    const sendBoth = (packet: Record<string, unknown>) => {
      sendWs({ ...packet, methodType: 'preview' })
      sendWs({ ...packet, methodType: 'master' })
    }
    if (slot.sourceType === 'webrtc') {
      if (virtualSources.some(v => v.id === slot.sourceValue)) return // virtual source - no independent audio
      sendBoth({ type: 'AUDIO_VOLUME', source: 'TRTC', userId: slot.sourceValue, volume, channel })
    } else if (slot.sourceType === 'rtmp') {
      const rtmpIndex = row.sources.slice(0, slotIdx).filter(s => s.sourceType === 'rtmp').length
      sendBoth({ type: 'AUDIO_VOLUME', source: 'SLDP_VIDEO', userId: rtmpIdForSlot(q, rtmpIndex), volume, channel })
    } else if (slot.sourceType === 'vod') {
      const vodIndex = row.sources.slice(0, slotIdx).filter(s => s.sourceType === 'vod').length
      sendBoth({ type: 'AUDIO_VOLUME', source: 'EXTERNAL_VIDEO', userId: extIdForVodSlot(q, vodIndex), volume, channel })
    }
  }, [rows, activeRowIdx, channel, virtualSources, sendWs])

  const setSourceTransform = useCallback((rowIdx: number, slotIdx: number, patch: Partial<Pick<SourceSlot, 'panX' | 'panY' | 'zoom'>>) => {
    setRows(prev => prev.map((r, i) => {
      if (i !== rowIdx) return r
      return { ...r, sources: r.sources.map((s, si) => si === slotIdx ? { ...s, ...patch } : s) }
    }))
    if (rowIdx !== activeRowIdx) return
    const row = rows[rowIdx]
    const slot = row.sources[slotIdx]
    if (!slot?.sourceValue) return
    const transform = { zoom: slot.zoom, panX: slot.panX, panY: slot.panY, ...patch }
    const q = rowIdx + 1
    const sendBoth = (packet: Record<string, unknown>) => {
      sendWs({ ...packet, methodType: 'preview' })
      sendWs({ ...packet, methodType: 'master' })
    }
    if (slot.sourceType === 'webrtc') {
      const virtualSrc = virtualSources.find(v => v.id === slot.sourceValue)
      sendBoth({ type: 'VIDEO_TRANSFORM', userId: virtualSrc ? virtualSrc.id : slot.sourceValue, transform, channel })
    } else if (slot.sourceType === 'rtmp') {
      const rtmpIndex = row.sources.slice(0, slotIdx).filter(s => s.sourceType === 'rtmp').length
      sendBoth({ type: 'VIDEO_TRANSFORM', userId: rtmpIdForSlot(q, rtmpIndex), transform, channel })
    } else if (slot.sourceType === 'vod') {
      const vodIndex = row.sources.slice(0, slotIdx).filter(s => s.sourceType === 'vod').length
      sendBoth({ type: 'VIDEO_TRANSFORM', userId: extIdForVodSlot(q, vodIndex), transform, channel })
    }
  }, [rows, activeRowIdx, channel, virtualSources, sendWs])

  const updateSourceLocations = useCallback((sourceName: string, locations: SourceLocation[]) => {
    setSourceLocations(prev => ({ ...prev, [sourceName]: locations }))
  }, [])

  // ── Virtual sources (duplicate TRTC streams with crop) ───────
  const addVirtualSource = useCallback((sourceUserId: string) => {
    setVirtualSources(prev => {
      const userDups = prev.filter(v => v.sourceUserId === sourceUserId)
      const displayIndex = userDups.length + 1
      const sanitizedUserId = sourceUserId.toLowerCase().replace(/[^a-z0-9]/g, '_')
      let id = `${sanitizedUserId}_dup_${displayIndex}`
      // Guard against ID collision when a lower-index dup was deleted while higher-index ones remain
      let candidateIndex = displayIndex
      while (prev.some(v => v.id === id)) {
        candidateIndex++
        id = `${sanitizedUserId}_dup_${candidateIndex}`
      }
      return [...prev, {
        id,
        name: `${sourceUserId} Dup ${displayIndex}`,
        sourceUserId,
        crop: { x: 0, y: 0, w: 100, h: 100 },
      }]
    })
  }, [])

  const removeVirtualSource = useCallback((id: string) => {
    setVirtualSources(prev => prev.filter(v => v.id !== id))
    setRows(prev => prev.map(r => ({
      ...r,
      sources: r.sources.map(s =>
        s.sourceType === 'webrtc' && s.sourceValue === id
          ? { ...s, sourceValue: '' }
          : s
      ),
    })))
  }, [])

  const updateVirtualSource = useCallback((id: string, patch: Partial<Pick<VirtualSource, 'name' | 'crop'>>) => {
    setVirtualSources(prev => prev.map(v => v.id === id ? { ...v, ...patch } : v))
  }, [])

  // ── Fire Q-button ────────────────────────────────────────────
  const buildRowGfxCommands = useCallback((q: number, methodType: StudioMode) => {
    const row = rows[q - 1]
    const tpl = gfxTemplateName || 'template1'
    const cmds: Array<{ key: string; newVal: boolean; wsPacket: object; apiPayload: object; label: string }> = []
    row.gfxStart.forEach(key => {
      const wsPacket = { Type: 'upd_display', channel, displayValue: bandLabel(key), tempType: key, displayType: true, template_type: tpl, methodType: 'preview' }
      cmds.push({ key, newVal: true, wsPacket, apiPayload: { channel, operation: 'upd_display', gfxtype: key, displayname: 'T', category: methodType, data: JSON.stringify(wsPacket) }, label: `${key} → ON` })
    })
    row.gfxStop.forEach(key => {
      const wsPacket = { Type: 'upd_display', channel, displayValue: bandLabel(key), tempType: key, displayType: false, template_type: tpl, methodType: 'preview' }
      cmds.push({ key, newVal: false, wsPacket, apiPayload: { channel, operation: 'upd_display', gfxtype: key, displayname: 'T', category: methodType, data: JSON.stringify(wsPacket) }, label: `${key} → OFF` })
    })
    return cmds
  }, [rows, gfxTemplateName, channel])

  const fireRowGfx = useCallback(async (q: number, methodType: StudioMode) => {
    const cmds = buildRowGfxCommands(q, methodType)
    if (!cmds.length) return
    addLog(`--- Q${q} GFX commands (${cmds.length}) ---`, 'divider')
    const tpl = gfxTemplateName || 'template1'
    for (const cmd of cmds) {
      sendWs(cmd.wsPacket, 'gfx')
      http.post('', GFX_SET_API, cmd.apiPayload)
        .then(() => { setGfxData(prev => ({ ...prev, [tpl]: { ...prev[tpl], [cmd.key]: cmd.newVal } })); addLog(`GFX DB OK (Q${q}): ${cmd.label}`, 'gfx') })
        .catch((e: Error) => addLog(`GFX DB FAILED (Q${q}) ${cmd.key}: ${e.message}`, 'err'))
    }
    if (mode === 'master') sendWs({ Type: 'goLive', channel, methodType: 'master' }, 'gfx')
  }, [buildRowGfxCommands, gfxTemplateName, addLog, sendWs, mode, channel])

  const sendPreload = useCallback((q: number, methodType: StudioMode) => {
    const row = rows[q - 1]
    // Virtual sources have no separate TRTC stream — skip them in preload
    const webrtcSlots = row.sources.filter(s => s.sourceType === 'webrtc' && s.sourceValue && !virtualSources.some(v => v.id === s.sourceValue))
    const vodSlots = row.sources
      .filter(s => s.sourceType === 'vod' && s.sourceValue)
      .map((slot, vodIndex) => ({ slot, extId: extIdForVodSlot(q, vodIndex) }))
    const rtmpSlots = row.sources.filter(s => s.sourceType === 'rtmp' && s.sourceValue)
    if (!webrtcSlots.length && !vodSlots.length && !rtmpSlots.length) return
    const defaultBgUrl = `${DEFAULT_BG_COVER_URL(channel)}?t=${Date.now()}`
    addLog(`--- Preload Q${q} (${webrtcSlots.length} WebRTC, ${vodSlots.length} VOD, ${rtmpSlots.length} RTMP) [${methodType}] ---`, 'divider')
    webrtcSlots.forEach(slot => {
      const bgImageUrl = participantImageMap[slot.sourceValue.toLowerCase()] || defaultBgUrl
      sendWs({ type: 'EXTERNAL_BG_IMAGE', userId: slot.sourceValue, url: bgImageUrl, fit: 'cover', channel, methodType }, 'preload')
      preloadTrackerRef.current.set(slot.sourceValue, { qRow: q, bgImageKey: participantImageMap[slot.sourceValue.toLowerCase()] ?? 'default' })
    })
    vodSlots.forEach(({ slot, extId }) => {
      sendWs({ userId: extId, url: videoUrl(slot.sourceValue), type: 'EXTERNAL_VIDEO', loop: slot.loop ?? true, channel, methodType }, 'preload')
      sendWs({ type: 'EXTERNAL_BG_IMAGE', userId: extId, url: defaultBgUrl, fit: 'cover', channel, methodType }, 'preload')
      preloadTrackerRef.current.set(extId, { qRow: q, bgImageKey: 'default', vodSourceValue: slot.sourceValue })
    })
    rtmpSlots.forEach((slot, rtmpIndex) => {
      const rtmpUserId = rtmpIdForSlot(q, rtmpIndex)
      sendWs({ type: 'SLDP', userId: rtmpUserId, url: `${SLDP_WSS_BASE}/${channel}/${slot.sourceValue}`, channel, methodType: 'preview' }, 'preload')
      sendWs({ type: 'EXTERNAL_BG_IMAGE', userId: rtmpUserId, url: defaultBgUrl, fit: 'cover', channel, methodType }, 'preload')
      preloadTrackerRef.current.set(rtmpUserId, { qRow: q, bgImageKey: 'default', rtmpSourceValue: slot.sourceValue })
    })
  }, [rows, channel, participantImageMap, virtualSources, addLog, sendWs])

  const fire = useCallback((q: number) => {
    const row = rows[q - 1]
    const entry = layoutData.find(l => String(l.id) === row.captionId)
    if (!entry) { addLog(`Q${q}: No caption.`, 'warn'); return }
    const methodType = mode
    const rowBg = bgUrlFn(entry.bgVideo)
    addLog(`=== Q${q} FIRED (${entry.caption}) [${methodType}] ===`, 'divider')
    setActiveRowIdx(q - 1)
    if (methodType === 'preview') {
      setLastFiredInfo(`Q${q} — ${entry.caption} (${new Date().toLocaleTimeString()}) — ready to publish`)
    }
    const rec = (obj: Record<string, unknown>, lt: LogType = 'sent') => {
      addLog(JSON.stringify(obj, null, 2), lt)
      if (wsRef.current?.readyState !== WebSocket.OPEN) { addLog('⚠ Not connected.', 'warn'); return }
      wsRef.current.send(JSON.stringify(obj))
      if (methodType === 'master') wsRef.current.send(JSON.stringify({ ...obj, methodType: 'preview' }))
    }

    // Build source slot lists — each type gets its own userId scheme.
    // Virtual sources (duplicates of a real TRTC stream) are separated out
    // so they never pollute audio/caption/preload logic for real slots.
    const virtualSourceMap = new Map(virtualSources.map(v => [v.id, v]))
    const isVirtualId = (id: string) => virtualSourceMap.has(id)

    const webrtcSlots = row.sources.filter(s => s.sourceType === 'webrtc' && s.sourceValue && !isVirtualId(s.sourceValue))
    const virtualSlots = row.sources.filter(s => s.sourceType === 'webrtc' && s.sourceValue && isVirtualId(s.sourceValue))
    const rtmpSlots = row.sources.filter(s => s.sourceType === 'rtmp' && s.sourceValue)
    const vodSlots = row.sources.filter(s => s.sourceType === 'vod' && s.sourceValue)
      .map((slot, vodIndex) => ({ slot, extId: extIdForVodSlot(q, vodIndex) }))

    const selectedWebrtcUserIds = webrtcSlots.map(s => s.sourceValue)
    // Real userIds behind virtual slots must not be hidden even if they have no direct slot
    const realIdsFromVirtualSlots = [...new Set(
      virtualSlots.map(s => virtualSourceMap.get(s.sourceValue)?.sourceUserId).filter((id): id is string => !!id)
    )]
    const allProtectedRealIds = new Set([...selectedWebrtcUserIds, ...realIdsFromVirtualSlots])

    if (webrtcSlots.length + virtualSlots.length + rtmpSlots.length + vodSlots.length === 0) {
      addLog(`Q${q}: No sources.`, 'warn'); return
    }

    // Mute all non-webrtc sources from the currently active row before switching to the new layout
    // WebRTC mute state is owned exclusively by the sidebar (muteParticipant) and must not be
    // overridden here during a Q-row switch.
    const currentActiveRowIdx = activeRowIdxRef.current
    if (currentActiveRowIdx !== null && currentActiveRowIdx !== q - 1) {
      const prevQ = currentActiveRowIdx + 1
      // Use the snapshot of what was actually fired (not current row state) so sources
      // deleted after firing still get muted when switching to a different Q row.
      // WebRTC mute is excluded — owned exclusively by the sidebar (muteParticipant).
      const prevFiredSources = lastFiredRowSourcesRef.current[currentActiveRowIdx] ?? []
      prevFiredSources
        .filter(s => s.sourceType === 'rtmp' && s.sourceValue)
        .forEach((_, rtmpIndex) => {
          rec({ type: 'AUDIO_CONTROL', source: 'SLDP_VIDEO', userId: rtmpIdForSlot(prevQ, rtmpIndex), mute: true, channel, methodType })
        })
      prevFiredSources
        .filter(s => s.sourceType === 'vod' && s.sourceValue)
        .forEach((_, vodIndex) => {
          rec({ type: 'AUDIO_CONTROL', source: 'EXTERNAL_VIDEO', userId: extIdForVodSlot(prevQ, vodIndex), mute: true, channel, methodType })
        })
    }

    // Mute non-webrtc sources dropped from this row since its last fire (same-row refire with removed sources).
    // WebRTC mute state is owned exclusively by the sidebar and must not be auto-set here.
    if (currentActiveRowIdx === q - 1) {
      const prevFiredSources = lastFiredRowSourcesRef.current[q - 1] ?? []
      const prevFiredRtmpCount = prevFiredSources.filter(s => s.sourceType === 'rtmp' && s.sourceValue).length
      for (let rtmpIndex = rtmpSlots.length; rtmpIndex < prevFiredRtmpCount; rtmpIndex++) {
        rec({ type: 'AUDIO_CONTROL', source: 'SLDP_VIDEO', userId: rtmpIdForSlot(q, rtmpIndex), mute: true, channel, methodType })
      }
      const prevFiredVodCount = prevFiredSources.filter(s => s.sourceType === 'vod' && s.sourceValue).length
      for (let vodIndex = vodSlots.length; vodIndex < prevFiredVodCount; vodIndex++) {
        rec({ type: 'AUDIO_CONTROL', source: 'EXTERNAL_VIDEO', userId: extIdForVodSlot(q, vodIndex), mute: true, channel, methodType })
      }
    }

    // Build layout and caption packets
    const coords = parseMixLayout(entry)
    const waterMarkStyles = parseWaterMarkStyles(entry)
    const layoutItems: object[] = []
    const captionUsers: object[] = []
    let windowIndex = 0 // advances per visible source; used as 1-based count after increment

    const hiddenBorder = { width: 0, color: '#00000000', radius: 0 }

    const emptyCaptionPacket = { position: { x: 0, y: 0, w: 0, h: 0 }, style: {}, animation: { interval: 3000 }, items: [''] }

    // WebRTC + virtual (dup) slots — iterated in Q row slot order so window positions
    // reflect the user's arrangement. Real WebRTC and dup slots are one interchangeable
    // group; RTMP and VOD always follow after.
    row.sources
      .filter(s => s.sourceType === 'webrtc' && s.sourceValue)
      .forEach(slot => {
        const pos = coords[windowIndex++] ?? { x: 0, y: 0, w: 0, h: 0, border: hiddenBorder }
        if (isVirtualId(slot.sourceValue)) {
          const virtualSrc = virtualSourceMap.get(slot.sourceValue)!
          layoutItems.push({
            userId: virtualSrc.id,
            x: pos.x, y: pos.y, w: pos.w, h: pos.h,
            border: pos.border,
            sourceUserId: virtualSrc.sourceUserId,
            crop: virtualSrc.crop,
          })
          const enabledDupLocationLabels = (sourceLocations[virtualSrc.id] ?? []).filter(l => l.enabled).map(l => l.label)
          const dupWaterMarkConfig = waterMarkStyles.get(windowIndex)
          if (enabledDupLocationLabels.length > 0) {
            const captionH = Math.round((dupWaterMarkConfig?.style.fontSize ?? 22) + CAPTION_VERTICAL_PADDING * 2)
            captionUsers.push({
              userId: virtualSrc.id,
              position: { x: 0, y: pos.h - captionH, w: pos.w, h: captionH },
              style: dupWaterMarkConfig?.style ?? {},
              animation: { interval: dupWaterMarkConfig?.animationInterval ?? 3000 },
              items: enabledDupLocationLabels,
            })
          } else {
            captionUsers.push({ userId: virtualSrc.id, ...emptyCaptionPacket })
          }
        } else {
          layoutItems.push({ userId: slot.sourceValue, x: pos.x, y: pos.y, w: pos.w, h: pos.h, border: pos.border })
          const enabledLocationLabels = (sourceLocations[slot.sourceValue] ?? []).filter(l => l.enabled).map(l => l.label)
          const waterMarkConfig = waterMarkStyles.get(windowIndex) // 1-based after increment
          if (enabledLocationLabels.length > 0) {
            const captionH = Math.round((waterMarkConfig?.style.fontSize ?? 22) + CAPTION_VERTICAL_PADDING * 2)
            captionUsers.push({
              userId: slot.sourceValue,
              position: { x: 0, y: pos.h - captionH, w: pos.w, h: captionH },
              style: waterMarkConfig?.style ?? {},
              animation: { interval: waterMarkConfig?.animationInterval ?? 3000 },
              items: enabledLocationLabels,
            })
          } else {
            captionUsers.push({ userId: slot.sourceValue, ...emptyCaptionPacket })
          }
        }
      })

    // RTMP — userId uses odd/even scheme: odd Q → rtmp1, rtmp3... even Q → rtmp2, rtmp4...
    rtmpSlots.forEach((slot, rtmpIndex) => {
      const rtmpUserId = rtmpIdForSlot(q, rtmpIndex)
      const pos = coords[windowIndex++] ?? { x: 0, y: 0, w: 0, h: 0, border: hiddenBorder }
      layoutItems.push({ userId: rtmpUserId, x: pos.x, y: pos.y, w: pos.w, h: pos.h, border: pos.border })
      const enabledLocationLabels = (sourceLocations[slot.sourceValue] ?? []).filter(l => l.enabled).map(l => l.label)
      const waterMarkConfig = waterMarkStyles.get(windowIndex) // 1-based after increment
      if (enabledLocationLabels.length > 0) {
        const captionH = Math.round((waterMarkConfig?.style.fontSize ?? 22) + CAPTION_VERTICAL_PADDING * 2)
        captionUsers.push({
          userId: rtmpUserId,
          position: { x: 0, y: pos.h - captionH, w: pos.w, h: captionH },
          style: waterMarkConfig?.style ?? {},
          animation: { interval: waterMarkConfig?.animationInterval ?? 3000 },
          items: enabledLocationLabels,
        })
      } else {
        captionUsers.push({ userId: rtmpUserId, ...emptyCaptionPacket })
      }
    })

    // VOD — userId is ext1/ext3/ext5 (odd Q) or ext2/ext4/ext6 (even Q) per slot index
    vodSlots.forEach(({ slot: vodSlot, extId }) => {
      const pos = coords[windowIndex++] ?? { x: 0, y: 0, w: 0, h: 0, border: hiddenBorder }
      layoutItems.push({ userId: extId, x: pos.x, y: pos.y, w: pos.w, h: pos.h, border: pos.border })
      const enabledLocationLabels = (sourceLocations[vodSlot.sourceValue] ?? []).filter(l => l.enabled).map(l => l.label)
      const waterMarkConfig = waterMarkStyles.get(windowIndex) // 1-based after increment
      if (enabledLocationLabels.length > 0) {
        const captionH = Math.round((waterMarkConfig?.style.fontSize ?? 22) + CAPTION_VERTICAL_PADDING * 2)
        captionUsers.push({
          userId: extId,
          position: { x: 0, y: pos.h - captionH, w: pos.w, h: captionH },
          style: waterMarkConfig?.style ?? {},
          animation: { interval: waterMarkConfig?.animationInterval ?? 3000 },
          items: enabledLocationLabels,
        })
      } else {
        captionUsers.push({ userId: extId, ...emptyCaptionPacket })
      }
    })

    // Hide virtual IDs not used by this row — viewer cancels their rAF canvas loop
    virtualSources.forEach(v => {
      if (!virtualSlots.some(s => s.sourceValue === v.id)) {
        layoutItems.push({ userId: v.id, x: 0, y: 0, w: 0, h: 0, border: hiddenBorder })
      }
    })

    // Real users that appear ONLY as dup sources (no direct slot) — the backend still needs
    // a hidden layout entry to initialize their TRTC pipeline so sourceUserId refs work.
    realIdsFromVirtualSlots.forEach(realUserId => {
      if (!selectedWebrtcUserIds.includes(realUserId)) {
        layoutItems.push({ userId: realUserId, x: 0, y: 0, w: 0, h: 0, border: hiddenBorder, caption: { enabled: false } })
      }
    })

    // All non-selected WebRTC participants — explicitly hidden so server removes them.
    // allProtectedRealIds are already handled above (real slots or dup-only entries).
    participants.forEach(participantUserId => {
      if (!allProtectedRealIds.has(participantUserId)) {
        layoutItems.push({ userId: participantUserId, x: 0, y: 0, w: 0, h: 0, border: hiddenBorder, caption: { enabled: false } })
      }
    })

    // Hide VOD ext IDs not used by this row:
    // - opposite parity (e.g. Q1 odd fires → hide even ext2, ext4...)
    // - same parity excess (e.g. Q1 had 0 VOD but Q3 had ext1 → hide ext1)
    for (let vodIndex = 0; vodIndex < MAX_TYPE_SOURCE_SLOTS; vodIndex++) {
      const oppositeParityExtId = extIdForVodSlot(isOdd(q) ? q + 1 : q - 1, vodIndex)
      layoutItems.push({ userId: oppositeParityExtId, x: 0, y: 0, w: 0, h: 0, border: hiddenBorder, caption: { enabled: false } })
      if (vodIndex >= vodSlots.length) {
        layoutItems.push({ userId: extIdForVodSlot(q, vodIndex), x: 0, y: 0, w: 0, h: 0, border: hiddenBorder, caption: { enabled: false } })
      }
    }

    // Hide RTMP IDs not used by this row:
    // - opposite parity (e.g. Q1 odd fires → hide even rtmp2, rtmp4...)
    // - same parity excess (e.g. Q1 has 0 RTMP but Q3 had rtmp1 → hide rtmp1)
    for (let rtmpIndex = 0; rtmpIndex < MAX_TYPE_SOURCE_SLOTS; rtmpIndex++) {
      const oppositeParityRtmpId = rtmpIdForSlot(isOdd(q) ? q + 1 : q - 1, rtmpIndex)
      layoutItems.push({ userId: oppositeParityRtmpId, x: 0, y: 0, w: 0, h: 0, border: hiddenBorder })
      if (rtmpIndex >= rtmpSlots.length) {
        layoutItems.push({ userId: rtmpIdForSlot(q, rtmpIndex), x: 0, y: 0, w: 0, h: 0, border: hiddenBorder })
      }
    }

    rec({ type: 'LAYOUT', channel, methodType, layout: { items: layoutItems } })
    rec({ type: 'CAPTION_ROTATE', channel, methodType, users: captionUsers })
    rec({ type: 'BACKGROUND', mode: bgMode(rowBg), url: rowBg, channel, methodType })

    // Audio volume + video per source — AUDIO_CONTROL for WebRTC is owned by the sidebar
    // (muteParticipant) and must not be overridden on fire.
    webrtcSlots.forEach(slot => {
      rec({ type: 'AUDIO_VOLUME', source: 'TRTC', userId: slot.sourceValue, volume: slot.volume, channel, methodType })
      rec({ type: 'VIDEO_TRANSFORM', userId: slot.sourceValue, transform: { zoom: slot.zoom, panX: slot.panX, panY: slot.panY }, channel, methodType })
      const webrtcBgUrl = participantImageMap[slot.sourceValue.toLowerCase()] || `${DEFAULT_BG_COVER_URL(channel)}?t=${Date.now()}`
      const webrtcBgImageKey = participantImageMap[slot.sourceValue.toLowerCase()] ?? 'default'
      const preloadedWebrtc = preloadTrackerRef.current.get(slot.sourceValue)
      const webrtcPreloadedForThisRow = preloadedWebrtc?.qRow === q && preloadedWebrtc?.bgImageKey === webrtcBgImageKey
      if (!webrtcPreloadedForThisRow) {
        rec({ type: 'EXTERNAL_BG_IMAGE', userId: slot.sourceValue, url: webrtcBgUrl, fit: 'cover', channel, methodType })
      }
    })
    // Virtual slots share the real TRTC stream so audio is skipped, but each dup
    // has its own transform state that must be sent on every fire to override whatever
    // the previous active row left on the backend.
    virtualSlots.forEach(slot => {
      rec({ type: 'VIDEO_TRANSFORM', userId: slot.sourceValue, transform: { zoom: slot.zoom, panX: slot.panX, panY: slot.panY }, channel, methodType })
    })
    rtmpSlots.forEach((slot, rtmpIndex) => {
      const rtmpUserId = rtmpIdForSlot(q, rtmpIndex)
      const preloadedRtmp = preloadTrackerRef.current.get(rtmpUserId)
      const rtmpPreloadedForThisRow = preloadedRtmp?.qRow === q && preloadedRtmp?.rtmpSourceValue === slot.sourceValue
      if (!rtmpPreloadedForThisRow) {
        rec({ type: 'SLDP', userId: rtmpUserId, url: `${SLDP_WSS_BASE}/${channel}/${slot.sourceValue}`, channel, methodType })
      }
      rec({ type: 'AUDIO_CONTROL', source: 'SLDP_VIDEO', userId: rtmpUserId, mute: slot.muted, channel, methodType })
      rec({ type: 'AUDIO_VOLUME', source: 'SLDP_VIDEO', userId: rtmpUserId, volume: slot.volume, channel, methodType })
      rec({ type: 'VIDEO_TRANSFORM', userId: rtmpUserId, transform: { zoom: slot.zoom, panX: slot.panX, panY: slot.panY }, channel, methodType })
      if (!rtmpPreloadedForThisRow) {
        rec({ type: 'EXTERNAL_BG_IMAGE', userId: rtmpUserId, url: `${DEFAULT_BG_COVER_URL(channel)}?t=${Date.now()}`, fit: 'cover', channel, methodType })
      }
    })
    vodSlots.forEach(({ slot: vodSlot, extId }) => {
      const preloadedVod = preloadTrackerRef.current.get(extId)
      const vodPreloadedForThisRow = preloadedVod?.qRow === q && preloadedVod?.vodSourceValue === vodSlot.sourceValue
      rec({ type: 'AUDIO_CONTROL', source: 'EXTERNAL_VIDEO', userId: extId, mute: vodSlot.muted, channel, methodType })
      rec({ type: 'AUDIO_VOLUME', source: 'EXTERNAL_VIDEO', userId: extId, volume: vodSlot.volume, channel, methodType })
      if (vodPreloadedForThisRow) {
        // Video was buffered by preload for this exact row — seek to start instead of reloading
        rec({ type: 'EXTERNAL_VIDEO_SEEK', userId: extId, seekTime: 0, channel, methodType })
      } else {
        // Not preloaded (out-of-sequence fire) or source changed after preload — full reload
        rec({ userId: extId, url: videoUrl(vodSlot.sourceValue), type: 'EXTERNAL_VIDEO', loop: vodSlot.loop ?? true, channel, methodType })
      }
      if (!vodPreloadedForThisRow) {
        rec({ type: 'EXTERNAL_BG_IMAGE', userId: extId, url: `${DEFAULT_BG_COVER_URL(channel)}?t=${Date.now()}`, fit: 'cover', channel, methodType })
      }
      rec({ type: 'VIDEO_TRANSFORM', userId: extId, transform: { zoom: vodSlot.zoom, panX: vodSlot.panX, panY: vodSlot.panY }, channel, methodType })
    })
    fireRowGfx(q, methodType)
    const firedSources = row.sources.filter(s => s.sourceValue)
    lastFiredRowSourcesRef.current[q - 1] = firedSources
    // Per-bus snapshot: preview fires reach preview only; master fires reach master
    // AND preview (dual-send inside rec()). Mirror that here so leave/rejoin refire
    // targets the exact bus(es) this fire actually populated.
    const rowSnapshot: BusSnapshot = { kind: 'row', q, entry, sources: firedSources }
    previewBusSnapshotRef.current = rowSnapshot
    if (methodType === 'master') masterBusSnapshotRef.current = rowSnapshot
    if (q < 10) {
      sendPreload(q + 1, methodType)
      if (methodType === 'master') sendPreload(q + 1, 'preview')
    }
  }, [rows, layoutData, mode, channel, participants, participantImageMap, sourceLocations, virtualSources, addLog, fireRowGfx, sendPreload])

  // Source values (e.g. dup IDs) currently checked in the compact source pool.
  // Read by SourcesSidebar to block dup deletion while the dup is in active use.
  const [compactPoolSelectedValues, setCompactPoolSelectedValues] = useState<ReadonlySet<string>>(new Set())

  // Compact view alternates between Q11 (odd → ext1, ext3, rtmp1, rtmp3)
  // and Q12 (even → ext2, ext4, rtmp2, rtmp4) on each fire, matching the
  // same odd/even parity scheme used by regular Q rows. Q rows go up to Q10,
  // so Q11/Q12 are outside that range and dedicated to compact.
  //
  // Persisted to storage so the correct free Q is restored after a page refresh.
  // Without this, compactActiveQRef would always reset to 11 and preload would
  // target the live Q instead of the free one.
  const storedCompactQ = getStorage<number>('compact_active_q')
  const compactActiveQRef = useRef<11 | 12>(storedCompactQ === 12 ? 12 : 11)
  // Tracks the Q used for the last preview fire. compactTake uses this to compute
  // the correct free Q after TAKE regardless of how many direct master fires
  // toggled compactActiveQRef in between.
  // Initialised to the opposite of the stored Q because compact_active_q always
  // stores the FREE Q, meaning the last preview Q was the other one.
  const compactPreviewQRef = useRef<11 | 12>(storedCompactQ === 12 ? 11 : 12)

  const fireCompact = useCallback((entry: LayoutEntry, sources: SourceSlot[], target: StudioMode) => {
    if (sources.length === 0) return

    const activeQ = compactActiveQRef.current
    const oppositeQ: 11 | 12 = activeQ === 11 ? 12 : 11

    // Preview target respects mode (preview→preview only, master→both preview+master matching fire() behaviour).
    // Master target always fires master only regardless of mode.
    const effectiveMethodType: StudioMode = (target === 'preview' && mode === 'preview') ? 'preview' : 'master'
    const isPreviewTarget = target === 'preview'

    addLog(`=== COMPACT FIRE (${entry.caption}) [target:${target}] ===`, 'divider')

    const rec = (obj: Record<string, unknown>, lt: LogType = 'sent') => {
      addLog(JSON.stringify(obj, null, 2), lt)
      if (wsRef.current?.readyState !== WebSocket.OPEN) { addLog('⚠ Not connected.', 'warn'); return }
      wsRef.current.send(JSON.stringify(obj))
      // Preview target in master mode: also send a preview copy (same as fire() master behaviour)
      if (isPreviewTarget && effectiveMethodType === 'master') {
        wsRef.current.send(JSON.stringify({ ...obj, methodType: 'preview' }))
      }
    }

    const virtualSourceMap = new Map(virtualSources.map(v => [v.id, v]))
    const isVirtualId = (id: string) => virtualSourceMap.has(id)

    const webrtcSlots = sources.filter(s => s.sourceType === 'webrtc' && s.sourceValue && !isVirtualId(s.sourceValue))
    const virtualSlots = sources.filter(s => s.sourceType === 'webrtc' && s.sourceValue && isVirtualId(s.sourceValue))
    const rtmpSlots = sources.filter(s => s.sourceType === 'rtmp' && s.sourceValue)
    const vodSlots = sources
      .filter(s => s.sourceType === 'vod' && s.sourceValue)
      .map((slot, vodIndex) => ({ slot, extId: extIdForVodSlot(activeQ, vodIndex) }))

    const selectedWebrtcUserIds = webrtcSlots.map(s => s.sourceValue)
    const realIdsFromVirtualSlots = [...new Set(
      virtualSlots.map(s => virtualSourceMap.get(s.sourceValue)?.sourceUserId).filter((id): id is string => !!id)
    )]
    const allProtectedRealIds = new Set([...selectedWebrtcUserIds, ...realIdsFromVirtualSlots])

    // Mute the previously live Q's VOD/RTMP sources before the new layout goes live.
    // Only runs when going live on master — pure preview fires do not affect master bus audio.
    // WebRTC mute is excluded — owned exclusively by the sidebar (muteParticipant).
    if (effectiveMethodType === 'master') {
      const prevFiredSources = compactLastFiredSourcesRef.current[oppositeQ] ?? []
      // Preview(M) fires to both buses → mute both. Direct master fires to master only → mute master only.
      const muteBuses: StudioMode[] = isPreviewTarget ? ['master', 'preview'] : ['master']
      prevFiredSources
        .filter(s => s.sourceType === 'rtmp' && s.sourceValue)
        .forEach((_, rtmpIndex) => {
          const mutePacket = { type: 'AUDIO_CONTROL', source: 'SLDP_VIDEO', userId: rtmpIdForSlot(oppositeQ, rtmpIndex), mute: true, channel }
          muteBuses.forEach(bus => sendWs({ ...mutePacket, methodType: bus }))
        })
      prevFiredSources
        .filter(s => s.sourceType === 'vod' && s.sourceValue)
        .forEach((_, vodIndex) => {
          const mutePacket = { type: 'AUDIO_CONTROL', source: 'EXTERNAL_VIDEO', userId: extIdForVodSlot(oppositeQ, vodIndex), mute: true, channel }
          muteBuses.forEach(bus => sendWs({ ...mutePacket, methodType: bus }))
        })
    }

    const rowBg = bgUrlFn(entry.bgVideo)
    const coords = parseMixLayout(entry)
    const waterMarkStyles = parseWaterMarkStyles(entry)

    const layoutItems: object[] = []
    const captionUsers: object[] = []
    let windowIndex = 0

    const hiddenBorder = { width: 0, color: '#00000000', radius: 0 }
    const emptyCaptionPacket = { position: { x: 0, y: 0, w: 0, h: 0 }, style: {}, animation: { interval: 3000 }, items: [''] }

    // WebRTC + virtual slots (in pool order, same as fire())
    sources
      .filter(s => s.sourceType === 'webrtc' && s.sourceValue)
      .forEach(slot => {
        const pos = coords[windowIndex++] ?? { x: 0, y: 0, w: 0, h: 0, border: hiddenBorder }
        if (isVirtualId(slot.sourceValue)) {
          const virtualSrc = virtualSourceMap.get(slot.sourceValue)!
          layoutItems.push({
            userId: virtualSrc.id, x: pos.x, y: pos.y, w: pos.w, h: pos.h,
            border: pos.border, sourceUserId: virtualSrc.sourceUserId, crop: virtualSrc.crop,
          })
          const enabledDupLabels = (sourceLocations[virtualSrc.id] ?? []).filter(l => l.enabled).map(l => l.label)
          const dupWmConfig = waterMarkStyles.get(windowIndex)
          const captionHDup = Math.round((dupWmConfig?.style.fontSize ?? 22) + CAPTION_VERTICAL_PADDING * 2)
          captionUsers.push(enabledDupLabels.length > 0
            ? { userId: virtualSrc.id, position: { x: 0, y: pos.h - captionHDup, w: pos.w, h: captionHDup }, style: dupWmConfig?.style ?? {}, animation: { interval: dupWmConfig?.animationInterval ?? 3000 }, items: enabledDupLabels }
            : { userId: virtualSrc.id, ...emptyCaptionPacket })
        } else {
          layoutItems.push({ userId: slot.sourceValue, x: pos.x, y: pos.y, w: pos.w, h: pos.h, border: pos.border })
          const enabledLabels = (sourceLocations[slot.sourceValue] ?? []).filter(l => l.enabled).map(l => l.label)
          const wmConfig = waterMarkStyles.get(windowIndex)
          const captionH = Math.round((wmConfig?.style.fontSize ?? 22) + CAPTION_VERTICAL_PADDING * 2)
          captionUsers.push(enabledLabels.length > 0
            ? { userId: slot.sourceValue, position: { x: 0, y: pos.h - captionH, w: pos.w, h: captionH }, style: wmConfig?.style ?? {}, animation: { interval: wmConfig?.animationInterval ?? 3000 }, items: enabledLabels }
            : { userId: slot.sourceValue, ...emptyCaptionPacket })
        }
      })

    // RTMP slots
    rtmpSlots.forEach((slot, rtmpIndex) => {
      const rtmpUserId = rtmpIdForSlot(activeQ, rtmpIndex)
      const pos = coords[windowIndex++] ?? { x: 0, y: 0, w: 0, h: 0, border: hiddenBorder }
      layoutItems.push({ userId: rtmpUserId, x: pos.x, y: pos.y, w: pos.w, h: pos.h, border: pos.border })
      const enabledLabels = (sourceLocations[slot.sourceValue] ?? []).filter(l => l.enabled).map(l => l.label)
      const wmConfig = waterMarkStyles.get(windowIndex)
      const captionHRtmp = Math.round((wmConfig?.style.fontSize ?? 22) + CAPTION_VERTICAL_PADDING * 2)
      captionUsers.push(enabledLabels.length > 0
        ? { userId: rtmpUserId, position: { x: 0, y: pos.h - captionHRtmp, w: pos.w, h: captionHRtmp }, style: wmConfig?.style ?? {}, animation: { interval: wmConfig?.animationInterval ?? 3000 }, items: enabledLabels }
        : { userId: rtmpUserId, ...emptyCaptionPacket })
    })

    // VOD slots
    vodSlots.forEach(({ slot: vodSlot, extId }) => {
      const pos = coords[windowIndex++] ?? { x: 0, y: 0, w: 0, h: 0, border: hiddenBorder }
      layoutItems.push({ userId: extId, x: pos.x, y: pos.y, w: pos.w, h: pos.h, border: pos.border })
      const enabledLabels = (sourceLocations[vodSlot.sourceValue] ?? []).filter(l => l.enabled).map(l => l.label)
      const wmConfig = waterMarkStyles.get(windowIndex)
      const captionHVod = Math.round((wmConfig?.style.fontSize ?? 22) + CAPTION_VERTICAL_PADDING * 2)
      captionUsers.push(enabledLabels.length > 0
        ? { userId: extId, position: { x: 0, y: pos.h - captionHVod, w: pos.w, h: captionHVod }, style: wmConfig?.style ?? {}, animation: { interval: wmConfig?.animationInterval ?? 3000 }, items: enabledLabels }
        : { userId: extId, ...emptyCaptionPacket })
    })

    // Hide unused virtual IDs
    virtualSources.forEach(v => {
      if (!virtualSlots.some(s => s.sourceValue === v.id)) {
        layoutItems.push({ userId: v.id, x: 0, y: 0, w: 0, h: 0, border: hiddenBorder })
      }
    })

    // Real users only referenced via dup sources
    realIdsFromVirtualSlots.forEach(realUserId => {
      if (!selectedWebrtcUserIds.includes(realUserId)) {
        layoutItems.push({ userId: realUserId, x: 0, y: 0, w: 0, h: 0, border: hiddenBorder, caption: { enabled: false } })
      }
    })

    // Hide all non-selected participants
    participants.forEach(participantUserId => {
      if (!allProtectedRealIds.has(participantUserId)) {
        layoutItems.push({ userId: participantUserId, x: 0, y: 0, w: 0, h: 0, border: hiddenBorder, caption: { enabled: false } })
      }
    })

    // Hide VOD ext IDs not used by this fire — both the active Q and the opposite Q
    for (let vodIndex = 0; vodIndex < MAX_TYPE_SOURCE_SLOTS; vodIndex++) {
      layoutItems.push({ userId: extIdForVodSlot(oppositeQ, vodIndex), x: 0, y: 0, w: 0, h: 0, border: hiddenBorder, caption: { enabled: false } })
      if (vodIndex >= vodSlots.length) {
        layoutItems.push({ userId: extIdForVodSlot(activeQ, vodIndex), x: 0, y: 0, w: 0, h: 0, border: hiddenBorder, caption: { enabled: false } })
      }
    }

    // Hide RTMP IDs not used by this fire — both the active Q and the opposite Q
    for (let rtmpIndex = 0; rtmpIndex < MAX_TYPE_SOURCE_SLOTS; rtmpIndex++) {
      layoutItems.push({ userId: rtmpIdForSlot(oppositeQ, rtmpIndex), x: 0, y: 0, w: 0, h: 0, border: hiddenBorder })
      if (rtmpIndex >= rtmpSlots.length) {
        layoutItems.push({ userId: rtmpIdForSlot(activeQ, rtmpIndex), x: 0, y: 0, w: 0, h: 0, border: hiddenBorder })
      }
    }

    rec({ type: 'LAYOUT', channel, methodType: effectiveMethodType, layout: { items: layoutItems } })
    rec({ type: 'CAPTION_ROTATE', channel, methodType: effectiveMethodType, users: captionUsers })
    rec({ type: 'BACKGROUND', mode: bgMode(rowBg), url: rowBg, channel, methodType: effectiveMethodType })

    // Audio volume + video transforms — no preload tracker, always send in full.
    // AUDIO_CONTROL for WebRTC is owned by the sidebar (muteParticipant) and must not
    // be overridden on fire.
    webrtcSlots.forEach(slot => {
      const bgUrl = participantImageMap[slot.sourceValue.toLowerCase()] || `${DEFAULT_BG_COVER_URL(channel)}?t=${Date.now()}`
      rec({ type: 'AUDIO_VOLUME', source: 'TRTC', userId: slot.sourceValue, volume: slot.volume, channel, methodType: effectiveMethodType })
      rec({ type: 'VIDEO_TRANSFORM', userId: slot.sourceValue, transform: { zoom: slot.zoom, panX: slot.panX, panY: slot.panY }, channel, methodType: effectiveMethodType })
      rec({ type: 'EXTERNAL_BG_IMAGE', userId: slot.sourceValue, url: bgUrl, fit: 'cover', channel, methodType: effectiveMethodType })
    })
    virtualSlots.forEach(slot => {
      rec({ type: 'VIDEO_TRANSFORM', userId: slot.sourceValue, transform: { zoom: slot.zoom, panX: slot.panX, panY: slot.panY }, channel, methodType: effectiveMethodType })
    })
    rtmpSlots.forEach((slot, rtmpIndex) => {
      const rtmpUserId = rtmpIdForSlot(activeQ, rtmpIndex)
      const preloadedRtmp = preloadTrackerRef.current.get(rtmpUserId)
      const rtmpPreloadedForThisQ = preloadedRtmp?.qRow === activeQ && preloadedRtmp?.rtmpSourceValue === slot.sourceValue
      if (!rtmpPreloadedForThisQ) {
        rec({ type: 'SLDP', userId: rtmpUserId, url: `${SLDP_WSS_BASE}/${channel}/${slot.sourceValue}`, channel, methodType: effectiveMethodType })
      }
      rec({ type: 'AUDIO_CONTROL', source: 'SLDP_VIDEO', userId: rtmpUserId, mute: slot.muted, channel, methodType: effectiveMethodType })
      rec({ type: 'AUDIO_VOLUME', source: 'SLDP_VIDEO', userId: rtmpUserId, volume: slot.volume, channel, methodType: effectiveMethodType })
      rec({ type: 'VIDEO_TRANSFORM', userId: rtmpUserId, transform: { zoom: slot.zoom, panX: slot.panX, panY: slot.panY }, channel, methodType: effectiveMethodType })
      if (!rtmpPreloadedForThisQ) {
        rec({ type: 'EXTERNAL_BG_IMAGE', userId: rtmpUserId, url: `${DEFAULT_BG_COVER_URL(channel)}?t=${Date.now()}`, fit: 'cover', channel, methodType: effectiveMethodType })
      }
    })
    vodSlots.forEach(({ slot: vodSlot, extId }) => {
      const preloadedVod = preloadTrackerRef.current.get(extId)
      const vodPreloadedForThisQ = preloadedVod?.qRow === activeQ && preloadedVod?.vodSourceValue === vodSlot.sourceValue
      rec({ type: 'AUDIO_CONTROL', source: 'EXTERNAL_VIDEO', userId: extId, mute: vodSlot.muted, channel, methodType: effectiveMethodType })
      rec({ type: 'AUDIO_VOLUME', source: 'EXTERNAL_VIDEO', userId: extId, volume: vodSlot.volume, channel, methodType: effectiveMethodType })
      if (vodPreloadedForThisQ) {
        rec({ type: 'EXTERNAL_VIDEO_SEEK', userId: extId, seekTime: 0, channel, methodType: effectiveMethodType })
      } else {
        rec({ userId: extId, url: videoUrl(vodSlot.sourceValue), type: 'EXTERNAL_VIDEO', loop: vodSlot.loop ?? true, channel, methodType: effectiveMethodType })
      }
      if (!vodPreloadedForThisQ) {
        rec({ type: 'EXTERNAL_BG_IMAGE', userId: extId, url: `${DEFAULT_BG_COVER_URL(channel)}?t=${Date.now()}`, fit: 'cover', channel, methodType: effectiveMethodType })
      }
      rec({ type: 'VIDEO_TRANSFORM', userId: extId, transform: { zoom: vodSlot.zoom, panX: vodSlot.panX, panY: vodSlot.panY }, channel, methodType: effectiveMethodType })
    })

    // Save sources for all fires (preview + master) so future fires and compactTake
    // can reference the fire-time snapshot even if the pool changes afterwards.
    const firedCompactSources = sources.filter(s => s.sourceValue)
    compactLastFiredSourcesRef.current[activeQ] = firedCompactSources

    // Per-bus snapshot: master is updated whenever this fire reaches the master bus
    // (effectiveMethodType==='master'). Preview is updated whenever the packets reach
    // the preview bus — either because effectiveMethodType==='preview' directly, or
    // because isPreviewTarget caused rec() to dual-send a preview copy from master.
    const compactSnapshot: BusSnapshot = { kind: 'compact', q: activeQ, entry, sources: firedCompactSources }
    if (effectiveMethodType === 'master') masterBusSnapshotRef.current = compactSnapshot
    if (effectiveMethodType === 'preview' || isPreviewTarget) previewBusSnapshotRef.current = compactSnapshot

    // Record the Q used for preview so compactTake can compute the correct free Q
    // even when direct master fires have moved compactActiveQRef in between.
    if (target === 'preview') {
      compactPreviewQRef.current = activeQ
    }
    // Toggle only when firing to master — that is when the Q goes live and the opposite becomes free for preload.
    // Preview fires do NOT toggle: the same Q must be promoted by TAKE, and preload has not started yet.
    if (target === 'master') {
      compactActiveQRef.current = oppositeQ
      setStorage('compact_active_q', oppositeQ)
    }
  }, [mode, channel, participants, participantImageMap, sourceLocations, virtualSources, addLog, sendWs])

  // Preload a single source for the next compact shot after TAKE has cleared the selection.
  // typeIndexInSelection: 0-based index of this source within its type in the current selection
  // (used to assign the correct ext/RTMP slot ID for VOD and RTMP sources).
  // WebRTC sources use sourceValue directly so typeIndexInSelection is ignored for them.
  // Always targets 'preview' bus.
  const sendCompactPreload = useCallback((source: SourceSlot, typeIndexInSelection: number) => {
    if (!source.sourceValue) return
    // compactActiveQRef is toggled to the free Q after every master fire / TAKE,
    // so it already points to the correct staging Q — use it directly.
    const preloadQ = compactActiveQRef.current
    const defaultBgUrl = `${DEFAULT_BG_COVER_URL(channel)}?t=${Date.now()}`

    if (source.sourceType === 'webrtc') {
      if (virtualSources.some(v => v.id === source.sourceValue)) return
      const bgImageUrl = participantImageMap[source.sourceValue.toLowerCase()] || defaultBgUrl
      addLog(`--- Compact Preload WebRTC: ${source.sourceValue} ---`, 'divider')
      sendWs({ type: 'EXTERNAL_BG_IMAGE', userId: source.sourceValue, url: bgImageUrl, fit: 'cover', channel, methodType: 'preview' }, 'preload')
      preloadTrackerRef.current.set(source.sourceValue, { qRow: preloadQ, bgImageKey: participantImageMap[source.sourceValue.toLowerCase()] ?? 'default' })
    } else if (source.sourceType === 'vod') {
      const extId = extIdForVodSlot(preloadQ, typeIndexInSelection)
      addLog(`--- Compact Preload VOD: ${source.sourceValue} [ext:${extId}] ---`, 'divider')
      // Preload to both buses: fireCompact fires with effectiveMethodType which may be 'master'
      // or 'preview' depending on mode. The SEEK command must be valid on whichever bus is used,
      // so the video must be buffered on both ahead of time.
      sendWs({ userId: extId, url: videoUrl(source.sourceValue), type: 'EXTERNAL_VIDEO', loop: source.loop ?? true, channel, methodType: 'preview' }, 'preload')
      sendWs({ type: 'EXTERNAL_BG_IMAGE', userId: extId, url: defaultBgUrl, fit: 'cover', channel, methodType: 'preview' }, 'preload')
      sendWs({ userId: extId, url: videoUrl(source.sourceValue), type: 'EXTERNAL_VIDEO', loop: source.loop ?? true, channel, methodType: 'master' }, 'preload')
      sendWs({ type: 'EXTERNAL_BG_IMAGE', userId: extId, url: defaultBgUrl, fit: 'cover', channel, methodType: 'master' }, 'preload')
      preloadTrackerRef.current.set(extId, { qRow: preloadQ, bgImageKey: 'default', vodSourceValue: source.sourceValue })
    } else if (source.sourceType === 'rtmp') {
      const rtmpUserId = rtmpIdForSlot(preloadQ, typeIndexInSelection)
      addLog(`--- Compact Preload RTMP: ${source.sourceValue} [userId:${rtmpUserId}] ---`, 'divider')
      // Preload to both buses for the same reason as VOD above.
      sendWs({ type: 'SLDP', userId: rtmpUserId, url: `${SLDP_WSS_BASE}/${channel}/${source.sourceValue}`, channel, methodType: 'preview' }, 'preload')
      sendWs({ type: 'EXTERNAL_BG_IMAGE', userId: rtmpUserId, url: defaultBgUrl, fit: 'cover', channel, methodType: 'preview' }, 'preload')
      sendWs({ type: 'SLDP', userId: rtmpUserId, url: `${SLDP_WSS_BASE}/${channel}/${source.sourceValue}`, channel, methodType: 'master' }, 'preload')
      sendWs({ type: 'EXTERNAL_BG_IMAGE', userId: rtmpUserId, url: defaultBgUrl, fit: 'cover', channel, methodType: 'master' }, 'preload')
      preloadTrackerRef.current.set(rtmpUserId, { qRow: preloadQ, bgImageKey: 'default', rtmpSourceValue: source.sourceValue })
    }
  }, [channel, participantImageMap, virtualSources, addLog, sendWs])

  // Sends goLive to master for the compact view TAKE button.
  // Separated from publishToMaster intentionally — publishToMaster has Q-row-specific
  // VOD seek and sendPreload logic that must not run for compact shots.
  // Sets compactActiveQRef to the opposite of the preview Q rather than toggling from
  // the current value. A direct master fire between the preview and TAKE already advances
  // compactActiveQRef, so toggling again would land back on the live Q.
  const compactTake = useCallback(() => {
    addLog('=== COMPACT TAKE → MASTER ===', 'divider')
    sendWs({ channel, type: 'goLive', methodType: 'master' }, 'master')
    // goLive promotes preview → master on the server; mirror that client-side so
    // leave/rejoin refire targets the correct bus.
    masterBusSnapshotRef.current = previewBusSnapshotRef.current
    // Seek all VODs in the promoted preview Q to 0 on master so they restart from the
    // beginning on air rather than continuing from wherever preview left them.
    const previewQ = compactPreviewQRef.current
    const previewFiredSources = compactLastFiredSourcesRef.current[previewQ] ?? []
    previewFiredSources
      .filter(s => s.sourceType === 'vod' && s.sourceValue)
      .forEach((_, vodIndex) => {
        sendWs({ type: 'EXTERNAL_VIDEO_SEEK', userId: extIdForVodSlot(previewQ, vodIndex), seekTime: 0, channel, methodType: 'master' }, 'master')
      })
    // Mute the non-preview Q's last-fired VOD/RTMP on both buses.
    // goLive promotes the preview Q to master; the other Q's audio must stop on both buses
    // since it was live on master and present on preview from its own prior fire.
    // WebRTC mute is excluded — owned exclusively by the sidebar (muteParticipant).
    const oldLiveQ: 11 | 12 = compactPreviewQRef.current === 11 ? 12 : 11
    const prevFiredSources = compactLastFiredSourcesRef.current[oldLiveQ] ?? []
    prevFiredSources
      .filter(s => s.sourceType === 'rtmp' && s.sourceValue)
      .forEach((_, rtmpIndex) => {
        sendWs({ type: 'AUDIO_CONTROL', source: 'SLDP_VIDEO', userId: rtmpIdForSlot(oldLiveQ, rtmpIndex), mute: true, channel, methodType: 'master' })
        sendWs({ type: 'AUDIO_CONTROL', source: 'SLDP_VIDEO', userId: rtmpIdForSlot(oldLiveQ, rtmpIndex), mute: true, channel, methodType: 'preview' })
      })
    prevFiredSources
      .filter(s => s.sourceType === 'vod' && s.sourceValue)
      .forEach((_, vodIndex) => {
        sendWs({ type: 'AUDIO_CONTROL', source: 'EXTERNAL_VIDEO', userId: extIdForVodSlot(oldLiveQ, vodIndex), mute: true, channel, methodType: 'master' })
        sendWs({ type: 'AUDIO_CONTROL', source: 'EXTERNAL_VIDEO', userId: extIdForVodSlot(oldLiveQ, vodIndex), mute: true, channel, methodType: 'preview' })
      })
    const nextQ: 11 | 12 = compactPreviewQRef.current === 11 ? 12 : 11
    compactActiveQRef.current = nextQ
    setStorage('compact_active_q', nextQ)
  }, [addLog, sendWs, channel])


  // ── Recording ────────────────────────────────────────────────────────────
  const fetchRecordingStatus = useCallback(async () => {
    try {
      const data = await http.get<{ code: number; inputs: Array<{ liveRecordingStatus: string }> }>(
        '', `v1/flowchart/inputs/${cid}?recordingstatus=true&zixiid=pcr-master`
      )
      if (data.code === 1) {
        setIsRecording(data.inputs[0]?.liveRecordingStatus === 'Recording on')
      }
    } catch { /* ignore — non-critical on init */ }
  }, [cid])

  const sendRecordingWsCommand = useCallback((command: 'STARTRECORDING' | 'STOPRECORDING') => {
    const ws = new WebSocket(RECORDING_WS_URL)
    ws.addEventListener('open', () => {
      ws.send(JSON.stringify({
        ApplicationType: 'PCRStreamController',
        Uid: '1234455667',
        ChannelId: Number(cid),
        Command: command,
        Status: 'pending',
        Timestamp: new Date(),
      }))
      ws.close()
    })
  }, [cid])

  const resetStream = useCallback(() => {
    if (isResetBusy) return
    setIsResetBusy(true)
    const userId = getStorage<string>('pcr_user_id') ?? '0'
    const ws = new WebSocket(RECORDING_WS_URL)
    const timeout = setTimeout(() => {
      ws.close()
      setIsResetBusy(false)
      addLog('Reset stream timed out', 'warn')
    }, 15_000)
    ws.addEventListener('open', () => {
      ws.send(JSON.stringify({
        ApplicationType: 'PCRStreamController',
        Uid: userId,
        ChannelId: Number(cid),
        Command: 'RESTARTSTREAM',
        Status: 'pending',
        Timestamp: new Date().toISOString(),
      }))
    })
    ws.addEventListener('message', (event: MessageEvent) => {
      try {
        const msg = JSON.parse(event.data as string) as { ApplicationType?: string; Command?: string; Status?: string }
        if (msg.ApplicationType === 'PCRStreamController' && msg.Command === 'RESTARTSTREAM' && msg.Status === 'success') {
          clearTimeout(timeout)
          ws.close()
          setIsResetBusy(false)
          addLog('Stream reset successfully', 'info')
        }
      } catch { /* ignore malformed */ }
    })
    ws.addEventListener('error', () => {
      clearTimeout(timeout)
      ws.close()
      setIsResetBusy(false)
      addLog('Reset stream failed - connection error', 'err')
    })
  }, [isResetBusy, cid, addLog])

  const resetLayout = useCallback(() => {
    const now = new Date().toISOString()
    const uid = getStorage<string>('pcr_user_id') ?? ''
    sendWs({
      ApplicationType: 'MeetingEndNotify',
      Uid: uid,
      ChannelId: Number(cid),
      ChannelName: channel,
      Command: 'MeetingEnded',
      MeetingEndTime: now,
      Status: 'success',
      Timestamp: now,
    })
  }, [cid, channel, sendWs])

  const toggleRecording = useCallback(async () => {
    if (isRecordingBusy) return
    setIsRecordingBusy(true)
    const val = isRecording ? 0 : 1
    try {
      const data = await http.post<{ code: number; streams: Array<{ id: string; live_recording_status: { active: boolean } }> }>(
        '', `v1/flowchart/recording/${cid}/pcr-master/${val}`, null
      )
      if (data.code === 1) {
        const pcrStream = data.streams.find(s => s.id === 'pcr-master')
        if (pcrStream) {
          const active = pcrStream.live_recording_status.active
          setIsRecording(active)
          addLog(active ? 'Recording started' : 'Recording stopped', 'info')
          if (!active) sendRecordingWsCommand('STOPRECORDING')
        }
      } else {
        addLog('Recording toggle failed — contact support', 'warn')
      }
    } catch (e) {
      addLog(`Recording error: ${(e as Error).message}`, 'err')
    } finally {
      setIsRecordingBusy(false)
    }
  }, [isRecording, isRecordingBusy, cid, addLog, sendRecordingWsCommand])

  const publishToMaster = useCallback(() => {
    addLog('=== PUBLISH → MASTER ===', 'divider')
    sendWs({ channel, type: 'goLive', methodType: 'master' }, 'master')
    // goLive promotes preview → master on the server; mirror that client-side so
    // leave/rejoin refire targets the correct bus.
    masterBusSnapshotRef.current = previewBusSnapshotRef.current
    if (activeRowIdx !== null) {
      const q = activeRowIdx + 1
      const row = rows[activeRowIdx]
      const vodSlots = row?.sources
        .filter(s => s.sourceType === 'vod' && s.sourceValue)
        .map((slot, vodIndex) => ({ slot, extId: extIdForVodSlot(q, vodIndex) })) ?? []
      vodSlots.forEach(({ extId }) => {
        sendWs({ userId: extId, type: 'EXTERNAL_VIDEO_SEEK', channel, methodType: 'master', seekTime: 0 }, 'master')
      })
      // Preload next Q to master so it is ready for the next publish
      if (q < 10) sendPreload(q + 1, 'master')
    }
    setLastFiredInfo(`Published to MASTER at ${new Date().toLocaleTimeString()}`)
  }, [addLog, channel, sendWs, activeRowIdx, rows, sendPreload])

  // ── Destinations ────────────────────────────────────────────
  const saveDestStorage = useCallback((dests: Destination[]) => {
    setStorage(DEST_STORAGE_KEY, dests.map(d => ({ ...d, streaming: false })))
  }, [])

  const addDestination = useCallback((dest: Destination) => {
    setDestinations(prev => { const next = [...prev, dest]; saveDestStorage(next); return next })
    addLog(`Destination added: ${dest.name} (${dest.platform})`, 'info')
  }, [saveDestStorage, addLog])

  const deleteDestination = useCallback((id: string) => {
    setDestinations(prev => {
      const d = prev.find(x => x.id === id)
      if (d?.streaming) { addLog(`Stop ${d.name} before deleting.`, 'warn'); return prev }
      const next = prev.filter(x => x.id !== id); saveDestStorage(next); return next
    })
  }, [saveDestStorage, addLog])

  const startDestination = useCallback(async (id: string): Promise<boolean> => {
    const d = destinations.find(x => x.id === id); if (!d) return false
    setDestinations(prev => prev.map(x => x.id === id ? { ...x, streaming: true } : x))
    try {
      await http.post('', d.startApi, { channel, platform: d.platform, name: d.name, ...d.fields })
      addLog(`▶ Started: ${d.name}`, 'info')
      return true
    } catch (e) {
      setDestinations(prev => prev.map(x => x.id === id ? { ...x, streaming: false } : x))
      addLog(`Start failed [${d.name}]: ${(e as Error).message}`, 'err')
      return false
    }
  }, [destinations, channel, addLog])

  const stopDestination = useCallback(async (id: string): Promise<boolean> => {
    const d = destinations.find(x => x.id === id); if (!d) return false
    try {
      await http.post('', d.stopApi, { channel, platform: d.platform, name: d.name, ...d.fields })
      setDestinations(prev => prev.map(x => x.id === id ? { ...x, streaming: false } : x)); addLog(`■ Stopped: ${d.name}`, 'info')
      return true
    } catch (e) { addLog(`Stop failed [${d.name}]: ${(e as Error).message}`, 'err'); return false }
  }, [destinations, channel, addLog])

  // ── Video popup ─────────────────────────────────────────────
  const openVideoPopup = useCallback((name: string, url: string) => { setVideoPopup({ name, url }); addLog(`Player opened: ${name}`, 'info') }, [addLog])
  const closeVideoPopup = useCallback(() => setVideoPopup(null), [])

  useEffect(() => { setStorage('studio_left_tab', currentTab) }, [currentTab])
  useEffect(() => { setStorage('studio_right_tab', currentRightTab) }, [currentRightTab])
  useEffect(() => { setStorage('studio_left_open', leftSidebarOpen) }, [leftSidebarOpen])
  useEffect(() => { setStorage('studio_right_open', rightSidebarOpen) }, [rightSidebarOpen])

  useEffect(() => {
    const key = rowsStorageKey.current
    if (!key || key.endsWith('_')) return
    setStorage(key, rows)
  }, [rows])

  useEffect(() => {
    if (!eventScopedKeyPrefix || eventScopedKeyPrefix.endsWith('_')) return
    setStorage(`studio_group_${eventScopedKeyPrefix}`, selectedGroup)
  }, [selectedGroup, eventScopedKeyPrefix])

  useEffect(() => {
    if (!eventScopedKeyPrefix || eventScopedKeyPrefix.endsWith('_')) return
    setStorage(`studio_active_row_${eventScopedKeyPrefix}`, activeRowIdx)
  }, [activeRowIdx, eventScopedKeyPrefix])

  useEffect(() => {
    if (!eventScopedKeyPrefix || eventScopedKeyPrefix.endsWith('_')) return
    setStorage(`studio_source_locations_${eventScopedKeyPrefix}`, sourceLocations)
  }, [sourceLocations, eventScopedKeyPrefix])

  useEffect(() => {
    if (!eventScopedKeyPrefix || eventScopedKeyPrefix.endsWith('_')) return
    setStorage(`studio_virtual_sources_${eventScopedKeyPrefix}`, virtualSources)
  }, [virtualSources, eventScopedKeyPrefix])


  useEffect(() => { participantsRef.current = participants }, [participants])
  useEffect(() => { rtmpSourcesRef.current = rtmpSources }, [rtmpSources])

  useEffect(() => {
    connectWS(); connectControlWs(); fetchLayouts(); fetchParticipants(); fetchParticipantImages(); fetchAllSources(); fetchRecordingStatus()
    return () => {
      if (claimChannelTimerRef.current) { clearTimeout(claimChannelTimerRef.current); claimChannelTimerRef.current = null }
      if (reconnectTimerRef.current) { clearTimeout(reconnectTimerRef.current); reconnectTimerRef.current = null }
      if (rtmpRefetchTimerRef.current) { clearTimeout(rtmpRefetchTimerRef.current); rtmpRefetchTimerRef.current = null }
      // Use logoutPayloadRef so sendPresencePacket (which closes over reactive state) is not a dep of this effect.
      // Including sendPresencePacket here would cause the effect to re-run whenever activeChannelUser or
      // pendingAccessRequest change, reconnecting both WebSockets on every presence event.
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        try {
          const payload = JSON.parse(logoutPayloadRef.current) as Record<string, unknown>
          payload.timestamp = Math.floor(Date.now() / 1000)
          wsRef.current.send(JSON.stringify(payload))
        } catch { /* ignore */ }
      }
      if (heartbeatIntervalRef.current) { clearInterval(heartbeatIntervalRef.current); heartbeatIntervalRef.current = null }
      if (wsRef.current) { wsRef.current.onclose = null; wsRef.current.close(); wsRef.current = null }
      if (controlHeartbeatIntervalRef.current) { clearInterval(controlHeartbeatIntervalRef.current); controlHeartbeatIntervalRef.current = null }
      if (controlWsRef.current) { controlWsRef.current.onclose = null; controlWsRef.current.close(); controlWsRef.current = null }
    }
  }, [connectWS, connectControlWs, fetchLayouts, fetchParticipants, fetchParticipantImages, fetchAllSources, fetchRecordingStatus])

  // Keep logoutPayloadRef current so the beforeunload listener always sends a fresh packet
  // without relying on a potentially stale closure over reactive state.
  useEffect(() => {
    const userData = getStorage<UserData>('pcr_user')
    const userId = getStorage<string>('pcr_user_id') ?? ''
    const userName = userData ? `${userData.firstname} ${userData.lastname}`.trim() : ''
    logoutPayloadRef.current = JSON.stringify({
      userId: Number(userId),
      userName,
      type: 'current_user',
      channelId: Number(cid),
      channel,
      methodType: 'logged_out' as PresenceMethodType,
      timestamp: 0, // overwritten at send time
    })
  }, [cid, channel])

  // Send logged_out on tab/browser close - beforeunload fires while the WS is still open,
  // so ws.send() succeeds. React cleanup does not run in this case, only on in-app navigation.
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (wsRef.current?.readyState !== WebSocket.OPEN) return
      try {
        const payload = JSON.parse(logoutPayloadRef.current)
        payload.timestamp = Math.floor(Date.now() / 1000)
        wsRef.current.send(JSON.stringify(payload))
      } catch { /* ignore */ }
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [])


  // Precompute previewUserIds for border highlights
  const previewUserIds = useMemo(
    () => new Set(rows.flatMap(r => r.sources.filter(s => s.sourceType === 'webrtc' && s.sourceValue).map(s => s.sourceValue))),
    [rows],
  )

  const buildStreamPreviewUrl = useCallback((src: AnySource): string | null => {
    if (src.status !== 'online' && src.status !== 'live') return null
    if (src.protocol === 'WebRTC') return `${WEBRTC_PREVIEW_BASE}?streamname=20006310_${channel}_${src.name}_main`
    return `${RTMP_PREVIEW_BASE}?channel=${channel}&streamName=${src.name}`
  }, [channel])

  return {
    channel, cid, wsStatus, toggleConnect, activeChannelUser, isRestricted, isAccessRequestPending, isClaimingChannel, pendingAccessRequest, requestAccess, acceptAccessRequest, denyAccessRequest, forceAccess,
    participants, participantImageMap, setParticipantImageMap, participantMuteMap, muteParticipant, webrtcSources, rtmpSources, videoAssets, isLoadingVideoAssets, sourceLocations, updateSourceLocations,
    addParticipant, removeParticipant,
    virtualSources, addVirtualSource, removeVirtualSource, updateVirtualSource,
    layoutData, groupLayouts, groups, selectedGroup, setSelectedGroup, onCaptionChange,
    fetchLayouts, fetchParticipants, fetchRtmp, fetchVideos, fetchAllSources, createRtmpApplication,
    mode, setMode, rows, updateRow, addSource, removeSource, updateSource, muteSource, setSourceVolume, setSourceTransform, activeRowIdx, fire, fireCompact, sendCompactPreload, compactTake, publishToMaster,
    compactPoolSelectedValues, setCompactPoolSelectedValues,
    lastFiredInfo,
    gfxData, gfxTemplateName, gfxBusy, fetchGraphics, toggleGfxBand,
    gfxBandContent, gfxAlignmentCache,
    fetchGfxBandContent, updateGfxBandContent, updateGfxBandLayout, updateGfxBandAlignment,
    previewGfxBandLayout, previewGfxBandAlignment,
    fetchGfxBandLocation, updateGfxBandLocation,
    fetchGfxBandAsset, fetchGfxAssets, fetchGfxBgAssets, updateGfxBandAsset,
    getGfxBandLayout, getGfxBandPosition,
    currentTab, setCurrentTab, currentRightTab, setCurrentRightTab,
    leftSidebarOpen, setLeftSidebarOpen, rightSidebarOpen, setRightSidebarOpen,
    studioLayout, setStudioLayout,
    addLog,
    destinations, addDestination, deleteDestination, startDestination, stopDestination,
    videoPopup, openVideoPopup, closeVideoPopup,
    isRecording, isRecordingBusy, toggleRecording,
    isResetBusy, resetStream, resetLayout,
    meetingUrl,
    previewUserIds, buildStreamPreviewUrl,
    sbStatus, layoutStatus, participantStatus, gfxStatus,
    previewUrl: getPreviewUrl(channel), masterUrl: getMasterUrl(channel),
    studioToast, setStudioToast, studioToastNonce, showToast,
    sendWs,
    sendCellChange,
    sendMatrixChange,
    sendPresencePacket,
  }
}

export type StudioContextValue = ReturnType<typeof useStudio>
