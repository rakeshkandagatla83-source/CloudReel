import { useCallback, useEffect, useState } from 'react'
import {
  createGateway,
  listGateways,
  setGatewayStatus,
  updateGateway,
} from '../../../lib/subscriptionAdminApi'
import type {
  CreateGatewayRequest,
  ListGatewaysQuery,
  SubscriptionGateway,
  UpdateGatewayRequest,
} from '../../../types/subscriptionAdmin'

interface UseGatewaysListResult {
  gateways: SubscriptionGateway[]
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useGatewaysList(query: ListGatewaysQuery = {}): UseGatewaysListResult {
  const [gateways, setGateways] = useState<SubscriptionGateway[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const queryKey = JSON.stringify(query)

  const refetch = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const res = await listGateways(query)
      if (res.code !== 1) throw new Error(res.Message || 'Failed to load gateways')
      setGateways(res.data ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load gateways')
      setGateways([])
    } finally {
      setIsLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryKey])

  useEffect(() => {
    refetch()
  }, [refetch])

  return { gateways, isLoading, error, refetch }
}

interface GatewayMutationResult {
  isSubmitting: boolean
  createGatewayMutate: (payload: CreateGatewayRequest) => Promise<void>
  updateGatewayMutate: (id: number, payload: UpdateGatewayRequest) => Promise<void>
  toggleGatewayStatus: (id: number, isActive: boolean) => Promise<void>
}

export function useGatewayMutations(): GatewayMutationResult {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const createGatewayMutate = useCallback(async (payload: CreateGatewayRequest): Promise<void> => {
    setIsSubmitting(true)
    try {
      const res = await createGateway(payload)
      if (res.code !== 1) throw new Error(res.Message || 'Failed to create gateway')
    } finally {
      setIsSubmitting(false)
    }
  }, [])

  const updateGatewayMutate = useCallback(async (id: number, payload: UpdateGatewayRequest): Promise<void> => {
    setIsSubmitting(true)
    try {
      const res = await updateGateway(id, payload)
      if (res.code !== 1) throw new Error(res.Message || 'Failed to update gateway')
    } finally {
      setIsSubmitting(false)
    }
  }, [])

  const toggleGatewayStatus = useCallback(async (id: number, isActive: boolean): Promise<void> => {
    setIsSubmitting(true)
    try {
      const res = await setGatewayStatus(id, isActive)
      if (res.code !== 1) throw new Error(res.Message || 'Failed to update status')
    } finally {
      setIsSubmitting(false)
    }
  }, [])

  return { isSubmitting, createGatewayMutate, updateGatewayMutate, toggleGatewayStatus }
}
