import { useState, useCallback } from 'react'
import { X } from 'lucide-react'
import type { AssetFilterState } from '../../types/asset'
import { CATEGORY_OPTIONS, SUBCATEGORY_OPTIONS } from './assetUtils'
import { Select, SelectItem } from '../../components/ui/Select'

function epochToDateStr(epoch: number): string {
  if (!epoch) return ''
  const d = new Date(epoch * 1000)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function dateStrToEpoch(str: string): number {
  if (!str) return 0
  return Math.floor(new Date(str).getTime() / 1000)
}

interface DraftState {
  category: string
  subCategory: string
  createFrom: string
  createTo: string
  uploadFrom: string
  uploadTo: string
}

function toDraft(f: AssetFilterState): DraftState {
  return {
    category: f.category,
    subCategory: f.subCategory,
    createFrom: epochToDateStr(f.createFrom),
    createTo: epochToDateStr(f.createTo),
    uploadFrom: epochToDateStr(f.uploadFrom),
    uploadTo: epochToDateStr(f.uploadTo),
  }
}

const EMPTY_DRAFT: DraftState = {
  category: '',
  subCategory: '',
  createFrom: '',
  createTo: '',
  uploadFrom: '',
  uploadTo: '',
}

interface AssetFiltersProps {
  filters: AssetFilterState
  onApply: (updates: Partial<AssetFilterState>) => void
}

const dateClass = 'w-full outline-hidden'

const labelClass = 'mb-1.5 block text-base font-semibold uppercase tracking-widest text-white/65'

export function AssetFilters({ filters, onApply }: AssetFiltersProps) {
  const [draft, setDraft] = useState<DraftState>(() => toDraft(filters))

  const set = useCallback(<K extends keyof DraftState>(key: K, val: DraftState[K]) => {
    setDraft((prev) => ({ ...prev, [key]: val }))
  }, [])

  const handleApply = useCallback(() => {
    onApply({
      category: draft.category,
      subCategory: draft.subCategory,
      createFrom: dateStrToEpoch(draft.createFrom),
      createTo: dateStrToEpoch(draft.createTo),
      uploadFrom: dateStrToEpoch(draft.uploadFrom),
      uploadTo: dateStrToEpoch(draft.uploadTo),
    })
  }, [draft, onApply])

  const handleClear = useCallback(() => {
    setDraft(EMPTY_DRAFT)
    onApply({
      category: '',
      subCategory: '',
      createFrom: 0,
      createTo: 0,
      uploadFrom: 0,
      uploadTo: 0,
    })
  }, [onApply])

  const isDirty =
    draft.category !== '' ||
    draft.subCategory !== '' ||
    draft.createFrom !== '' ||
    draft.createTo !== '' ||
    draft.uploadFrom !== '' ||
    draft.uploadTo !== ''

  return (
    <div className="rounded-xl border border-white/10 bg-secondary-bg p-4">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {/* Category */}
        <div>
          <label className={labelClass}>Type</label>
          <Select
            value={draft.category}
            onValueChange={v => set('category', v)}
            className="w-full"
          >
            {CATEGORY_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </Select>
        </div>

        {/* Sub Category */}
        <div>
          <label className={labelClass}>Sub Category</label>
          <Select
            value={draft.subCategory}
            onValueChange={v => set('subCategory', v)}
            className="w-full"
          >
            {SUBCATEGORY_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
            ))}
          </Select>
        </div>

        {/* Created From */}
        <div>
          <label className={labelClass}>Created From</label>
          <input
            type="date"
            value={draft.createFrom}
            onChange={(e) => set('createFrom', e.target.value)}
            className={dateClass}
          />
        </div>

        {/* Created To */}
        <div>
          <label className={labelClass}>Created To</label>
          <input
            type="date"
            value={draft.createTo}
            onChange={(e) => set('createTo', e.target.value)}
            className={dateClass}
          />
        </div>

        {/* Uploaded From */}
        <div>
          <label className={labelClass}>Uploaded From</label>
          <input
            type="date"
            value={draft.uploadFrom}
            onChange={(e) => set('uploadFrom', e.target.value)}
            className={dateClass}
          />
        </div>

        {/* Uploaded To */}
        <div>
          <label className={labelClass}>Uploaded To</label>
          <input
            type="date"
            value={draft.uploadTo}
            onChange={(e) => set('uploadTo', e.target.value)}
            className={dateClass}
          />
        </div>
      </div>

      {/* Actions */}
      <div className="mt-4 flex items-center justify-end gap-2">
        {isDirty && (
          <button
            onClick={handleClear}
            className="flex h-10 cursor-pointer items-center gap-1.5 rounded-lg border border-white/10 px-4 text-base text-white/70 transition-colors hover:border-white/20 hover:text-white/80"
          >
            <X size={14} />
            Clear
          </button>
        )}
        <button
          onClick={handleApply}
          className="h-10 cursor-pointer rounded-lg bg-[#3031cb] px-4 text-base font-semibold text-white transition-colors hover:bg-[#2626a8]"
        >
          Apply Filters
        </button>
      </div>
    </div>
  )
}
