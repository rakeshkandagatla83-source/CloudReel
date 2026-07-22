import { useEffect, useState } from 'react'
import { http } from '../../lib/http'
import { apiConfig } from '../../lib/apiConfig'
import { getStorage } from '../../lib/storage'
import { useSubscription } from './useSubscription'

interface ApiEvent {
  Sno: number | null
  StartDateTime: number | null
  EndDateTime: number | null
}

interface MeetingHoursUsage {
  hoursUsed: number
  limit: number
  isAtLimit: boolean
  canCreateHours: (hours: number) => boolean
  loading: boolean
  error: string | null
}

async function fetchEvents(billingPeriodStart: Date, billingPeriodEnd: Date): Promise<ApiEvent[]> {
  try {
    const cid = getStorage<string | number>('pcr_channel_id')
    if (!cid) return []

    const startDateTime = Math.floor(billingPeriodStart.getTime() / 1000)
    const endDateTime = Math.floor(billingPeriodEnd.getTime() / 1000)
    const days = Math.ceil((endDateTime - startDateTime) / 86400)

    const res = await http.post<{
      Code: number
      Success: boolean
      Data: Array<{ events?: ApiEvent[] }>
    }>(
      apiConfig.dotnetApiBase,
      'v2/ProducerEvent/producerEventPlaylist',
      { Cid: Number(cid), StartDateTime: startDateTime, Days: days }
    )

    if (!res.Success) return []
    const events = (res.Data ?? [])
      .flatMap(item => item.events ?? [])
      .filter(e => e.Sno !== null && e.StartDateTime !== null && e.EndDateTime !== null)
    return events
  } catch {
    return []
  }
}

export function useMeetingHoursUsage(): MeetingHoursUsage {
  const { planLimits, billingPeriodStart, billingPeriodEnd, isSubscribed } = useSubscription()
  const [hoursUsed, setHoursUsed] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isSubscribed || !billingPeriodStart || !billingPeriodEnd) {
      setHoursUsed(0)
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    fetchEvents(billingPeriodStart, billingPeriodEnd)
      .then((events) => {
        const totalHours = events.reduce((sum, event) => {
          const hours = (event.EndDateTime! - event.StartDateTime!) / 3600
          return sum + hours
        }, 0)
        setHoursUsed(totalHours)
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Failed to load meeting hours usage')
      })
      .finally(() => {
        setLoading(false)
      })
  }, [isSubscribed, billingPeriodStart, billingPeriodEnd])

  const limit = planLimits?.maxMeetingHours ?? 0
  const isAtLimit = hoursUsed >= limit
  const canCreateHours = (hours: number) => hoursUsed + hours <= limit

  return {
    hoursUsed: Math.round(hoursUsed * 100) / 100,
    limit,
    isAtLimit,
    canCreateHours,
    loading,
    error,
  }
}
