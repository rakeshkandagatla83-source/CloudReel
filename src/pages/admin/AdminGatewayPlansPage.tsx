import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import * as RadixDialog from '@radix-ui/react-dialog'
import {
  AlertCircle,
  ArrowLeft,
  Check,
  Copy,
  Layers,
  Loader2,
  Plus,
  RotateCcw,
  Save,
  X,
} from 'lucide-react'
import { cn } from '../../lib/utils'
import { epochToLocalDate } from '../../lib/dateUtils'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { Toaster } from '../../components/ui/Toast'
import { useCreateGatewayPlan, useGatewayPlans } from '../../features/admin/plans/useGatewayPlans'
import type { CreateGatewayPlanRequest, GatewayPlanPeriod } from '../../types/subscriptionAdmin'

interface ToastState {
  open: boolean
  title: string
  description?: string
  variant: 'error' | 'success' | 'warning'
}

interface CreateFormState {
  name: string
  amount: string
  currency: string
  period: GatewayPlanPeriod
  interval: string
  description: string
}

const INITIAL_CREATE_FORM: CreateFormState = {
  name: '',
  amount: '',
  currency: '',
  period: 'monthly',
  interval: '1',
  description: '',
}

const PERIODS: GatewayPlanPeriod[] = ['daily', 'weekly', 'monthly', 'quarterly', 'yearly']

function formatPlanAmount(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: amount % 1 === 0 ? 0 : 2,
      maximumFractionDigits: 2,
    }).format(amount)
  } catch {
    return `${amount.toFixed(2)} ${currency}`
  }
}

