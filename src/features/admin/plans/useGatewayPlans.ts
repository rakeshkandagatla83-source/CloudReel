import { useCallback, useEffect, useState } from 'react'
import { createGatewayPlan, getGatewayPlans } from '../../../lib/subscriptionAdminApi'
import type { CreateGatewayPlanRequest, GatewayPlan } from '../../../types/subscriptionAdmin'

interface UseGatewayPlansResult {
  plans: GatewayPlan[]
  isLoading: boolean
  error: string | null
  supported: boolean
  refetch: () => Promise<void>
}

export function useGatewayPlans(gatewayCode: string | null): UseGatewayPlansResult {
  const [plans, setPlans] = useState<GatewayPlan[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [supported, setSupported] = useState(true)

  const refetch = useCallback(async () => {
    if (!gatewayCode) {
      setPlans([])
      setIsLoading(false)
      setError(null)
      setSupported(true)
      return
    }
    setIsLoading(true)
    setError(null)
    try {
      const res = await getGatewayPlans(gatewayCode)
      if (res.code !== 1) {
        const msg = res.Message ?? ''
        if (/does not support plan management/i.test(msg)) {
          setSupported(false)
          setPlans([])
          setError(null)
          return
        }
        throw new Error(msg || 'Failed to load gateway plans')
      }
      setSupported(true)
      setPlans(res.data ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load gateway plans')
      setPlans([])
    } finally {
      setIsLoading(false)
    }
  }, [gatewayCode])

  useEffect(() => {
    refetch()
  }, [refetch])

  return { plans, isLoading, error, supported, refetch }
}

interface UseCreateGatewayPlanResult {
  isSubmitting: boolean
  createPlan: (gatewayCode: string, payload: CreateGatewayPlanRequest) => Promise<GatewayPlan>
}

export function useCreateGatewayPlan(): UseCreateGatewayPlanResult {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const createPlan = useCallback(async (gatewayCode: string, payload: CreateGatewayPlanRequest): Promise<GatewayPlan> => {
    setIsSubmitting(true)
    try {
      const res = await createGatewayPlan(gatewayCode, payload)
      if (res.code !== 1) throw new Error(res.Message || 'Failed to create gateway plan')
      if (!res.data) throw new Error('Gateway plan created but server returned no data')
      return res.data
    } finally {
      setIsSubmitting(false)
    }
  }, [])

  return { isSubmitting, createPlan }
}
