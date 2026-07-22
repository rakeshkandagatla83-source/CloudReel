import * as RadixToast from '@radix-ui/react-toast'
import { X, AlertCircle } from 'lucide-react'
import { cn } from '../../lib/utils'

interface ToasterProps {
  id?: string
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  variant?: 'error' | 'success' | 'warning'
  viewportClassName?: string
}

export function Toaster({ id, open, onOpenChange, title, description, variant = 'error', viewportClassName }: ToasterProps) {
  return (
    <RadixToast.Provider swipeDirection="right">
      <RadixToast.Root
        id={id}
        open={open}
        onOpenChange={onOpenChange}
        duration={4000}
        className={cn(
          'flex items-start gap-3 rounded-xl border px-4 py-3.5 shadow-xl',
          'data-[state=open]:animate-in data-[state=closed]:animate-out',
          'data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0',
          'data-[state=open]:slide-in-from-bottom-4 data-[state=closed]:slide-out-to-right-4',
          'duration-200',
          variant === 'error'
            ? 'bg-[#1a0a0b] border-red-500/20'
            : variant === 'warning'
              ? 'bg-[#1a140a] border-amber-500/20'
              : 'bg-[#0a1a0f] border-emerald-500/20',
        )}
      >
        <AlertCircle
          size={16}
          className={cn(
            'mt-0.5 shrink-0',
            variant === 'error' ? 'text-red-400' : variant === 'warning' ? 'text-amber-400' : 'text-emerald-400',
          )}
        />
        <div className="flex-1 min-w-0">
          <RadixToast.Title className="text-sm font-semibold text-white">
            {title}
          </RadixToast.Title>
          {description && (
            <RadixToast.Description className="mt-0.5 text-xs text-white/45">
              {description}
            </RadixToast.Description>
          )}
        </div>
        <RadixToast.Close
          className="mt-0.5 text-white/25 hover:text-white/60 transition-colors cursor-pointer"
          aria-label="Close"
        >
          <X size={14} />
        </RadixToast.Close>
      </RadixToast.Root>

      <RadixToast.Viewport className={cn('fixed bottom-6 right-6 z-100 flex flex-col gap-2 w-80 outline-none', viewportClassName)} />
    </RadixToast.Provider>
  )
}
