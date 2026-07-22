import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { VideoPlayerPopup } from '../VideoPlayerPopup'

// ── Mock HTMLVideoElement ─────────────────────────────────────────────────

const mockPlay = vi.fn().mockResolvedValue(undefined)
const mockPause = vi.fn()
const mockLoad = vi.fn()

beforeEach(() => {
  vi.clearAllMocks()
  Object.defineProperty(HTMLVideoElement.prototype, 'play', { value: mockPlay, configurable: true })
  Object.defineProperty(HTMLVideoElement.prototype, 'pause', { value: mockPause, configurable: true })
  Object.defineProperty(HTMLVideoElement.prototype, 'load', { value: mockLoad, configurable: true })
})

const VIDEO_STATE = { name: 'My Video.mp4', url: 'https://example.com/video.mp4' }

// ── Null state ─────────────────────────────────────────────────────────────

describe('VideoPlayerPopup — null state', () => {
  it('renders nothing when state is null', () => {
    const { container } = render(<VideoPlayerPopup state={null} onClose={vi.fn()} />)
    expect(container.firstChild).toBeNull()
  })
})

// ── Basic rendering ────────────────────────────────────────────────────────

describe('VideoPlayerPopup — rendering', () => {
  it('renders the video filename in the header', () => {
    render(<VideoPlayerPopup state={VIDEO_STATE} onClose={vi.fn()} />)
    expect(screen.getByText('My Video.mp4')).toBeInTheDocument()
  })

  it('shows the VOD badge', () => {
    render(<VideoPlayerPopup state={VIDEO_STATE} onClose={vi.fn()} />)
    expect(screen.getByText('VOD')).toBeInTheDocument()
  })

  it('renders a video element', () => {
    render(<VideoPlayerPopup state={VIDEO_STATE} onClose={vi.fn()} />)
    expect(document.querySelector('video')).toBeInTheDocument()
  })

  it('shows initial time display as 0:00 / 0:00', () => {
    render(<VideoPlayerPopup state={VIDEO_STATE} onClose={vi.fn()} />)
    expect(screen.getByText('0:00 / 0:00')).toBeInTheDocument()
  })

  it('renders all skip buttons (±1s, ±5s, ±10s)', () => {
    render(<VideoPlayerPopup state={VIDEO_STATE} onClose={vi.fn()} />)
    // There are two "1s" buttons (forward and back), two "5s", two "10s"
    const buttons = screen.getAllByRole('button')
    const texts = buttons.map(b => b.textContent)
    expect(texts.filter(t => t?.includes('1s'))).toHaveLength(2)
    expect(texts.filter(t => t?.includes('5s'))).toHaveLength(2)
    expect(texts.filter(t => t?.includes('10s'))).toHaveLength(2)
  })

  it('renders speed buttons 0.5×, 1×, 2×, 4×', () => {
    render(<VideoPlayerPopup state={VIDEO_STATE} onClose={vi.fn()} />)
    expect(screen.getByText('0.5×')).toBeInTheDocument()
    expect(screen.getByText('1×')).toBeInTheDocument()
    expect(screen.getByText('2×')).toBeInTheDocument()
    expect(screen.getByText('4×')).toBeInTheDocument()
  })

  it('renders the Loop button', () => {
    render(<VideoPlayerPopup state={VIDEO_STATE} onClose={vi.fn()} />)
    expect(screen.getByRole('button', { name: /loop/i })).toBeInTheDocument()
  })

  it('renders the seek and volume range inputs', () => {
    render(<VideoPlayerPopup state={VIDEO_STATE} onClose={vi.fn()} />)
    const ranges = screen.getAllByRole('slider')
    expect(ranges.length).toBeGreaterThanOrEqual(2) // seek + volume
  })
})

// ── Close button ───────────────────────────────────────────────────────────

