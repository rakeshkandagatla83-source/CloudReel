import { useState } from 'react'
import { X } from 'lucide-react'
import { cn } from '../../lib/utils'
import { useStudioCtx } from './StudioContext'
import { STREAMING_PRESETS } from '../../lib/studioConfig'
import type { Destination } from '../../types/studio'

interface Props {
  open: boolean
  onClose: () => void
}

export function DestinationModal({ open, onClose }: Props) {
  const { addDestination } = useStudioCtx()
  const [presetIdx, setPresetIdx] = useState<number | null>(null)
  const [name, setName] = useState('')
  const [fields, setFields] = useState<Record<string, string>>({})
  const [err, setErr] = useState('')

  if (!open) return null

  function selectPreset(idx: number) {
    setPresetIdx(idx); setFields({}); setErr('')
    if (!name) setName(STREAMING_PRESETS[idx].platform + ' Stream')
  }

  function handleSave() {
    setErr('')
    if (presetIdx === null) { setErr('Please select a platform.'); return }
    if (!name.trim()) { setErr('Display name is required.'); return }
    const preset = STREAMING_PRESETS[presetIdx]
    const dest: Destination = {
      id: Date.now() + '_' + Math.random().toString(36).slice(2, 7),
      platform: preset.platform, icon: preset.icon, color: preset.color,
      name: name.trim(), fields, startApi: preset.startApi, stopApi: preset.stopApi,
      fieldDefs: preset.fields, streaming: false,
    }
    addDestination(dest)
    setPresetIdx(null); setName(''); setFields({}); setErr('')
    onClose()
  }

  const inputCls = 'px-2.5 py-1.5 rounded-lg bg-surface border border-primary-border text-sm text-primary-text placeholder-secondary-text outline-none focus:border-[#3031cb]/40 transition-colors w-full'

  return (
    <div
      className="fixed inset-0 z-[300] bg-black/70 backdrop-blur-sm flex items-center justify-center"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-surface border border-primary-border rounded-2xl p-5 w-72 max-h-[90vh] overflow-y-auto flex flex-col gap-3 shadow-xl">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-[#3031cb]">+ Add Destination</h3>
          <button type="button" onClick={onClose} className="text-secondary-text hover:text-primary-text cursor-pointer transition-colors"><X size={14} /></button>
        </div>
        <p className="text-[10px] text-secondary-text -mt-1 text-center">Choose a platform</p>

        {/* Platform grid */}
        <div className="grid grid-cols-2 gap-1.5">
          {STREAMING_PRESETS.map((p, i) => (
            <button
              key={p.platform}
              type="button"
              onClick={() => selectPreset(i)}
              className={cn(
                'flex flex-col items-center gap-1 py-2.5 px-1 rounded-xl border-2 text-[11px] font-bold cursor-pointer transition-all',
                presetIdx === i ? 'text-white' : 'border-primary-border bg-surface-2 text-secondary-text hover:border-active-accent/30 hover:text-primary-text',
              )}
              style={presetIdx === i ? { borderColor: p.color, background: p.color, color: '#fff' } : {}}
            >
              <span className="text-sm">{p.icon}</span>
              {p.platform}
            </button>
          ))}
        </div>

        {/* Name */}
        <div className="flex flex-col gap-1">
          <label className="text-[10px] text-secondary-text">Display Name</label>
          <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Main YouTube Stream" className={inputCls} />
        </div>

        {/* Fields */}
        {presetIdx !== null && STREAMING_PRESETS[presetIdx].fields.map(f => (
          <div key={f.key} className="flex flex-col gap-1">
            <label className="text-[10px] text-secondary-text">{f.label}</label>
            <input
              type={f.type || 'text'}
              value={fields[f.key] || ''}
              onChange={e => setFields(prev => ({ ...prev, [f.key]: e.target.value }))}
              placeholder={f.placeholder}
              className={inputCls}
            />
          </div>
        ))}

        {err && <p className="text-[10px] text-[#3031cb] text-center">{err}</p>}

        <div className="flex gap-2 mt-1">
          <button type="button" onClick={handleSave} className="flex-1 py-2 rounded-lg bg-[#3031cb] hover:bg-[#2829b0] text-white font-bold text-xs cursor-pointer transition-colors">Save</button>
          <button type="button" onClick={onClose} className="flex-1 py-2 rounded-lg bg-surface-2 hover:bg-surface border border-primary-border text-secondary-text font-bold text-xs cursor-pointer transition-colors">Cancel</button>
        </div>
      </div>
    </div>
  )
}
