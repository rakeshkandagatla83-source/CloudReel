import { useState, useMemo, useCallback, useEffect } from 'react'
import type { DbLayout, DbFetchStatus } from '../../types/layoutBuilder'
import { fetchLayoutsApi, deleteLayoutApi } from './layoutBuilderApi'
import { getStudioCid } from '../../lib/studioConfig'

interface UseDbLayoutsReturn {
  layouts: DbLayout[]
  filtered: DbLayout[]
  status: DbFetchStatus
  statusMessage: string
  groups: string[]
  groupFilter: string
  setGroupFilter: (group: string) => void
  fetch: () => Promise<void>
  removeLayout: (id: number) => void
  deleteLayout: (id: number) => Promise<void>
}

export function useDbLayouts(): UseDbLayoutsReturn {
  const [layouts, setLayouts] = useState<DbLayout[]>([])
  const [status, setStatus] = useState<DbFetchStatus>('idle')
  const [statusMessage, setStatusMessage] = useState('')
  const cid = getStudioCid() ?? '0'
  const [groupFilter, setGroupFilter] = useState('')

  const groups = useMemo(
    () => [...new Set(layouts.map((l) => l.groupName).filter(Boolean))].sort(),
    [layouts],
  )

  const filtered = useMemo(
    () => (groupFilter ? layouts.filter((l) => l.groupName === groupFilter) : layouts),
    [layouts, groupFilter],
  )

  const fetch = useCallback(async () => {
    setStatus('loading')
    setStatusMessage('Fetching...')
    try {
      const data = await fetchLayoutsApi(cid)
      setLayouts(data)
      setStatus('ok')
      setStatusMessage(`${data.length} layouts`)
    } catch (e) {
      setStatus('error')
      setStatusMessage(e instanceof Error ? e.message : 'Fetch failed')
    }
  }, [cid])

  useEffect(() => {
    fetch()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const removeLayout = useCallback((id: number) => {
    setLayouts((prev) => prev.filter((l) => l.id !== id))
  }, [])

  const deleteLayout = useCallback(
    async (id: number) => {
      await deleteLayoutApi(id)
      removeLayout(id)
    },
    [removeLayout],
  )

  return {
    layouts,
    filtered,
    status,
    statusMessage,
    groups,
    groupFilter,
    setGroupFilter,
    fetch,
    removeLayout,
    deleteLayout,
  }
}
