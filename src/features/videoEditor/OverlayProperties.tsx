import { Trash2 } from 'lucide-react'
import type { Overlay, TextOverlay } from './VideoEditorTypes'
import { FONTS, fmtTime } from './VideoEditorTypes'

interface Props {
  overlay: Overlay
  duration: number
  onChange: (patch: Partial<Overlay>) => void
  onRemove: () => void
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 mt-1.5">
      <span className="w-14 shrink-0 text-[10px] text-slate-500">{label}</span>
      <div className="flex flex-1 items-center gap-1.5 min-w-0">{children}</div>
    </div>
  )
}

function SliderRow({ label, min, max, step = 1, value, unit = '', onChange }: { label: string; min: number; max: number; step?: number; value: number; unit?: string; onChange: (v: number) => void }) {
  return (
    <Row label={label}>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        className="h-1 flex-1 accent-blue-500"
        onChange={e => onChange(+e.target.value)}
      />
      <span className="w-8 shrink-0 text-right text-[10px] text-slate-500">{value}{unit}</span>
    </Row>
  )
}

function NumberInput({ value, min, max, onChange }: { value: number; min?: number; max?: number; onChange: (v: number) => void }) {
  return (
    <input
      type="number"
      min={min}
      max={max}
      value={value}
      className="flex-1 min-w-0 rounded border border-[#1e2d40] bg-primary-bg px-1.5 py-0.5 text-[10px] text-slate-300 outline-hidden focus:border-blue-500"
      onChange={e => onChange(+e.target.value)}
    />
  )
}

function TimeInput({ value, duration, onChange }: { value: number; duration: number; onChange: (v: number) => void }) {
  return (
    <input
      type="text"
      defaultValue={fmtTime(value)}
      key={fmtTime(value)}
      className="w-14 rounded border border-[#1e2d40] bg-primary-bg px-1.5 py-0.5 text-[10px] text-slate-300 outline-hidden focus:border-blue-500"
      onBlur={e => {
        const parts = e.target.value.split(':')
        let t = 0
        if (parts.length === 2) t = parseInt(parts[0]) * 60 + parseFloat(parts[1])
        else if (parts.length === 3) t = parseInt(parts[0]) * 3600 + parseInt(parts[1]) * 60 + parseFloat(parts[2])
        onChange(Math.max(0, Math.min(duration, t)))
      }}
    />
  )
}

function StyleBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`flex h-6 w-6 cursor-pointer items-center justify-center rounded border text-xs ${
        active ? 'border-blue-500 bg-blue-600 text-white' : 'border-[#1e2d40] bg-primary-bg text-slate-400 hover:text-white'
      }`}
    >
      {children}
    </button>
  )
}

