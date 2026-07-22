import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { PublishPanel } from '../PublishPanel'

// ── Mock SocialPublishPanel to isolate MeetingUrlPanel tests ──────────────────

vi.mock('../SocialPublishPanel', () => ({
  SocialPublishPanel: () => <div data-testid="social-publish-panel" />,
}))

// ── Mock the studio context ────────────────────────────────────────────────

const defaultCtx = {
  meetingUrl: '',
  destinations: [],
  startDestination: vi.fn(),
  stopDestination: vi.fn(),
  deleteDestination: vi.fn(),
}

vi.mock('../StudioContext', () => ({
  useStudioCtx: () => ctxOverride,
}))

let ctxOverride = { ...defaultCtx }

function renderPanel(overrides: Partial<typeof defaultCtx> = {}) {
  ctxOverride = { ...defaultCtx, ...overrides }
  return render(<PublishPanel />)
}

// ── Tests ─────────────────────────────────────────────────────────────────

describe('MeetingUrlPanel — empty state', () => {
  it('shows empty state message when no URL exists', () => {
    renderPanel({ meetingUrl: '' })
    expect(screen.getByText(/no meeting url/i)).toBeInTheDocument()
  })

  it('does NOT show Copy or Open buttons when no URL exists', () => {
    renderPanel({ meetingUrl: '' })
    expect(screen.queryByRole('button', { name: /copy/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /open/i })).not.toBeInTheDocument()
  })
})

describe('MeetingUrlPanel — URL display', () => {
  const testUrl = 'https://webrtc-test.janya.video/index.html?ID=test-uuid'

  it('shows the URL text when meetingUrl is populated', () => {
    renderPanel({ meetingUrl: testUrl })
    expect(screen.getByText(testUrl)).toBeInTheDocument()
  })

  it('shows Copy and Open buttons when meetingUrl is populated', () => {
    renderPanel({ meetingUrl: testUrl })
    expect(screen.getByRole('button', { name: /^copy$/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /open/i })).toBeInTheDocument()
  })

  it('restores and displays a previously persisted URL (simulates page refresh)', () => {
    renderPanel({ meetingUrl: testUrl })
    expect(screen.getByText(testUrl)).toBeInTheDocument()
  })
})

describe('MeetingUrlPanel — Copy button', () => {
  const testUrl = 'https://webrtc-test.janya.video/index.html?ID=copy-test'

  beforeEach(() => {
    Object.assign(navigator, {
      clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
    })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('calls navigator.clipboard.writeText with the meeting URL', async () => {
    renderPanel({ meetingUrl: testUrl })
    await userEvent.click(screen.getByRole('button', { name: /^copy$/i }))
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(testUrl)
  })

  it('changes button text to "Copied!" after clicking', async () => {
    renderPanel({ meetingUrl: testUrl })
    await userEvent.click(screen.getByRole('button', { name: /^copy$/i }))
    expect(screen.getByRole('button', { name: /copied/i })).toBeInTheDocument()
  })

  it('reverts button text back to "Copy" after 2 seconds', async () => {
    vi.useFakeTimers()
    renderPanel({ meetingUrl: testUrl })

    fireEvent.click(screen.getByRole('button', { name: /^copy$/i }))
    expect(screen.getByText(/copied/i)).toBeInTheDocument()

    await act(async () => { vi.advanceTimersByTime(2100) })
    expect(screen.getByRole('button', { name: /^copy$/i })).toBeInTheDocument()
  })
})

describe('MeetingUrlPanel — Open button', () => {
  const testUrl = 'https://webrtc-test.janya.video/index.html?ID=open-test'

  beforeEach(() => {
    vi.spyOn(window, 'open').mockImplementation(() => null)
  })

  it('calls window.open with the meeting URL and _blank target', async () => {
    renderPanel({ meetingUrl: testUrl })
    await userEvent.click(screen.getByRole('button', { name: /open/i }))
    expect(window.open).toHaveBeenCalledWith(testUrl, '_blank')
  })
})
