import { useCallback, useEffect, useState } from 'react'
import {
  createSubscriptionPlan,
  getSubscriptionPlan,
  listSubscriptionPlans,
  setSubscriptionPlanStatus,
  updateSubscriptionPlan,
} from '../../../lib/subscriptionAdminApi'
import type {
  CreatePlanRequest,
  ListPlansQuery,
  SubscriptionPlan,
  UpdatePlanRequest,
} from '../../../types/subscriptionAdmin'

interface UsePlansListResult {
  plans: SubscriptionPlan[]
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function usePlansList(query: ListPlansQuery = {}): UsePlansListResult {
  const [plans, setPlans] = useState<SubscriptionPlan[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const queryKey = JSON.stringify(query)

  const refetch = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const res = await listSubscriptionPlans(query)
      if (res.code !== 1) throw new Error(res.Message || 'Failed to load plans')
      setPlans(res.data ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load plans')
      setPlans([])
    } finally {
      setIsLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryKey])

  useEffect(() => {
    refetch()
  }, [refetch])

  return { plans, isLoading, error, refetch }
}

interface UsePlanResult {
  plan: SubscriptionPlan | null
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function usePlan(id: number | null): UsePlanResult {
  const [plan, setPlan] = useState<SubscriptionPlan | null>(null)
  const [isLoading, setIsLoading] = useState(id !== null)
  const [error, setError] = useState<string | null>(null)

  const refetch = useCallback(async () => {
    if (id === null) {
      setPlan(null)
      setIsLoading(false)
      return
    }
    setIsLoading(true)
    setError(null)
    try {
      const res = await getSubscriptionPlan(id)
      if (res.code !== 1) throw new Error(res.Message || 'Failed to load plan')
      setPlan(res.data ?? null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load plan')
      setPlan(null)
    } finally {
      setIsLoading(false)
    }
  }, [id])

  useEffect(() => {
    refetch()
  }, [refetch])

  return { plan, isLoading, error, refetch }
}

interface PlanMutationResult {
  isSubmitting: boolean
  createPlan: (payload: CreatePlanRequest) => Promise<{ id: number }>
  updatePlan: (id: number, payload: UpdatePlanRequest) => Promise<void>
  togglePlanStatus: (id: number, isActive: boolean) => Promise<void>
}

export function usePlanMutations(): PlanMutationResult {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const createPlan = useCallback(async (payload: CreatePlanRequest): Promise<{ id: number }> => {
    setIsSubmitting(true)
    try {
      const res = await createSubscriptionPlan(payload)
      if (res.code !== 1) throw new Error(res.Message || 'Failed to create plan')
      if (typeof res.planId !== 'number' || res.planId <= 0) {
        throw new Error('Plan created but server did not return the new plan id')
      }
      return { id: res.planId }
    } finally {
      setIsSubmitting(false)
    }
  }, [])

  const updatePlan = useCallback(async (id: number, payload: UpdatePlanRequest): Promise<void> => {
    setIsSubmitting(true)
    try {
      const res = await updateSubscriptionPlan(id, payload)
      if (res.code !== 1) throw new Error(res.Message || 'Failed to update plan')
    } finally {
      setIsSubmitting(false)
    }
  }, [])

  const togglePlanStatus = useCallback(async (id: number, isActive: boolean): Promise<void> => {
    setIsSubmitting(true)
    try {
      const res = await setSubscriptionPlanStatus(id, isActive)
      if (res.code !== 1) throw new Error(res.Message || 'Failed to update status')
    } finally {
      setIsSubmitting(false)
    }
  }, [])

  return { isSubmitting, createPlan, updatePlan, togglePlanStatus }
}
