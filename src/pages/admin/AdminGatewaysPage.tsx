import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import * as RadixDialog from '@radix-ui/react-dialog'
import { Plus, Pencil, Loader2, AlertCircle, Power, PowerOff, X, Lock, Save, LayoutGrid } from 'lucide-react'
import { cn } from '../../lib/utils'
import { epochToLocalDate } from '../../lib/dateUtils'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { Toaster } from '../../components/ui/Toast'
import { useGatewayMutations, useGatewaysList } from '../../features/admin/gateways/useGateways'
import { parseAllowedCountries, serializeAllowedCountries } from '../../lib/allowedCountriesUtils'
import { AllowedCountriesPicker } from '../../features/admin/gateways/AllowedCountriesPicker'
import type { SubscriptionGateway } from '../../types/subscriptionAdmin'

interface ToastState {
  open: boolean
  title: string
  description?: string
  variant: 'error' | 'success' | 'warning'
}

interface ModalState {
  open: boolean
  mode: 'create' | 'edit'
  gateway: SubscriptionGateway | null
}

interface ToggleState {
  gateway: SubscriptionGateway | null
  open: boolean
}

interface FormState {
  gatewayCode: string
  gatewayName: string
  isActive: boolean
  supportsSubscriptions: boolean
  allowedCountries: string[]
}

const INITIAL_FORM: FormState = {
  gatewayCode: '',
  gatewayName: '',
  isActive: true,
  supportsSubscriptions: true,
  allowedCountries: [],
}

