import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { EventForm } from '../EventForm'
import type { CalendarEvent } from '../../../types/event'

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('../../../lib/s3Service', () => ({
  createClientUpload: vi.fn(() => ({
    done: vi.fn().mockResolvedValue('https://cdn.example.com/thumb.jpg'),
    abort: vi.fn(),
  })),
}))

vi.mock('../../../components/ui/Select', () => ({
  Select: ({ value, onValueChange, children, disabled }: {
    value: string
    onValueChange: (v: string) => void
    children: React.ReactNode
    disabled?: boolean
  }) => (
    <select value={value} onChange={e => onValueChange(e.target.value)} disabled={disabled}>
      {children}
    </select>
  ),
  SelectItem: ({ value, children }: { value: string; children: React.ReactNode }) => (
    <option value={value}>{children}</option>
  ),
}))

// ── Helpers ───────────────────────────────────────────────────────────────────

// Use real time — offsets ensure fixtures are always relative to now
function makeInitial(overrides: Partial<CalendarEvent & { startDateTime: number; endDateTime: number }> = {}) {
  const n = Math.floor(Date.now() / 1000)
  return {
    startDateTime: n + 3600,   // 1 h from now — always future
    endDateTime: n + 7200,     // 2 h from now
    ...overrides,
  }
}

const defaultProps = {
  initial: makeInitial(),
  isEdit: false,
  allEvents: [] as CalendarEvent[],
  editingId: null,
  cid: '42',
  userId: '7',
  onSave: vi.fn().mockResolvedValue({ ok: true }),
  onCancel: vi.fn(),
}

function renderForm(overrides: Partial<typeof defaultProps> & { onDelete?: () => void } = {}) {
  const props = { ...defaultProps, ...overrides }
  return render(<EventForm {...props} />)
}

beforeEach(() => vi.clearAllMocks())

// ── Required field markers ─────────────────────────────────────────────────────

describe('EventForm — required field markers', () => {
  it('shows * next to Event Title label', () => {
    renderForm()
    const titleLabel = screen.getByText(/event title/i)
    const container = titleLabel.closest('label') ?? titleLabel.parentElement
    expect(container?.textContent).toContain('*')
  })

  it('shows * next to Start label', () => {
    renderForm()
    const startSpan = screen.getByText(/^start/i)
    const container = startSpan.closest('span') ?? startSpan.parentElement
    expect(container?.textContent).toContain('*')
  })

  it('shows * next to End label', () => {
    renderForm()
    const endSpan = screen.getByText(/^end/i)
    const container = endSpan.closest('span') ?? endSpan.parentElement
    expect(container?.textContent).toContain('*')
  })
})

// ── Title inline validation ────────────────────────────────────────────────────

describe('EventForm — title inline validation', () => {
  it('does not show title error initially (before any interaction)', () => {
    renderForm()
    expect(screen.queryByText(/event title is required/i)).not.toBeInTheDocument()
  })

  it('shows "Event title is required." after blurring an empty title input', () => {
    renderForm()
    const titleInput = screen.getByPlaceholderText(/enter event title/i)
    fireEvent.blur(titleInput)
    expect(screen.getByText('Event title is required.')).toBeInTheDocument()
  })

  it('hides the inline error after the user types a valid title', async () => {
    renderForm()
    const titleInput = screen.getByPlaceholderText(/enter event title/i)
    fireEvent.blur(titleInput)
    expect(screen.getByText('Event title is required.')).toBeInTheDocument()
    await userEvent.type(titleInput, 'My Event')
    expect(screen.queryByText('Event title is required.')).not.toBeInTheDocument()
  })

  it('shows title error on submit attempt with empty title and does not call onSave', async () => {
    const onSave = vi.fn()
    renderForm({ onSave })
    await userEvent.click(screen.getByRole('button', { name: /create event/i }))
    // Submit triggers both the inline error and the global error with the same text
    expect(screen.getAllByText('Event title is required.').length).toBeGreaterThan(0)
    expect(onSave).not.toHaveBeenCalled()
  })

  it('applies red border class to title input when touched and empty', () => {
    renderForm()
    const titleInput = screen.getByPlaceholderText(/enter event title/i)
    fireEvent.blur(titleInput)
    expect(titleInput.className).toContain('red')
  })
})

// ── Submit button labels ───────────────────────────────────────────────────────

