import axios from 'axios'
import { http } from './http'
import { apiConfig } from './apiConfig'
import type {
  AdminApiResponse,
  CreateGatewayPlanRequest,
  CreateGatewayRequest,
  CreateMappingRequest,
  CreatePlanRequest,
  GatewayPlan,
  ListGatewaysQuery,
  ListPlansQuery,
  PlanGatewayMapping,
  PlanQuota,
  SubscriptionGateway,
  SubscriptionPlan,
  UpdateGatewayRequest,
  UpdateMappingRequest,
  UpdatePlanRequest,
  UpsertQuotaRequest,
} from '../types/subscriptionAdmin'

const PLANS_BASE = 'v1/subscription/plans'
const GATEWAYS_BASE = 'v1/subscription/gateways'

async function callAdminApi<T>(fn: () => Promise<AdminApiResponse<T>>): Promise<AdminApiResponse<T>> {
  try {
    return await fn()
  } catch (err) {
    if (axios.isAxiosError(err) && err.response?.data && typeof err.response.data === 'object') {
      const body = err.response.data as Partial<AdminApiResponse<T>>
      if (typeof body.code === 'number') {
        return {
          code: body.code,
          Message: body.Message ?? 'Request failed',
          id: body.id,
          data: body.data,
        }
      }
    }
    throw err
  }
}

function buildQueryString(query: ListPlansQuery): string {
  const params = new URLSearchParams()
  if (typeof query.active === 'boolean') params.append('active', String(query.active))
  if (query.billingCycle) params.append('billingCycle', query.billingCycle)
  const qs = params.toString()
  return qs ? `?${qs}` : ''
}

export async function listSubscriptionPlans(query: ListPlansQuery = {}) {
  return callAdminApi(() =>
    http.get<AdminApiResponse<SubscriptionPlan[]>>(
      apiConfig.dotnetApiBase,
      `${PLANS_BASE}${buildQueryString(query)}`,
    ),
  )
}

export async function getSubscriptionPlan(id: number) {
  return callAdminApi(() =>
    http.get<AdminApiResponse<SubscriptionPlan>>(apiConfig.dotnetApiBase, `${PLANS_BASE}/${id}`),
  )
}

export async function createSubscriptionPlan(payload: CreatePlanRequest) {
  return callAdminApi(() =>
    http.post<AdminApiResponse<SubscriptionPlan>>(apiConfig.dotnetApiBase, PLANS_BASE, payload),
  )
}

export async function updateSubscriptionPlan(id: number, payload: UpdatePlanRequest) {
  return callAdminApi(() =>
    http.put<AdminApiResponse<SubscriptionPlan>>(
      apiConfig.dotnetApiBase,
      `${PLANS_BASE}/${id}`,
      payload,
    ),
  )
}

export async function setSubscriptionPlanStatus(id: number, isActive: boolean) {
  return callAdminApi(() =>
    http.patch<AdminApiResponse<{ id: number; isActive: boolean }>>(
      apiConfig.dotnetApiBase,
      `${PLANS_BASE}/${id}/status`,
      { isActive },
    ),
  )
}

function buildGatewaysQuery(query: ListGatewaysQuery): string {
  const params = new URLSearchParams()
  if (typeof query.active === 'boolean') params.append('active', String(query.active))
  const qs = params.toString()
  return qs ? `?${qs}` : ''
}

export async function listGateways(query: ListGatewaysQuery = {}) {
  return callAdminApi(() =>
    http.get<AdminApiResponse<SubscriptionGateway[]>>(
      apiConfig.dotnetApiBase,
      `${GATEWAYS_BASE}${buildGatewaysQuery(query)}`,
    ),
  )
}

export async function createGateway(payload: CreateGatewayRequest) {
  return callAdminApi(() =>
    http.post<AdminApiResponse<SubscriptionGateway>>(
      apiConfig.dotnetApiBase,
      GATEWAYS_BASE,
      payload,
    ),
  )
}

export async function updateGateway(id: number, payload: UpdateGatewayRequest) {
  return callAdminApi(() =>
    http.put<AdminApiResponse<SubscriptionGateway>>(
      apiConfig.dotnetApiBase,
      `${GATEWAYS_BASE}/${id}`,
      payload,
    ),
  )
}

export async function setGatewayStatus(id: number, isActive: boolean) {
  return callAdminApi(() =>
    http.patch<AdminApiResponse<{ id: number; isActive: boolean }>>(
      apiConfig.dotnetApiBase,
      `${GATEWAYS_BASE}/${id}/status`,
      { isActive },
    ),
  )
}

export async function listPlanGatewayMappings(planId: number) {
  return callAdminApi(() =>
    http.get<AdminApiResponse<PlanGatewayMapping[]>>(
      apiConfig.dotnetApiBase,
      `${PLANS_BASE}/${planId}/gateway-mappings`,
    ),
  )
}

export async function createPlanGatewayMapping(planId: number, payload: CreateMappingRequest) {
  return callAdminApi(() =>
    http.post<AdminApiResponse<PlanGatewayMapping>>(
      apiConfig.dotnetApiBase,
      `${PLANS_BASE}/${planId}/gateway-mappings`,
      payload,
    ),
  )
}

export async function updatePlanGatewayMapping(
  planId: number,
  mappingId: number,
  payload: UpdateMappingRequest,
) {
  return callAdminApi(() =>
    http.put<AdminApiResponse<PlanGatewayMapping>>(
      apiConfig.dotnetApiBase,
      `${PLANS_BASE}/${planId}/gateway-mappings/${mappingId}`,
      payload,
    ),
  )
}

export async function deletePlanGatewayMapping(planId: number, mappingId: number) {
  return callAdminApi(() =>
    http.delete<AdminApiResponse<{ id: number }>>(
      apiConfig.dotnetApiBase,
      `${PLANS_BASE}/${planId}/gateway-mappings/${mappingId}`,
    ),
  )
}

export async function getPlanQuota(planId: number) {
  return callAdminApi(() =>
    http.get<AdminApiResponse<PlanQuota>>(
      apiConfig.dotnetApiBase,
      `${PLANS_BASE}/${planId}/quotas`,
    ),
  )
}

export async function upsertPlanQuota(planId: number, payload: UpsertQuotaRequest) {
  return callAdminApi(() =>
    http.put<AdminApiResponse<{ id: number }>>(
      apiConfig.dotnetApiBase,
      `${PLANS_BASE}/${planId}/quotas`,
      payload,
    ),
  )
}

export async function getGatewayPlans(gatewayCode: string) {
  return callAdminApi(() =>
    http.get<AdminApiResponse<GatewayPlan[]>>(
      apiConfig.dotnetApiBase,
      `v1/subscription/gateways/${encodeURIComponent(gatewayCode)}/plans`,
    ),
  )
}

export async function createGatewayPlan(gatewayCode: string, payload: CreateGatewayPlanRequest) {
  return callAdminApi(() =>
    http.post<AdminApiResponse<GatewayPlan>>(
      apiConfig.dotnetApiBase,
      `v1/subscription/gateways/${encodeURIComponent(gatewayCode)}/plans`,
      payload,
    ),
  )
}
