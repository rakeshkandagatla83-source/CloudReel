import { useState, useCallback, useEffect } from 'react'
import { getStorage } from '../../lib/storage'
import { fetchPublishHistory } from '../../lib/publishHistoryService'
import type { PublishHistoryRecord, PublishPlatform } from '../../types/publishHistory'

function todayStr(): string {
  return new Date().toISOString().slice(0, 10)
}

function daysAgoStr(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString().slice(0, 10)
}

export interface HistoryFilters {
  startDate: string
  endDate: string
  platform: PublishPlatform | 'all'
  sortOrder: 'asc' | 'desc'
  page: number
  pageSize: number
}

export function usePublishHistory() {
  const cid = getStorage<string>('pcr_channel_id') ?? ''

  const [filters, setFilters] = useState<HistoryFilters>({
    startDate: daysAgoStr(30),
    endDate: todayStr(),
    platform: 'all',
    sortOrder: 'desc',
    page: 1,
    pageSize: 25,
  })

  const [records, setRecords] = useState<PublishHistoryRecord[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(
    async (f: HistoryFilters) => {
      if (!cid) {
        setError('No channel selected')
        return
      }
      setLoading(true)
      setError(null)
      try {
        const start = new Date(f.startDate + 'T00:00:00')
        const end = new Date(f.endDate + 'T23:59:59')
        const result = await fetchPublishHistory({
          cid,
          startDate: start,
          endDate: end,
          sortOrder: f.sortOrder,
          page: f.page,
          pageSize: f.pageSize,
        })
        setRecords(result.records)
        setTotal(result.total)
      } catch (e) {
        setError((e as Error).message)
      } finally {
        setLoading(false)
      }
    },
    [cid],
  )

  useEffect(() => {
    void load(filters)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function applyFilters(patch: Partial<HistoryFilters>) {
    const next: HistoryFilters = { ...filters, ...patch, page: patch.page ?? 1 }
    setFilters(next)
    // Platform is filtered client-side — skip the API call when only it changed
    const platformOnly = Object.keys(patch).every(k => k === 'platform')
    if (!platformOnly) void load(next)
  }

  const totalPages = Math.max(1, Math.ceil(total / filters.pageSize))

  // Client-side platform filter applied on top of server results
  const visible =
    filters.platform === 'all'
      ? records
      : records.filter(r => r.platform === filters.platform)

  return {
    records: visible,
    total,
    loading,
    error,
    filters,
    applyFilters,
    totalPages,
    refetch: () => void load(filters),
  }
}
