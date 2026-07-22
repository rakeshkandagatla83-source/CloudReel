import { useCallback, useEffect, useState } from 'react'
import {
  createPlanGatewayMapping,
  deletePlanGatewayMapping,
  listPlanGatewayMappings,
  updatePlanGatewayMapping,
} from '../../../lib/subscriptionAdminApi'
import type {
  CreateMappingRequest,
  PlanGatewayMapping,
  UpdateMappingRequest,
} from '../../../types/subscriptionAdmin'

interface UseMappingsResult {
  mappings: PlanGatewayMapping[]
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useGatewayMappings(planId: number | null): UseMappingsResult {
  const [mappings, setMappings] = useState<PlanGatewayMapping[]>([])
  const [isLoading, setIsLoading] = useState(planId !== null)
  const [error, setError] = useState<string | null>(null)

  const refetch = useCallback(async () => {
    if (planId === null) {
      setMappings([])
      setIsLoading(false)
      return
    }
    setIsLoading(true)
    setError(null)
    try {
      const res = await listPlanGatewayMappings(planId)
      if (res.code !== 1) throw new Error(res.Message || 'Failed to load mappings')
      setMappings(res.data ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load mappings')
      setMappings([])
    } finally {
      setIsLoading(false)
    }
  }, [planId])

  useEffect(() => {
    refetch()
  }, [refetch])

  return { mappings, isLoading, error, refetch }
}

interface MappingMutationResult {
  isSubmitting: boolean
  createMapping: (planId: number, payload: CreateMappingRequest) => Promise<void>
  updateMapping: (
    planId: number,
    mappingId: number,
    payload: UpdateMappingRequest,
  ) => Promise<void>
  deleteMapping: (planId: number, mappingId: number) => Promise<void>
}

export function useGatewayMappingMutations(): MappingMutationResult {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const createMapping = useCallback(async (planId: number, payload: CreateMappingRequest): Promise<void> => {
    setIsSubmitting(true)
    try {
      const res = await createPlanGatewayMapping(planId, payload)
      if (res.code !== 1) throw new Error(res.Message || 'Failed to create mapping')
    } finally {
      setIsSubmitting(false)
    }
  }, [])

  const updateMapping = useCallback(
    async (planId: number, mappingId: number, payload: UpdateMappingRequest): Promise<void> => {
      setIsSubmitting(true)
      try {
        const res = await updatePlanGatewayMapping(planId, mappingId, payload)
        if (res.code !== 1) throw new Error(res.Message || 'Failed to update mapping')
      } finally {
        setIsSubmitting(false)
      }
    },
    [],
  )

  const deleteMapping = useCallback(async (planId: number, mappingId: number): Promise<void> => {
    setIsSubmitting(true)
    try {
      const res = await deletePlanGatewayMapping(planId, mappingId)
      if (res.code !== 1) throw new Error(res.Message || 'Failed to delete mapping')
    } finally {
      setIsSubmitting(false)
    }
  }, [])

  return { isSubmitting, createMapping, updateMapping, deleteMapping }
}
