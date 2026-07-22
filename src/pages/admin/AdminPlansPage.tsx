import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Pencil, Loader2, AlertCircle, Power, PowerOff } from 'lucide-react'
import { cn } from '../../lib/utils'
import { epochToLocalDate } from '../../lib/dateUtils'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { Toaster } from '../../components/ui/Toast'
import { usePlanMutations, usePlansList } from '../../features/admin/plans/usePlans'
import type { SubscriptionPlan } from '../../types/subscriptionAdmin'

interface ToastState {
  open: boolean
  title: string
  description?: string
  variant: 'error' | 'success' | 'warning'
}

interface ToggleState {
  plan: SubscriptionPlan | null
  open: boolean
}

export function AdminPlansPage() {
  const navigate = useNavigate()
  const { plans, isLoading, error, refetch } = usePlansList()
  const { togglePlanStatus, isSubmitting } = usePlanMutations()

  const [toggleState, setToggleState] = useState<ToggleState>({ plan: null, open: false })
  const [toast, setToast] = useState<ToastState>({ open: false, title: '', variant: 'success' })

  const showToast = (toastValue: Omit<ToastState, 'open'>) => {
    setToast({ ...toastValue, open: true })
  }

  const handleToggleConfirm = async () => {
    if (!toggleState.plan) return
    const nextActive = !toggleState.plan.isActive
    const planForToast = toggleState.plan
    setToggleState({ plan: null, open: false })
    try {
      await togglePlanStatus(planForToast.id, nextActive)
      showToast({
        title: nextActive ? 'Plan activated' : 'Plan deactivated',
        description: planForToast.planName,
        variant: 'success',
      })
      refetch()
    } catch (err) {
      showToast({
        title: 'Failed to update status',
        description: err instanceof Error ? err.message : 'Please try again.',
        variant: 'error',
      })
    }
  }

  return (
    <div id="admin-plans-page" className="flex h-full flex-col">
      <div
        id="admin-plans-page-header"
        className="flex items-center justify-between border-b border-white/6 px-6 py-4 shrink-0"
      >
        <div>
          <h1 id="admin-plans-page-title" className="text-lg font-semibold">
            Subscription Plans
          </h1>
          <p id="admin-plans-page-subtitle" className="text-xs text-white/45 mt-0.5">
            Manage plans, gateway pricing, and quotas.
          </p>
        </div>
        <button
          id="admin-plans-btn-new"
          type="button"
          onClick={() => navigate('/admin/plans/new')}
          className="flex items-center gap-1.5 rounded-lg bg-[#3031cb] hover:bg-[#2626a8] px-3.5 py-2 text-xs font-semibold text-white cursor-pointer transition-colors"
        >
          <Plus size={14} />
          New Plan
        </button>
      </div>

      <div id="admin-plans-page-content" className="flex-1 overflow-y-auto px-6 py-6">
        {isLoading && (
          <div id="admin-plans-loading" className="flex items-center justify-center py-20 text-white/45 text-sm">
            <Loader2 size={16} className="animate-spin mr-2" />
            Loading plans...
          </div>
        )}

        {!isLoading && error && (
          <div
            id="admin-plans-error"
            className="flex items-start gap-3 rounded-xl border border-red-500/20 bg-[#1a0a0b] px-4 py-3 text-sm text-red-300"
          >
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            <div>
              <div className="font-medium">Failed to load plans</div>
              <div className="text-xs text-red-300/70 mt-0.5">{error}</div>
            </div>
          </div>
        )}

        {!isLoading && !error && plans.length === 0 && (
          <div
            id="admin-plans-empty"
            className="flex flex-col items-center justify-center rounded-xl border border-dashed border-white/10 py-20 text-center"
          >
            <div className="text-sm text-white/55">No plans yet</div>
            <div className="text-xs text-white/35 mt-1">Create your first plan to get started.</div>
            <button
              id="admin-plans-empty-btn-new"
              type="button"
              onClick={() => navigate('/admin/plans/new')}
              className="mt-4 flex items-center gap-1.5 rounded-lg bg-[#3031cb] hover:bg-[#2626a8] px-3.5 py-2 text-xs font-semibold text-white cursor-pointer transition-colors"
            >
              <Plus size={14} />
              New Plan
            </button>
          </div>
        )}

        {!isLoading && !error && plans.length > 0 && (
          <div id="admin-plans-table-wrap" className="overflow-x-auto rounded-xl border border-white/6 bg-surface">
            <table id="admin-plans-table" className="w-full text-sm">
              <thead id="admin-plans-table-head" className="bg-white/3">
                <tr className="text-left text-xs uppercase tracking-wide text-white/45">
                  <th className="px-4 py-3 font-medium">Plan Name</th>
                  <th className="px-4 py-3 font-medium">Plan Code</th>
                  <th className="px-4 py-3 font-medium">Billing Cycle</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Created</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody id="admin-plans-table-body" className="divide-y divide-white/6">
                {plans.map(plan => (
                  <tr
                    key={plan.id}
                    id={`admin-plans-row-${plan.id}`}
                    className="hover:bg-white/3 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium text-white/90">{plan.planName}</div>
                      {plan.description && (
                        <div className="text-xs text-white/45 mt-0.5 line-clamp-1">{plan.description}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-white/70 font-mono text-xs">{plan.planCode}</td>
                    <td className="px-4 py-3 text-white/70 capitalize">{plan.billingCycle.toLowerCase()}</td>
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
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          id={`admin-plans-btn-edit-${plan.id}`}
                          type="button"
                          onClick={() => navigate(`/admin/plans/${plan.id}`)}
                          title="Edit plan"
                          className="p-1.5 rounded-md text-white/55 hover:bg-white/8 hover:text-white cursor-pointer transition-colors"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          id={`admin-plans-btn-toggle-${plan.id}`}
                          type="button"
                          onClick={() => setToggleState({ plan, open: true })}
                          disabled={isSubmitting}
                          title={plan.isActive ? 'Deactivate plan' : 'Activate plan'}
                          className={cn(
                            'p-1.5 rounded-md cursor-pointer transition-colors',
                            plan.isActive
                              ? 'text-white/55 hover:bg-amber-500/12 hover:text-amber-300'
                              : 'text-white/55 hover:bg-emerald-500/12 hover:text-emerald-300',
                            isSubmitting && 'opacity-50 cursor-not-allowed',
                          )}
                        >
                          {plan.isActive ? <PowerOff size={14} /> : <Power size={14} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ConfirmDialog
        open={toggleState.open}
        onOpenChange={open => setToggleState(prev => ({ ...prev, open }))}
        title={toggleState.plan?.isActive ? 'Deactivate plan?' : 'Activate plan?'}
        description={
          toggleState.plan
            ? `${toggleState.plan.planName} (${toggleState.plan.planCode}) will be ${
                toggleState.plan.isActive ? 'hidden from new subscribers' : 'available for new subscribers'
              }.`
            : undefined
        }
        confirmLabel={toggleState.plan?.isActive ? 'Deactivate' : 'Activate'}
        variant={toggleState.plan?.isActive ? 'danger' : 'default'}
        onConfirm={handleToggleConfirm}
      />

      <Toaster
        id="admin-plans-toast"
        open={toast.open}
        onOpenChange={open => setToast(prev => ({ ...prev, open }))}
        title={toast.title}
        description={toast.description}
        variant={toast.variant}
      />
    </div>
  )
}
