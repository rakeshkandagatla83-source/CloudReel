import { useCallback, useEffect, useState } from 'react'
import { getPlanQuota, upsertPlanQuota } from '../../../lib/subscriptionAdminApi'
import type { PlanQuota, UpsertQuotaRequest } from '../../../types/subscriptionAdmin'

interface UseQuotaResult {
  quota: PlanQuota | null
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useQuota(planId: number | null): UseQuotaResult {
  const [quota, setQuota] = useState<PlanQuota | null>(null)
  const [isLoading, setIsLoading] = useState(planId !== null)
  const [error, setError] = useState<string | null>(null)

  const refetch = useCallback(async () => {
    if (planId === null) {
      setQuota(null)
      setIsLoading(false)
      return
    }
    setIsLoading(true)
    setError(null)
    try {
      const res = await getPlanQuota(planId)
      if (res.code !== 1) throw new Error(res.Message || 'Failed to load quota')
      setQuota(res.data ?? null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load quota')
      setQuota(null)
    } finally {
      setIsLoading(false)
    }
  }, [planId])

  useEffect(() => {
    refetch()
  }, [refetch])

  return { quota, isLoading, error, refetch }
}

interface QuotaMutationResult {
  isSubmitting: boolean
  upsertQuota: (planId: number, payload: UpsertQuotaRequest) => Promise<void>
}

export function useQuotaMutations(): QuotaMutationResult {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const upsertQuota = useCallback(async (planId: number, payload: UpsertQuotaRequest): Promise<void> => {
    setIsSubmitting(true)
    try {
      const res = await upsertPlanQuota(planId, payload)
      if (res.code !== 1) throw new Error(res.Message || 'Failed to save quota')
    } finally {
      setIsSubmitting(false)
    }
  }, [])

  return { isSubmitting, upsertQuota }
}
