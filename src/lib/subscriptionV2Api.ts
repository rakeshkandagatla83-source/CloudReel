import axios from 'axios'
import { http } from './http'
import { apiConfig } from './apiConfig'
import type {
  ChangePlanRequest,
  CheckoutRequest,
  CheckoutSession,
  CurrentSubscription,
  PublicPlan,
  SubscriptionApiResponse,
} from '../types/subscriptionV2'

const SUBSCRIPTION_BASE = 'v1/subscription'

async function callApi<T>(fn: () => Promise<SubscriptionApiResponse<T>>): Promise<SubscriptionApiResponse<T>> {
  try {
    return await fn()
  } catch (err) {
    if (axios.isAxiosError(err) && err.response?.data && typeof err.response.data === 'object') {
      const body = err.response.data as Partial<SubscriptionApiResponse<T>>
      if (typeof body.code === 'number') {
        return {
          code: body.code,
          Message: body.Message ?? 'Request failed',
          id: body.id,
          subscriptionId: body.subscriptionId,
          data: body.data,
        }
      }
    }
    throw err
  }
}

export async function getPublicPlans(country: string, currency: string) {
  const params = new URLSearchParams({ country, currency })
  return callApi(() =>
    http.get<SubscriptionApiResponse<PublicPlan[]>>(
      apiConfig.dotnetApiBase,
      `${SUBSCRIPTION_BASE}/plans/public?${params.toString()}`,
    ),
  )
}

export async function postCheckout(payload: CheckoutRequest) {
  return callApi(() =>
    http.post<SubscriptionApiResponse<CheckoutSession>>(
      apiConfig.dotnetApiBase,
      `${SUBSCRIPTION_BASE}/checkout`,
      payload,
    ),
  )
}

export async function getMySubscription() {
  return callApi(() =>
    http.get<SubscriptionApiResponse<CurrentSubscription>>(
      apiConfig.dotnetApiBase,
      `${SUBSCRIPTION_BASE}/me`,
    ),
  )
}

export async function cancelMySubscription(cancelAtCycleEnd: boolean) {
  const params = new URLSearchParams({ cancelAtCycleEnd: String(cancelAtCycleEnd) })
  return callApi(() =>
    http.post<SubscriptionApiResponse<unknown>>(
      apiConfig.dotnetApiBase,
      `${SUBSCRIPTION_BASE}/cancel?${params.toString()}`,
      null,
    ),
  )
}

export async function changeMyPlan(payload: ChangePlanRequest) {
  return callApi(() =>
    http.post<SubscriptionApiResponse<unknown>>(
      apiConfig.dotnetApiBase,
      `${SUBSCRIPTION_BASE}/update-plan`,
      payload,
    ),
  )
}
