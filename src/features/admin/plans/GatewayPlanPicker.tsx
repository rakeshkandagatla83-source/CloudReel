import { useEffect, useState } from 'react'
import { AlertCircle, Check, Loader2, Plus, RotateCcw, X } from 'lucide-react'
import { cn } from '../../../lib/utils'
import { useCreateGatewayPlan, useGatewayPlans } from './useGatewayPlans'
import type { CreateGatewayPlanRequest, GatewayPlan, GatewayPlanPeriod } from '../../../types/subscriptionAdmin'

const CREATE_OPTION_VALUE = '__create__'

const PERIODS: GatewayPlanPeriod[] = ['daily', 'weekly', 'monthly', 'quarterly', 'yearly']

interface GatewayPlanPickerProps {
  gatewayCode: string | null
  mode: 'create' | 'edit'
  externalPlanId: string
  formCurrency: string
  onExternalPlanIdChange: (value: string) => void
  onPlanSelected: (plan: GatewayPlan) => void
}

interface CreateFormState {
  name: string
  amount: string
  currency: string
  period: GatewayPlanPeriod
  interval: string
  description: string
}

export function GatewayPlanPicker({
  gatewayCode,
  mode,
  externalPlanId,
  formCurrency,
  onExternalPlanIdChange,
  onPlanSelected,
}: GatewayPlanPickerProps) {
  const { plans, isLoading, error, supported, refetch } = useGatewayPlans(
    mode === 'create' ? gatewayCode : null,
  )
  const { createPlan, isSubmitting } = useCreateGatewayPlan()

  const [showCreateForm, setShowCreateForm] = useState(false)
  const [createForm, setCreateForm] = useState<CreateFormState>({
    name: '',
    amount: '',
    currency: '',
    period: 'monthly',
    interval: '1',
    description: '',
  })
  const [createError, setCreateError] = useState<string | null>(null)

  useEffect(() => {
    if (showCreateForm) {
      setCreateForm(prev => ({
        ...prev,
        currency: formCurrency || prev.currency,
      }))
    }
  }, [showCreateForm, formCurrency])

  useEffect(() => {
    setShowCreateForm(false)
    setCreateError(null)
  }, [gatewayCode])

  if (mode === 'edit') {
    return (
      <div id="admin-mapping-modal-field-externalPlanId">
        <label
          htmlFor="admin-mapping-modal-input-externalPlanId"
          className="block text-xs font-medium text-white/70 mb-1.5"
        >
          External Plan ID
        </label>
        <input
          id="admin-mapping-modal-input-externalPlanId"
          type="text"
          value={externalPlanId}
          readOnly
          className="w-full rounded-lg border border-white/6 bg-white/3 px-3 py-2 text-sm font-mono text-white/55 cursor-not-allowed"
        />
        <p className="mt-1 text-xs text-white/35">External Plan ID cannot be changed.</p>
      </div>
    )
  }

  const shouldShowTextFallback = !gatewayCode || !supported

  if (shouldShowTextFallback) {
    return (
      <div id="admin-mapping-modal-field-externalPlanId">
        <label
          htmlFor="admin-mapping-modal-input-externalPlanId"
          className="block text-xs font-medium text-white/70 mb-1.5"
        >
          External Plan ID <span className="text-[#3031cb]">*</span>
        </label>
        <input
          id="admin-mapping-modal-input-externalPlanId"
          type="text"
          value={externalPlanId}
          onChange={e => onExternalPlanIdChange(e.target.value)}
          maxLength={50}
          placeholder={
            !gatewayCode
              ? 'Select a gateway first...'
              : 'e.g. plan_RZP_PRO_MONTHLY_INR'
          }
          disabled={!gatewayCode}
          className={cn(
            'w-full rounded-lg border px-3 py-2 text-sm font-mono transition-colors',
            !gatewayCode
              ? 'border-white/6 bg-white/3 text-white/35 cursor-not-allowed'
              : 'border-white/10 bg-surface text-white placeholder-white/30 focus:border-[#3031cb] focus:outline-hidden',
          )}
        />
        <p className="mt-1 text-xs text-white/35">
          {!gatewayCode
            ? 'Pick a gateway to enable plan selection.'
            : 'This gateway does not expose a plan API - enter the plan id manually from the provider dashboard.'}
        </p>
      </div>
    )
  }

  const validateCreate = (): string | null => {
    if (!createForm.name.trim()) return 'Plan name is required'
    const amt = Number(createForm.amount)
    if (!createForm.amount.trim() || Number.isNaN(amt) || amt <= 0) return 'Amount must be greater than 0'
    if (!createForm.currency.trim() || createForm.currency.trim().length !== 3) return 'Currency must be 3 letters'
    const interval = Number(createForm.interval)
    if (!Number.isInteger(interval) || interval < 1) return 'Interval must be a positive integer'
    return null
  }

  const handleCreate = async () => {
    if (!gatewayCode) return
    const err = validateCreate()
    setCreateError(err)
    if (err) return

    try {
      const payload: CreateGatewayPlanRequest = {
        name: createForm.name.trim(),
        amount: Number(createForm.amount),
        currency: createForm.currency.trim().toUpperCase(),
        period: createForm.period,
        interval: Number(createForm.interval),
        description: createForm.description.trim() || null,
      }
      const newPlan = await createPlan(gatewayCode, payload)
      setShowCreateForm(false)
      setCreateForm({
        name: '',
        amount: '',
        currency: '',
        period: 'monthly',
        interval: '1',
        description: '',
      })
      await refetch()
      onPlanSelected(newPlan)
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Failed to create plan')
    }
  }

  const handleDropdownChange = (value: string) => {
    if (value === CREATE_OPTION_VALUE) {
      setShowCreateForm(true)
      return
    }
    if (!value) {
      onExternalPlanIdChange('')
      return
    }
    const picked = plans.find(p => p.externalPlanId === value)
    if (picked) {
      onPlanSelected(picked)
    }
  }

  return (
    <div id="admin-mapping-modal-field-externalPlanId" className="space-y-2.5">
      <label
        htmlFor="admin-mapping-modal-input-externalPlanId"
        className="block text-xs font-medium text-white/70"
      >
        External Plan <span className="text-[#3031cb]">*</span>
      </label>

      <div className="relative">
        <select
          id="admin-mapping-modal-input-externalPlanId"
          value={externalPlanId}
          onChange={e => handleDropdownChange(e.target.value)}
          disabled={isLoading}
          className={cn(
            'w-full rounded-lg border border-white/10 bg-surface px-3 py-2 text-sm text-white focus:border-[#3031cb] focus:outline-hidden transition-colors',
            isLoading ? 'cursor-wait opacity-60' : 'cursor-pointer',
          )}
        >
          <option value="">{isLoading ? 'Loading plans...' : 'Select a plan...'}</option>
          {plans.map(p => (
            <option key={p.externalPlanId} value={p.externalPlanId}>
              {p.name} - {p.amount} {p.currency} / {p.period} ({p.externalPlanId})
            </option>
          ))}
          <option value={CREATE_OPTION_VALUE}>+ Create new plan on this gateway</option>
        </select>
        {isLoading && (
          <Loader2 size={14} className="absolute right-8 top-1/2 -translate-y-1/2 animate-spin text-white/45" />
        )}
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-500/20 bg-[#1a140a] px-3 py-2 text-xs text-amber-300">
          <AlertCircle size={13} className="mt-0.5 shrink-0" />
          <div className="flex-1">
            <div>Couldn't load existing plans. You can still create a new one.</div>
            <button
              id="admin-mapping-plan-picker-retry"
              type="button"
              onClick={refetch}
              className="mt-1 inline-flex items-center gap-1 text-[11px] text-amber-200 hover:text-amber-100 underline cursor-pointer"
            >
              <RotateCcw size={11} /> Retry
            </button>
          </div>
        </div>
      )}

      {externalPlanId && !showCreateForm && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-2 text-xs">
          <Check size={13} className="shrink-0 text-emerald-300" strokeWidth={2.5} />
          <span className="font-mono text-emerald-200 truncate">{externalPlanId}</span>
        </div>
      )}

      {showCreateForm && (
        <div
          id="admin-mapping-plan-picker-create-form"
          className="space-y-3 rounded-lg border border-white/10 bg-secondary-bg p-3.5"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-white/85">
              <Plus size={13} />
              New plan on this gateway
            </div>
            <button
              id="admin-mapping-plan-picker-create-close"
              type="button"
              onClick={() => {
                setShowCreateForm(false)
                setCreateError(null)
              }}
              disabled={isSubmitting}
              className={cn(
                'p-1 rounded-md text-white/55 hover:bg-white/8 hover:text-white transition-colors',
                isSubmitting ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
              )}
            >
              <X size={13} />
            </button>
          </div>

          {createError && (
            <div className="flex items-center gap-2 rounded-md border border-amber-500/20 bg-[#1a140a] px-2.5 py-1.5 text-xs text-amber-300">
              <AlertCircle size={12} />
              <span>{createError}</span>
            </div>
          )}

          <div className="space-y-2.5">
            <div id="admin-mapping-plan-picker-create-name">
              <label className="block text-[11px] font-medium text-white/65 mb-1">Name *</label>
              <input
                type="text"
                value={createForm.name}
                onChange={e => setCreateForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g. Pro Monthly"
                maxLength={64}
                className="w-full rounded-md border border-white/10 bg-surface px-2.5 py-1.5 text-xs text-white placeholder-white/30 focus:border-[#3031cb] focus:outline-hidden"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-medium text-white/65 mb-1">Amount *</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={createForm.amount}
                  onChange={e => setCreateForm(prev => ({ ...prev, amount: e.target.value }))}
                  placeholder="499.00"
                  className="w-full rounded-md border border-white/10 bg-surface px-2.5 py-1.5 text-xs text-white placeholder-white/30 focus:border-[#3031cb] focus:outline-hidden"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-white/65 mb-1">Currency *</label>
                <input
                  type="text"
                  value={createForm.currency}
                  onChange={e =>
                    setCreateForm(prev => ({ ...prev, currency: e.target.value.toUpperCase().slice(0, 5) }))
                  }
                  placeholder="INR"
                  maxLength={5}
                  className="w-full rounded-md border border-white/10 bg-surface px-2.5 py-1.5 text-xs font-mono text-white placeholder-white/30 focus:border-[#3031cb] focus:outline-hidden"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-medium text-white/65 mb-1">Period *</label>
                <select
                  value={createForm.period}
                  onChange={e => setCreateForm(prev => ({ ...prev, period: e.target.value as GatewayPlanPeriod }))}
                  className="w-full rounded-md border border-white/10 bg-surface px-2.5 py-1.5 text-xs text-white focus:border-[#3031cb] focus:outline-hidden cursor-pointer"
                >
                  {PERIODS.map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-medium text-white/65 mb-1">Interval *</label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={createForm.interval}
                  onChange={e => setCreateForm(prev => ({ ...prev, interval: e.target.value }))}
                  placeholder="1"
                  className="w-full rounded-md border border-white/10 bg-surface px-2.5 py-1.5 text-xs text-white placeholder-white/30 focus:border-[#3031cb] focus:outline-hidden"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-white/65 mb-1">Description</label>
              <input
                type="text"
                value={createForm.description}
                onChange={e => setCreateForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Optional description"
                maxLength={250}
                className="w-full rounded-md border border-white/10 bg-surface px-2.5 py-1.5 text-xs text-white placeholder-white/30 focus:border-[#3031cb] focus:outline-hidden"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              id="admin-mapping-plan-picker-create-cancel"
              type="button"
              onClick={() => {
                setShowCreateForm(false)
                setCreateError(null)
              }}
              disabled={isSubmitting}
              className={cn(
                'px-3 py-1.5 text-[11px] text-white/55 border border-white/10 rounded-md hover:bg-white/5 transition-colors',
                isSubmitting ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
              )}
            >
              Cancel
            </button>
            <button
              id="admin-mapping-plan-picker-create-submit"
              type="button"
              onClick={handleCreate}
              disabled={isSubmitting}
              className={cn(
                'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[11px] font-semibold text-white transition-colors',
                isSubmitting
                  ? 'bg-[#3031cb]/50 cursor-not-allowed'
                  : 'bg-[#3031cb] hover:bg-[#2626a8] cursor-pointer',
              )}
            >
              {isSubmitting ? <Loader2 size={11} className="animate-spin" /> : <Plus size={11} />}
              {isSubmitting ? 'Creating...' : 'Create plan'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