export function AdminGatewayPlansPage() {
  const navigate = useNavigate()
  const { code } = useParams<{ code: string }>()
  const gatewayCode = code ?? null

  const { plans, isLoading, error, supported, refetch } = useGatewayPlans(gatewayCode)
  const { createPlan, isSubmitting } = useCreateGatewayPlan()

  const [createOpen, setCreateOpen] = useState(false)
  const [createForm, setCreateForm] = useState<CreateFormState>(INITIAL_CREATE_FORM)
  const [createValidation, setCreateValidation] = useState<string | null>(null)
  const [confirmCreate, setConfirmCreate] = useState(false)
  const [toast, setToast] = useState<ToastState>({ open: false, title: '', variant: 'success' })
  const [copiedId, setCopiedId] = useState<string | null>(null)

  useEffect(() => {
    if (createOpen) {
      setCreateForm(INITIAL_CREATE_FORM)
      setCreateValidation(null)
    }
  }, [createOpen])

  const sortedPlans = useMemo(
    () => [...plans].sort((a, b) => b.createdAt - a.createdAt),
    [plans],
  )

  const handleCopy = async (planId: string) => {
    try {
      await navigator.clipboard.writeText(planId)
      setCopiedId(planId)
      setTimeout(() => setCopiedId(null), 1500)
    } catch {
      setToast({ open: true, title: 'Copy failed', variant: 'error' })
    }
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

  const handleCreateClick = () => {
    const err = validateCreate()
    setCreateValidation(err)
    if (err) return
    setConfirmCreate(true)
  }

  const handleCreateConfirm = async () => {
    if (!gatewayCode) return
    setConfirmCreate(false)
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
      setCreateOpen(false)
      setToast({
        open: true,
        title: 'Plan created',
        description: `${newPlan.name} (${newPlan.externalPlanId})`,
        variant: 'success',
      })
      await refetch()
    } catch (err) {
      setToast({
        open: true,
        title: 'Failed to create plan',
        description: err instanceof Error ? err.message : undefined,
        variant: 'error',
      })
    }
  }

  if (!gatewayCode) {
    return (
      <div id="admin-gateway-plans-page" className="flex h-full items-center justify-center px-6">
        <div className="rounded-xl border border-red-500/20 bg-[#1a0a0b] px-4 py-3 text-sm text-red-300">
          Missing gateway code in URL.
        </div>
      </div>
    )
  }

  return (
    <div id="admin-gateway-plans-page" className="flex h-full flex-col">
      <div
        id="admin-gateway-plans-header"
        className="flex items-center justify-between border-b border-white/6 px-6 py-4 shrink-0"
      >
        <div className="flex items-center gap-3">
          <button
            id="admin-gateway-plans-btn-back"
            type="button"
            onClick={() => navigate('/admin/gateways')}
            className="flex items-center gap-1.5 text-xs text-white/55 hover:text-white px-2.5 py-1.5 rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
          >
            <ArrowLeft size={14} />
            <span>Back</span>
          </button>
          <div className="h-6 w-px bg-white/10" />
          <div>
            <h1 id="admin-gateway-plans-title" className="text-lg font-semibold">
              {gatewayCode} Plans
            </h1>
            <p className="text-xs text-white/45 mt-0.5">
              Plans defined on the {gatewayCode} side. Use these IDs when configuring mappings.
            </p>
          </div>
        </div>
        {supported && (
          <button
            id="admin-gateway-plans-btn-new"
            type="button"
            onClick={() => setCreateOpen(true)}
            className="flex items-center gap-1.5 rounded-lg bg-[#3031cb] hover:bg-[#2626a8] px-3.5 py-2 text-xs font-semibold text-white cursor-pointer transition-colors"
          >
            <Plus size={14} />
            New Plan
          </button>
        )}
      </div>

      <div id="admin-gateway-plans-content" className="flex-1 overflow-y-auto px-6 py-6">
        {!supported && (
          <div
            id="admin-gateway-plans-unsupported"
            className="mx-auto max-w-xl flex flex-col items-center rounded-xl border border-white/10 bg-surface px-6 py-12 text-center"
          >
            <Layers size={28} className="text-white/35" />
            <div className="mt-3 text-sm font-medium text-white/85">Plan management not supported</div>
            <div className="mt-1 text-xs text-white/45 max-w-md">
              <span className="font-mono">{gatewayCode}</span> doesn't expose a plan API. Plans for this gateway are
              managed directly in the provider's dashboard, then referenced by ID in your mappings.
            </div>
            <Link
              to="/admin/gateways"
              className="mt-4 text-xs text-white/55 hover:text-white underline cursor-pointer"
            >
              Back to gateways
            </Link>
          </div>
        )}

        {supported && isLoading && (
          <div id="admin-gateway-plans-loading" className="flex items-center justify-center py-20 text-white/45 text-sm">
            <Loader2 size={16} className="animate-spin mr-2" />
            Loading plans...
          </div>
        )}

        {supported && !isLoading && error && (
          <div
            id="admin-gateway-plans-error"
            className="mx-auto max-w-lg flex items-start gap-3 rounded-xl border border-red-500/20 bg-[#1a0a0b] px-4 py-3 text-sm text-red-300"
          >
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            <div className="flex-1">
              <div className="font-medium">Failed to load plans</div>
              <div className="text-xs text-red-300/70 mt-0.5">{error}</div>
              <button
                id="admin-gateway-plans-btn-retry"
                type="button"
                onClick={refetch}
                className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-red-200 hover:text-red-100 underline cursor-pointer"
              >
                <RotateCcw size={11} /> Try again
              </button>
            </div>
          </div>
        )}

        {supported && !isLoading && !error && sortedPlans.length === 0 && (
          <div
            id="admin-gateway-plans-empty"
            className="mx-auto max-w-md flex flex-col items-center rounded-xl border border-dashed border-white/10 px-6 py-12 text-center"
          >
            <Layers size={28} className="text-white/35" />
            <div className="mt-3 text-sm text-white/55">No plans yet on {gatewayCode}</div>
            <div className="mt-1 text-xs text-white/35">
              Create a plan here, then reference it in your gateway mappings.
            </div>
            <button
              id="admin-gateway-plans-empty-btn-new"
              type="button"
              onClick={() => setCreateOpen(true)}
              className="mt-4 flex items-center gap-1.5 rounded-lg bg-[#3031cb] hover:bg-[#2626a8] px-3.5 py-2 text-xs font-semibold text-white cursor-pointer transition-colors"
            >
              <Plus size={14} />
              New Plan
            </button>
          </div>
        )}

        {supported && !isLoading && !error && sortedPlans.length > 0 && (
          <div
            id="admin-gateway-plans-table-wrap"
            className="overflow-x-auto rounded-xl border border-white/6 bg-surface"
          >
            <table id="admin-gateway-plans-table" className="w-full text-sm">
              <thead id="admin-gateway-plans-table-head" className="bg-white/3">
                <tr className="text-left text-xs uppercase tracking-wide text-white/45">
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Plan ID</th>
                  <th className="px-4 py-3 font-medium">Amount</th>
                  <th className="px-4 py-3 font-medium">Period</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Created</th>
                </tr>
              </thead>
              <tbody id="admin-gateway-plans-table-body" className="divide-y divide-white/6">
                {sortedPlans.map(plan => {
                  const isCopied = copiedId === plan.externalPlanId
                  return (
                    <tr
                      key={plan.externalPlanId}
                      id={`admin-gateway-plans-row-${plan.externalPlanId}`}
                      className="hover:bg-white/3 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="font-medium text-white/90">{plan.name}</div>
                        {plan.description && (
                          <div className="text-xs text-white/45 mt-0.5 line-clamp-1">{plan.description}</div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          id={`admin-gateway-plans-btn-copy-${plan.externalPlanId}`}
                          type="button"
                          onClick={() => handleCopy(plan.externalPlanId)}
                          title="Copy plan ID"
                          className={cn(
                            'group/copy inline-flex items-center gap-1.5 rounded-md border px-2 py-1 font-mono text-xs transition-colors cursor-pointer',
                            isCopied
                              ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                              : 'border-white/8 bg-white/3 text-white/70 hover:bg-white/8 hover:text-white',
                          )}
                        >
                          {isCopied ? <Check size={11} strokeWidth={2.5} /> : <Copy size={11} />}
                          <span className="truncate max-w-50">{plan.externalPlanId}</span>
                        </button>
                      </td>
                      <td className="px-4 py-3 text-white/85 font-medium">
                        {formatPlanAmount(plan.amount, plan.currency)}
                      </td>
                      <td className="px-4 py-3 text-white/70 text-xs capitalize">
                        {plan.interval > 1 ? `every ${plan.interval} ` : ''}
                        {plan.period}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium',
                            plan.isActive
                              ? 'bg-emerald-500/12 text-emerald-300'
                              : 'bg-white/5 text-white/55',
                          )}
                        >
                          <span
                            className={cn(
                              'h-1.5 w-1.5 rounded-full',
                              plan.isActive ? 'bg-emerald-400' : 'bg-white/40',
                            )}
                          />
                          {plan.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-white/55 text-xs">{epochToLocalDate(plan.createdAt)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <RadixDialog.Root open={createOpen} onOpenChange={open => !isSubmitting && setCreateOpen(open)}>
        <RadixDialog.Portal>
          <RadixDialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
          <RadixDialog.Content
            id="admin-gateway-plans-create-modal"
            onInteractOutside={e => e.preventDefault()}
            className={cn(
              'fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2',
              'bg-secondary-bg border border-white/8 rounded-xl shadow-2xl',
              'data-[state=open]:animate-in data-[state=closed]:animate-out',
              'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
              'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
              'duration-200',
            )}
          >
            <div className="flex items-center justify-between border-b border-white/6 px-5 py-3.5">
              <RadixDialog.Title className="text-sm font-semibold">
                New Plan on {gatewayCode}
              </RadixDialog.Title>
              <RadixDialog.Close asChild>
                <button
                  id="admin-gateway-plans-create-modal-close"
                  type="button"
                  disabled={isSubmitting}
                  className={cn(
                    'p-1 rounded-md text-white/55 hover:bg-white/8 hover:text-white transition-colors',
                    isSubmitting ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer',
                  )}
                >
                  <X size={14} />
                </button>
              </RadixDialog.Close>
            </div>

            <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
              {createValidation && (
                <div className="flex items-center gap-2 rounded-lg border border-amber-500/20 bg-[#1a140a] px-3 py-2 text-xs text-amber-300">
                  <AlertCircle size={14} />
                  <span>{createValidation}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-white/70 mb-1.5">
                  Plan Name <span className="text-[#3031cb]">*</span>
                </label>
                <input
                  id="admin-gateway-plans-create-input-name"
                  type="text"
                  value={createForm.name}
                  onChange={e => setCreateForm(prev => ({ ...prev, name: e.target.value }))}
                  maxLength={64}
                  placeholder="e.g. Pro Monthly"
                  className="w-full rounded-lg border border-white/10 bg-surface px-3 py-2 text-sm text-white placeholder-white/30 focus:border-[#3031cb] focus:outline-hidden transition-colors"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-white/70 mb-1.5">
                    Amount <span className="text-[#3031cb]">*</span>
                  </label>
                  <input
                    id="admin-gateway-plans-create-input-amount"
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={createForm.amount}
                    onChange={e => setCreateForm(prev => ({ ...prev, amount: e.target.value }))}
                    placeholder="499.00"
                    className="w-full rounded-lg border border-white/10 bg-surface px-3 py-2 text-sm text-white placeholder-white/30 focus:border-[#3031cb] focus:outline-hidden transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-white/70 mb-1.5">
                    Currency <span className="text-[#3031cb]">*</span>
                  </label>
                  <input
                    id="admin-gateway-plans-create-input-currency"
                    type="text"
                    value={createForm.currency}
                    onChange={e =>
                      setCreateForm(prev => ({ ...prev, currency: e.target.value.toUpperCase().slice(0, 5) }))
                    }
                    placeholder="INR"
                    maxLength={5}
                    className="w-full rounded-lg border border-white/10 bg-surface px-3 py-2 text-sm font-mono text-white placeholder-white/30 focus:border-[#3031cb] focus:outline-hidden transition-colors"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-white/70 mb-1.5">
                    Period <span className="text-[#3031cb]">*</span>
                  </label>
                  <select
                    id="admin-gateway-plans-create-input-period"
                    value={createForm.period}
                    onChange={e =>
                      setCreateForm(prev => ({ ...prev, period: e.target.value as GatewayPlanPeriod }))
                    }
                    className="w-full rounded-lg border border-white/10 bg-surface px-3 py-2 text-sm text-white focus:border-[#3031cb] focus:outline-hidden cursor-pointer transition-colors capitalize"
                  >
                    {PERIODS.map(p => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-white/70 mb-1.5">
                    Interval <span className="text-[#3031cb]">*</span>
                  </label>
                  <input
                    id="admin-gateway-plans-create-input-interval"
                    type="number"
                    min="1"
                    step="1"
                    value={createForm.interval}
                    onChange={e => setCreateForm(prev => ({ ...prev, interval: e.target.value }))}
                    placeholder="1"
                    className="w-full rounded-lg border border-white/10 bg-surface px-3 py-2 text-sm text-white placeholder-white/30 focus:border-[#3031cb] focus:outline-hidden transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-white/70 mb-1.5">Description</label>
                <textarea
                  id="admin-gateway-plans-create-input-description"
                  value={createForm.description}
                  onChange={e => setCreateForm(prev => ({ ...prev, description: e.target.value }))}
                  maxLength={250}
                  rows={2}
                  placeholder="Optional description"
                  className="w-full rounded-lg border border-white/10 bg-surface px-3 py-2 text-sm text-white placeholder-white/30 focus:border-[#3031cb] focus:outline-hidden transition-colors resize-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-white/6 px-5 py-3">
              <RadixDialog.Close asChild>
                <button
                  id="admin-gateway-plans-create-modal-cancel"
                  type="button"
                  disabled={isSubmitting}
                  className={cn(
                    'px-3.5 py-1.5 text-xs text-white/55 border border-white/10 rounded-lg hover:bg-white/5 transition-colors',
                    isSubmitting ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
                  )}
                >
                  Cancel
                </button>
              </RadixDialog.Close>
              <button
                id="admin-gateway-plans-create-modal-save"
                type="button"
                onClick={handleCreateClick}
                disabled={isSubmitting}
                className={cn(
                  'flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-semibold text-white transition-colors',
                  isSubmitting
                    ? 'bg-[#3031cb]/50 cursor-not-allowed'
                    : 'bg-[#3031cb] hover:bg-[#2626a8] cursor-pointer',
                )}
              >
                {isSubmitting ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                Create plan
              </button>
            </div>
          </RadixDialog.Content>
        </RadixDialog.Portal>
      </RadixDialog.Root>

      <ConfirmDialog
        open={confirmCreate}
        onOpenChange={setConfirmCreate}
        title={`Create new plan on ${gatewayCode}?`}
        description={`"${createForm.name.trim()}" will be created on ${gatewayCode}. The plan can be referenced in mappings after creation.`}
        confirmLabel="Create"
        onConfirm={handleCreateConfirm}
      />

      <Toaster
        id="admin-gateway-plans-toast"
        open={toast.open}
        onOpenChange={open => setToast(prev => ({ ...prev, open }))}
        title={toast.title}
        description={toast.description}
        variant={toast.variant}
      />
    </div>
  )
}
