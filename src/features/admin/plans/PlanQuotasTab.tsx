import { useEffect, useState } from 'react'
import { Save, Loader2, AlertCircle, X, Video, Layers, Radio, Upload } from 'lucide-react'
import { cn } from '../../../lib/utils'
import { ConfirmDialog } from '../../../components/ui/ConfirmDialog'
import { Toaster } from '../../../components/ui/Toast'
import { useQuota, useQuotaMutations } from './useQuota'
import type { UpsertQuotaRequest } from '../../../types/subscriptionAdmin'

interface PlanQuotasTabProps {
  planId: number
}

interface FormState {
  meetingHours: string
  platforms: string
  publishingHours: string
  uploads: string
}

const INITIAL_FORM: FormState = {
  meetingHours: '0',
  platforms: '0',
  publishingHours: '0',
  uploads: '0',
}

interface ToastState {
  open: boolean
  title: string
  description?: string
  variant: 'error' | 'success' | 'warning'
}

interface QuotaField {
  id: keyof FormState
  label: string
  description: string
  unit: string
  step: string
  Icon: typeof Video
  isInteger: boolean
}

const QUOTA_FIELDS: QuotaField[] = [
  {
    id: 'meetingHours',
    label: 'Meeting Hours',
    description: 'Total live meeting time allowed per billing cycle (Studio Go Live).',
    unit: 'hours',
    step: '0.5',
    Icon: Video,
    isInteger: false,
  },
  {
    id: 'publishingHours',
    label: 'Publishing Hours',
    description: 'Total VOD-to-Live streaming time allowed per billing cycle (MAM publish).',
    unit: 'hours',
    step: '0.5',
    Icon: Radio,
    isInteger: false,
  },
  {
    id: 'uploads',
    label: 'Uploads',
    description: 'Number of asset uploads to MAM per billing cycle.',
    unit: 'uploads',
    step: '1',
    Icon: Upload,
    isInteger: true,
  },
  {
    id: 'platforms',
    label: 'Platforms',
    description: 'Number of simultaneous publishing destinations (e.g. YouTube + Facebook).',
    unit: 'platforms',
    step: '1',
    Icon: Layers,
    isInteger: true,
  },
]

