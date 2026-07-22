import { useEffect, useMemo, useState } from 'react'
import * as RadixDialog from '@radix-ui/react-dialog'
import { AlertCircle, Loader2, Lock, Save, X } from 'lucide-react'
import { getCountries } from 'libphonenumber-js'
import { cn } from '../../../lib/utils'
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog'
import { getCurrencyForCountry } from '../../../lib/countryCurrencyUtils'
import { useGatewaysList } from '../gateways/useGateways'
import { parseAllowedCountries } from '../../../lib/allowedCountriesUtils'
import { GatewayPlanPicker } from './GatewayPlanPicker'
import type {
  CreateMappingRequest,
  GatewayPlan,
  PlanGatewayMapping,
  UpdateMappingRequest,
} from '../../../types/subscriptionAdmin'

interface GatewayMappingModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: 'create' | 'edit'
  mapping: PlanGatewayMapping | null
  isSubmitting: boolean
  onCreate: (payload: CreateMappingRequest) => Promise<boolean>
  onUpdate: (mappingId: number, payload: UpdateMappingRequest) => Promise<boolean>
}

interface FormState {
  gatewayId: number | null
  countryCode: string
  currencyCode: string
  amount: string
  externalPlanId: string
  isActive: boolean
}

const INITIAL_FORM: FormState = {
  gatewayId: null,
  countryCode: '',
  currencyCode: '',
  amount: '',
  externalPlanId: '',
  isActive: true,
}