describe('EventForm — submit button labels', () => {
  it('shows "Create Event" for a new event (isEdit=false)', () => {
    renderForm({ isEdit: false })
    expect(screen.getByRole('button', { name: /create event/i })).toBeInTheDocument()
  })

  it('shows "Save Changes" when editing a future event', () => {
    renderForm({
      isEdit: true,
      initial: makeInitial({ id: 'ev-1', title: 'Existing' }),
    })
    expect(screen.getByRole('button', { name: /save changes/i })).toBeInTheDocument()
  })

  it('shows "Extend Duration" when editing an ongoing event', () => {
    const n = Math.floor(Date.now() / 1000)
    renderForm({
      isEdit: true,
      initial: {
        id: 'ev-live',
        title: 'Live Now',
        startDateTime: n - 600,  // started 10 min ago
        endDateTime: n + 3600,   // ends in 1 h
      },
    })
    expect(screen.getByRole('button', { name: /extend duration/i })).toBeInTheDocument()
  })
})

// ── Cancel button ─────────────────────────────────────────────────────────────

describe('EventForm — cancel button', () => {
  it('calls onCancel when Cancel is clicked', async () => {
    const onCancel = vi.fn()
    renderForm({ onCancel })
    await userEvent.click(screen.getByRole('button', { name: /cancel/i }))
    expect(onCancel).toHaveBeenCalledOnce()
  })
})

// ── Event type and resolution ─────────────────────────────────────────────────

describe('EventForm — event type field', () => {
  it('does not show Resolution field for "Other" type by default', () => {
    renderForm()
    expect(screen.queryByText(/meeting resolution/i)).not.toBeInTheDocument()
  })

  it('shows Resolution field when "Conference" type is selected', async () => {
    renderForm()
    const eventTypeSelect = screen.getByDisplayValue('Other')
    await userEvent.selectOptions(eventTypeSelect, 'Conference')
    expect(screen.getByText(/meeting resolution/i)).toBeInTheDocument()
  })

  it('hides Resolution field when type is switched back to Other', async () => {
    renderForm()
    const eventTypeSelect = screen.getByDisplayValue('Other')
    await userEvent.selectOptions(eventTypeSelect, 'Conference')
    await userEvent.selectOptions(screen.getByDisplayValue('Conference'), 'Other')
    expect(screen.queryByText(/meeting resolution/i)).not.toBeInTheDocument()
  })
})

// ── Ongoing event restrictions ─────────────────────────────────────────────────

describe('EventForm — ongoing event', () => {
  function makeOngoingInitial() {
    const n = Math.floor(Date.now() / 1000)
    return { id: 'ev-live', title: 'Live Event', startDateTime: n - 600, endDateTime: n + 3600 }
  }

  it('shows the LIVE banner for ongoing events', () => {
    renderForm({ isEdit: true, initial: makeOngoingInitial() })
    expect(screen.getByText(/LIVE/)).toBeInTheDocument()
  })

  it('disables the title input during an ongoing event', () => {
    renderForm({ isEdit: true, initial: makeOngoingInitial() })
    expect(screen.getByPlaceholderText(/enter event title/i)).toBeDisabled()
  })

  it('does not show a Delete button for ongoing events', () => {
    renderForm({ isEdit: true, initial: makeOngoingInitial(), onDelete: vi.fn() })
    expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument()
  })
})

// ── Delete button (editing future events) ─────────────────────────────────────

describe('EventForm — delete button', () => {
  it('shows Delete button when isEdit=true and onDelete is provided', () => {
    renderForm({
      isEdit: true,
      initial: makeInitial({ id: 'ev-1', title: 'Future Event' }),
      onDelete: vi.fn(),
    })
    expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument()
  })

  it('does not show Delete button when onDelete is not provided', () => {
    renderForm({
      isEdit: true,
      initial: makeInitial({ id: 'ev-1', title: 'Future Event' }),
    })
    expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument()
  })

  it('opens delete confirmation dialog when Delete is clicked', async () => {
    renderForm({
      isEdit: true,
      initial: makeInitial({ id: 'ev-1', title: 'Future Event' }),
      onDelete: vi.fn(),
    })
    await userEvent.click(screen.getByRole('button', { name: /delete/i }))
    expect(screen.getByText(/delete event/i)).toBeInTheDocument()
  })
})
