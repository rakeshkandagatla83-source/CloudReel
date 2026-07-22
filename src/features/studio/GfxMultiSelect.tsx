import { useState, useEffect, useRef } from 'react'
import { ChevronDown } from 'lucide-react'
import { cn } from '../../lib/utils'
import { bandLabel } from '../../lib/studioConfig'

interface Props {
  type: 'start' | 'stop'
  selected: string[]
  bandKeys: string[]
  disabledKeys?: string[]
  onChange: (keys: string[]) => void
}

export function GfxMultiSelect({ type, selected, bandKeys, disabledKeys = [], onChange }: Props) {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)
  const isStop = type === 'stop'

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const toggle = (key: string) => {
    if (selected.includes(key)) onChange(selected.filter(k => k !== key))
    else onChange([...selected, key])
  }

  // Start GFX uses emerald (semantic: turning ON)
  // Stop GFX uses red (semantic: turning OFF)
  const triggerCls = isStop
    ? 'bg-[#e00000]/8 text-[#e00000]/70 border-[#e00000]/15 hover:bg-[#e00000]/12 hover:border-[#e00000]/30'
    : 'bg-[#24dd6e]/10 text-[#24dd6e] border-[#24dd6e]/25 hover:bg-[#24dd6e]/20 hover:border-[#24dd6e]/40'
  const ddBg = isStop ? 'bg-surface border-[#e00000]/15' : 'bg-surface border-[#24dd6e]/30'
  const itemHover = isStop ? 'hover:bg-[#e00000]/8' : 'hover:bg-[#24dd6e]/5'
  const cntCls = isStop ? 'bg-[#e00000]/15 text-[#e00000]/80' : 'bg-[#24dd6e]/20 text-[#24dd6e]'
  const allBtnCls = isStop ? 'bg-[#e00000]/10 text-[#e00000]/70 hover:bg-[#e00000]/20' : 'bg-[#24dd6e]/10 text-[#24dd6e] hover:bg-[#24dd6e]/20'
  const label = isStop ? 'Stop GFX' : 'Start GFX'

  return (
    <div ref={wrapRef} className="relative w-full">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className={cn('w-full flex items-center justify-between gap-1 px-2 py-1 rounded-lg border text-[10px] cursor-pointer transition-colors', triggerCls)}
      >
        <span className="truncate">{label}</span>
        <div className="flex items-center gap-1 shrink-0">
          {selected.length > 0 && <span className={cn('text-[9px] px-1.5 py-0.5 rounded-full font-bold', cntCls)}>{selected.length}</span>}
          <ChevronDown size={9} className={cn('transition-transform', open && 'rotate-180')} />
        </div>
      </button>

      {open && (
        <div className={cn('absolute top-full left-0 mt-0.5 w-44 rounded-lg border z-[200] shadow-xl flex flex-col overflow-hidden', ddBg)}>
          <div className="px-2 py-1 text-[9px] font-semibold uppercase tracking-wider text-secondary-text border-b border-primary-border">
            {isStop ? 'Turn OFF on fire' : 'Turn ON on fire'}
          </div>
          <div className="max-h-36 overflow-y-auto p-1 flex flex-col gap-0.5">
            {bandKeys.length === 0 ? (
              <div className="text-[10px] text-white/25 text-center py-2">No GFX loaded.<br />Click ⟳ Refresh.</div>
            ) : bandKeys.map(key => {
              const isDisabled = disabledKeys.includes(key)
              return (
                <label key={key} className={cn(
                  'flex items-center gap-1.5 px-1.5 py-1 rounded text-[10px]',
                  isDisabled ? 'cursor-not-allowed text-white/25' : cn('cursor-pointer text-white/65', itemHover),
                )}>
                  <input
                    type="checkbox"
                    checked={selected.includes(key)}
                    disabled={isDisabled}
                    onChange={() => toggle(key)}
                    className={cn('w-3 h-3 shrink-0', isDisabled ? 'cursor-not-allowed' : 'cursor-pointer', isStop ? 'accent-[#e00000]' : 'accent-[#24dd6e]')}
                  />
                  <span className="truncate">{bandLabel(key)}</span>
                </label>
              )
            })}
          </div>
          <div className="flex gap-1 p-1 border-t border-white/6">
            <button type="button" onClick={() => onChange(bandKeys.filter(k => !disabledKeys.includes(k)))} className={cn('flex-1 py-1 rounded text-[9px] font-bold cursor-pointer transition-colors', allBtnCls)}>All</button>
            <button type="button" onClick={() => onChange([])} className="flex-1 py-1 rounded text-[9px] font-bold bg-surface-2 text-secondary-text hover:bg-primary-border cursor-pointer transition-colors">None</button>
          </div>
        </div>
      )}
    </div>
  )
}