export function GatewayMappingModal({
  open,
  onOpenChange,
  mode,
  mapping,
  isSubmitting,
  onCreate,
  onUpdate,
}: GatewayMappingModalProps) {
  const { gateways } = useGatewaysList({ active: true })
  const countries = useMemo(() => {
    const displayNames = new Intl.DisplayNames(['en'], { type: 'region' })
    return getCountries()
      .map(code => ({ country: displayNames.of(code) ?? code, countryCode: code }))
      .sort((a, b) => a.country.localeCompare(b.country))
  }, [])

  const [form, setForm] = useState<FormState>(INITIAL_FORM)
  const [validationError, setValidationError] = useState<string | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)

  const selectedGateway = useMemo(() => {
    if (form.gatewayId === null) return null
    return gateways.find(g => g.id === form.gatewayId) ?? null
  }, [form.gatewayId, gateways])

  const selectedGatewayCode = selectedGateway?.gatewayCode ?? null

  const filteredCountries = useMemo(() => {
    if (!selectedGateway || !selectedGateway.allowedCountries) return countries
    const allowed = new Set(parseAllowedCountries(selectedGateway.allowedCountries))
    return countries.filter(c => allowed.has(c.countryCode))
  }, [countries, selectedGateway])

  useEffect(() => {
    if (mode !== 'create' || !form.countryCode || !selectedGateway?.allowedCountries) return
    const allowed = new Set(parseAllowedCountries(selectedGateway.allowedCountries))
    if (!allowed.has(form.countryCode)) {
      setForm(prev => ({ ...prev, countryCode: '', currencyCode: '' }))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedGateway?.id, selectedGateway?.allowedCountries])

  const handlePlanSelected = (plan: GatewayPlan) => {
    setForm(prev => ({
      ...prev,
      externalPlanId: plan.externalPlanId,
      amount: plan.amount.toString(),
      currencyCode: plan.currency.toUpperCase(),
    }))
    setValidationError(null)
  }

  useEffect(() => {
    if (open) {
      if (mode === 'edit' && mapping) {
        setForm({
          gatewayId: mapping.gatewayId,
          countryCode: mapping.countryCode,
          currencyCode: mapping.currencyCode,
          amount: mapping.amount.toString(),
          externalPlanId: mapping.externalPlanId,
          isActive: mapping.isActive,
        })
      } else {
        setForm(INITIAL_FORM)
      }
      setValidationError(null)
    }
  }, [open, mode, mapping])

  const validate = (): string | null => {
    if (mode === 'create') {
      if (form.gatewayId === null) return 'Gateway is required'
      if (!form.countryCode) return 'Country is required'
      if (!form.currencyCode.trim()) return 'Currency Code is required'
      if (form.currencyCode.trim().length !== 3) return 'Currency Code must be 3 letters (ISO 4217)'
    }
    if (!form.externalPlanId.trim()) return 'External Plan ID is required'
    const parsedAmount = Number(form.amount)
    if (!form.amount.trim() || Number.isNaN(parsedAmount)) return 'Amount must be a number'
    if (parsedAmount < 0) return 'Amount cannot be negative'
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
    const amount = Number(form.amount)
    if (mode === 'create' && form.gatewayId !== null) {
      const ok = await onCreate({
        gatewayId: form.gatewayId,
        countryCode: form.countryCode,
        currencyCode: form.currencyCode.trim().toUpperCase(),
        amount,
        externalPlanId: form.externalPlanId.trim(),
        isActive: form.isActive,
      })
      if (ok) onOpenChange(false)
    } else if (mode === 'edit' && mapping) {
      const ok = await onUpdate(mapping.id, {
        amount,
        externalPlanId: form.externalPlanId.trim(),
        isActive: form.isActive,
      })
      if (ok) onOpenChange(false)
    }
  }

  return (
    <>
      <RadixDialog.Root open={open} onOpenChange={onOpenChange}>
        <RadixDialog.Portal>
          <RadixDialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
          <RadixDialog.Content
            id="admin-mapping-modal"
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
                {mode === 'create' ? 'Add Gateway Mapping' : 'Edit Gateway Mapping'}
              </RadixDialog.Title>
              <RadixDialog.Close asChild>
                <button
                  id="admin-mapping-modal-btn-close"
                  type="button"
                  className="p-1 rounded-md text-white/55 hover:bg-white/8 hover:text-white cursor-pointer transition-colors"
                >
                  <X size={14} />
                </button>
              </RadixDialog.Close>
            </div>

            <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
              {validationError && (
                <div className="flex items-center gap-2 rounded-lg border border-amber-500/20 bg-[#1a140a] px-3 py-2 text-xs text-amber-300">
                  <AlertCircle size={14} />
                  <span>{validationError}</span>
                </div>
              )}

              <div id="admin-mapping-modal-field-gateway">
                <label htmlFor="admin-mapping-modal-input-gateway" className="flex items-center gap-1.5 text-xs font-medium text-white/70 mb-1.5">
                  Gateway {mode === 'create' && <span className="text-[#3031cb]">*</span>}
                  {mode === 'edit' && <Lock size={11} className="text-white/40" />}
                </label>
                <select
                  id="admin-mapping-modal-input-gateway"
                  value={form.gatewayId ?? ''}
                  onChange={e =>
                    mode === 'create' &&
                    setForm(prev => ({ ...prev, gatewayId: e.target.value ? Number(e.target.value) : null }))
                  }
                  disabled={mode === 'edit'}
                  className={cn(
                    'w-full rounded-lg border px-3 py-2 text-sm transition-colors',
                    mode === 'create'
                      ? 'border-white/10 bg-surface text-white focus:border-[#3031cb] focus:outline-hidden cursor-pointer'
                      : 'border-white/6 bg-white/3 text-white/55 cursor-not-allowed',
                  )}
                >
                  <option value="">Select gateway...</option>
                  {gateways.map(gateway => (
                    <option key={gateway.id} value={gateway.id}>
                      {gateway.gatewayName} ({gateway.gatewayCode})
                    </option>
                  ))}
                </select>
              </div>

              <div id="admin-mapping-modal-row-country-currency" className="grid grid-cols-2 gap-3">
                <div id="admin-mapping-modal-field-country">
                  <label htmlFor="admin-mapping-modal-input-country" className="flex items-center gap-1.5 text-xs font-medium text-white/70 mb-1.5">
                    Country {mode === 'create' && <span className="text-[#3031cb]">*</span>}
                    {mode === 'edit' && <Lock size={11} className="text-white/40" />}
                  </label>
                  <select
                    id="admin-mapping-modal-input-country"
                    value={form.countryCode}
                    onChange={e => {
                      if (mode !== 'create') return
                      const nextCountry = e.target.value
                      const autoCurrency = getCurrencyForCountry(nextCountry)
                      setForm(prev => ({
                        ...prev,
                        countryCode: nextCountry,
                        currencyCode: autoCurrency || prev.currencyCode,
                      }))
                    }}
                    disabled={mode === 'edit'}
                    className={cn(
                      'w-full rounded-lg border px-3 py-2 text-sm transition-colors',
                      mode === 'create'
                        ? 'border-white/10 bg-surface text-white focus:border-[#3031cb] focus:outline-hidden cursor-pointer'
                        : 'border-white/6 bg-white/3 text-white/55 cursor-not-allowed',
                    )}
                  >
                    <option value="">Select country...</option>
                    {filteredCountries.map(c => (
                      <option key={c.countryCode} value={c.countryCode}>
                        {c.country} ({c.countryCode})
                      </option>
                    ))}
                  </select>
                </div>

                <div id="admin-mapping-modal-field-currency">
                  <label htmlFor="admin-mapping-modal-input-currency" className="flex items-center gap-1.5 text-xs font-medium text-white/70 mb-1.5">
                    Currency {mode === 'create' && <span className="text-[#3031cb]">*</span>}
                    {mode === 'edit' && <Lock size={11} className="text-white/40" />}
                  </label>
                  <input
                    id="admin-mapping-modal-input-currency"
                    type="text"
                    value={form.currencyCode}
                    onChange={e =>
                      mode === 'create' &&
                      setForm(prev => ({ ...prev, currencyCode: e.target.value.toUpperCase().slice(0, 5) }))
                    }
                    readOnly={mode === 'edit'}
                    maxLength={5}
                    placeholder="INR"
                    className={cn(
                      'w-full rounded-lg border px-3 py-2 text-sm font-mono transition-colors',
                      mode === 'create'
                        ? 'border-white/10 bg-surface text-white placeholder-white/30 focus:border-[#3031cb] focus:outline-hidden'
                        : 'border-white/6 bg-white/3 text-white/55 cursor-not-allowed',
                    )}
                  />
                </div>
              </div>

              <div id="admin-mapping-modal-field-amount">
                <label htmlFor="admin-mapping-modal-input-amount" className="block text-xs font-medium text-white/70 mb-1.5">
                  Amount <span className="text-[#3031cb]">*</span>
                </label>
                <input
                  id="admin-mapping-modal-input-amount"
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.amount}
                  onChange={e => setForm(prev => ({ ...prev, amount: e.target.value }))}
                  placeholder="499.00"
                  className="w-full rounded-lg border border-white/10 bg-surface px-3 py-2 text-sm text-white placeholder-white/30 focus:border-[#3031cb] focus:outline-hidden transition-colors"
                />
              </div>

              <GatewayPlanPicker
                gatewayCode={selectedGatewayCode}
                mode={mode}
                externalPlanId={form.externalPlanId}
                formCurrency={form.currencyCode}
                onExternalPlanIdChange={value => setForm(prev => ({ ...prev, externalPlanId: value }))}
                onPlanSelected={handlePlanSelected}
              />

              <div
                id="admin-mapping-modal-field-isActive"
                className="flex items-center justify-between rounded-lg border border-white/10 bg-surface px-3 py-2.5"
              >
                <div className="text-sm text-white/85">Active</div>
                <button
                  id="admin-mapping-modal-btn-toggleActive"
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

            <div className="flex items-center justify-end gap-2 border-t border-white/6 px-5 py-3">
              <RadixDialog.Close asChild>
                <button
                  id="admin-mapping-modal-btn-cancel"
                  type="button"
                  className="px-3.5 py-1.5 text-xs text-white/55 border border-white/10 rounded-lg hover:bg-white/5 cursor-pointer transition-colors"
                >
                  Cancel
                </button>
              </RadixDialog.Close>
              <button
                id="admin-mapping-modal-btn-save"
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
                {mode === 'create' ? 'Add' : 'Save'}
              </button>
            </div>
          </RadixDialog.Content>
        </RadixDialog.Portal>
      </RadixDialog.Root>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={mode === 'create' ? 'Add gateway mapping?' : 'Save changes?'}
        description={
          mode === 'create'
            ? 'A new gateway mapping will be added to this plan.'
            : 'Changes to this gateway mapping will be saved.'
        }
        confirmLabel={mode === 'create' ? 'Add' : 'Save'}
        onConfirm={handleSaveConfirm}
      />
    </>
  )
}
