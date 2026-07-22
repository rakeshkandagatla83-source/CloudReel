import { X, Trash2 } from 'lucide-react'
import { cn } from '../../lib/utils'
import type { Source } from '../../types/layoutBuilder'

interface SourcePropertiesPanelProps {
  source: Source
  onUpdate: (patch: Partial<Source>) => void
  onDelete: () => void
  onClose: () => void
}

interface PropRowProps {
  label: string
  children: React.ReactNode
  two?: boolean
}

function PropRow({ label, children, two }: PropRowProps) {
  return (
    <div className={cn('mb-3.5', two && 'grid grid-cols-2 gap-2.5')}>
      {!two && <label className="block text-sm text-white/55 mb-1.5">{label}</label>}
      {children}
    </div>
  )
}

function NumInput({
  label,
  value,
  min,
  step,
  onChange,
}: {
  label: string
  value: number
  min?: number
  step?: number
  onChange: (v: number) => void
}) {
  return (
    <div>
      <label className="block text-sm text-white/55 mb-1.5">{label}</label>
      <input
        type="number"
        value={value}
        min={min}
        step={step}
        onChange={(e) => onChange(+e.target.value)}
        className="w-full px-3 h-10 rounded bg-white/5 border border-white/10 text-white text-base outline-none focus:border-white/30 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
      />
    </div>
  )
}

function ColorRow({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (v: string) => void
}) {
  const hexVal = value.length === 7 ? value : value.slice(0, 7)
  return (
    <div className="mb-3.5">
      <label className="block text-sm text-white/55 mb-1.5">{label}</label>
      <div className="flex gap-2 items-center">
        <input
          type="color"
          value={hexVal}
          onChange={(e) => onChange(e.target.value)}
          className="w-8 h-10 rounded border border-white/10 cursor-pointer bg-transparent p-0.5 shrink-0"
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="flex-1 min-w-0 px-3 h-10 rounded bg-white/5 border border-white/10 text-white text-base outline-none focus:border-white/30 font-mono"
        />
      </div>
    </div>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-sm font-bold uppercase tracking-widest mt-5 mb-2.5 pb-2 border-b text-white/55 border-white/8">
      {children}
    </p>
  )
}

const FONT_OPTIONS = [
  'Arial',
  'Helvetica',
  'Georgia',
  'Verdana',
  'Trebuchet MS',
  'Courier New',
  'Times New Roman',
]

