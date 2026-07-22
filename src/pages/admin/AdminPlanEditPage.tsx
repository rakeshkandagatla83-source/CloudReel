import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Loader2, Save, AlertCircle, X, Lock } from 'lucide-react'
import { cn } from '../../lib/utils'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { Toaster } from '../../components/ui/Toast'
import { usePlan, usePlanMutations } from '../../features/admin/plans/usePlans'
import { PlanPricingTab } from '../../features/admin/plans/PlanPricingTab'
import { PlanQuotasTab } from '../../features/admin/plans/PlanQuotasTab'
import type { BillingCycle, CreatePlanRequest, UpdatePlanRequest } from '../../types/subscriptionAdmin'

type TabId = 'basic' | 'pricing' | 'quotas'

interface FormState {
  planCode: string
  planName: string
  description: string
  billingCycle: BillingCycle
  isActive: boolean
}

const INITIAL_FORM: FormState = {
  planCode: '',
  planName: '',
  description: '',
  billingCycle: 'MONTHLY',
  isActive: true,
}

interface ToastState {
  open: boolean
  title: string
  description?: string
  variant: 'error' | 'success' | 'warning'
}

export function AdminPlanEditPage() {
  const navigate = useNavigate()
  const params = useParams<{ id?: string }>()
  const planId = params.id && params.id !== 'new' ? Number(params.id) : null
  const isCreate = planId === null

  const { plan, isLoading: isPlanLoading, error: planError } = usePlan(planId)
  const { createPlan, updatePlan, isSubmitting } = usePlanMutations()

  const [activeTab, setActiveTab] = useState<TabId>('basic')
  const [form, setForm] = useState<FormState>(INITIAL_FORM)
  const [validationError, setValidationError] = useState<string | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [toast, setToast] = useState<ToastState>({ open: false, title: '', variant: 'success' })

  useEffect(() => {
    if (plan) {
      setForm({
        planCode: plan.planCode,
        planName: plan.planName,
        description: plan.description ?? '',
        billingCycle: plan.billingCycle,
        isActive: plan.isActive,
      })
    }
  }, [plan])

  const tabs = useMemo(
    () => [
      { id: 'basic' as TabId, label: 'Basic Details', enabled: true },
      { id: 'pricing' as TabId, label: 'Gateway Pricing', enabled: !isCreate },
      { id: 'quotas' as TabId, label: 'Quotas', enabled: !isCreate },
    ],
    [isCreate],
  )

  const validate = (): string | null => {
    if (!form.planName.trim()) return 'Plan Name is required'
    if (isCreate && !form.planCode.trim()) return 'Plan Code is required'
    if (!form.billingCycle) return 'Billing Cycle is required'
    return null
  }

  const handleSaveClick = () => {
    const err = validate()
    setValidationError(err)
    if (err) return
    setConfirmOpen(true)
  }

  const handleSaveConfirm = async () => {
    setConfirmOpen(false)
    const trimmedDescription = form.description.trim()
    if (isCreate) {
      const payload: CreatePlanRequest = {
        planCode: form.planCode.trim(),
        planName: form.planName.trim(),
        description: trimmedDescription || null,
        billingCycle: form.billingCycle,
        isActive: form.isActive,
      }
      try {
        const created = await createPlan(payload)
        setToast({ open: true, title: 'Plan created', description: form.planName.trim(), variant: 'success' })
        navigate(`/admin/plans/${created.id}`, { replace: true })
      } catch (err) {
        setToast({
          open: true,
          title: 'Failed to create plan',
          description: err instanceof Error ? err.message : undefined,
          variant: 'error',
        })
      }
      return
    }

    if (planId === null) return
    const payload: UpdatePlanRequest = {
      planName: form.planName.trim(),
      description: trimmedDescription || null,
      billingCycle: form.billingCycle,
      isActive: form.isActive,
    }
    try {
      await updatePlan(planId, payload)
      setToast({ open: true, title: 'Plan updated', description: form.planName.trim(), variant: 'success' })
    } catch (err) {
      setToast({
        open: true,
        title: 'Failed to update plan',
        description: err instanceof Error ? err.message : undefined,
        variant: 'error',
      })
    }
  }

  return (
    <div id="admin-plan-edit-page" className="flex h-full flex-col">
      <div
        id="admin-plan-edit-header"
        className="flex items-center justify-between border-b border-white/6 px-6 py-4 shrink-0"
      >
        <div className="flex items-center gap-3">
          <button
            id="admin-plan-edit-btn-back"
            type="button"
            onClick={() => navigate('/admin/plans')}
            className="flex items-center gap-1.5 text-xs text-white/55 hover:text-white px-2.5 py-1.5 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
          >
            <ArrowLeft size={14} />
            <span>Back</span>
          </button>
          <div className="h-6 w-px bg-white/10" />
          <div>
            <h1 id="admin-plan-edit-title" className="text-lg font-semibold">
              {isCreate ? 'New Plan' : plan?.planName ?? 'Edit Plan'}
            </h1>
            {!isCreate && plan && (
              <div id="admin-plan-edit-subtitle" className="text-xs text-white/45 mt-0.5 font-mono">
                {plan.planCode}
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            id="admin-plan-edit-btn-cancel"
            type="button"
            onClick={() => navigate('/admin/plans')}
            className="px-3.5 py-2 text-xs text-white/55 border border-white/10 rounded-lg hover:bg-white/5 cursor-pointer transition-colors"
          >
            Cancel
          </button>
          <button
            id="admin-plan-edit-btn-save"
            type="button"
            onClick={handleSaveClick}
            disabled={isSubmitting || (planId !== null && isPlanLoading)}
            className={cn(
              'flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold text-white transition-colors',
              isSubmitting || (planId !== null && isPlanLoading)
                ? 'bg-[#3031cb]/50 cursor-not-allowed'
                : 'bg-[#3031cb] hover:bg-[#2626a8] cursor-pointer',
            )}
          >
            {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            {isCreate ? 'Create Plan' : 'Save Changes'}
          </button>
        </div>
      </div>

      <div
        id="admin-plan-edit-tabs"
        className="flex items-center gap-1 border-b border-white/6 px-6 shrink-0 bg-[#080e1a]"
      >
        {tabs.map(tab => (
          <button
            key={tab.id}
            id={`admin-plan-edit-tab-${tab.id}`}
            type="button"
            onClick={() => tab.enabled && setActiveTab(tab.id)}
            disabled={!tab.enabled}
            title={!tab.enabled ? 'Save the plan first to configure this tab' : undefined}
            className={cn(
              'relative px-4 py-3 text-xs font-medium transition-colors',
              !tab.enabled && 'opacity-40 cursor-not-allowed',
              tab.enabled && 'cursor-pointer',
              activeTab === tab.id
                ? 'text-white'
                : tab.enabled
                  ? 'text-white/55 hover:text-white/85'
                  : 'text-white/55',
            )}
          >
            {tab.label}
            {activeTab === tab.id && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#3031cb]" />
            )}
          </button>
        ))}
      </div>

      <div id="admin-plan-edit-content" className="flex-1 overflow-y-auto px-6 py-6">
        {planId !== null && isPlanLoading && (
          <div id="admin-plan-edit-loading" className="flex items-center justify-center py-20 text-white/45 text-sm">
            <Loader2 size={16} className="animate-spin mr-2" />
            Loading plan...
          </div>
        )}

        {planId !== null && !isPlanLoading && planError && (
          <div
            id="admin-plan-edit-error"
            className="flex items-start gap-3 rounded-xl border border-red-500/20 bg-[#1a0a0b] px-4 py-3 text-sm text-red-300"
          >
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            <div>
              <div className="font-medium">Failed to load plan</div>
              <div className="text-xs text-red-300/70 mt-0.5">{planError}</div>
            </div>
          </div>
        )}

        {(planId === null || (!isPlanLoading && !planError)) && activeTab === 'basic' && (
          <div id="admin-plan-edit-basic" className="max-w-2xl">
            {validationError && (
              <div
                id="admin-plan-edit-validation"
                className="mb-4 flex items-center justify-between gap-3 rounded-lg border border-amber-500/20 bg-[#1a140a] px-3 py-2 text-xs text-amber-300"
              >
                <div className="flex items-center gap-2">
                  <AlertCircle size={14} />
                  <span>{validationError}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setValidationError(null)}
                  className="text-amber-300/70 hover:text-amber-300 cursor-pointer"
                >
                  <X size={14} />
                </button>
              </div>
            )}

            <div id="admin-plan-edit-form" className="space-y-5">
              <div id="admin-plan-edit-field-planName">
                <label htmlFor="admin-plan-edit-input-planName" className="block text-xs font-medium text-white/70 mb-1.5">
                  Plan Name <span className="text-[#3031cb]">*</span>
                </label>
                <input
                  id="admin-plan-edit-input-planName"
                  type="text"
                  value={form.planName}
                  onChange={e => setForm(prev => ({ ...prev, planName: e.target.value }))}
                  maxLength={50}
                  placeholder="e.g. Professional Monthly"
                  className="w-full rounded-lg border border-white/10 bg-surface px-3 py-2 text-sm text-white placeholder-white/30 focus:border-[#3031cb] focus:outline-hidden transition-colors"
                />
              </div>

              <div id="admin-plan-edit-field-planCode">
                <label
                  htmlFor="admin-plan-edit-input-planCode"
                  className="flex items-center gap-1.5 text-xs font-medium text-white/70 mb-1.5"
                >
                  Plan Code {isCreate && <span className="text-[#3031cb]">*</span>}
                  {!isCreate && <Lock size={11} className="text-white/40" />}
                </label>
                <input
                  id="admin-plan-edit-input-planCode"
                  type="text"
                  value={form.planCode}
                  onChange={e =>
                    isCreate &&
                    setForm(prev => ({ ...prev, planCode: e.target.value.toUpperCase().replace(/\s+/g, '_') }))
                  }
                  maxLength={50}
                  readOnly={!isCreate}
                  placeholder="e.g. PRO_MONTHLY"
                  className={cn(
                    'w-full rounded-lg border px-3 py-2 text-sm font-mono transition-colors',
                    isCreate
                      ? 'border-white/10 bg-surface text-white placeholder-white/30 focus:border-[#3031cb] focus:outline-hidden'
                      : 'border-white/6 bg-white/3 text-white/55 cursor-not-allowed',
                  )}
                />
                {isCreate ? (
                  <p className="mt-1 text-xs text-white/35">
                    Uppercase identifier. Cannot be changed after creation.
                  </p>
                ) : (
                  <p className="mt-1 text-xs text-white/35">Plan Code is immutable once created.</p>
                )}
              </div>

              <div id="admin-plan-edit-field-description">
                <label
                  htmlFor="admin-plan-edit-input-description"
                  className="block text-xs font-medium text-white/70 mb-1.5"
                >
                  Description
                </label>
                <textarea
                  id="admin-plan-edit-input-description"
                  value={form.description}
                  onChange={e => setForm(prev => ({ ...prev, description: e.target.value }))}
                  maxLength={250}
                  rows={3}
                  placeholder="Short description shown to customers."
                  className="w-full rounded-lg border border-white/10 bg-surface px-3 py-2 text-sm text-white placeholder-white/30 focus:border-[#3031cb] focus:outline-hidden transition-colors resize-none"
                />
                <p className="mt-1 text-xs text-white/35">{form.description.length} / 250</p>
              </div>

              <div id="admin-plan-edit-field-billingCycle">
                <label className="block text-xs font-medium text-white/70 mb-1.5">
                  Billing Cycle <span className="text-[#3031cb]">*</span>
                </label>
                <div className="flex items-center gap-2">
                  {(['MONTHLY', 'YEARLY'] as BillingCycle[]).map(cycle => (
                    <button
                      key={cycle}
                      id={`admin-plan-edit-billingCycle-${cycle.toLowerCase()}`}
                      type="button"
                      onClick={() => setForm(prev => ({ ...prev, billingCycle: cycle }))}
                      className={cn(
                        'flex-1 rounded-lg border px-3 py-2 text-xs font-medium transition-colors cursor-pointer',
                        form.billingCycle === cycle
                          ? 'border-[#3031cb] bg-[#3031cb]/10 text-white'
                          : 'border-white/10 bg-surface text-white/55 hover:bg-white/5',
                      )}
                    >
                      {cycle.charAt(0) + cycle.slice(1).toLowerCase()}
                    </button>
                  ))}
                </div>
              </div>

              <div id="admin-plan-edit-field-isActive" className="flex items-center justify-between rounded-lg border border-white/10 bg-surface px-3 py-3">
                <div>
                  <div className="text-sm text-white/85">Active</div>
                  <div className="text-xs text-white/45 mt-0.5">
                    Inactive plans are hidden from new subscribers.
                  </div>
                </div>
                <button
                  id="admin-plan-edit-btn-toggleActive"
                  type="button"
                  role="switch"
                  aria-checked={form.isActive}
                  onClick={() => setForm(prev => ({ ...prev, isActive: !prev.isActive }))}
                  className={cn(
                    'relative h-5 w-9 shrink-0 rounded-full p-0 transition-colors cursor-pointer',
                    form.isActive ? 'bg-[#3031cb]' : 'bg-white/15',
                  )}
                >
                  <span
                    className={cn(
                      'absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all',
                      form.isActive ? 'left-4.5' : 'left-0.5',
                    )}
                  />
                </button>
              </div>
            </div>
          </div>
        )}

        {!isCreate && planId !== null && activeTab === 'pricing' && (
          <PlanPricingTab planId={planId} />
        )}

        {!isCreate && planId !== null && activeTab === 'quotas' && (
          <PlanQuotasTab planId={planId} />
        )}
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={isCreate ? 'Create plan?' : 'Save changes?'}
        description={
          isCreate
            ? `Plan "${form.planName.trim()}" will be created with code ${form.planCode.trim()}.`
            : `Changes to "${form.planName.trim()}" will be saved.`
        }
        confirmLabel={isCreate ? 'Create' : 'Save'}
        onConfirm={handleSaveConfirm}
      />

      <Toaster
        id="admin-plan-edit-toast"
        open={toast.open}
        onOpenChange={open => setToast(prev => ({ ...prev, open }))}
        title={toast.title}
        description={toast.description}
        variant={toast.variant}
      />
    </div>
  )
}
