import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { QButtonTable } from '../QButtonTable'
import type { RowState } from '../../../types/studio'

// ── Context mock ─────────────────────────────────────────────────────────────
// QButtonTable renders QButtonRow children that also consume context, so the
// mock must satisfy all fields destructured by both components.

let ctxValues: {
  rows: RowState[]
  activeRowIdx: number | null
  participants: string[]
  rtmpSources: { id: number; name: string; protocol: 'RTMP'; status: string }[]
  webrtcSources: { id: string; name: string; protocol: 'WebRTC'; status: string; isScreenShare?: boolean }[]
  selectedGroup: string
  groupLayouts: { id: number; caption: string; windowsCount: number }[]
  layoutData: { id: number; windowsCount: number }[]
  fire: () => void
  updateRow: () => void
  addSource: () => void
  removeSource: () => void
  updateSource: () => void
  muteSource: () => void
  setSourceVolume: () => void
  setSourceTransform: () => void
  onCaptionChange: () => void
  gfxData: Record<string, Record<string, unknown>>
  gfxTemplateName: string
  videoAssets: { name: string }[]
  isLoadingVideoAssets: boolean
  openVideoPopup: () => void
  showToast: () => void
  virtualSources: { id: string; name: string; sourceUserId: string; crop: unknown }[]
}

vi.mock('../StudioContext', () => ({ useStudioCtx: () => ctxValues }))

const makeRow = (): RowState => ({
  captionId: '',
  sources: [],
  gfxStart: [],
  gfxStop: [],
})

beforeEach(() => {
  vi.clearAllMocks()
  ctxValues = {
    rows: [makeRow(), makeRow(), makeRow()],
    activeRowIdx: null,
    participants: ['alice', 'bob'],
    rtmpSources: [],
    webrtcSources: [],
    selectedGroup: '',
    groupLayouts: [],
    layoutData: [],
    fire: vi.fn(),
    updateRow: vi.fn(),
    addSource: vi.fn(),
    removeSource: vi.fn(),
    updateSource: vi.fn(),
    muteSource: vi.fn(),
    setSourceVolume: vi.fn(),
    setSourceTransform: vi.fn(),
    onCaptionChange: vi.fn(),
    gfxData: {},
    gfxTemplateName: '',
    videoAssets: [],
    isLoadingVideoAssets: false,
    openVideoPopup: vi.fn(),
    showToast: vi.fn(),
    virtualSources: [],
  }
})

// ── Table header ──────────────────────────────────────────────────────────────

describe('QButtonTable — header columns', () => {
  it('renders the Btn column header', () => {
    render(<QButtonTable />)
    expect(screen.getByText('Btn')).toBeInTheDocument()
  })

  it('renders the Caption column header', () => {
    render(<QButtonTable />)
    expect(screen.getByText('Caption')).toBeInTheDocument()
  })

  it('renders the GFX Start column header', () => {
    render(<QButtonTable />)
    expect(screen.getByText('GFX Start')).toBeInTheDocument()
  })

  it('renders the GFX Stop column header', () => {
    render(<QButtonTable />)
    expect(screen.getByText('GFX Stop')).toBeInTheDocument()
  })

  it('renders the Sources column header', () => {
    render(<QButtonTable />)
    expect(screen.getByText('Sources')).toBeInTheDocument()
  })

  it('does NOT render a separate Video column header', () => {
    render(<QButtonTable />)
    expect(screen.queryByText('Video')).not.toBeInTheDocument()
  })

})

// ── Row rendering ─────────────────────────────────────────────────────────────

describe('QButtonTable — row rendering', () => {
  it('renders a Q button for each row', () => {
    render(<QButtonTable />)
    expect(screen.getByRole('button', { name: 'Q1' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Q2' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Q3' })).toBeInTheDocument()
  })

  it('renders no row-active class when activeRowIdx is null', () => {
    render(<QButtonTable />)
    expect(document.querySelector('.row-active')).not.toBeInTheDocument()
  })

  it('marks the correct row as active when activeRowIdx is set', () => {
    ctxValues.activeRowIdx = 1
    render(<QButtonTable />)
    expect(document.querySelector('.row-active')).toBeInTheDocument()
  })

  it('marks the row after active as row-next', () => {
    ctxValues.activeRowIdx = 0 // Q1 active → Q2 is next
    // Q2 must be fireable (captionId + sourceValue) for row-next class to apply
    ctxValues.rows[1] = {
      captionId: '1',
      sources: [{ sourceType: 'webrtc', sourceValue: 'alice', muted: false, volume: 100, panX: 0, panY: 0, zoom: 1, loop: false }],
      gfxStart: [],
      gfxStop: [],
    }
    render(<QButtonTable />)
    expect(document.querySelector('.row-next')).toBeInTheDocument()
  })
})

