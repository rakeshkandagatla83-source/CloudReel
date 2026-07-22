import { useState, useCallback, useRef } from 'react'
import { http } from '../../lib/http'
import { apiConfig } from '../../lib/apiConfig'
import { getStorage } from '../../lib/storage'
import { logout } from '../../lib/authService'
import type { CalendarEvent } from '../../types/event'
import type { UserData } from '../../types/user'
import { uid } from './eventUtils'

interface UsageCheckResult {
  canCreate: boolean
  reason?: string
  hoursNeeded?: number
  hoursAvailable?: number
}

const MEETING_CODE_CHARS = 'abcdefghijklmnopqrstuvwxyz'
const meetingCodeSegment = (length: number) =>
  Array.from({ length }, () => MEETING_CODE_CHARS[Math.floor(Math.random() * 26)]).join('')
const generateMeetingCode = () =>
  `${meetingCodeSegment(3)}-${meetingCodeSegment(4)}-${meetingCodeSegment(3)}`

function normalizeEvent(ev: Record<string, unknown>): CalendarEvent {
  return {
    id: String(ev.Sno ?? ev.id ?? uid()),
    title: String(ev.Title ?? ev.title ?? ''),
    description: String(ev.Description ?? ev.description ?? ''),
    startDateTime: Number(ev.StartDateTime ?? ev.startDateTime ?? 0),
    endDateTime: Number(ev.EndDateTime ?? ev.endDateTime ?? 0),
    eventType: (String(ev.EventType ?? ev.eventType ?? 'O').trim() as 'C' | 'O'),
    resolution: String(ev.resolution ?? ev.Resolution ?? ''),
    thumbnailUrl: String(ev.ThumbnailUrl ?? ev.thumbnailUrl ?? ''),
    createdAt: Number(ev.CreatedAt ?? ev.createdAt ?? Math.floor(Date.now() / 1000)),
    _local: Boolean(ev._local),
  }
}

const POLL_INTERVAL_MS = 10_000
const POLL_MAX_ATTEMPTS = 30

