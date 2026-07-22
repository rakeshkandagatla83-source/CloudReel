export type BillingCycle = 'MONTHLY' | 'YEARLY'

export interface SubscriptionPlan {
  id: number
  planCode: string
  planName: string
  description: string | null
  billingCycle: BillingCycle
  isActive: boolean
  createdAt: number
  createdBy: number
  updatedAt: number | null
  updatedBy: number | null
}

export interface CreatePlanRequest {
  planCode: string
  planName: string
  description?: string | null
  billingCycle: BillingCycle
  isActive: boolean
}

export interface UpdatePlanRequest {
  planName: string
  description?: string | null
  billingCycle: BillingCycle
  isActive: boolean
}

export interface ListPlansQuery {
  active?: boolean
  billingCycle?: BillingCycle
}

export interface AdminApiResponse<T> {
  code: number
  Message: string
  id?: number
  planId?: number
  data?: T
}

export interface SubscriptionGateway {
  id: number
  gatewayCode: string
  gatewayName: string
  isActive: boolean
  supportsSubscriptions: boolean
  allowedCountries: string | null
  createdAt: number
  createdBy: number
  updatedAt: number | null
  updatedBy: number | null
}

export interface CreateGatewayRequest {
  gatewayCode: string
  gatewayName: string
  isActive: boolean
  supportsSubscriptions: boolean
  allowedCountries: string | null
}

export interface UpdateGatewayRequest {
  gatewayName: string
  isActive: boolean
  supportsSubscriptions: boolean
  allowedCountries: string | null
}

export interface ListGatewaysQuery {
  active?: boolean
}

export interface PlanGatewayMapping {
  id: number
  subscriptionPlanId: number
  gatewayId: number
  externalPlanId: string
  amount: number
  countryCode: string
  currencyCode: string
  isActive: boolean
  createdAt: number
  updatedAt: number
  gatewayCode: string
  gatewayName: string
}

export interface CreateMappingRequest {
  gatewayId: number
  countryCode: string
  currencyCode: string
  amount: number
  externalPlanId: string
  isActive: boolean
}

export interface UpdateMappingRequest {
  amount: number
  externalPlanId: string
  isActive: boolean
}

export interface PlanQuota {
  id: number
  subscriptionPlanId: number
  meetingHours: number
  platforms: number
  publishingHours: number
  uploads: number
  createdAt: number
  createdBy: number
  updatedAt: number | null
  updatedBy: number | null
}

export interface UpsertQuotaRequest {
  meetingHours: number
  platforms: number
  publishingHours: number
  uploads: number
}

export type GatewayPlanPeriod = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly'

export interface GatewayPlan {
  externalPlanId: string
  gatewayCode: string
  name: string
  amount: number
  currency: string
  period: string
  interval: number
  description: string | null
  isActive: boolean
  createdAt: number
}

export interface CreateGatewayPlanRequest {
  name: string
  amount: number
  currency: string
  period: GatewayPlanPeriod
  interval: number
  description?: string | null
}
