import { useState, useEffect, useRef } from 'react'
import { MoreVertical } from 'lucide-react'

export interface AssetMoreMenuItem {
  label: string
  icon: React.ReactNode
  onClick: () => void
  danger?: boolean
}

interface AssetMoreMenuProps {
  triggerId: string
  items: AssetMoreMenuItem[]
  triggerClassName?: string
}

export function AssetMoreMenu({ triggerId, items, triggerClassName }: AssetMoreMenuProps) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handlePointerDown(e: PointerEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [open])

  return (
    <div ref={containerRef} className="relative">
      <button
        id={triggerId}
        type="button"
        title="More options"
        onClick={(e) => { e.stopPropagation(); setOpen((o) => !o) }}
        className={triggerClassName}
      >
        <MoreVertical size={13} />
      </button>
      {open && (
        <div
          id={`${triggerId}-menu`}
          className="absolute right-0 top-full z-50 mt-1 min-w-36 overflow-hidden rounded-xl border border-white/15 bg-[#111827] p-1 shadow-2xl shadow-black/60"
          onClick={(e) => e.stopPropagation()}
        >
          {items.map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={() => { item.onClick(); setOpen(false) }}
              className={`flex w-full cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-[13px] outline-none transition-colors ${
                item.danger
                  ? 'text-red-400 hover:bg-red-500/10 hover:text-red-300'
                  : 'text-white/70 hover:bg-white/8 hover:text-white'
              }`}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
