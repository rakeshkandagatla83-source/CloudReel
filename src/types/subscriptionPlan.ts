export interface PlanCurrency {
  currency: string
  price_segment_id: null
  setup_fee: number
  tax_inclusive: null
  unit_amount: number
}

export interface Plan {
  id: string
  code: string
  name: string
  description: string
  state: 'active' | 'inactive'
  currencies: PlanCurrency[]
  interval_length: number
  interval_unit: string
  auto_renew: boolean
  trial_length: number
  trial_unit: string
}

export interface SubscriptionPlansResponse {
  code: number
  Message: string
  id: number
  data: Plan[]
}

// ── Subscription / Invoice ─────────────────────────────────────────────────────

export interface SubscriptionPlanRef {
  code: string
  name: string
}

export interface Subscription {
  id: string
  state: 'active' | 'trial' | 'canceled' | string
  plan: SubscriptionPlanRef
  current_term_started_at: string
  current_term_ends_at: string
  current_period_ends_at: string
  trial_ends_at: string | null
  trial_requires_billing_info: boolean
  expires_at?: string
}

export interface SubscriptionInvoice {
  subscription: Subscription
  invoiceNumber: string
}

export interface SubscriptionResponse {
  code: number
  Message: string
  data: SubscriptionInvoice[]
}

// ── Recurly account ────────────────────────────────────────────────────────────

export interface RecurlyAccount {
  first_name: string
  last_name: string
  email: string
}

export interface RecurlyAccountResponse {
  code: number
  Message: string
  data: RecurlyAccount
}