export function AdminGatewaysPage() {
  const navigate = useNavigate()
  const { gateways, isLoading, error, refetch } = useGatewaysList()
  const {
    createGatewayMutate,
    updateGatewayMutate,
    toggleGatewayStatus,
    isSubmitting,
  } = useGatewayMutations()

  const [modal, setModal] = useState<ModalState>({ open: false, mode: 'create', gateway: null })
  const [form, setForm] = useState<FormState>(INITIAL_FORM)
  const [validationError, setValidationError] = useState<string | null>(null)
  const [confirmSaveOpen, setConfirmSaveOpen] = useState(false)
  const [toggleState, setToggleState] = useState<ToggleState>({ gateway: null, open: false })
  const [toast, setToast] = useState<ToastState>({ open: false, title: '', variant: 'success' })

  useEffect(() => {
    if (modal.open) {
      if (modal.mode === 'edit' && modal.gateway) {
        setForm({
          gatewayCode: modal.gateway.gatewayCode,
          gatewayName: modal.gateway.gatewayName,
          isActive: modal.gateway.isActive,
          supportsSubscriptions: modal.gateway.supportsSubscriptions,
          allowedCountries: parseAllowedCountries(modal.gateway.allowedCountries),
        })
      } else {
        setForm(INITIAL_FORM)
      }
      setValidationError(null)
    }
  }, [modal])

  const handleNew = () => setModal({ open: true, mode: 'create', gateway: null })
  const handleEdit = (gateway: SubscriptionGateway) =>
    setModal({ open: true, mode: 'edit', gateway })

  const closeModal = () => setModal(prev => ({ ...prev, open: false }))

  const validate = (): string | null => {
    if (!form.gatewayName.trim()) return 'Gateway Name is required'
    if (modal.mode === 'create' && !form.gatewayCode.trim()) return 'Gateway Code is required'
    return null
  }

  const handleSaveClick = () => {
    const err = validate()
    setValidationError(err)
    if (err) return
    setConfirmSaveOpen(true)
  }

  const handleSaveConfirm = async () => {
    setConfirmSaveOpen(false)
    if (modal.mode === 'create') {
      try {
        await createGatewayMutate({
          gatewayCode: form.gatewayCode.trim(),
          gatewayName: form.gatewayName.trim(),
          isActive: form.isActive,
          supportsSubscriptions: form.supportsSubscriptions,
          allowedCountries: serializeAllowedCountries(form.allowedCountries),
        })
        setToast({ open: true, title: 'Gateway created', description: form.gatewayName.trim(), variant: 'success' })
        closeModal()
        refetch()
      } catch (err) {
        setToast({
          open: true,
          title: 'Failed to create gateway',
          description: err instanceof Error ? err.message : undefined,
          variant: 'error',
        })
      }
    } else if (modal.gateway) {
      try {
        await updateGatewayMutate(modal.gateway.id, {
          gatewayName: form.gatewayName.trim(),
          isActive: form.isActive,
          supportsSubscriptions: form.supportsSubscriptions,
          allowedCountries: serializeAllowedCountries(form.allowedCountries),
        })
        setToast({ open: true, title: 'Gateway updated', description: form.gatewayName.trim(), variant: 'success' })
        closeModal()
        refetch()
      } catch (err) {
        setToast({
          open: true,
          title: 'Failed to update gateway',
          description: err instanceof Error ? err.message : undefined,
          variant: 'error',
        })
      }
    }
  }

  const handleToggleConfirm = async () => {
    if (!toggleState.gateway) return
    const nextActive = !toggleState.gateway.isActive
    const gatewayForToast = toggleState.gateway
    setToggleState({ gateway: null, open: false })
    try {
      await toggleGatewayStatus(gatewayForToast.id, nextActive)
      setToast({
        open: true,
        title: nextActive ? 'Gateway activated' : 'Gateway deactivated',
        description: gatewayForToast.gatewayName,
        variant: 'success',
      })
      refetch()
    } catch (err) {
      setToast({
        open: true,
        title: 'Failed to update status',
        description: err instanceof Error ? err.message : 'Please try again.',
        variant: 'error',
      })
    }
  }

  return (
    <div id="admin-gateways-page" className="flex h-full flex-col">
      <div
        id="admin-gateways-page-header"
        className="flex items-center justify-between border-b border-white/6 px-6 py-4 shrink-0"
      >
        <div>
          <h1 id="admin-gateways-page-title" className="text-lg font-semibold">
            Payment Gateways
          </h1>
          <p id="admin-gateways-page-subtitle" className="text-xs text-white/45 mt-0.5">
            Master list of providers used in plan pricing.
          </p>
        </div>
        <button
          id="admin-gateways-btn-new"
          type="button"
          onClick={handleNew}
          className="flex items-center gap-1.5 rounded-lg bg-[#3031cb] hover:bg-[#2626a8] px-3.5 py-2 text-xs font-semibold text-white cursor-pointer transition-colors"
        >
          <Plus size={14} />
          New Gateway
        </button>
      </div>

      <div id="admin-gateways-page-content" className="flex-1 overflow-y-auto px-6 py-6">
        {isLoading && (
          <div id="admin-gateways-loading" className="flex items-center justify-center py-20 text-white/45 text-sm">
            <Loader2 size={16} className="animate-spin mr-2" />
            Loading gateways...
          </div>
        )}

        {!isLoading && error && (
          <div
            id="admin-gateways-error"
            className="flex items-start gap-3 rounded-xl border border-red-500/20 bg-[#1a0a0b] px-4 py-3 text-sm text-red-300"
          >
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            <div>
              <div className="font-medium">Failed to load gateways</div>
              <div className="text-xs text-red-300/70 mt-0.5">{error}</div>
            </div>
          </div>
        )}

        {!isLoading && !error && gateways.length === 0 && (
          <div
            id="admin-gateways-empty"
            className="flex flex-col items-center justify-center rounded-xl border border-dashed border-white/10 py-20 text-center"
          >
            <div className="text-sm text-white/55">No gateways yet</div>
            <div className="text-xs text-white/35 mt-1">Add a gateway before configuring plan pricing.</div>
            <button
              id="admin-gateways-empty-btn-new"
              type="button"
              onClick={handleNew}
              className="mt-4 flex items-center gap-1.5 rounded-lg bg-[#3031cb] hover:bg-[#2626a8] px-3.5 py-2 text-xs font-semibold text-white cursor-pointer transition-colors"
            >
              <Plus size={14} />
              New Gateway
            </button>
          </div>
        )}

        {!isLoading && !error && gateways.length > 0 && (
          <div id="admin-gateways-table-wrap" className="overflow-x-auto rounded-xl border border-white/6 bg-surface">
            <table id="admin-gateways-table" className="w-full text-sm">
              <thead id="admin-gateways-table-head" className="bg-white/3">
                <tr className="text-left text-xs uppercase tracking-wide text-white/45">
                  <th className="px-4 py-3 font-medium">Gateway Name</th>
                  <th className="px-4 py-3 font-medium">Gateway Code</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Created</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody id="admin-gateways-table-body" className="divide-y divide-white/6">
                {gateways.map(gateway => (
                  <tr
                    key={gateway.id}
                    id={`admin-gateways-row-${gateway.id}`}
                    className="hover:bg-white/3 transition-colors"
                  >
                    <td className="px-4 py-3 font-medium text-white/90">{gateway.gatewayName}</td>
                    <td className="px-4 py-3 text-white/70 font-mono text-xs">{gateway.gatewayCode}</td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium',
                          gateway.isActive
                            ? 'bg-emerald-500/12 text-emerald-300'
                            : 'bg-white/5 text-white/55',
                        )}
                      >
                        <span
                          className={cn(
                            'h-1.5 w-1.5 rounded-full',
                            gateway.isActive ? 'bg-emerald-400' : 'bg-white/40',
                          )}
                        />
                        {gateway.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-white/55 text-xs">{epochToLocalDate(gateway.createdAt)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          id={`admin-gateways-btn-plans-${gateway.id}`}
                          type="button"
                          onClick={() => navigate(`/admin/gateways/${gateway.gatewayCode}/plans`)}
                          title="Manage plans on this gateway"
                          className="p-1.5 rounded-md text-white/55 hover:bg-emerald-500/12 hover:text-emerald-300 cursor-pointer transition-colors"
                        >
                          <LayoutGrid size={14} />
                        </button>
                        <button
                          id={`admin-gateways-btn-edit-${gateway.id}`}
                          type="button"
                          onClick={() => handleEdit(gateway)}
                          title="Edit gateway"
                          className="p-1.5 rounded-md text-white/55 hover:bg-white/8 hover:text-white cursor-pointer transition-colors"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          id={`admin-gateways-btn-toggle-${gateway.id}`}
                          type="button"
                          onClick={() => setToggleState({ gateway, open: true })}
                          disabled={isSubmitting}
                          title={gateway.isActive ? 'Deactivate gateway' : 'Activate gateway'}
                          className={cn(
                            'p-1.5 rounded-md cursor-pointer transition-colors',
                            gateway.isActive
                              ? 'text-white/55 hover:bg-amber-500/12 hover:text-amber-300'
                              : 'text-white/55 hover:bg-emerald-500/12 hover:text-emerald-300',
                            isSubmitting && 'opacity-50 cursor-not-allowed',
                          )}
                        >
                          {gateway.isActive ? <PowerOff size={14} /> : <Power size={14} />}
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

      <RadixDialog.Root open={modal.open} onOpenChange={open => !open && closeModal()}>
        <RadixDialog.Portal>
          <RadixDialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
          <RadixDialog.Content
            id="admin-gateways-modal"
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
                {modal.mode === 'create' ? 'New Gateway' : 'Edit Gateway'}
              </RadixDialog.Title>
              <RadixDialog.Close asChild>
                <button
                  id="admin-gateways-modal-btn-close"
                  type="button"
                  className="p-1 rounded-md text-white/55 hover:bg-white/8 hover:text-white cursor-pointer transition-colors"
                >
                  <X size={14} />
                </button>
              </RadixDialog.Close>
            </div>

            <div className="p-5 space-y-4">
              {validationError && (
                <div className="flex items-center gap-2 rounded-lg border border-amber-500/20 bg-[#1a140a] px-3 py-2 text-xs text-amber-300">
                  <AlertCircle size={14} />
                  <span>{validationError}</span>
                </div>
              )}

              <div id="admin-gateways-modal-field-gatewayName">
                <label htmlFor="admin-gateways-modal-input-gatewayName" className="block text-xs font-medium text-white/70 mb-1.5">
                  Gateway Name <span className="text-[#3031cb]">*</span>
                </label>
                <input
                  id="admin-gateways-modal-input-gatewayName"
                  type="text"
                  value={form.gatewayName}
                  onChange={e => setForm(prev => ({ ...prev, gatewayName: e.target.value }))}
                  maxLength={100}
                  placeholder="e.g. Razorpay India"
                  className="w-full rounded-lg border border-white/10 bg-surface px-3 py-2 text-sm text-white placeholder-white/30 focus:border-[#3031cb] focus:outline-hidden transition-colors"
                />
              </div>

              <div id="admin-gateways-modal-field-gatewayCode">
                <label
                  htmlFor="admin-gateways-modal-input-gatewayCode"
                  className="flex items-center gap-1.5 text-xs font-medium text-white/70 mb-1.5"
                >
                  Gateway Code {modal.mode === 'create' && <span className="text-[#3031cb]">*</span>}
                  {modal.mode === 'edit' && <Lock size={11} className="text-white/40" />}
                </label>
                <input
                  id="admin-gateways-modal-input-gatewayCode"
                  type="text"
                  value={form.gatewayCode}
                  onChange={e =>
                    modal.mode === 'create' &&
                    setForm(prev => ({ ...prev, gatewayCode: e.target.value.toUpperCase().replace(/\s+/g, '_') }))
                  }
                  maxLength={50}
                  readOnly={modal.mode === 'edit'}
                  placeholder="e.g. RAZORPAY"
                  className={cn(
                    'w-full rounded-lg border px-3 py-2 text-sm font-mono transition-colors',
                    modal.mode === 'create'
                      ? 'border-white/10 bg-surface text-white placeholder-white/30 focus:border-[#3031cb] focus:outline-hidden'
                      : 'border-white/6 bg-white/3 text-white/55 cursor-not-allowed',
                  )}
                />
                {modal.mode === 'create' ? (
                  <p className="mt-1 text-xs text-white/35">Uppercase identifier. Cannot be changed after creation.</p>
                ) : (
                  <p className="mt-1 text-xs text-white/35">Gateway Code is immutable once created.</p>
                )}
              </div>

              <div
                id="admin-gateways-modal-field-isActive"
                className="flex items-center justify-between rounded-lg border border-white/10 bg-surface px-3 py-2.5"
              >
                <div>
                  <div className="text-sm text-white/85">Active</div>
                  <div className="text-xs text-white/45 mt-0.5">Available for mappings and checkout.</div>
                </div>
                <button
                  id="admin-gateways-modal-btn-toggleActive"
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

              <div
                id="admin-gateways-modal-field-supportsSubscriptions"
                className="flex items-center justify-between rounded-lg border border-white/10 bg-surface px-3 py-2.5"
              >
                <div>
                  <div className="text-sm text-white/85">Supports subscriptions</div>
                  <div className="text-xs text-white/45 mt-0.5">Enable for recurring billing plans.</div>
                </div>
                <button
                  id="admin-gateways-modal-btn-toggleSupportsSubscriptions"
                  type="button"
                  role="switch"
                  aria-checked={form.supportsSubscriptions}
                  onClick={() => setForm(prev => ({ ...prev, supportsSubscriptions: !prev.supportsSubscriptions }))}
                  className={cn(
                    'relative h-5 w-9 shrink-0 rounded-full p-0 transition-colors cursor-pointer',
                    form.supportsSubscriptions ? 'bg-[#3031cb]' : 'bg-white/15',
                  )}
                >
                  <span
                    className={cn(
                      'absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all',
                      form.supportsSubscriptions ? 'left-4.5' : 'left-0.5',
                    )}
                  />
                </button>
              </div>

              <div id="admin-gateways-modal-field-allowedCountries">
                <label className="block text-xs font-medium text-white/70 mb-1.5">Allowed Countries</label>
                <AllowedCountriesPicker
                  value={form.allowedCountries}
                  onChange={next => setForm(prev => ({ ...prev, allowedCountries: next }))}
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-white/6 px-5 py-3">
              <RadixDialog.Close asChild>
                <button
                  id="admin-gateways-modal-btn-cancel"
                  type="button"
                  className="px-3.5 py-1.5 text-xs text-white/55 border border-white/10 rounded-lg hover:bg-white/5 cursor-pointer transition-colors"
                >
                  Cancel
                </button>
              </RadixDialog.Close>
              <button
                id="admin-gateways-modal-btn-save"
                type="button"
                onClick={handleSaveClick}
                disabled={isSubmitting}
                className={cn(
                  'flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-semibold text-white transition-colors',
                  isSubmitting
                    ? 'bg-[#3031cb]/50 cursor-not-allowed'
                    : 'bg-[#3031cb] hover:bg-[#2626a8] cursor-pointer',
                )}
              >
                {isSubmitting ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                {modal.mode === 'create' ? 'Create' : 'Save'}
              </button>
            </div>
          </RadixDialog.Content>
        </RadixDialog.Portal>
      </RadixDialog.Root>

      <ConfirmDialog
        open={confirmSaveOpen}
        onOpenChange={setConfirmSaveOpen}
        title={modal.mode === 'create' ? 'Create gateway?' : 'Save changes?'}
        description={
          modal.mode === 'create'
            ? `Gateway "${form.gatewayName.trim()}" will be created with code ${form.gatewayCode.trim()}.`
            : `Changes to "${form.gatewayName.trim()}" will be saved.`
        }
        confirmLabel={modal.mode === 'create' ? 'Create' : 'Save'}
        onConfirm={handleSaveConfirm}
      />

      <ConfirmDialog
        open={toggleState.open}
        onOpenChange={open => setToggleState(prev => ({ ...prev, open }))}
        title={toggleState.gateway?.isActive ? 'Deactivate gateway?' : 'Activate gateway?'}
        description={
          toggleState.gateway
            ? `${toggleState.gateway.gatewayName} (${toggleState.gateway.gatewayCode}) will be ${
                toggleState.gateway.isActive
                  ? 'unavailable for new plan mappings'
                  : 'available for plan mappings'
              }.`
            : undefined
        }
        confirmLabel={toggleState.gateway?.isActive ? 'Deactivate' : 'Activate'}
        variant={toggleState.gateway?.isActive ? 'danger' : 'default'}
        onConfirm={handleToggleConfirm}
      />

      <Toaster
        id="admin-gateways-toast"
        open={toast.open}
        onOpenChange={open => setToast(prev => ({ ...prev, open }))}
        title={toast.title}
        description={toast.description}
        variant={toast.variant}
      />
    </div>
  )
}
