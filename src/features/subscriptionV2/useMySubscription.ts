import { useCallback, useEffect, useState } from 'react'
import { cancelMySubscription, changeMyPlan, getMySubscription } from '../../lib/subscriptionV2Api'
import type { ChangePlanRequest, CurrentSubscription } from '../../types/subscriptionV2'

interface UseMySubscriptionResult {
  subscription: CurrentSubscription | null
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useMySubscription(): UseMySubscriptionResult {
  const [subscription, setSubscription] = useState<CurrentSubscription | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refetch = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const res = await getMySubscription()
      if (res.code !== 1) throw new Error(res.Message || 'Failed to load subscription')
      setSubscription(res.data ?? null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load subscription')
      setSubscription(null)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    refetch()
  }, [refetch])

  return { subscription, isLoading, error, refetch }
}

interface UseCancelSubscriptionResult {
  isSubmitting: boolean
  cancel: (cancelAtCycleEnd: boolean) => Promise<void>
}

export function useCancelSubscription(): UseCancelSubscriptionResult {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const cancel = useCallback(async (cancelAtCycleEnd: boolean) => {
    setIsSubmitting(true)
    try {
      const res = await cancelMySubscription(cancelAtCycleEnd)
      if (res.code !== 1) throw new Error(res.Message || 'Failed to cancel subscription')
    } finally {
      setIsSubmitting(false)
    }
  }, [])

  return { isSubmitting, cancel }
}

interface UseChangePlanResult {
  isSubmitting: boolean
  changePlan: (payload: ChangePlanRequest) => Promise<void>
}

export function useChangePlan(): UseChangePlanResult {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const changePlan = useCallback(async (payload: ChangePlanRequest) => {
    setIsSubmitting(true)
    try {
      const res = await changeMyPlan(payload)
      if (res.code !== 1) throw new Error(res.Message || 'Failed to change plan')
    } finally {
      setIsSubmitting(false)
    }
  }, [])

  return { isSubmitting, changePlan }
}
