import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SourceSlotRow } from '../SourceSlotRow'
import type { SourceSlot, RtmpSource, VideoAsset } from '../../../types/studio'

// ── Shared test data ──────────────────────────────────────────────────────────

const defaultParticipants = ['alice', 'bob', 'charlie']

const defaultRtmpSources: RtmpSource[] = [
  { id: 1, name: 'rtmp-stream-1', protocol: 'RTMP', status: 'live' },
  { id: 2, name: 'rtmp-stream-2', protocol: 'RTMP', status: 'live' },
]

const defaultVideoAssets: VideoAsset[] = [
  { name: 'intro.mp4' },
  { name: 'outro.mp4' },
]

const mockOnUpdate = vi.fn()
const mockOnRemove = vi.fn()
const mockOpenVideoPopup = vi.fn()

function makeSlot(overrides: Partial<SourceSlot> = {}): SourceSlot {
  return { sourceType: '', sourceValue: '', muted: false, volume: 100, panX: 0, panY: 0, zoom: 1, loop: true, ...overrides }
}

function renderSlot(
  slot: SourceSlot,
  {
    usedValues = [],
    videoAssets = defaultVideoAssets,
  }: { usedValues?: string[]; videoAssets?: VideoAsset[] } = {},
) {
  return render(
    <SourceSlotRow
      rowIdx={0}
      slotIdx={0}
      slot={slot}
      participants={defaultParticipants}
      virtualSources={[]}
      rtmpSources={defaultRtmpSources}
      videoAssets={videoAssets}
      usedValues={usedValues}
      onUpdate={mockOnUpdate}
      onVolumeChange={vi.fn()}
      onTransformChange={vi.fn()}
      onRemove={mockOnRemove}
      onShowToast={vi.fn()}
      openVideoPopup={mockOpenVideoPopup}
      disabledTypes={[]}
    />,
  )
}

beforeEach(() => vi.clearAllMocks())

// ── Source value area by type ─────────────────────────────────────────────────

describe('SourceSlotRow - source value area', () => {
  it('shows "Select type first" placeholder when no sourceType is set', () => {
    renderSlot(makeSlot())
    expect(screen.getByText('Select type first')).toBeInTheDocument()
  })

  it('does not show SRT input for webrtc type', () => {
    renderSlot(makeSlot({ sourceType: 'webrtc' }))
    expect(screen.queryByPlaceholderText('srt://host:port')).not.toBeInTheDocument()
  })

  it('does not show SRT input for vod type', () => {
    renderSlot(makeSlot({ sourceType: 'vod' }))
    expect(screen.queryByPlaceholderText('srt://host:port')).not.toBeInTheDocument()
  })
})

// ── VOD custom dropdown ───────────────────────────────────────────────────────

