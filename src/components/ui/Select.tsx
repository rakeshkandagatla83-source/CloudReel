import * as RadixSelect from '@radix-ui/react-select'
import { ChevronDown, Check } from 'lucide-react'
import { cn } from '../../lib/utils'

// Sentinel for empty-string values since Radix treats '' as uncontrolled
const EMPTY_SENTINEL = '__empty__'

export interface SelectProps {
  value: string | undefined
  onValueChange: (value: string) => void
  disabled?: boolean
  placeholder?: string
  /** Extra classes merged onto the trigger button (add padding, text-size, width, etc.) */
  className?: string
  children: React.ReactNode
}

export interface SelectItemProps {
  value: string
  disabled?: boolean
  children: React.ReactNode
}

export function Select({ value, onValueChange, disabled, placeholder, className, children }: SelectProps) {
  const radixValue = value === undefined ? undefined : value === '' ? EMPTY_SENTINEL : value

  return (
    <RadixSelect.Root
      value={radixValue}
      onValueChange={v => onValueChange(v === EMPTY_SENTINEL ? '' : v)}
      disabled={disabled}
    >
      <RadixSelect.Trigger
        className={cn(
          'flex items-center justify-between gap-2',
          'bg-white/4 border border-white/8 rounded-lg',
          'text-white/75 text-base px-3.5 py-2 min-h-10',
          'focus:outline-hidden focus:border-[#3031cb]/40',
          'disabled:opacity-25 disabled:cursor-not-allowed cursor-pointer',
          'transition-colors',
          className,
        )}
      >
        <RadixSelect.Value placeholder={placeholder ?? ''} />
        <RadixSelect.Icon className="shrink-0">
          <ChevronDown size={14} className="text-white/40" />
        </RadixSelect.Icon>
      </RadixSelect.Trigger>

      <RadixSelect.Portal>
        <RadixSelect.Content
          position="popper"
          sideOffset={4}
          className={cn(
            'z-[200] min-w-[var(--radix-select-trigger-width)] max-h-60 overflow-hidden',
            'bg-secondary-bg border border-white/10 rounded-lg shadow-xl',
            'data-[state=open]:animate-in data-[state=closed]:animate-out',
            'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
            'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
            'duration-150',
          )}
        >
          <RadixSelect.Viewport className="p-1 max-h-60 overflow-y-auto">
            {children}
          </RadixSelect.Viewport>
        </RadixSelect.Content>
      </RadixSelect.Portal>
    </RadixSelect.Root>
  )
}

export function SelectItem({ value, disabled, children }: SelectItemProps) {
  const radixValue = value === '' ? EMPTY_SENTINEL : value
  return (
    <RadixSelect.Item
      value={radixValue}
      disabled={disabled}
      className={cn(
        'flex items-center gap-2 px-3 py-2 text-base rounded-md cursor-pointer outline-none select-none',
        'text-white/70 data-highlighted:bg-white/8 data-highlighted:text-white',
        'data-disabled:opacity-30 data-disabled:cursor-not-allowed',
      )}
    >
      <RadixSelect.ItemText>{children}</RadixSelect.ItemText>
      <RadixSelect.ItemIndicator className="ml-auto">
        <Check size={14} className="text-[#3031cb]" />
      </RadixSelect.ItemIndicator>
    </RadixSelect.Item>
  )
}
