import { useMemo, useState } from 'react'
import { getCountries } from 'libphonenumber-js'
import { ChevronDown, Globe, Search, X } from 'lucide-react'
import { cn } from '../../../lib/utils'

interface AllowedCountriesPickerProps {
  value: string[]
  onChange: (next: string[]) => void
  disabled?: boolean
}

interface CountryOption {
  code: string
  name: string
}

export function AllowedCountriesPicker({ value, onChange, disabled }: AllowedCountriesPickerProps) {
  const [search, setSearch] = useState('')
  const [open, setOpen] = useState(false)

  const allCountries = useMemo<CountryOption[]>(() => {
    const displayNames = new Intl.DisplayNames(['en'], { type: 'region' })
    return getCountries()
      .map(code => ({ code, name: displayNames.of(code) ?? code }))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [])

  const selectedSet = useMemo(() => new Set(value.map(c => c.toUpperCase())), [value])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return allCountries.filter(c => !selectedSet.has(c.code)).slice(0, 50)
    return allCountries
      .filter(c => !selectedSet.has(c.code))
      .filter(c => c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q))
      .slice(0, 50)
  }, [allCountries, selectedSet, search])

  const toggleCountry = (code: string) => {
    const upper = code.toUpperCase()
    if (selectedSet.has(upper)) {
      onChange(value.filter(c => c.toUpperCase() !== upper))
    } else {
      onChange([...value, upper])
    }
  }

  const removeCountry = (code: string) => {
    onChange(value.filter(c => c.toUpperCase() !== code.toUpperCase()))
  }

  const clearAll = () => onChange([])

  return (
    <div id="allowed-countries-picker" className="space-y-2">
      <div
        id="allowed-countries-picker-header"
        className="flex items-center justify-between"
      >
        <div className="flex items-center gap-1.5 text-xs text-white/55">
          <Globe size={12} />
          <span>
            {value.length === 0
              ? 'Unrestricted - gateway works for all countries'
              : `${value.length} ${value.length === 1 ? 'country' : 'countries'} allowed`}
          </span>
        </div>
        {value.length > 0 && (
          <button
            id="allowed-countries-picker-clear"
            type="button"
            onClick={clearAll}
            disabled={disabled}
            className={cn(
              'text-[11px] text-white/45 hover:text-white/85 underline transition-colors',
              disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
            )}
          >
            Clear all
          </button>
        )}
      </div>

      {value.length > 0 && (
        <div
          id="allowed-countries-picker-chips"
          className="flex flex-wrap gap-1.5 rounded-lg border border-white/10 bg-surface p-2"
        >
          {value.map(code => {
            const name = allCountries.find(c => c.code === code.toUpperCase())?.name ?? code
            return (
              <span
                key={code}
                className="inline-flex items-center gap-1 rounded-md border border-emerald-500/25 bg-emerald-500/10 px-2 py-0.5 text-xs text-emerald-200"
              >
                <span className="font-mono text-[10px] text-emerald-300/80">{code.toUpperCase()}</span>
                <span className="hidden sm:inline">{name}</span>
                <button
                  type="button"
                  onClick={() => removeCountry(code)}
                  disabled={disabled}
                  className={cn(
                    'p-0.5 rounded text-emerald-300/70 hover:bg-emerald-500/20 hover:text-emerald-200 transition-colors',
                    disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer',
                  )}
                >
                  <X size={10} strokeWidth={2.5} />
                </button>
              </span>
            )
          })}
        </div>
      )}

      <div id="allowed-countries-picker-input-wrap" className="relative">
        <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-white/35" />
        <input
          id="allowed-countries-picker-input"
          type="text"
          value={search}
          onChange={e => {
            setSearch(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          disabled={disabled}
          placeholder="Search countries to add..."
          className={cn(
            'w-full rounded-lg border border-white/10 bg-surface pl-8 pr-8 py-2 text-sm text-white placeholder-white/30 focus:border-[#3031cb] focus:outline-hidden transition-colors',
            disabled && 'cursor-not-allowed opacity-50',
          )}
        />
        <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/35 pointer-events-none" />
      </div>

      {open && filtered.length > 0 && (
        <div
          id="allowed-countries-picker-list"
          className="rounded-lg border border-white/10 bg-secondary-bg shadow-2xl max-h-60 overflow-y-auto"
        >
          {filtered.map(c => (
            <button
              key={c.code}
              type="button"
              onMouseDown={e => {
                e.preventDefault()
                toggleCountry(c.code)
                setSearch('')
              }}
              className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-xs hover:bg-white/5 cursor-pointer transition-colors"
            >
              <span className="text-white/85">{c.name}</span>
              <span className="font-mono text-[10px] text-white/45">{c.code}</span>
            </button>
          ))}
        </div>
      )}

      {open && search.trim() && filtered.length === 0 && (
        <div className="rounded-lg border border-white/10 bg-secondary-bg px-3 py-2 text-xs text-white/45">
          No matching countries
        </div>
      )}
    </div>
  )
}
