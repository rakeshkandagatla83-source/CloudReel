import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QButtonRow } from '../QButtonRow'
import type { RowState, SourceSlot } from '../../../types/studio'

// ── Context mock ──────────────────────────────────────────────────────────────

const mockFire = vi.fn()
const mockUpdateRow = vi.fn()
const mockOnCaptionChange = vi.fn()
const mockAddSource = vi.fn()
const mockRemoveSource = vi.fn()
const mockUpdateSource = vi.fn()
const mockMuteSource = vi.fn()
const mockSetSourceVolume = vi.fn()
const mockSetSourceTransform = vi.fn()
const mockOpenVideoPopup = vi.fn()

let ctxValues: {
  participants: string[]
  rtmpSources: { id: number; name: string; protocol: 'RTMP'; status: string }[]
  webrtcSources: { id: string; name: string; protocol: 'WebRTC'; status: string; isScreenShare?: boolean }[]
  selectedGroup: string
  groupLayouts: { id: number; caption: string; windowsCount: number }[]
  layoutData: { id: number; windowsCount: number }[]
  fire: typeof mockFire
  updateRow: typeof mockUpdateRow
  addSource: typeof mockAddSource
  removeSource: typeof mockRemoveSource
  updateSource: typeof mockUpdateSource
  muteSource: typeof mockMuteSource
  setSourceVolume: typeof mockSetSourceVolume
  setSourceTransform: typeof mockSetSourceTransform
  onCaptionChange: typeof mockOnCaptionChange
  gfxData: Record<string, Record<string, unknown>>
  gfxTemplateName: string
  videoAssets: { name: string }[]
  isLoadingVideoAssets: boolean
  openVideoPopup: typeof mockOpenVideoPopup
  showToast: (title: string, description?: string) => void
  virtualSources: { id: string; name: string; sourceUserId: string; crop: unknown }[]
}

vi.mock('../StudioContext', () => ({ useStudioCtx: () => ctxValues }))

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeSlot(overrides: Partial<SourceSlot> = {}): SourceSlot {
  return { sourceType: '', sourceValue: '', muted: false, volume: 100, panX: 0, panY: 0, zoom: 1, loop: true, ...overrides }
}

function makeRow(overrides: Partial<RowState> = {}): RowState {
  return { captionId: '', sources: [], gfxStart: [], gfxStop: [], ...overrides }
}

// QButtonRow renders a <tr>; wrap in table+tbody for valid DOM
function renderRow(
  rowIndex: number,
  row: RowState,
  { isActive = false, isNext = false }: { isActive?: boolean; isNext?: boolean } = {},
) {
  return render(
    <table>
      <tbody>
        <QButtonRow idx={rowIndex} row={row} isActive={isActive} isNext={isNext} />
      </tbody>
    </table>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  ctxValues = {
    participants: ['alice', 'bob'],
    rtmpSources: [{ id: 1, name: 'rtmp-stream-1', protocol: 'RTMP', status: 'live' }],
    webrtcSources: [],
    selectedGroup: 'News',
    groupLayouts: [
      { id: 10, caption: 'Solo', windowsCount: 1 },
      { id: 20, caption: 'Duo', windowsCount: 2 },
    ],
    layoutData: [
      { id: 10, windowsCount: 1 },
      { id: 20, windowsCount: 2 },
    ],
    fire: mockFire,
    updateRow: mockUpdateRow,
    addSource: mockAddSource,
    removeSource: mockRemoveSource,
    updateSource: mockUpdateSource,
    muteSource: mockMuteSource,
    setSourceVolume: mockSetSourceVolume,
    setSourceTransform: mockSetSourceTransform,
    onCaptionChange: mockOnCaptionChange,
    gfxData: {},
    gfxTemplateName: '',
    videoAssets: [{ name: 'intro.mp4' }, { name: 'outro.mp4' }],
    isLoadingVideoAssets: false,
    openVideoPopup: mockOpenVideoPopup,
    showToast: vi.fn(),
    virtualSources: [],
  }
})

// ── Q button ──────────────────────────────────────────────────────────────────

describe('QButtonRow - Q button', () => {
  it('renders Q1 label for row index 0', () => {
    renderRow(0, makeRow())
    expect(screen.getByRole('button', { name: 'Q1' })).toBeInTheDocument()
  })

  it('renders Q2 label for row index 1', () => {
    renderRow(1, makeRow())
    expect(screen.getByRole('button', { name: 'Q2' })).toBeInTheDocument()
  })

  it('calls fire(1) when Q1 is clicked', async () => {
    const fireableRow = makeRow({ captionId: '10', sources: [makeSlot({ sourceType: 'webrtc', sourceValue: 'alice' })] })
    renderRow(0, fireableRow)
    await userEvent.click(screen.getByRole('button', { name: 'Q1' }))
    expect(mockFire).toHaveBeenCalledWith(1)
  })

  it('calls fire(2) when Q2 is clicked', async () => {
    const fireableRow = makeRow({ captionId: '20', sources: [makeSlot({ sourceType: 'webrtc', sourceValue: 'alice' }), makeSlot({ sourceType: 'webrtc', sourceValue: 'bob' })] })
    renderRow(1, fireableRow)
    await userEvent.click(screen.getByRole('button', { name: 'Q2' }))
    expect(mockFire).toHaveBeenCalledWith(2)
  })

  it('applies red brand styling for odd Q numbers', () => {
    const fireableRow = makeRow({ captionId: '10', sources: [makeSlot({ sourceType: 'webrtc', sourceValue: 'alice' })] })
    renderRow(0, fireableRow) // Q1 is odd
    expect(screen.getByRole('button', { name: 'Q1' }).className).toContain('e40b18')
  })

  it('applies neutral styling for even Q numbers', () => {
    renderRow(1, makeRow()) // Q2 is even
    const button = screen.getByRole('button', { name: 'Q2' })
    expect(button.className).toContain('white')
    expect(button.className).not.toContain('e40b18')
  })
})

