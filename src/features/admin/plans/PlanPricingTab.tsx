import { useState } from 'react'
import { Plus, Pencil, Trash2, Loader2, AlertCircle, Power, PowerOff } from 'lucide-react'
import { cn } from '../../../lib/utils'
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog'
import { Toaster } from '../../../components/ui/Toast'
import { useGatewayMappingMutations, useGatewayMappings } from './useGatewayMappings'
import { GatewayMappingModal } from './GatewayMappingModal'
import type {
  CreateMappingRequest,
  PlanGatewayMapping,
  UpdateMappingRequest,
} from '../../../types/subscriptionAdmin'

interface PlanPricingTabProps {
  planId: number
}

interface ToastState {
  open: boolean
  title: string
  description?: string
  variant: 'error' | 'success' | 'warning'
}

interface ModalState {
  open: boolean
  mode: 'create' | 'edit'
  mapping: PlanGatewayMapping | null
}

interface DeleteState {
  mapping: PlanGatewayMapping | null
  open: boolean
}

interface ToggleState {
  mapping: PlanGatewayMapping | null
  open: boolean
}

function formatAmount(amount: number, currencyCode: string): string {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: 2,
    }).format(amount)
  } catch {
    return `${amount.toFixed(2)} ${currencyCode}`
  }
}

