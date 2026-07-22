import { useRef, useEffect } from 'react'
import * as RadixDialog from '@radix-ui/react-dialog'
import { cn } from '../../lib/utils'
import { getStorage, setStorage } from '../../lib/storage'

const STORAGE_KEY = 'gfx_dialog_pos'

interface StoredPos { x: number; y: number }

function getInitialPos(): StoredPos {
  const stored = getStorage<StoredPos>(STORAGE_KEY)
  if (stored && typeof stored.x === 'number' && typeof stored.y === 'number') return stored
  return {
    x: Math.max(0, Math.round(window.innerWidth / 2 - 300)),
    y: Math.max(0, Math.round(window.innerHeight / 2 - 250)),
  }
}

interface Props {
  children: React.ReactNode
  className?: string
}

export function GfxDraggableContent({ children, className }: Props) {
  // Outer plain div handles all drag positioning — no Radix event overhead on mousemove.
  // RadixDialog.Content is kept solely for animation, aria, and focus management.
  const outerRef = useRef<HTMLDivElement>(null)
  const posRef = useRef<StoredPos>(getInitialPos())
  const draggingRef = useRef(false)
  const originRef = useRef({ mx: 0, my: 0, ex: 0, ey: 0 })

  useEffect(() => {
    function onMouseMove(e: MouseEvent) {
      if (!draggingRef.current || !outerRef.current) return
      const { mx, my, ex, ey } = originRef.current
      const x = Math.max(0, Math.min(window.innerWidth - 100, ex + e.clientX - mx))
      const y = Math.max(0, Math.min(window.innerHeight - 40, ey + e.clientY - my))
      posRef.current = { x, y }
      outerRef.current.style.transform = `translate(${x}px, ${y}px)`
    }
    function onMouseUp() {
      if (!draggingRef.current) return
      draggingRef.current = false
      document.body.style.userSelect = ''
      document.body.style.cursor = ''
      setStorage(STORAGE_KEY, posRef.current)
    }
    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
    return () => {
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
    }
  }, [])

  function handleMouseDown(e: React.MouseEvent) {
    if (e.button !== 0) return
    const target = e.target as HTMLElement
    if (target.closest('button,input,select,textarea,[role="combobox"],[role="option"],[role="listbox"],[role="slider"],[draggable="true"]')) return
    const el = outerRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    draggingRef.current = true
    originRef.current = { mx: e.clientX, my: e.clientY, ex: rect.left, ey: rect.top }
    document.body.style.userSelect = 'none'
    document.body.style.cursor = 'grabbing'
  }

  const { x, y } = posRef.current

  return (
    <div
      id="gfx-draggable-positioner"
      ref={outerRef}
      onMouseDown={handleMouseDown}
      style={{ position: 'fixed', left: 0, top: 0, transform: `translate(${x}px, ${y}px)`, zIndex: 50 }}
      className="cursor-move"
    >
      <RadixDialog.Content
        onInteractOutside={e => e.preventDefault()}
        className={cn(
          'data-[state=open]:animate-in data-[state=closed]:animate-out',
          'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
          'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
          'duration-200',
          className,
        )}
      >
        {children}
      </RadixDialog.Content>
    </div>
  )
}
