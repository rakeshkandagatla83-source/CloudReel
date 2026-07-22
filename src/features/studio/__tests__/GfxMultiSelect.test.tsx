import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { GfxMultiSelect } from '../GfxMultiSelect'

const BAND_KEYS = ['lower_band', 'ticker_band', 'logo_band']

function renderSelect(overrides: Partial<Parameters<typeof GfxMultiSelect>[0]> = {}) {
  const defaults = {
    type: 'start' as const,
    selected: [] as string[],
    bandKeys: BAND_KEYS,
    onChange: vi.fn(),
  }
  return { ...defaults, ...overrides, onChange: overrides.onChange ?? defaults.onChange }
}

beforeEach(() => vi.clearAllMocks())

// ── Labels ────────────────────────────────────────────────────────────────

describe('GfxMultiSelect — labels', () => {
  it('shows "Start GFX" trigger for type="start"', () => {
    const props = renderSelect({ type: 'start' })
    render(<GfxMultiSelect {...props} />)
    expect(screen.getByRole('button', { name: /start gfx/i })).toBeInTheDocument()
  })

  it('shows "Stop GFX" trigger for type="stop"', () => {
    const props = renderSelect({ type: 'stop' })
    render(<GfxMultiSelect {...props} />)
    expect(screen.getByRole('button', { name: /stop gfx/i })).toBeInTheDocument()
  })
})

// ── Dropdown toggle ───────────────────────────────────────────────────────

describe('GfxMultiSelect — dropdown open/close', () => {
  it('dropdown is closed by default', () => {
    const props = renderSelect()
    render(<GfxMultiSelect {...props} />)
    expect(screen.queryByText(/turn on on fire/i)).not.toBeInTheDocument()
  })

  it('opens dropdown when trigger is clicked', async () => {
    const props = renderSelect({ type: 'start' })
    render(<GfxMultiSelect {...props} />)
    await userEvent.click(screen.getByRole('button', { name: /start gfx/i }))
    expect(screen.getByText(/turn on on fire/i)).toBeInTheDocument()
  })

  it('shows "Turn OFF on fire" header for stop type', async () => {
    const props = renderSelect({ type: 'stop' })
    render(<GfxMultiSelect {...props} />)
    await userEvent.click(screen.getByRole('button', { name: /stop gfx/i }))
    expect(screen.getByText(/turn off on fire/i)).toBeInTheDocument()
  })

  it('closes dropdown when trigger is clicked again', async () => {
    const props = renderSelect()
    render(<GfxMultiSelect {...props} />)
    const trigger = screen.getByRole('button', { name: /start gfx/i })
    await userEvent.click(trigger)
    await userEvent.click(trigger)
    expect(screen.queryByText(/turn on on fire/i)).not.toBeInTheDocument()
  })

  it('closes dropdown when clicking outside', async () => {
    const props = renderSelect()
    render(
      <div>
        <GfxMultiSelect {...props} />
        <div data-testid="outside">Outside</div>
      </div>,
    )
    await userEvent.click(screen.getByRole('button', { name: /start gfx/i }))
    expect(screen.getByText(/turn on on fire/i)).toBeInTheDocument()

    fireEvent.mouseDown(screen.getByTestId('outside'))
    expect(screen.queryByText(/turn on on fire/i)).not.toBeInTheDocument()
  })
})

// ── Band keys ─────────────────────────────────────────────────────────────

describe('GfxMultiSelect — band key list', () => {
  it('renders a checkbox for each band key', async () => {
    const props = renderSelect()
    render(<GfxMultiSelect {...props} />)
    await userEvent.click(screen.getByRole('button', { name: /start gfx/i }))
    const checkboxes = screen.getAllByRole('checkbox')
    expect(checkboxes).toHaveLength(BAND_KEYS.length)
  })

  it('shows "No GFX loaded" when bandKeys is empty', async () => {
    const props = renderSelect({ bandKeys: [] })
    render(<GfxMultiSelect {...props} />)
    await userEvent.click(screen.getByRole('button', { name: /start gfx/i }))
    expect(screen.getByText(/no gfx loaded/i)).toBeInTheDocument()
  })
})

// ── Selection ─────────────────────────────────────────────────────────────

describe('GfxMultiSelect — selection', () => {
  it('renders selected items as checked', async () => {
    const props = renderSelect({ selected: ['lower_band'] })
    render(<GfxMultiSelect {...props} />)
    await userEvent.click(screen.getByRole('button', { name: /start gfx/i }))
    const checkboxes = screen.getAllByRole('checkbox') as HTMLInputElement[]
    const lowerBandCb = checkboxes.find(cb => cb.closest('label')?.textContent?.includes('Lower Band'))
    expect(lowerBandCb?.checked).toBe(true)
  })

  it('calls onChange with the key added when an unchecked item is clicked', async () => {
    const onChange = vi.fn()
    const props = renderSelect({ selected: [], onChange })
    render(<GfxMultiSelect {...props} />)
    await userEvent.click(screen.getByRole('button', { name: /start gfx/i }))
    await userEvent.click(screen.getAllByRole('checkbox')[0])
    expect(onChange).toHaveBeenCalledWith([BAND_KEYS[0]])
  })

  it('calls onChange with the key removed when a checked item is clicked', async () => {
    const onChange = vi.fn()
    const props = renderSelect({ selected: ['lower_band'], onChange })
    render(<GfxMultiSelect {...props} />)
    await userEvent.click(screen.getByRole('button', { name: /start gfx/i }))
    const checkboxes = screen.getAllByRole('checkbox') as HTMLInputElement[]
    const checked = checkboxes.find(cb => cb.closest('label')?.textContent?.includes('Lower Band'))!
    await userEvent.click(checked)
    expect(onChange).toHaveBeenCalledWith([])
  })

  it('"All" button calls onChange with all bandKeys', async () => {
    const onChange = vi.fn()
    const props = renderSelect({ selected: [], onChange })
    render(<GfxMultiSelect {...props} />)
    await userEvent.click(screen.getByRole('button', { name: /start gfx/i }))
    await userEvent.click(screen.getByRole('button', { name: /^all$/i }))
    expect(onChange).toHaveBeenCalledWith(BAND_KEYS)
  })

  it('"None" button calls onChange with empty array', async () => {
    const onChange = vi.fn()
    const props = renderSelect({ selected: BAND_KEYS, onChange })
    render(<GfxMultiSelect {...props} />)
    await userEvent.click(screen.getByRole('button', { name: /start gfx/i }))
    await userEvent.click(screen.getByRole('button', { name: /^none$/i }))
    expect(onChange).toHaveBeenCalledWith([])
  })
})

// ── Count badge ────────────────────────────────────────────────────────────

describe('GfxMultiSelect — count badge', () => {
  it('shows count badge when items are selected', () => {
    const props = renderSelect({ selected: ['lower_band', 'logo_band'] })
    render(<GfxMultiSelect {...props} />)
    expect(screen.getByText('2')).toBeInTheDocument()
  })

  it('does not show count badge when nothing is selected', () => {
    const props = renderSelect({ selected: [] })
    render(<GfxMultiSelect {...props} />)
    expect(screen.queryByText('0')).not.toBeInTheDocument()
  })
})