describe('SourceSlotRow - VOD dropdown', () => {
  it('renders the VOD trigger button with "-- Video --" placeholder when no value selected', () => {
    renderSlot(makeSlot({ sourceType: 'vod' }))
    expect(screen.getByRole('button', { name: /-- Video --/i })).toBeInTheDocument()
  })

  it('shows selected video name in the trigger button', () => {
    renderSlot(makeSlot({ sourceType: 'vod', sourceValue: 'intro.mp4' }))
    expect(screen.getByRole('button', { name: /intro\.mp4/i })).toBeInTheDocument()
  })

  it('opens the dropdown when trigger is clicked', async () => {
    renderSlot(makeSlot({ sourceType: 'vod' }))
    await userEvent.click(screen.getByRole('button', { name: /-- Video --/i }))
    expect(screen.getByText('intro.mp4')).toBeInTheDocument()
    expect(screen.getByText('outro.mp4')).toBeInTheDocument()
  })

  it('calls onUpdate with selected video name when an asset is clicked', async () => {
    renderSlot(makeSlot({ sourceType: 'vod' }))
    await userEvent.click(screen.getByRole('button', { name: /-- Video --/i }))
    await userEvent.click(screen.getByText('intro.mp4'))
    expect(mockOnUpdate).toHaveBeenCalledWith({ sourceValue: 'intro.mp4' })
  })

  it('closes the dropdown after selecting a video', async () => {
    renderSlot(makeSlot({ sourceType: 'vod' }))
    await userEvent.click(screen.getByRole('button', { name: /-- Video --/i }))
    await userEvent.click(screen.getByText('intro.mp4'))
    expect(screen.queryByText('outro.mp4')).not.toBeInTheDocument()
  })

  it('does not show search input when assets count is 5 or fewer', () => {
    renderSlot(makeSlot({ sourceType: 'vod' })) // defaultVideoAssets has 2
    screen.getByRole('button', { name: /-- Video --/i }).click()
    expect(screen.queryByPlaceholderText('Search...')).not.toBeInTheDocument()
  })

  it('shows search input when assets count exceeds 5', async () => {
    const manyAssets: VideoAsset[] = Array.from({ length: 6 }, (_, index) => ({
      name: `video-${index}.mp4`,
    }))
    renderSlot(makeSlot({ sourceType: 'vod' }), { videoAssets: manyAssets })
    await userEvent.click(screen.getByRole('button', { name: /-- Video --/i }))
    expect(screen.getByPlaceholderText('Search...')).toBeInTheDocument()
  })

  it('filters video list by search term', async () => {
    const manyAssets: VideoAsset[] = [
      { name: 'intro-hd.mp4' },
      { name: 'outro-hd.mp4' },
      { name: 'bumper.mp4' },
      { name: 'promo-clip.mp4' },
      { name: 'ad-break.mp4' },
      { name: 'ident.mp4' },
    ]
    renderSlot(makeSlot({ sourceType: 'vod' }), { videoAssets: manyAssets })
    await userEvent.click(screen.getByRole('button', { name: /-- Video --/i }))
    await userEvent.type(screen.getByPlaceholderText('Search...'), 'hd')
    expect(screen.getByText('intro-hd.mp4')).toBeInTheDocument()
    expect(screen.getByText('outro-hd.mp4')).toBeInTheDocument()
    expect(screen.queryByText('bumper.mp4')).not.toBeInTheDocument()
  })

  it('shows "No results" message when search has no matches', async () => {
    const manyAssets: VideoAsset[] = Array.from({ length: 6 }, (_, index) => ({
      name: `video-${index}.mp4`,
    }))
    renderSlot(makeSlot({ sourceType: 'vod' }), { videoAssets: manyAssets })
    await userEvent.click(screen.getByRole('button', { name: /-- Video --/i }))
    await userEvent.type(screen.getByPlaceholderText('Search...'), 'zzz-no-match')
    expect(screen.getByText('No results')).toBeInTheDocument()
  })

  it('clears selection when "-- Video --" option is clicked inside the dropdown', async () => {
    renderSlot(makeSlot({ sourceType: 'vod', sourceValue: 'intro.mp4' }))
    await userEvent.click(screen.getByRole('button', { name: /intro\.mp4/i }))
    const clearOption = screen.getAllByRole('button').find(b => b.textContent?.includes('-- Video --'))
    await userEvent.click(clearOption!)
    expect(mockOnUpdate).toHaveBeenCalledWith({ sourceValue: '' })
  })
})

// ── VOD preview button ────────────────────────────────────────────────────────