export function OverlayProperties({ overlay: ov, duration, onChange, onRemove }: Props) {
  const to = ov.type === 'text' ? (ov as TextOverlay) : null

  return (
    <div id="ve-ov-props" className="flex flex-1 flex-col overflow-y-auto p-2 text-xs">
      {/* Position & Size */}
      <p className="mt-1 text-[9px] font-bold uppercase tracking-widest text-slate-600">Position & Size</p>
      <Row label="X %"><NumberInput value={Math.round(ov.xPct)} min={0} max={98} onChange={v => onChange({ xPct: v })} /></Row>
      <Row label="Y %"><NumberInput value={Math.round(ov.yPct)} min={0} max={98} onChange={v => onChange({ yPct: v })} /></Row>
      <Row label="Width %"><NumberInput value={Math.round(ov.wPct)} min={3} max={90} onChange={v => onChange({ wPct: v })} /></Row>
      <SliderRow label="Rotate" min={0} max={360} value={Math.round(ov.rotation)} unit="°" onChange={v => onChange({ rotation: v })} />
      <SliderRow label="Opacity" min={0} max={100} value={ov.opacity} unit="%" onChange={v => onChange({ opacity: v })} />

      {/* Visibility */}
      <p className="mt-3 text-[9px] font-bold uppercase tracking-widest text-slate-600">Visibility</p>
      <Row label="From"><TimeInput value={ov.showFrom} duration={duration} onChange={v => onChange({ showFrom: v })} /></Row>
      <Row label="To"><TimeInput value={ov.showTo} duration={duration} onChange={v => onChange({ showTo: v })} /></Row>

      {/* Text-specific */}
      {to && (
        <>
          <p className="mt-3 text-[9px] font-bold uppercase tracking-widest text-slate-600">Text Content</p>
          <textarea
            value={to.text}
            rows={3}
            className="mt-1.5 w-full resize-none rounded border border-[#1e2d40] bg-primary-bg px-2 py-1 text-xs text-slate-300 outline-hidden focus:border-blue-500"
            onChange={e => onChange({ text: e.target.value } as Partial<Overlay>)}
          />

          <p className="mt-3 text-[9px] font-bold uppercase tracking-widest text-slate-600">Font</p>
          <Row label="Family">
            <select
              value={to.fontFamily}
              className="flex-1 rounded border border-[#1e2d40] bg-primary-bg px-1 py-0.5 text-[10px] text-slate-300 outline-hidden focus:border-blue-500"
              onChange={e => onChange({ fontFamily: e.target.value } as Partial<Overlay>)}
            >
              {FONTS.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
          </Row>
          <SliderRow label="Size" min={8} max={120} value={to.fontSize} unit="px" onChange={v => onChange({ fontSize: v } as Partial<Overlay>)} />
          <Row label="Style">
            <div className="flex gap-1">
              <StyleBtn active={to.bold} onClick={() => onChange({ bold: !to.bold } as Partial<Overlay>)}><b>B</b></StyleBtn>
              <StyleBtn active={to.italic} onClick={() => onChange({ italic: !to.italic } as Partial<Overlay>)}><i>I</i></StyleBtn>
              <StyleBtn active={to.underline} onClick={() => onChange({ underline: !to.underline } as Partial<Overlay>)}><u>U</u></StyleBtn>
            </div>
          </Row>
          <Row label="Align">
            <div className="flex gap-1">
              {(['left', 'center', 'right'] as const).map(a => (
                <StyleBtn key={a} active={to.align === a} onClick={() => onChange({ align: a } as Partial<Overlay>)}>
                  {a === 'left' ? 'L' : a === 'center' ? 'C' : 'R'}
                </StyleBtn>
              ))}
            </div>
          </Row>
          <SliderRow label="Letter Sp" min={-5} max={20} value={to.letterSpacing} unit="px" onChange={v => onChange({ letterSpacing: v } as Partial<Overlay>)} />
          <SliderRow label="Line H" min={0.8} max={3} step={0.1} value={to.lineHeight} onChange={v => onChange({ lineHeight: v } as Partial<Overlay>)} />

          <p className="mt-3 text-[9px] font-bold uppercase tracking-widest text-slate-600">Colors</p>
          <Row label="Text">
            <input type="color" value={to.fontColor} className="h-6 w-7 cursor-pointer rounded border border-[#1e2d40] bg-primary-bg p-px" onChange={e => onChange({ fontColor: e.target.value } as Partial<Overlay>)} />
          </Row>
          <Row label="BG Color">
            <input type="color" value={to.bgColor} className="h-6 w-7 cursor-pointer rounded border border-[#1e2d40] bg-primary-bg p-px" onChange={e => onChange({ bgColor: e.target.value } as Partial<Overlay>)} />
          </Row>
          <SliderRow label="BG Alpha" min={0} max={100} value={to.bgOpacity} unit="%" onChange={v => onChange({ bgOpacity: v } as Partial<Overlay>)} />
          <SliderRow label="Padding" min={0} max={40} value={to.padding} unit="px" onChange={v => onChange({ padding: v } as Partial<Overlay>)} />
          <SliderRow label="Radius" min={0} max={30} value={to.borderRadius} unit="px" onChange={v => onChange({ borderRadius: v } as Partial<Overlay>)} />

          <p className="mt-3 text-[9px] font-bold uppercase tracking-widest text-slate-600">Stroke</p>
          <SliderRow label="Width" min={0} max={10} value={to.strokeWidth} unit="px" onChange={v => onChange({ strokeWidth: v } as Partial<Overlay>)} />
          <Row label="Color">
            <input type="color" value={to.strokeColor} className="h-6 w-7 cursor-pointer rounded border border-[#1e2d40] bg-primary-bg p-px" onChange={e => onChange({ strokeColor: e.target.value } as Partial<Overlay>)} />
          </Row>

          <p className="mt-3 text-[9px] font-bold uppercase tracking-widest text-slate-600">Shadow</p>
          <Row label="">
            <label className="flex cursor-pointer items-center gap-1.5 text-[10px] text-slate-400">
              <input type="checkbox" checked={to.shadow} onChange={e => onChange({ shadow: e.target.checked } as Partial<Overlay>)} />
              Enable shadow
            </label>
          </Row>
          <Row label="Color">
            <input type="color" value={to.shadowColor} className="h-6 w-7 cursor-pointer rounded border border-[#1e2d40] bg-primary-bg p-px" onChange={e => onChange({ shadowColor: e.target.value } as Partial<Overlay>)} />
          </Row>
          <SliderRow label="Blur" min={0} max={30} value={to.shadowBlur} unit="px" onChange={v => onChange({ shadowBlur: v } as Partial<Overlay>)} />
        </>
      )}

      <button
        id="ve-btn-ov-remove"
        className="mt-4 flex w-full cursor-pointer items-center justify-center gap-1.5 rounded bg-[#2d1010] py-1.5 text-xs font-semibold text-red-400 hover:bg-[#3d1515]"
        onClick={onRemove}
      >
        <Trash2 size={11} />
        Remove Overlay
      </button>
    </div>
  )
}
