import { useState, useEffect, useCallback } from 'react'
import { isAxiosError } from 'axios'
import { http } from '../../lib/http'
import { getStorage, setStorage } from '../../lib/storage'
import type { Asset, AssetsResponse, AssetFilterState } from '../../types/asset'
import { apiConfig } from '../../lib/apiConfig'

const STORAGE_PGSIZE = 'pcr_mam_pgsize'
const STORAGE_PGNO = 'pcr_mam_pgno'

export const DEFAULT_FILTERS: AssetFilterState = {
  name: '',
  category: '',
  subCategory: '',
  createFrom: 0,
  createTo: 0,
  uploadFrom: 0,
  uploadTo: 0,
  order: '',
  pgno: 1,
  pgsize: 50,
}

export function useAssets() {
  const [assets, setAssets] = useState<Asset[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFilters] = useState<AssetFilterState>(() => ({
    ...DEFAULT_FILTERS,
    pgsize: getStorage<number>(STORAGE_PGSIZE) ?? DEFAULT_FILTERS.pgsize,
    pgno: getStorage<number>(STORAGE_PGNO) ?? DEFAULT_FILTERS.pgno,
  }))
  const [hasMore, setHasMore] = useState(false)
  const [totalPages, setTotalPages] = useState<number | null>(null)

  const fetchAssets = useCallback(async (f: AssetFilterState, signal?: AbortSignal) => {
    const token = getStorage<string>('pcr_token') ?? ''
    const cid = getStorage<string>('pcr_channel_id') ?? ''
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({
        cid,
        status: 'A',
        pgno: String(f.pgno),
        pgsize: String(f.pgsize),
        category: f.category,
        name: f.name,
        createFrom: String(f.createFrom),
        createTo: String(f.createTo),
        uploadFrom: String(f.uploadFrom),
        uploadTo: String(f.uploadTo),
        order: f.order,
        afPath: '',
        subCategory: f.subCategory,
      })
      const res = await http.post<AssetsResponse>(
        apiConfig.scalaApiBase,
        'v1/playout/getassets/with/folders',
        params,
        {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'x-auth-token': token,
            'x-channel-id': cid,
          },
          signal,
        },
      )
      const count = res.resultCount ?? 0
      const pages = count > 0 ? Math.ceil(count / f.pgsize) : f.pgno
      setAssets(res.assets ?? [])
      setHasMore(f.pgno < pages)
      setTotalPages(pages)
      setLoading(false)
    } catch (err) {
      if (isAxiosError(err) && err.code === 'ERR_CANCELED') return
      const msg = isAxiosError(err)
        ? ((err.response?.data?.Message as string | undefined) ?? 'Failed to load assets. Please try again.')
        : 'An error occurred while loading assets.'
      setError(msg)
      setAssets([])
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchAssets(filters, controller.signal)
    return () => controller.abort()
  }, [fetchAssets, filters])

  useEffect(() => { setStorage(STORAGE_PGSIZE, filters.pgsize) }, [filters.pgsize])
  useEffect(() => { setStorage(STORAGE_PGNO, filters.pgno) }, [filters.pgno])

  const applyFilters = useCallback((updates: Partial<AssetFilterState>) => {
    setFilters((prev) => ({ ...prev, ...updates, pgno: 1 }))
  }, [])

  const goToPage = useCallback((page: number) => {
    setFilters((prev) => ({ ...prev, pgno: page }))
  }, [])

  const refetch = useCallback(() => {
    setFilters((prev) => ({ ...prev }))
  }, [])

  return { assets, loading, error, filters, applyFilters, goToPage, hasMore, totalPages, refetch }
}