describe('SourceSlotRow - VOD preview button', () => {
  it('renders the preview button for VOD type', () => {
    renderSlot(makeSlot({ sourceType: 'vod' }))
    expect(screen.getByTitle('Preview video')).toBeInTheDocument()
  })

  it('preview button is disabled when no video is selected', () => {
    renderSlot(makeSlot({ sourceType: 'vod', sourceValue: '' }))
    expect(screen.getByTitle('Preview video')).toBeDisabled()
  })

  it('preview button is enabled when a video is selected', () => {
    renderSlot(makeSlot({ sourceType: 'vod', sourceValue: 'intro.mp4' }))
    expect(screen.getByTitle('Preview video')).not.toBeDisabled()
  })

  it('calls openVideoPopup with asset name and url when preview is clicked', async () => {
    renderSlot(makeSlot({ sourceType: 'vod', sourceValue: 'intro.mp4' }))
    await userEvent.click(screen.getByTitle('Preview video'))
    expect(mockOpenVideoPopup).toHaveBeenCalledWith('intro.mp4', expect.any(String))
  })

  it('does not render preview button for webrtc type', () => {
    renderSlot(makeSlot({ sourceType: 'webrtc' }))
    expect(screen.queryByTitle('Preview video')).not.toBeInTheDocument()
  })

  it('does not render preview button for rtmp type', () => {
    renderSlot(makeSlot({ sourceType: 'rtmp' }))
    expect(screen.queryByTitle('Preview video')).not.toBeInTheDocument()
  })
})

// ── Mute button ───────────────────────────────────────────────────────────────

describe('SourceSlotRow - mute button', () => {
  it('is disabled when sourceValue is empty', () => {
    renderSlot(makeSlot({ sourceValue: '' }))
    expect(screen.getByTitle('Mute')).toBeDisabled()
  })

  it('is enabled when sourceValue is set', () => {
    renderSlot(makeSlot({ sourceType: 'webrtc', sourceValue: 'alice' }))
    expect(screen.getByTitle('Mute')).not.toBeDisabled()
  })

  it('shows "Unmute" title when slot is muted', () => {
    renderSlot(makeSlot({ sourceValue: 'alice', muted: true }))
    expect(screen.getByTitle('Unmute')).toBeInTheDocument()
  })

  it('calls onUpdate with muted true when clicking Mute', async () => {
    renderSlot(makeSlot({ sourceValue: 'alice', muted: false }))
    await userEvent.click(screen.getByTitle('Mute'))
    expect(mockOnUpdate).toHaveBeenCalledWith({ muted: true })
  })

  it('calls onUpdate with muted false when clicking Unmute', async () => {
    renderSlot(makeSlot({ sourceValue: 'alice', muted: true }))
    await userEvent.click(screen.getByTitle('Unmute'))
    expect(mockOnUpdate).toHaveBeenCalledWith({ muted: false })
  })
})

// ── Remove button ─────────────────────────────────────────────────────────────

describe('SourceSlotRow - remove button', () => {
  it('renders the remove button', () => {
    renderSlot(makeSlot())
    expect(screen.getByTitle('Remove source')).toBeInTheDocument()
  })

  it('calls onRemove when remove button is clicked', async () => {
    renderSlot(makeSlot())
    await userEvent.click(screen.getByTitle('Remove source'))
    const dialog = screen.getByRole('dialog')
    await userEvent.click(within(dialog).getByRole('button', { name: /^remove$/i }))
    expect(mockOnRemove).toHaveBeenCalledOnce()
  })
})

// ── Element IDs ───────────────────────────────────────────────────────────────

describe('SourceSlotRow - element IDs', () => {
  it('assigns the correct slot root id based on rowIdx and slotIdx', () => {
    render(
      <SourceSlotRow
        rowIdx={2}
        slotIdx={3}
        slot={makeSlot()}
        participants={[]}
        virtualSources={[]}
        rtmpSources={[]}
        videoAssets={[]}
        usedValues={[]}
        onUpdate={mockOnUpdate}
        onVolumeChange={vi.fn()}
        onTransformChange={vi.fn()}
        onRemove={mockOnRemove}
        onShowToast={vi.fn()}
        openVideoPopup={mockOpenVideoPopup}
        disabledTypes={[]}
      />,
    )
    expect(document.getElementById('studio-source-2-3')).toBeInTheDocument()
  })
})