export function useEvents() {
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(false)
  const loadedRef = useRef<Record<string, boolean>>({})
  const cid = getStorage<string>('pcr_channel_id') ?? ''
  const userId = getStorage<string>('pcr_user_id') ?? ''

  const fetchEvents = useCallback(
    async (year: number, month: number, force = false) => {
      const key = `${year}-${month}`
      if (!force && loadedRef.current[key]) return
      delete loadedRef.current[key]
      setLoading(true)
      const cidNum = Number(getStorage<string | number>('pcr_channel_id'))
      if (!cidNum) { logout(); window.location.href = '/login'; return }
      const firstOfMonth = new Date(year, month, 1, 0, 0, 0)
      const epochSec = Math.floor(firstOfMonth.getTime() / 1000)
      const daysInMonth = new Date(year, month + 1, 0).getDate()
      try {
        const json = await http.post<{ Data?: unknown[]; data?: unknown[] }>(
          '',
          'v2/ProducerEvent/producerEventPlaylist',
          { cid: cidNum, startDateTime: epochSec, days: daysInMonth },
        )
        const startTs = firstOfMonth.getTime()
        const endTs = new Date(year, month + 1, 0, 23, 59, 59).getTime()
        const fetched = ((json.Data ?? json.data ?? []) as Record<string, unknown>[])
          .flatMap(b => ((b.events ?? []) as Record<string, unknown>[]))
          .filter(ev => ev.Sno && ev.Title)
          .map(normalizeEvent)
        setEvents(prev => [
          ...prev.filter(e => { const t = e.startDateTime * 1000; return t < startTs || t > endTs }),
          ...fetched,
        ])
        loadedRef.current[key] = true
      } catch {
        // silently ignore; existing events stay
      } finally {
        setLoading(false)
      }
    },
    [],
  )

  const saveEvent = useCallback(
    async (
      payload: Record<string, unknown>,
      isEdit: boolean,
      editingId?: string | null,
    ): Promise<{ ok: boolean; error?: string; local?: boolean }> => {
      const apiPath = isEdit ? 'v2/ProducerEvent/updateEvent' : 'v2/ProducerEvent/insertEvent'
      try {
        const json = await http.post<{
          Code?: number; code?: number; statusCode?: number
          Success?: boolean; success?: boolean
          Id?: string; id?: string; Message?: string; message?: string
        }>('', apiPath, payload)
        const ok = json.Code === 200 || json.code === 200 || json.statusCode === 200
          || json.Success === true || json.success === true
        if (ok) {
          const newEv = normalizeEvent({ ...payload, id: json.id ?? json.Id ?? editingId ?? uid(), _local: true })
          setEvents(prev =>
            isEdit ? prev.map(e => (String(e.id) === String(editingId) ? newEv : e)) : [...prev, newEv],
          )
          return { ok: true }
        }
        return { ok: false, error: json.Message ?? json.message ?? 'API error.' }
      } catch {
        const newEv = normalizeEvent({ ...payload, id: editingId ?? uid(), _local: true })
        setEvents(prev =>
          isEdit ? prev.map(e => (String(e.id) === String(editingId) ? newEv : e)) : [...prev, newEv],
        )
        return { ok: true, local: true }
      }
    },
    [],
  )

  const removeEvent = useCallback((id: string) => {
    setEvents(prev => prev.filter(e => String(e.id) !== String(id)))
  }, [])

  const deleteEvent = useCallback(
    async (id: string): Promise<{ ok: boolean; error?: string }> => {
      try {
        const json = await http.post<{ Code?: number; Success?: boolean; Message?: string }>(
          apiConfig.dotnetApiBase,
          'v2/ProducerEvent/deleteEvent',
          { cid: Number(cid), sno: Number(id) },
        )
        if (json.Code === 200 || json.Success === true) {
          setEvents(prev => prev.filter(e => String(e.id) !== String(id)))
          return { ok: true }
        }
        return { ok: false, error: json.Message ?? 'Delete failed.' }
      } catch {
        return { ok: false, error: 'Network error.' }
      }
    },
    [cid],
  )

  // ── Fetch existing instance (quick status check) ─────────────────────────────
  const fetchInstance = useCallback(
    async (): Promise<{ instanceId: string } | null> => {
      const cidNum = Number(cid)
      try {
        const check = await http.get<{
          code?: number; success?: boolean
          data?: Record<string, unknown> | null
        }>(
          apiConfig.dotnetApiBase,
          `v2/Channel/GetCloudInstanceDetailsByChid?chid=${cidNum}`,
        )
        const d = check.data
        if (d && String(d.status ?? '') === 'RUNNING') {
          return { instanceId: String(d.instanceId ?? '') }
        }
        return null
      } catch {
        return null
      }
    },
    [cid],
  )

  // ── Start instance flow ──────────────────────────────────────────────────────
  // Checks/assigns/starts the cloud instance and polls until RUNNING.
  const startInstanceFlow = useCallback(
    async (
      event: CalendarEvent,
      onStatus: (msg: string, ok?: boolean) => void,
    ): Promise<{ instanceId: string } | null> => {
      const cidNum = Number(cid)

      // 0. Conflict check — another event is already live on this channel
      const now = Math.floor(Date.now() / 1000)
      const conflict = events.some(ev =>
        String(ev.id) !== String(event.id) &&
        ev.startDateTime <= now &&
        ev.endDateTime >= now,
      )
      if (conflict) {
        onStatus('Another meeting is already in progress.', false)
        return null
      }

      // ── Helper: start instance via JanyaCP StartInstance endpoint ──────────
      async function startInstance(instanceId: unknown): Promise<boolean> {
        try {
          const res = await http.post<{ Response?: { RequestId?: string }; message?: string }>(
            apiConfig.dotnetApiBase,
            `v1/JanyaCP/StartInstance?ctmId=1&instanceId=${instanceId}&channelId=${cidNum}`,
            {},
          )
          if (res.Response?.RequestId) return true
          if (res.message && res.message.includes('is already RUNNING')) return true
          return false
        } catch {
          return false
        }
      }

      // ── Helper: poll every 10s until instance is RUNNING ──────────────────
      async function pollUntilRunning(): Promise<boolean> {
        for (let attempt = 1; attempt <= POLL_MAX_ATTEMPTS; attempt++) {
          await new Promise<void>(resolve => setTimeout(resolve, POLL_INTERVAL_MS))
          try {
            const res = await http.get<{ data?: Record<string, unknown> | null }>(
              apiConfig.dotnetApiBase,
              `v2/Channel/GetCloudInstanceDetailsByChid?chid=${cidNum}`,
            )
            const statusValue = String((res.data?.['Status'] ?? res.data?.['status']) ?? '').toUpperCase()
            if (statusValue === 'RUNNING') return true
            if (statusValue !== '' && statusValue !== 'PENDING' && statusValue !== 'STOPPED') {
              onStatus(`Instance failed to start (status: ${statusValue}). Please contact admin.`, false)
              return false
            }
            onStatus(`Instance starting… (${attempt} / ${POLL_MAX_ATTEMPTS})`)
          } catch {
            onStatus('Error checking instance status.', false)
            return false
          }
        }
        onStatus('Instance start timed out. Please try again later.', false)
        return false
      }

      // ── Step 1: Check if an instance is already assigned to this channel ──
      onStatus('Checking instance…')
      try {
        const check = await http.get<{
          code?: number; success?: boolean; message?: string
          data?: Record<string, unknown> | null
        }>(
          apiConfig.dotnetApiBase,
          `v2/Channel/GetCloudInstanceDetailsByChid?chid=${cidNum}`,
        )

        const d = check.data

        if (d == null) {
          // ── No instance assigned — find a free one and assign it ──────────
          onStatus('Finding available instance…')
          const free = await http.get<{
            success?: boolean; data?: Record<string, unknown>; message?: string
          }>(
            apiConfig.dotnetApiBase,
            'v2/Channel/GetFirstFreePcrInstance',
          )
          if (!free.success || !free.data) {
            onStatus(free.message ?? 'No free instance available. Please contact admin.', false)
            return null
          }

          onStatus('Assigning instance to channel…')
          const assign = await http.put<{ success?: boolean; code?: number; message?: string }>(
            apiConfig.dotnetApiBase,
            'v2/Channel/UpdateInstanceChid',
            { Sno: free.data.sno, InstanceId: free.data.instanceId, Chid: cidNum },
          )
          if (!assign.success && assign.code !== 200) {
            onStatus(assign.message ?? 'Failed to assign instance. Please try again.', false)
            return null
          }

          onStatus('Starting instance…')
          const started = await startInstance(free.data.instanceId)
          if (!started) {
            onStatus('Failed to start instance. Please contact admin.', false)
            return null
          }

          onStatus('Waiting for instance to start…')
          const running = await pollUntilRunning()
          if (!running) return null
          return { instanceId: String(free.data.instanceId ?? '') }
        }

        // ── Instance is assigned — check its current status ────────────────
        const status = String(d.status ?? '')

        if (status === 'RUNNING') {
          return { instanceId: String(d.instanceId ?? '') }
        }

        if (status === 'STOPPING') {
          onStatus('Instance is currently stopping. Please wait and try again.', false)
          return null
        }

        if (status === 'STOPPED' || status === 'PENDING') {
          onStatus('Starting instance…')
          const started = await startInstance(d.instanceId)
          if (!started) {
            onStatus('Failed to start instance. Please contact admin.', false)
            return null
          }
          onStatus('Waiting for instance to start…')
          const running = await pollUntilRunning()
          if (!running) return null
          return { instanceId: String(d.instanceId ?? '') }
        }

        onStatus('Instance unavailable. Please contact Janya admin.', false)
        return null
      } catch {
        onStatus('Network error. Please check your connection and try again.', false)
        return null
      }
    },
    [cid, userId, events],
  )

  const getMeetingForEvent = useCallback(
    async (eventId: string): Promise<string | null> => {
      try {
        const res = await http.get<{ code: number; data: Array<{ masterUUID: string }> }>(
          apiConfig.dotnetApiBase,
          `v1/producer/get-videoconference-info-by-event?eventId=${eventId}`,
        )
        if (res.code === 1 && Array.isArray(res.data) && res.data.length > 0) {
          return res.data[0].masterUUID
        }
        return null
      } catch {
        return null
      }
    },
    [],
  )

  const createMeetingUrlForEvent = useCallback(
    async (
      eventId: string,
      bitrate: string,
      onStatus: (msg: string, ok?: boolean) => void,
    ): Promise<{ meetingUrl: string; masterUUID: string } | null> => {
      onStatus('Creating meeting URL…')
      try {
        const channelName = getStorage<string>('pcr_channel_name') ?? ''
        const userData = getStorage<UserData>('pcr_user')
        const rawName = userData ? (userData.lastname ? `${userData.firstname}-${userData.lastname}` : userData.firstname) : 'host'
        const sanitized = rawName.replace(/[\s~`!@#$%^&*(){}[\];:"'<,.>?/\\|_+=-]/g, '').toLowerCase()
        const participantId = sanitized + Math.floor(Math.random() * 10)
        const masterUUID = generateMeetingCode()
        const roomName = channelName
        const res = await http.post<{ code?: number }>(
          apiConfig.dotnetApiBase,
          'v1/Producer/add-videoconference-info',
          {
            chId: channelName,
            roomName,
            userId: participantId,
            bitRate: bitrate,
            userType: 'Host',
            meetingJoinedTime: Math.floor(Date.now() / 1000),
            meetingDCTime: 0,
            masterUUID,
            cvUUID: masterUUID,
            waitingRoom: false,
            eventId,
          },
        )
        if (res.code !== 1) {
          onStatus('Failed to create meeting URL. Please try again.', false)
          return null
        }
        const meetingUrl = `${apiConfig.meetingHostBase}/host?id=${masterUUID}`
        onStatus('Meeting URL ready!', true)
        return { meetingUrl, masterUUID }
      } catch {
        onStatus('Failed to create meeting URL.', false)
        return null
      }
    },
    [],
  )

  const checkEventQuota = useCallback(
    (startDateTime: number, endDateTime: number, planLimits: { maxMeetingHours: number } | null, meetingHoursUsed: number): UsageCheckResult => {
      if (!planLimits) {
        return { canCreate: false, reason: 'no-subscription' }
      }
      const eventHours = (endDateTime - startDateTime) / 3600
      const hoursAvailable = planLimits.maxMeetingHours - meetingHoursUsed
      if (eventHours > hoursAvailable) {
        return {
          canCreate: false,
          reason: `Event duration exceeds remaining meeting hours`,
          hoursNeeded: eventHours,
          hoursAvailable,
        }
      }
      return { canCreate: true }
    },
    [],
  )

  return { events, loading, cid, userId, fetchEvents, saveEvent, removeEvent, deleteEvent, fetchInstance, startInstanceFlow, createMeetingUrlForEvent, getMeetingForEvent, checkEventQuota }
}
