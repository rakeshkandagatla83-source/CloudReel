import type { BillingCycle } from './subscriptionAdmin'

export interface PublicPlan {
  planId: number
  planCode: string
  planName: string
  description: string | null
  billingCycle: BillingCycle
  mappingId: number
  gatewayId: number
  gatewayCode: string
  gatewayName: string
  externalPlanId: string
  amount: number
  countryCode: string
  currencyCode: string
  meetingHours: number | null
  platforms: number | null
  publishingHours: number | null
  uploads: number | null
}

export interface SubscriptionApiResponse<T> {
  code: number
  Message: string
  id?: number
  subscriptionId?: number
  data?: T
}

export interface CheckoutRequest {
  subscriptionPlanId: number
  mappingId: number
  redirectUrl: string
}

export interface ChangePlanRequest {
  subscriptionPlanId: number
  mappingId: number
  changeAtCycleEnd: boolean
}

export interface PlanGroup {
  planId: number
  planCode: string
  planName: string
  description: string | null
  billingCycle: PublicPlan['billingCycle']
  meetingHours: number | null
  platforms: number | null
  publishingHours: number | null
  uploads: number | null
  gateways: PublicPlan[]
}

export interface CheckoutSession {
  gatewayTransactionId: string
  redirectUrl?: string | null
  checkoutData?: Record<string, unknown> | null
}

export interface CurrentSubscription {
  id: number
  userId: number
  status: 'pending' | 'trialing' | 'active' | 'cancelled' | 'expired' | 'failed'
  subscriptionPlanId: number
  planCode: string
  planName: string
  description: string | null
  billingCycle: BillingCycle
  gatewayId: number | null
  externalSubscriptionId: string | null
  amount: number | null
  currencyCode: string | null
  currentPeriodStartedAt: number
  currentPeriodEndsAt: number
  cancelledAt: number | null
  createdAt: number
  updatedAt: number | null
  meetingHours: number | null
  platforms: number | null
  publishingHours: number | null
  uploads: number | null
}
