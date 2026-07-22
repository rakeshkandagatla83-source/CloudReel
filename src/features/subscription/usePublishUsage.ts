import { useEffect, useState } from 'react'
import { getStorage } from '../../lib/storage'
import { fetchPublishRecordsInRange } from '../../lib/publishHistoryService'
import { useSubscription } from './useSubscription'

export interface PublishUsage {
  uploads: {
    used: number
    limit: number
    isAtLimit: boolean
  }
  publishingHours: {
    hoursUsed: number
    limit: number
    isAtLimit: boolean
    canPublishHours: (hours: number) => boolean
  }
  loading: boolean
  error: string | null
}

export function usePublishUsage(): PublishUsage {
  const { planLimits, billingPeriodStart, billingPeriodEnd, isSubscribed } = useSubscription()
  const [uploads, setUploads] = useState(0)
  const [publishingHours, setPublishingHours] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isSubscribed || !billingPeriodStart || !billingPeriodEnd) {
      setUploads(0)
      setPublishingHours(0)
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    const cid = getStorage<string>('pcr_channel_id')
    if (!cid) {
      setError('No channel selected')
      setLoading(false)
      return
    }

    fetchPublishRecordsInRange(cid, billingPeriodStart, billingPeriodEnd)
      .then((records) => {
        // Calculate upload count
        const uploadCount = records.filter((r) => {
          const inputType = r.Inputtype.toLowerCase()
          const outputMode = r.outputMode.toLowerCase()
          return inputType === 'vod upload' || outputMode.includes('vod upload')
        }).length

        // Calculate publishing hours
        const totalHours = records
          .filter((r) => r.Endtime > r.Starttime)
          .reduce((sum, record) => {
            const hours = (record.Endtime - record.Starttime) / 3600
            return sum + hours
          }, 0)

        setUploads(uploadCount)
        setPublishingHours(totalHours)
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Failed to load publish usage')
      })
      .finally(() => {
        setLoading(false)
      })
  }, [isSubscribed, billingPeriodStart, billingPeriodEnd])

  const uploadLimit = planLimits?.maxUploads ?? 0
  const publishingHoursLimit = planLimits?.maxPublishingHours ?? 0

  return {
    uploads: {
      used: uploads,
      limit: uploadLimit,
      isAtLimit: uploads >= uploadLimit,
    },
    publishingHours: {
      hoursUsed: Math.round(publishingHours * 100) / 100,
      limit: publishingHoursLimit,
      isAtLimit: publishingHours >= publishingHoursLimit,
      canPublishHours: (hours: number) => publishingHours + hours <= publishingHoursLimit,
    },
    loading,
    error,
  }
}
