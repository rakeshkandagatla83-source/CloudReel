import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { EventDetail } from '../EventDetail'
import type { CalendarEvent } from '../../../types/event'

// ── Mock useNavigate ───────────────────────────────────────────────────────────

const mockNavigate = vi.fn()

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

// ── Fixtures ──────────────────────────────────────────────────────────────────

// Fixed epoch — far enough in the future/past to avoid flakiness
const NOW = 2_000_000_000

const futureEvent: CalendarEvent = {
  id: 'ev-1',
  title: 'Test Event',
  description: '',
  startDateTime: NOW + 3600,
  endDateTime: NOW + 7200,
  eventType: 'O',
  resolution: '',
  thumbnailUrl: '',
  createdAt: NOW,
}

const ongoingEvent: CalendarEvent = {
  id: 'ev-2',
  title: 'Live Event',
  description: '',
  startDateTime: NOW - 600,
  endDateTime: NOW + 3600,
  eventType: 'C',
  resolution: 'HD (720p)',
  thumbnailUrl: '',
  createdAt: NOW,
}

const defaultProps = {
  onFetchInstance: vi.fn().mockResolvedValue(null),
  onCheckCloud: vi.fn().mockResolvedValue(null),
  onCreateMeeting: vi.fn().mockResolvedValue(null),
  onGetMeeting: vi.fn().mockResolvedValue(null),
  onEdit: vi.fn(),
  onDelete: vi.fn(),
  onClose: vi.fn(),
}

function renderDetail(
  event: CalendarEvent,
  status: 'past' | 'ongoing' | 'future',
  overrides: Partial<typeof defaultProps> & { canStartEarly?: boolean } = {},
) {
  const props = { ...defaultProps, ...overrides, event, status }
  return render(
    <MemoryRouter>
      <EventDetail {...props} />
    </MemoryRouter>,
  )
}

beforeEach(() => vi.clearAllMocks())

// ── Status banners ────────────────────────────────────────────────────────────

describe('EventDetail — status banners', () => {
  it('shows LIVE banner for ongoing status', () => {
    renderDetail(ongoingEvent, 'ongoing')
    expect(screen.getByText('LIVE')).toBeInTheDocument()
  })

  it('shows early-start amber banner when canStartEarly=true and status=future', () => {
    renderDetail(futureEvent, 'future', { canStartEarly: true })
    expect(screen.getByText(/you can start early/i)).toBeInTheDocument()
  })

  it('shows no action banner for future event with canStartEarly=false', () => {
    renderDetail(futureEvent, 'future', { canStartEarly: false })
    expect(screen.queryByText('LIVE')).not.toBeInTheDocument()
    expect(screen.queryByText(/you can start early/i)).not.toBeInTheDocument()
  })

  it('shows no action banner for past events', () => {
    const past = { ...futureEvent, startDateTime: NOW - 7200, endDateTime: NOW - 3600 }
    renderDetail(past, 'past')
    expect(screen.queryByText('LIVE')).not.toBeInTheDocument()
    expect(screen.queryByText(/you can start early/i)).not.toBeInTheDocument()
  })
})

// ── Instance loading (ongoing) ─────────────────────────────────────────────────

describe('EventDetail — instance check for ongoing event', () => {
  it('shows checking spinner while onFetchInstance is pending', () => {
    // onFetchInstance returns a never-resolving promise so spinner stays
    renderDetail(ongoingEvent, 'ongoing', {
      onFetchInstance: vi.fn().mockReturnValue(new Promise(() => {})),
    })
    expect(screen.getByText(/checking cloud instance/i)).toBeInTheDocument()
  })

  it('shows START EVENT button when no instance is found', async () => {
    renderDetail(ongoingEvent, 'ongoing', {
      onFetchInstance: vi.fn().mockResolvedValue(null),
    })
    await waitFor(() => expect(screen.queryByText(/checking cloud instance/i)).not.toBeInTheDocument())
    expect(screen.getByRole('button', { name: /start event/i })).toBeInTheDocument()
  })

  it('shows GO LIVE button when instance already exists and meeting exists', async () => {
    renderDetail(ongoingEvent, 'ongoing', {
      onFetchInstance: vi.fn().mockResolvedValue({ instanceId: 'abc123' }),
      onGetMeeting: vi.fn().mockResolvedValue('some-master-uuid'),
    })
    await waitFor(() => expect(screen.queryByText(/checking/i)).not.toBeInTheDocument())
    expect(screen.getByRole('button', { name: /go live/i })).toBeInTheDocument()
  })
})

// ── canStartEarly action ───────────────────────────────────────────────────────

describe('EventDetail — canStartEarly actions', () => {
  it('shows START EVENT button when canStartEarly=true and no instance', () => {
    renderDetail(futureEvent, 'future', { canStartEarly: true })
    expect(screen.getByRole('button', { name: /start event/i })).toBeInTheDocument()
  })

  it('calls onCheckCloud when START EVENT is clicked', async () => {
    const onCheckCloud = vi.fn().mockResolvedValue(null)
    renderDetail(futureEvent, 'future', { canStartEarly: true, onCheckCloud })
    await userEvent.click(screen.getByRole('button', { name: /start event/i }))
    expect(onCheckCloud).toHaveBeenCalledOnce()
  })

  it('shows GO LIVE button after onCheckCloud resolves an instance', async () => {
    const onCheckCloud = vi.fn().mockResolvedValue({ instanceId: 'cloud-1' })
    renderDetail(futureEvent, 'future', { canStartEarly: true, onCheckCloud })
    await userEvent.click(screen.getByRole('button', { name: /start event/i }))
    await waitFor(() => expect(screen.getByRole('button', { name: /go live/i })).toBeInTheDocument())
  })
})

