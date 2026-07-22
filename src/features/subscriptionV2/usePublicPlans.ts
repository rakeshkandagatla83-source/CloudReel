import { useCallback, useEffect, useState } from 'react'
import { getPublicPlans } from '../../lib/subscriptionV2Api'
import type { PublicPlan } from '../../types/subscriptionV2'

interface UsePublicPlansResult {
  plans: PublicPlan[]
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function usePublicPlans(country: string, currency: string): UsePublicPlansResult {
  const [plans, setPlans] = useState<PublicPlan[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refetch = useCallback(async () => {
    if (!country || !currency) {
      setPlans([])
      setIsLoading(false)
      return
    }
    setIsLoading(true)
    setError(null)
    try {
      const res = await getPublicPlans(country, currency)
      if (res.code !== 1) throw new Error(res.Message || 'Failed to load plans')
      setPlans(res.data ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load plans')
      setPlans([])
    } finally {
      setIsLoading(false)
    }
  }, [country, currency])

  useEffect(() => {
    refetch()
  }, [refetch])

  return { plans, isLoading, error, refetch }
}