export function PlanQuotasTab({ planId }: PlanQuotasTabProps) {
  const { quota, isLoading, error, refetch } = useQuota(planId)
  const { upsertQuota, isSubmitting } = useQuotaMutations()

  const [form, setForm] = useState<FormState>(INITIAL_FORM)
  const [validationError, setValidationError] = useState<string | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [toast, setToast] = useState<ToastState>({ open: false, title: '', variant: 'success' })

  useEffect(() => {
    if (quota) {
      setForm({
        meetingHours: String(quota.meetingHours),
        platforms: String(quota.platforms),
        publishingHours: String(quota.publishingHours),
        uploads: String(quota.uploads),
      })
    } else {
      setForm(INITIAL_FORM)
    }
  }, [quota])

  const validate = (): string | null => {
    for (const field of QUOTA_FIELDS) {
      const raw = form[field.id]
      if (!raw.trim()) return `${field.label} is required`
      const parsed = Number(raw)
      if (Number.isNaN(parsed)) return `${field.label} must be a number`
      if (parsed < 0) return `${field.label} cannot be negative`
      if (field.isInteger && !Number.isInteger(parsed)) return `${field.label} must be a whole number`
    }
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
    const payload: UpsertQuotaRequest = {
      meetingHours: Number(form.meetingHours),
      platforms: Number(form.platforms),
      publishingHours: Number(form.publishingHours),
      uploads: Number(form.uploads),
    }
    try {
      await upsertQuota(planId, payload)
      setToast({ open: true, title: quota ? 'Quota updated' : 'Quota configured', variant: 'success' })
      refetch()
    } catch (err) {
      setToast({
        open: true,
        title: 'Failed to save quota',
        description: err instanceof Error ? err.message : undefined,
        variant: 'error',
      })
    }
  }

  return (
    <div id="admin-plan-quotas-tab" className="max-w-3xl">
      <div id="admin-plan-quotas-header" className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-sm font-semibold text-white/85">Quotas</h2>
          <p className="text-xs text-white/45 mt-0.5">
            Usage limits applied to subscribers on this plan, reset each billing cycle.
          </p>
        </div>
        <button
          id="admin-plan-quotas-btn-save"
          type="button"
          onClick={handleSaveClick}
          disabled={isLoading || isSubmitting}
          className={cn(
            'flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-semibold text-white transition-colors',
            isLoading || isSubmitting
              ? 'bg-[#3031cb]/50 cursor-not-allowed'
              : 'bg-[#3031cb] hover:bg-[#2626a8] cursor-pointer',
          )}
        >
          {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          Save Quota
        </button>
      </div>

      {isLoading && (
        <div id="admin-plan-quotas-loading" className="flex items-center justify-center py-16 text-white/45 text-sm">
          <Loader2 size={16} className="animate-spin mr-2" />
          Loading quota...
        </div>
      )}

      {!isLoading && error && (
        <div
          id="admin-plan-quotas-error"
          className="flex items-start gap-3 rounded-xl border border-red-500/20 bg-[#1a0a0b] px-4 py-3 text-sm text-red-300 mb-4"
        >
          <AlertCircle size={16} className="mt-0.5 shrink-0" />
          <div>
            <div className="font-medium">Failed to load quota</div>
            <div className="text-xs text-red-300/70 mt-0.5">{error}</div>
          </div>
        </div>
      )}

      {!isLoading && (
        <>
          {validationError && (
            <div
              id="admin-plan-quotas-validation"
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

          {!quota && (
            <div
              id="admin-plan-quotas-not-configured"
              className="mb-4 flex items-center gap-2 rounded-lg border border-white/10 bg-surface px-3 py-2 text-xs text-white/55"
            >
              <AlertCircle size={14} className="text-white/45" />
              <span>No quota configured for this plan yet. Set values below and save.</span>
            </div>
          )}

          <div id="admin-plan-quotas-fields" className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {QUOTA_FIELDS.map(field => (
              <div
                key={field.id}
                id={`admin-plan-quotas-field-${field.id}`}
                className="rounded-xl border border-white/8 bg-surface p-4"
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <field.Icon size={14} className="text-[#3031cb]" />
                  <label
                    htmlFor={`admin-plan-quotas-input-${field.id}`}
                    className="text-sm font-medium text-white/90"
                  >
                    {field.label}
                  </label>
                </div>
                <p className="text-xs text-white/45 mb-3 leading-relaxed">{field.description}</p>
                <div className="flex items-center gap-2">
                  <input
                    id={`admin-plan-quotas-input-${field.id}`}
                    type="number"
                    min="0"
                    step={field.step}
                    value={form[field.id]}
                    onChange={e => setForm(prev => ({ ...prev, [field.id]: e.target.value }))}
                    className="flex-1 rounded-lg border border-white/10 bg-primary-bg px-3 py-2 text-sm text-white placeholder-white/30 focus:border-[#3031cb] focus:outline-hidden transition-colors"
                  />
                  <span className="text-xs text-white/45">{field.unit}</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={quota ? 'Update quota?' : 'Configure quota?'}
        description={
          quota
            ? 'Subscribers on this plan will use the new limits from their next billing cycle reset.'
            : 'Subscribers on this plan will start with these usage limits.'
        }
        confirmLabel="Save"
        onConfirm={handleSaveConfirm}
      />

      <Toaster
        id="admin-plan-quotas-toast"
        open={toast.open}
        onOpenChange={open => setToast(prev => ({ ...prev, open }))}
        title={toast.title}
        description={toast.description}
        variant={toast.variant}
      />
    </div>
  )
}
