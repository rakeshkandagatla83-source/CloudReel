import { useState, useEffect } from 'react'
// import * as Select from '@radix-ui/react-select'
// import { Clock, ChevronDown, Check } from 'lucide-react'
// import { cn } from '../../lib/utils'

const LOCAL_TZ = Intl.DateTimeFormat().resolvedOptions().timeZone

// const STATIC_TIMEZONES = [
//   { label: 'UTC', value: 'UTC' },
//   { label: 'GMT+1', value: 'Europe/Paris' },
//   { label: 'GMT+2', value: 'Europe/Helsinki' },
//   { label: 'GMT+3', value: 'Europe/Moscow' },
//   { label: 'GMT+4', value: 'Asia/Dubai' },
//   { label: 'GMT+5', value: 'Asia/Karachi' },
//   { label: 'GMT+5:30', value: 'Asia/Kolkata' },
//   { label: 'GMT+6', value: 'Asia/Dhaka' },
//   { label: 'GMT+8', value: 'Asia/Shanghai' },
//   { label: 'GMT-5', value: 'America/New_York' },
//   { label: 'GMT-6', value: 'America/Chicago' },
//   { label: 'GMT-7', value: 'America/Denver' },
//   { label: 'GMT-8', value: 'America/Los_Angeles' },
// ]

// function getGmtLabel(tz: string): string {
//   const parts = new Intl.DateTimeFormat('en', { timeZone: tz, timeZoneName: 'shortOffset' }).formatToParts(new Date())
//   return parts.find(p => p.type === 'timeZoneName')?.value ?? 'GMT'
// }

// const LOCAL_TZ_LABEL = getGmtLabel(LOCAL_TZ)
// const localAlreadyListed = STATIC_TIMEZONES.some(t => t.label === LOCAL_TZ_LABEL)
// const TIMEZONES = localAlreadyListed
//   ? STATIC_TIMEZONES
//   : [{ label: LOCAL_TZ_LABEL, value: LOCAL_TZ }, ...STATIC_TIMEZONES]

interface MonitorBarProps {
  previewSrc: string
  programSrc: string
}

export function MonitorBar({ previewSrc, programSrc }: MonitorBarProps) {
  const [tz] = useState(LOCAL_TZ) //, setTz
  const [, setTime] = useState('') // time 
  const [, setDate] = useState('') // date

  useEffect(() => {
    function tick() {
      const now = new Date()
      setTime(now.toLocaleTimeString('en-GB', { timeZone: tz, hour12: false }))
      setDate(
        now.toLocaleDateString('en-GB', {
          timeZone: tz,
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        }),
      )
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [tz])

  return (
    <div className="flex shrink-0 border-b border-primary-border bg-surface gap-8">
      {/* PREVIEW */}
      <div className="relative flex flex-1 flex-col border-r border-primary-border">
        <div className="pointer-events-none absolute left-1/2 top-2 z-10 flex -translate-x-1/2 items-center gap-1.5 rounded-md border border-[#006ee5]/25 bg-[#006ee5]/8 px-3 py-1">
          <div className="h-1.5 w-1.5 rounded-full bg-[#006ee5]" />
          <span className="text-base font-bold tracking-widest text-[#006ee5]">PREVIEW</span>
        </div>
        <iframe
          src={previewSrc || 'about:blank'}
          className="w-full border-none bg-surface-2 overflow-hidden"
          style={{ aspectRatio: '16/9' }}
          scrolling="no"
          allowFullScreen
          title="Preview monitor"
        />
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#006ee5]/20" />
      </div>

      {/* CLOCK */}
      {/* <div className="flex w-44 shrink-0 flex-col items-center justify-center gap-2 border-r border-white/6 bg-[#06090f]">
        <Clock size={12} className="text-white/15" />
        <div className="font-mono text-2xl font-bold tabular-nums tracking-widest text-white">
          {time || '00:00:00'}
        </div>
        <div className="text-sm text-white/25">{date}</div>
        <Select.Root value={tz} onValueChange={setTz}>
          <Select.Trigger
            className={cn(
              'flex items-center gap-1 text-sm text-white/35 transition-colors',
              'hover:text-white/60 cursor-pointer outline-hidden',
            )}
          >
            <Select.Value />
            <Select.Icon>
              <ChevronDown size={9} />
            </Select.Icon>
          </Select.Trigger>
          <Select.Portal>
            <Select.Content
              position="popper"
              sideOffset={6}
              className={cn(
                'z-[200] min-w-32 bg-secondary-bg border border-white/10 rounded-lg shadow-2xl overflow-hidden',
                'data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95',
              )}
            >
              <Select.Viewport className="p-1">
                {TIMEZONES.map(t => (
                  <Select.Item
                    key={t.value}
                    value={t.value}
                    className={cn(
                      'flex items-center gap-2 rounded-md px-3 py-1.5 text-sm text-white/55',
                      'cursor-pointer outline-hidden select-none',
                      'data-highlighted:bg-white/8 data-highlighted:text-white',
                    )}
                  >
                    <Select.ItemText>{t.label}</Select.ItemText>
                    <Select.ItemIndicator className="ml-auto">
                      <Check size={10} />
                    </Select.ItemIndicator>
                  </Select.Item>
                ))}
              </Select.Viewport>
            </Select.Content>
          </Select.Portal>
        </Select.Root>
      </div> */}

      {/* PROGRAM */}
      <div className="relative flex flex-1 flex-col">
        <div className="pointer-events-none absolute left-1/2 top-2 z-10 flex -translate-x-1/2 items-center gap-1.5 rounded-md border border-[#e00000]/25 bg-[#e00000]/8 px-3 py-1">
          <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#e00000]" />
          <span className="text-base font-bold tracking-widest text-[#e00000]">PROGRAM</span>
        </div>
        <iframe
          src={programSrc || 'about:blank'}
          className="w-full border-none bg-surface-2 overflow-hidden"
          style={{ aspectRatio: '16/9' }}
          scrolling="no"
          allowFullScreen
          title="Program monitor"
        />
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#d300ea]/20" />
      </div>
    </div>
  )
}