export function SourcePropertiesPanel({ source, onUpdate, onDelete, onClose }: SourcePropertiesPanelProps) {
  return (
    <div className="w-72 shrink-0 bg-secondary-bg border-l border-white/8 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/8 shrink-0 bg-primary-bg">
        <span className="text-sm font-bold text-white/60 uppercase tracking-wider">
          Properties
        </span>
        <button
          type="button"
          onClick={onClose}
          className="text-white/30 hover:text-white/70 transition-colors cursor-pointer"
        >
          <X size={16} />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-3 py-2 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:bg-white/10 [&::-webkit-scrollbar-thumb]:rounded">
        <SectionLabel>Source</SectionLabel>
        <PropRow label="Name">
          <input
            type="text"
            value={source.label}
            onChange={(e) => onUpdate({ label: e.target.value })}
            className="w-full px-3 h-10 rounded bg-white/5 border border-white/10 text-white text-base outline-none focus:border-white/30"
          />
        </PropRow>

        <SectionLabel>Position & Size</SectionLabel>
        <div className="grid grid-cols-2 gap-2 mb-3">
          <NumInput label="X" value={source.x} onChange={(v) => onUpdate({ x: v })} />
          <NumInput label="Y" value={source.y} onChange={(v) => onUpdate({ y: v })} />
        </div>
        <div className="grid grid-cols-2 gap-2 mb-3">
          <NumInput label="Width" value={source.w} min={80} onChange={(v) => onUpdate({ w: v })} />
          <NumInput label="Height" value={source.h} min={45} onChange={(v) => onUpdate({ h: v })} />
        </div>

        <SectionLabel>Background</SectionLabel>
        <ColorRow label="Color" value={source.bgColor} onChange={(v) => onUpdate({ bgColor: v })} />

        <SectionLabel>Border</SectionLabel>
        <ColorRow
          label="Border Color"
          value={source.borderColor}
          onChange={(v) => onUpdate({ borderColor: v })}
        />
        <div className="grid grid-cols-2 gap-2 mb-3">
          <NumInput
            label="Weight (px)"
            value={source.borderWidth}
            min={0}
            onChange={(v) => onUpdate({ borderWidth: v })}
          />
          <NumInput
            label="Radius (px)"
            value={source.borderRadius}
            min={0}
            onChange={(v) => onUpdate({ borderRadius: v })}
          />
        </div>

        <SectionLabel>Caption</SectionLabel>
        <label className="flex items-center gap-2.5 mb-3.5 cursor-pointer">
          <input
            type="checkbox"
            checked={source.showCaption}
            onChange={(e) => onUpdate({ showCaption: e.target.checked })}
            className="accent-blue-500 w-5 h-5 cursor-pointer"
          />
          <span className="text-base text-white/70">Show Caption</span>
        </label>

        {source.showCaption && (
          <>
            <PropRow label="Caption Text">
              <input
                type="text"
                value={source.captionText}
                placeholder="Auto = source name"
                onChange={(e) => onUpdate({ captionText: e.target.value })}
                className="w-full px-3 h-10 rounded bg-white/5 border border-white/10 text-white text-base outline-none focus:border-white/30"
              />
            </PropRow>

            <PropRow label="Font">
              <select
                value={source.captionFont}
                onChange={(e) => onUpdate({ captionFont: e.target.value })}
                className="w-full px-3 h-10 rounded bg-white/5 border border-white/10 text-white text-base outline-none focus:border-white/30 cursor-pointer"
              >
                {FONT_OPTIONS.map((f) => (
                  <option key={f} value={f} className="bg-secondary-bg">
                    {f}
                  </option>
                ))}
              </select>
            </PropRow>

            <NumInput
              label="Font Size"
              value={source.captionFontSize}
              min={8}
              onChange={(v) => onUpdate({ captionFontSize: v })}
            />
            <div className="mb-3" />

            <div className="grid grid-cols-2 gap-2 mb-3">
              <div>
                <label className="block text-sm text-white/55 mb-1.5">Font Color</label>
                <input
                  type="color"
                  value={source.captionColor}
                  onChange={(e) => onUpdate({ captionColor: e.target.value })}
                  className="w-full h-10 rounded border border-white/10 cursor-pointer bg-transparent p-0.5"
                />
              </div>
              <div>
                <label className="block text-sm text-white/55 mb-1.5">Caption BG</label>
                <input
                  type="color"
                  value={source.captionBg.slice(0, 7)}
                  onChange={(e) => onUpdate({ captionBg: e.target.value + 'cc' })}
                  className="w-full h-10 rounded border border-white/10 cursor-pointer bg-transparent p-0.5"
                />
              </div>
            </div>

            <ColorRow
              label="Border Color"
              value={source.captionBorderColor}
              onChange={(v) => onUpdate({ captionBorderColor: v })}
            />

            <div className="grid grid-cols-2 gap-2 mb-3">
              <NumInput
                label="Border Weight"
                value={source.captionBorderWidth}
                min={0}
                onChange={(v) => onUpdate({ captionBorderWidth: v })}
              />
              <NumInput
                label="Border Radius"
                value={source.captionRadius}
                min={0}
                onChange={(v) => onUpdate({ captionRadius: v })}
              />
            </div>

            <NumInput
              label="Animation (ms)"
              value={source.captionAnim}
              min={0}
              step={100}
              onChange={(v) => onUpdate({ captionAnim: v })}
            />
          </>
        )}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-white/8 shrink-0">
        <button
          type="button"
          onClick={onDelete}
          className="w-full flex items-center justify-center gap-2 h-10 rounded-lg border border-red-900/50 bg-red-950/30 text-red-400 text-base font-semibold cursor-pointer hover:bg-red-950/60 transition-colors"
        >
          <Trash2 size={13} />
          Delete Source
        </button>
      </div>
    </div>
  )
}