export function PlanPricingTab({ planId }: PlanPricingTabProps) {
  const { mappings, isLoading, error, refetch } = useGatewayMappings(planId)
  const { createMapping, updateMapping, deleteMapping, isSubmitting } = useGatewayMappingMutations()

  const [modal, setModal] = useState<ModalState>({ open: false, mode: 'create', mapping: null })
  const [deleteState, setDeleteState] = useState<DeleteState>({ mapping: null, open: false })
  const [toggleState, setToggleState] = useState<ToggleState>({ mapping: null, open: false })
  const [toast, setToast] = useState<ToastState>({ open: false, title: '', variant: 'success' })

  const handleCreate = async (payload: CreateMappingRequest): Promise<boolean> => {
    try {
      await createMapping(planId, payload)
      setToast({ open: true, title: 'Mapping added', variant: 'success' })
      refetch()
      return true
    } catch (err) {
      setToast({
        open: true,
        title: 'Failed to add mapping',
        description: err instanceof Error ? err.message : undefined,
        variant: 'error',
      })
      return false
    }
  }

  const handleUpdate = async (mappingId: number, payload: UpdateMappingRequest): Promise<boolean> => {
    try {
      await updateMapping(planId, mappingId, payload)
      setToast({ open: true, title: 'Mapping updated', variant: 'success' })
      refetch()
      return true
    } catch (err) {
      setToast({
        open: true,
        title: 'Failed to update mapping',
        description: err instanceof Error ? err.message : undefined,
        variant: 'error',
      })
      return false
    }
  }

  const handleDeleteConfirm = async () => {
    if (!deleteState.mapping) return
    const mappingId = deleteState.mapping.id
    setDeleteState({ mapping: null, open: false })
    try {
      await deleteMapping(planId, mappingId)
      setToast({ open: true, title: 'Mapping deleted', variant: 'success' })
      refetch()
    } catch (err) {
      setToast({
        open: true,
        title: 'Failed to delete mapping',
        description: err instanceof Error ? err.message : undefined,
        variant: 'error',
      })
    }
  }

  const handleToggleConfirm = async () => {
    if (!toggleState.mapping) return
    const mapping = toggleState.mapping
    const next = !mapping.isActive
    setToggleState({ mapping: null, open: false })
    try {
      await updateMapping(planId, mapping.id, {
        amount: mapping.amount,
        externalPlanId: mapping.externalPlanId,
        isActive: next,
      })
      setToast({
        open: true,
        title: next ? 'Mapping activated' : 'Mapping deactivated',
        variant: 'success',
      })
      refetch()
    } catch (err) {
      setToast({
        open: true,
        title: 'Failed to update status',
        description: err instanceof Error ? err.message : undefined,
        variant: 'error',
      })
    }
  }

  return (
    <div id="admin-plan-pricing-tab">
      <div id="admin-plan-pricing-header" className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-semibold text-white/85">Gateway Pricing</h2>
          <p className="text-xs text-white/45 mt-0.5">
            Configure provider-specific pricing per country and currency.
          </p>
        </div>
        <button
          id="admin-plan-pricing-btn-add"
          type="button"
          onClick={() => setModal({ open: true, mode: 'create', mapping: null })}
          className="flex items-center gap-1.5 rounded-lg bg-[#3031cb] hover:bg-[#2626a8] px-3 py-1.5 text-xs font-semibold text-white cursor-pointer transition-colors"
        >
          <Plus size={13} />
          Add Mapping
        </button>
      </div>

      {isLoading && (
        <div id="admin-plan-pricing-loading" className="flex items-center justify-center py-16 text-white/45 text-sm">
          <Loader2 size={16} className="animate-spin mr-2" />
          Loading mappings...
        </div>
      )}

      {!isLoading && error && (
        <div
          id="admin-plan-pricing-error"
          className="flex items-start gap-3 rounded-xl border border-red-500/20 bg-[#1a0a0b] px-4 py-3 text-sm text-red-300"
        >
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          <div>
            <div className="font-medium">Failed to load mappings</div>
            <div className="text-xs text-red-300/70 mt-0.5">{error}</div>
          </div>
        </div>
      )}

      {!isLoading && !error && mappings.length === 0 && (
        <div
          id="admin-plan-pricing-empty"
          className="flex flex-col items-center justify-center rounded-xl border border-dashed border-white/10 py-16 text-center"
        >
          <div className="text-sm text-white/55">No gateway mappings yet</div>
          <div className="text-xs text-white/35 mt-1">
            Add a mapping for each provider/country/currency combination.
          </div>
        </div>
      )}

      {!isLoading && !error && mappings.length > 0 && (
        <div id="admin-plan-pricing-table-wrap" className="overflow-x-auto rounded-xl border border-white/6 bg-surface">
          <table id="admin-plan-pricing-table" className="w-full text-sm">
            <thead id="admin-plan-pricing-table-head" className="bg-white/3">
              <tr className="text-left text-xs uppercase tracking-wide text-white/45">
                <th className="px-4 py-3 font-medium">Gateway</th>
                <th className="px-4 py-3 font-medium">Country</th>
                <th className="px-4 py-3 font-medium">Currency</th>
                <th className="px-4 py-3 font-medium">Amount</th>
                <th className="px-4 py-3 font-medium">External Plan ID</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody id="admin-plan-pricing-table-body" className="divide-y divide-white/6">
              {mappings.map(mapping => (
                <tr
                  key={mapping.id}
                  id={`admin-plan-pricing-row-${mapping.id}`}
                  className="hover:bg-white/3 transition-colors"
                >
                  <td className="px-4 py-3">
                    <div className="font-medium text-white/90">{mapping.gatewayName}</div>
                    <div className="text-xs text-white/45 mt-0.5 font-mono">{mapping.gatewayCode}</div>
                  </td>
                  <td className="px-4 py-3 text-white/70 font-mono text-xs">{mapping.countryCode}</td>
                  <td className="px-4 py-3 text-white/70 font-mono text-xs">{mapping.currencyCode}</td>
                  <td className="px-4 py-3 text-white/85 font-medium">
                    {formatAmount(mapping.amount, mapping.currencyCode)}
                  </td>
                  <td className="px-4 py-3 text-white/55 font-mono text-xs truncate max-w-50">
                    {mapping.externalPlanId}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium',
                        mapping.isActive
                          ? 'bg-emerald-500/12 text-emerald-300'
                          : 'bg-white/5 text-white/55',
                      )}
                    >
                      <span
                        className={cn(
                          'h-1.5 w-1.5 rounded-full',
                          mapping.isActive ? 'bg-emerald-400' : 'bg-white/40',
                        )}
                      />
                      {mapping.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        id={`admin-plan-pricing-btn-edit-${mapping.id}`}
                        type="button"
                        onClick={() => setModal({ open: true, mode: 'edit', mapping })}
                        title="Edit mapping"
                        className="p-1.5 rounded-md text-white/55 hover:bg-white/8 hover:text-white cursor-pointer transition-colors"
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        id={`admin-plan-pricing-btn-toggle-${mapping.id}`}
                        type="button"
                        onClick={() => setToggleState({ mapping, open: true })}
                        disabled={isSubmitting}
                        title={mapping.isActive ? 'Deactivate mapping' : 'Activate mapping'}
                        className={cn(
                          'p-1.5 rounded-md cursor-pointer transition-colors',
                          mapping.isActive
                            ? 'text-white/55 hover:bg-amber-500/12 hover:text-amber-300'
                            : 'text-white/55 hover:bg-emerald-500/12 hover:text-emerald-300',
                          isSubmitting && 'opacity-50 cursor-not-allowed',
                        )}
                      >
                        {mapping.isActive ? <PowerOff size={13} /> : <Power size={13} />}
                      </button>
                      <button
                        id={`admin-plan-pricing-btn-delete-${mapping.id}`}
                        type="button"
                        onClick={() => setDeleteState({ mapping, open: true })}
                        disabled={isSubmitting}
                        title="Delete mapping"
                        className={cn(
                          'p-1.5 rounded-md text-white/55 hover:bg-red-500/12 hover:text-red-300 cursor-pointer transition-colors',
                          isSubmitting && 'opacity-50 cursor-not-allowed',
                        )}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <GatewayMappingModal
        open={modal.open}
        onOpenChange={open => setModal(prev => ({ ...prev, open }))}
        mode={modal.mode}
        mapping={modal.mapping}
        isSubmitting={isSubmitting}
        onCreate={handleCreate}
        onUpdate={handleUpdate}
      />

      <ConfirmDialog
        open={deleteState.open}
        onOpenChange={open => setDeleteState(prev => ({ ...prev, open }))}
        title="Delete mapping?"
        description={
          deleteState.mapping
            ? `${deleteState.mapping.gatewayName} - ${deleteState.mapping.countryCode}/${deleteState.mapping.currencyCode} will be removed permanently.`
            : undefined
        }
        confirmLabel="Delete"
        variant="danger"
        onConfirm={handleDeleteConfirm}
      />

      <ConfirmDialog
        open={toggleState.open}
        onOpenChange={open => setToggleState(prev => ({ ...prev, open }))}
        title={toggleState.mapping?.isActive ? 'Deactivate mapping?' : 'Activate mapping?'}
        description={
          toggleState.mapping
            ? `${toggleState.mapping.gatewayName} - ${toggleState.mapping.countryCode}/${toggleState.mapping.currencyCode} will be ${
                toggleState.mapping.isActive ? 'hidden from new subscribers' : 'available for new subscribers'
              }.`
            : undefined
        }
        confirmLabel={toggleState.mapping?.isActive ? 'Deactivate' : 'Activate'}
        variant={toggleState.mapping?.isActive ? 'danger' : 'default'}
        onConfirm={handleToggleConfirm}
      />

      <Toaster
        id="admin-plan-pricing-toast"
        open={toast.open}
        onOpenChange={open => setToast(prev => ({ ...prev, open }))}
        title={toast.title}
        description={toast.description}
        variant={toast.variant}
      />
    </div>
  )
}