// ── Row active/next classes ───────────────────────────────────────────────────

describe('QButtonRow - row state classes', () => {
  it('adds row-active class when isActive is true', () => {
    renderRow(0, makeRow(), { isActive: true })
    expect(document.querySelector('tr')!.className).toContain('row-active')
  })

  it('adds row-next class when isNext is true', () => {
    renderRow(0, makeRow(), { isNext: true })
    expect(document.querySelector('tr')!.className).toContain('row-next')
  })

  it('has no active or next class when both flags are false', () => {
    renderRow(0, makeRow())
    const tableRow = document.querySelector('tr')!
    expect(tableRow.className).not.toContain('row-active')
    expect(tableRow.className).not.toContain('row-next')
  })
})

// ── Caption dropdown ──────────────────────────────────────────────────────────

describe('QButtonRow - caption dropdown', () => {
  it('caption select is disabled when no group is selected', () => {
    ctxValues.selectedGroup = ''
    renderRow(0, makeRow())
    const captionSelect = screen.getAllByRole('combobox')[0] as HTMLButtonElement
    expect(captionSelect.disabled).toBe(true)
  })

  it('caption select is enabled when a group is selected', () => {
    renderRow(0, makeRow())
    const captionSelect = screen.getAllByRole('combobox')[0] as HTMLButtonElement
    expect(captionSelect.disabled).toBe(false)
  })

  it('shows "no group" badge when no group is selected', () => {
    ctxValues.selectedGroup = ''
    renderRow(0, makeRow())
    expect(screen.getByText('no group')).toBeInTheDocument()
  })

  it('shows "no layout" badge when group is set but captionId is empty', () => {
    renderRow(0, makeRow({ captionId: '' }))
    expect(screen.getByText('no layout')).toBeInTheDocument()
  })

  it('shows "max 1" badge when captionId matches a 1-window layout', () => {
    renderRow(0, makeRow({ captionId: '10' }))
    expect(screen.getByText('max 1')).toBeInTheDocument()
  })

  it('shows "max 2" badge when captionId matches a 2-window layout', () => {
    renderRow(0, makeRow({ captionId: '20' }))
    expect(screen.getByText('max 2')).toBeInTheDocument()
  })

  it('calls onCaptionChange when a caption is selected', async () => {
    renderRow(0, makeRow())
    await userEvent.click(screen.getAllByRole('combobox')[0])
    await userEvent.click(await screen.findByText(/Solo/))
    expect(mockOnCaptionChange).toHaveBeenCalledWith(0, '10')
  })
})

// ── Sources column - hint text ────────────────────────────────────────────────

describe('QButtonRow - sources hint text', () => {
  it('shows "Select group first" when no group and no sources', () => {
    ctxValues.selectedGroup = ''
    renderRow(0, makeRow())
    expect(screen.getByText('Select group first')).toBeInTheDocument()
  })

  it('shows "Select caption first" when group is set but captionId is empty', () => {
    renderRow(0, makeRow({ captionId: '' }))
    expect(screen.getByText('Select caption first')).toBeInTheDocument()
  })

  it('shows drag hint when group and caption are both set but no sources added', () => {
    renderRow(0, makeRow({ captionId: '10' }))
    expect(screen.getByText(/drag participant or click add source/i)).toBeInTheDocument()
  })

  it('hides hint text once a source slot is present', () => {
    const sources = [makeSlot({ sourceType: 'webrtc', sourceValue: 'alice' })]
    renderRow(0, makeRow({ captionId: '20', sources }))
    expect(screen.queryByText(/drag participant or click add source/i)).not.toBeInTheDocument()
    expect(screen.queryByText('Select caption first')).not.toBeInTheDocument()
    expect(screen.queryByText('Select group first')).not.toBeInTheDocument()
  })
})

// ── Sources column - Add source button ────────────────────────────────────────

describe('QButtonRow - Add source button', () => {
  it('does not show "Add source" when captionId is empty (maxSlots is 0)', () => {
    renderRow(0, makeRow({ captionId: '' }))
    expect(screen.queryByRole('button', { name: /add source/i })).not.toBeInTheDocument()
  })

  it('shows "Add source" button when sources count is below the layout max', () => {
    renderRow(0, makeRow({ captionId: '20' })) // max 2, 0 sources
    expect(screen.getByRole('button', { name: /add source/i })).toBeInTheDocument()
  })

  it('calls addSource with the correct row index when clicked', async () => {
    renderRow(3, makeRow({ captionId: '20' }))
    await userEvent.click(screen.getByRole('button', { name: /add source/i }))
    expect(mockAddSource).toHaveBeenCalledWith(3)
  })

  it('hides "Add source" when sources have reached the layout max (1-window layout)', () => {
    const sources = [makeSlot({ sourceType: 'webrtc', sourceValue: 'alice' })]
    renderRow(0, makeRow({ captionId: '10', sources })) // max 1, already 1
    expect(screen.queryByRole('button', { name: /add source/i })).not.toBeInTheDocument()
  })

  it('hides "Add source" when 6 sources are present (global max)', () => {
    const sources: SourceSlot[] = Array.from({ length: 6 }, (_, index) =>
      makeSlot({ sourceType: 'webrtc', sourceValue: `participant-${index}` }),
    )
    renderRow(0, makeRow({ captionId: '20', sources }))
    expect(screen.queryByRole('button', { name: /add source/i })).not.toBeInTheDocument()
  })
})