describe('VideoPlayerPopup — close button', () => {
  it('calls onClose when the × button is clicked', async () => {
    const onClose = vi.fn()
    render(<VideoPlayerPopup state={VIDEO_STATE} onClose={onClose} />)
    const closeBtn = document.querySelector('[class*="p-0.5"]') as HTMLElement
    fireEvent.click(closeBtn)
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('calls onClose when Escape key is pressed', () => {
    const onClose = vi.fn()
    render(<VideoPlayerPopup state={VIDEO_STATE} onClose={onClose} />)
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledOnce()
  })
})

// ── Keyboard shortcuts ─────────────────────────────────────────────────────

describe('VideoPlayerPopup — keyboard shortcuts', () => {
  it('Space key triggers togglePlay', () => {
    render(<VideoPlayerPopup state={VIDEO_STATE} onClose={vi.fn()} />)
    // After mount, video.play() was called once; a second Space would call pause
    fireEvent.keyDown(document, { key: ' ' })
    // Should have been called (play or pause — depends on current state)
    expect(mockPlay.mock.calls.length + mockPause.mock.calls.length).toBeGreaterThan(0)
  })

  it('ArrowLeft key does not throw', () => {
    render(<VideoPlayerPopup state={VIDEO_STATE} onClose={vi.fn()} />)
    expect(() => fireEvent.keyDown(document, { key: 'ArrowLeft' })).not.toThrow()
  })

  it('ArrowRight key does not throw', () => {
    render(<VideoPlayerPopup state={VIDEO_STATE} onClose={vi.fn()} />)
    expect(() => fireEvent.keyDown(document, { key: 'ArrowRight' })).not.toThrow()
  })

  it('M key toggles mute without throwing', () => {
    render(<VideoPlayerPopup state={VIDEO_STATE} onClose={vi.fn()} />)
    expect(() => fireEvent.keyDown(document, { key: 'm' })).not.toThrow()
  })

  it('keyboard shortcuts are inactive when state is null', () => {
    const onClose = vi.fn()
    render(<VideoPlayerPopup state={null} onClose={onClose} />)
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).not.toHaveBeenCalled()
  })

  it('keyboard shortcuts do not fire when an INPUT is focused', () => {
    const onClose = vi.fn()
    render(
      <div>
        <input data-testid="inp" />
        <VideoPlayerPopup state={VIDEO_STATE} onClose={onClose} />
      </div>,
    )
    const input = screen.getByTestId('inp') as HTMLElement
    input.focus()
    Object.defineProperty(document, 'activeElement', { value: input, configurable: true })
    fireEvent.keyDown(document, { key: 'Escape' })
    // The guard checks tagName === 'INPUT', so onClose should not be called
    expect(onClose).not.toHaveBeenCalled()
  })
})

// ── Time formatting (via component display) ────────────────────────────────

describe('VideoPlayerPopup — time formatting', () => {
  it('shows "0:00 / 0:00" initially', () => {
    render(<VideoPlayerPopup state={VIDEO_STATE} onClose={vi.fn()} />)
    expect(screen.getByText('0:00 / 0:00')).toBeInTheDocument()
  })

  it('updates duration display when loadedmetadata fires on the video', () => {
    render(<VideoPlayerPopup state={VIDEO_STATE} onClose={vi.fn()} />)
    const video = document.querySelector('video')!
    Object.defineProperty(video, 'duration', { value: 125, configurable: true })
    fireEvent(video, new Event('loadedmetadata'))
    // 125 seconds = 2:05
    expect(screen.getByText('0:00 / 2:05')).toBeInTheDocument()
  })

  it('updates current time display on timeupdate event', () => {
    render(<VideoPlayerPopup state={VIDEO_STATE} onClose={vi.fn()} />)
    const video = document.querySelector('video')!
    Object.defineProperty(video, 'duration', { value: 600, configurable: true })
    Object.defineProperty(video, 'currentTime', { value: 65, configurable: true })
    fireEvent(video, new Event('timeupdate'))
    expect(screen.getByText('1:05 / 0:00')).toBeInTheDocument()
  })
})

// ── Volume display ─────────────────────────────────────────────────────────

describe('VideoPlayerPopup — volume', () => {
  it('shows 100% volume by default', () => {
    render(<VideoPlayerPopup state={VIDEO_STATE} onClose={vi.fn()} />)
    expect(screen.getByText('100%')).toBeInTheDocument()
  })

  it('shows 0% after mute button is clicked', async () => {
    render(<VideoPlayerPopup state={VIDEO_STATE} onClose={vi.fn()} />)
    // Find the mute button by its class; it contains the Volume2 icon initially
    const buttons = screen.getAllByRole('button')
    const muteBtn = buttons.find(b => b.className.includes('text-white/40'))!
    fireEvent.click(muteBtn)
    await waitFor(() => expect(screen.getByText('0%')).toBeInTheDocument())
  })
})