// ── GO LIVE navigation ─────────────────────────────────────────────────────────

describe('EventDetail — GO LIVE navigation', () => {
  it('calls onClose and navigates to /studio when GO LIVE is clicked', async () => {
    const onClose = vi.fn()
    renderDetail(ongoingEvent, 'ongoing', {
      onFetchInstance: vi.fn().mockResolvedValue({ instanceId: 'abc' }),
      onGetMeeting: vi.fn().mockResolvedValue('some-master-uuid'),
      onClose,
    })
    await waitFor(() => expect(screen.queryByText(/checking/i)).not.toBeInTheDocument())
    await userEvent.click(screen.getByRole('button', { name: /go live/i }))
    expect(onClose).toHaveBeenCalledOnce()
    expect(mockNavigate).toHaveBeenCalledWith('/studio', { state: { fromGoLive: true } })
  })
})

// ── Event info display ────────────────────────────────────────────────────────

describe('EventDetail — event info display', () => {
  it('displays the event title', () => {
    renderDetail(futureEvent, 'future')
    expect(screen.getByText('Test Event')).toBeInTheDocument()
  })

  it('shows "Conference" badge for eventType C', () => {
    renderDetail(ongoingEvent, 'ongoing')
    expect(screen.getByText(/conference/i)).toBeInTheDocument()
  })

  it('shows "Other" badge for eventType O', () => {
    renderDetail(futureEvent, 'future')
    expect(screen.getByText(/other/i)).toBeInTheDocument()
  })

  it('shows resolution for Conference events', () => {
    renderDetail(ongoingEvent, 'ongoing')
    expect(screen.getByText('HD (720p)')).toBeInTheDocument()
  })

  it('shows description when provided', () => {
    const ev = { ...futureEvent, description: 'A test description here' }
    renderDetail(ev, 'future')
    expect(screen.getByText('A test description here')).toBeInTheDocument()
  })
})

// ── Action buttons ─────────────────────────────────────────────────────────────

describe('EventDetail — action buttons', () => {
  it('calls onEdit when Edit is clicked (future)', async () => {
    const onEdit = vi.fn()
    renderDetail(futureEvent, 'future', { onEdit })
    await userEvent.click(screen.getByRole('button', { name: /edit/i }))
    expect(onEdit).toHaveBeenCalledOnce()
  })

  it('calls onClose when Close is clicked', async () => {
    const onClose = vi.fn()
    renderDetail(futureEvent, 'future', { onClose })
    await userEvent.click(screen.getByRole('button', { name: /close/i }))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('shows Delete button for future events', () => {
    renderDetail(futureEvent, 'future')
    expect(screen.getByRole('button', { name: /delete/i })).toBeInTheDocument()
  })

  it('hides Delete button for ongoing events', async () => {
    renderDetail(ongoingEvent, 'ongoing', {
      onFetchInstance: vi.fn().mockResolvedValue(null),
    })
    await waitFor(() => expect(screen.queryByText(/checking/i)).not.toBeInTheDocument())
    expect(screen.queryByRole('button', { name: /^delete$/i })).not.toBeInTheDocument()
  })

  it('hides Edit button for past events', () => {
    const past = { ...futureEvent, startDateTime: NOW - 7200, endDateTime: NOW - 3600 }
    renderDetail(past, 'past')
    expect(screen.queryByRole('button', { name: /edit/i })).not.toBeInTheDocument()
  })
})

// ── Delete confirmation dialog ─────────────────────────────────────────────────

describe('EventDetail — delete confirmation', () => {
  it('opens confirmation dialog when Delete is clicked', async () => {
    renderDetail(futureEvent, 'future')
    await userEvent.click(screen.getByRole('button', { name: /delete/i }))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByText(/delete event/i)).toBeInTheDocument()
  })

  it('calls onDelete after confirming in the dialog', async () => {
    const onDelete = vi.fn()
    renderDetail(futureEvent, 'future', { onDelete })
    await userEvent.click(screen.getByRole('button', { name: /delete/i }))
    const dialog = screen.getByRole('dialog')
    await userEvent.click(within(dialog).getByRole('button', { name: /^delete$/i }))
    expect(onDelete).toHaveBeenCalledOnce()
  })

  it('does not call onDelete when deletion is cancelled', async () => {
    const onDelete = vi.fn()
    renderDetail(futureEvent, 'future', { onDelete })
    await userEvent.click(screen.getByRole('button', { name: /delete/i }))
    await userEvent.click(screen.getByRole('button', { name: /cancel/i }))
    expect(onDelete).not.toHaveBeenCalled()
  })

  it('includes the event title in the dialog description', async () => {
    renderDetail(futureEvent, 'future')
    await userEvent.click(screen.getByRole('button', { name: /delete/i }))
    // The description text uses quoted title: "Test Event" will be permanently deleted.
    expect(screen.getByText(/"Test Event"/)).toBeInTheDocument()
  })
})
