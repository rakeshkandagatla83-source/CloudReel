import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SourcesSidebar } from '../SourcesSidebar'
import type { ParticipantSource, RtmpSource, VideoAsset, SourceLocation, VirtualSource } from '../../../types/studio'

// ── Context mock ──────────────────────────────────────────────────────────────

const mockSetCurrentTab = vi.fn()
const mockFetchParticipants = vi.fn().mockResolvedValue(undefined)
const mockFetchRtmp = vi.fn().mockResolvedValue(undefined)
const mockFetchVideos = vi.fn().mockResolvedValue(undefined)
const mockFetchAllSources = vi.fn().mockResolvedValue(undefined)
const mockBuildStreamPreviewUrl = vi.fn().mockReturnValue(null)
const mockOpenVideoPopup = vi.fn()
const mockUpdateSourceLocations = vi.fn()
const mockMuteParticipant = vi.fn()
const mockAddVirtualSource = vi.fn()
const mockRemoveVirtualSource = vi.fn()
const mockUpdateVirtualSource = vi.fn()
const mockShowToast = vi.fn()

const webrtcSource: ParticipantSource = {
  id: 'ws-1',
  name: 'alice',
  protocol: 'WebRTC',
  status: 'online',
}

const rtmpSource: RtmpSource = {
  id: 1,
  name: 'rtmp-stream-1',
  protocol: 'RTMP',
  status: 'live',
}

const videoAsset: VideoAsset = { name: 'intro.mp4' }

let ctxValues: {
  currentTab: 'webrtc' | 'rtmp' | 'video'
  setCurrentTab: typeof mockSetCurrentTab
  webrtcSources: ParticipantSource[]
  rtmpSources: RtmpSource[]
  videoAssets: VideoAsset[]
  fetchParticipants: typeof mockFetchParticipants
  fetchRtmp: typeof mockFetchRtmp
  fetchVideos: typeof mockFetchVideos
  fetchAllSources: typeof mockFetchAllSources
  buildStreamPreviewUrl: typeof mockBuildStreamPreviewUrl
  openVideoPopup: typeof mockOpenVideoPopup
  sourceLocations: Record<string, SourceLocation[]>
  updateSourceLocations: typeof mockUpdateSourceLocations
  participantMuteMap: Record<string, boolean>
  muteParticipant: typeof mockMuteParticipant
  virtualSources: VirtualSource[]
  addVirtualSource: typeof mockAddVirtualSource
  removeVirtualSource: typeof mockRemoveVirtualSource
  updateVirtualSource: typeof mockUpdateVirtualSource
  activeRowIdx: number | null
  rows: { captionId: string; sources: unknown[]; gfxStart: unknown[]; gfxStop: unknown[] }[]
  showToast: typeof mockShowToast
}

vi.mock('../StudioContext', () => ({ useStudioCtx: () => ctxValues }))

beforeEach(() => {
  vi.clearAllMocks()
  ctxValues = {
    currentTab: 'webrtc',
    setCurrentTab: mockSetCurrentTab,
    webrtcSources: [webrtcSource],
    rtmpSources: [rtmpSource],
    videoAssets: [videoAsset],
    fetchParticipants: mockFetchParticipants,
    fetchRtmp: mockFetchRtmp,
    fetchVideos: mockFetchVideos,
    fetchAllSources: mockFetchAllSources,
    buildStreamPreviewUrl: mockBuildStreamPreviewUrl,
    openVideoPopup: mockOpenVideoPopup,
    sourceLocations: {},
    updateSourceLocations: mockUpdateSourceLocations,
    participantMuteMap: {},
    muteParticipant: mockMuteParticipant,
    virtualSources: [],
    addVirtualSource: mockAddVirtualSource,
    removeVirtualSource: mockRemoveVirtualSource,
    updateVirtualSource: mockUpdateVirtualSource,
    activeRowIdx: null,
    rows: [],
    showToast: mockShowToast,
  }
})

// ── Tab switching ─────────────────────────────────────────────────────────────

describe('SourcesSidebar - tabs', () => {
  it('renders all three tabs', () => {
    render(<SourcesSidebar />)
    expect(document.getElementById('studio-sidebar-tab-webrtc')).toBeInTheDocument()
    expect(document.getElementById('studio-sidebar-tab-rtmp')).toBeInTheDocument()
    expect(document.getElementById('studio-sidebar-tab-video')).toBeInTheDocument()
  })

  it('calls setCurrentTab with webrtc when WebRTC tab is clicked', async () => {
    ctxValues.currentTab = 'rtmp'
    render(<SourcesSidebar />)
    await userEvent.click(screen.getByText('WebRTC'))
    expect(mockSetCurrentTab).toHaveBeenCalledWith('webrtc')
  })

  it('calls setCurrentTab with rtmp when RTMP tab is clicked', async () => {
    render(<SourcesSidebar />)
    await userEvent.click(screen.getByText('RTMP'))
    expect(mockSetCurrentTab).toHaveBeenCalledWith('rtmp')
  })

  it('calls setCurrentTab with video when Videos tab is clicked', async () => {
    render(<SourcesSidebar />)
    await userEvent.click(screen.getByText('Videos'))
    expect(mockSetCurrentTab).toHaveBeenCalledWith('video')
  })

  it('shows source count badge on tabs with sources', () => {
    render(<SourcesSidebar />)
    // webrtcSources has 1, rtmpSources has 1
    const badges = screen.getAllByText('1')
    expect(badges.length).toBeGreaterThanOrEqual(2)
  })
})

// ── Source list rendering ─────────────────────────────────────────────────────

describe('SourcesSidebar - source list', () => {
  it('renders webrtc source tile with source name', () => {
    render(<SourcesSidebar />)
    expect(screen.getByText('alice')).toBeInTheDocument()
  })

  it('shows empty state when no webrtc sources', () => {
    ctxValues.webrtcSources = []
    render(<SourcesSidebar />)
    expect(screen.getByText(/no webrtc sources/i)).toBeInTheDocument()
  })

  it('renders rtmp source tile when rtmp tab is active', () => {
    ctxValues.currentTab = 'rtmp'
    render(<SourcesSidebar />)
    expect(screen.getByText('rtmp-stream-1')).toBeInTheDocument()
  })

  it('renders video tile when video tab is active', () => {
    ctxValues.currentTab = 'video'
    render(<SourcesSidebar />)
    // VideoTile renders the asset name in two places (preview placeholder + info bar)
    expect(screen.getAllByText('intro.mp4').length).toBeGreaterThanOrEqual(1)
  })

  it('shows video search input only on video tab', () => {
    ctxValues.currentTab = 'video'
    render(<SourcesSidebar />)
    expect(screen.getByPlaceholderText('Search videos…')).toBeInTheDocument()
  })

  it('does not show video search input on webrtc tab', () => {
    render(<SourcesSidebar />)
    expect(screen.queryByPlaceholderText('Search videos…')).not.toBeInTheDocument()
  })
})

// ── Location tags - adding ────────────────────────────────────────────────────

describe('SourcesSidebar - location tags (adding)', () => {
  it('adds a location when Enter is pressed in the location input', async () => {
    render(<SourcesSidebar />)
    await userEvent.click(screen.getByTitle('Edit locations'))
    const locationInput = screen.getByPlaceholderText('New location…')
    await userEvent.type(locationInput, 'Hyderabad{Enter}')
    expect(mockUpdateSourceLocations).toHaveBeenCalledWith('alice', [{ label: 'Hyderabad', enabled: true }])
  })

  it('adds a location when Enter is pressed (second entry)', async () => {
    render(<SourcesSidebar />)
    await userEvent.click(screen.getByTitle('Edit locations'))
    const locationInput = screen.getByPlaceholderText('New location…')
    await userEvent.type(locationInput, 'Mumbai{Enter}')
    expect(mockUpdateSourceLocations).toHaveBeenCalledWith('alice', [{ label: 'Mumbai', enabled: true }])
  })

  it('adds a location when the + button is clicked', async () => {
    render(<SourcesSidebar />)
    await userEvent.click(screen.getByTitle('Edit locations'))
    const locationInput = screen.getByPlaceholderText('New location…')
    await userEvent.type(locationInput, 'Chennai')
    await userEvent.click(screen.getByTitle('Add location'))
    expect(mockUpdateSourceLocations).toHaveBeenCalledWith('alice', [{ label: 'Chennai', enabled: true }])
  })

  it('trims whitespace before adding a location', async () => {
    render(<SourcesSidebar />)
    await userEvent.click(screen.getByTitle('Edit locations'))
    const locationInput = screen.getByPlaceholderText('New location…')
    await userEvent.type(locationInput, '  Delhi  {Enter}')
    expect(mockUpdateSourceLocations).toHaveBeenCalledWith('alice', [{ label: 'Delhi', enabled: true }])
  })

  it('does not add an empty string as a location', async () => {
    render(<SourcesSidebar />)
    await userEvent.click(screen.getByTitle('Edit locations'))
    await userEvent.click(screen.getByTitle('Add location'))
    expect(mockUpdateSourceLocations).not.toHaveBeenCalled()
  })

  it('does not add a duplicate location', async () => {
    ctxValues.sourceLocations = { alice: [{ label: 'Hyderabad', enabled: true }] }
    render(<SourcesSidebar />)
    await userEvent.click(screen.getByTitle('Edit locations'))
    const locationInput = screen.getByPlaceholderText('New location…')
    await userEvent.type(locationInput, 'Hyderabad{Enter}')
    expect(mockUpdateSourceLocations).not.toHaveBeenCalled()
  })

  it('appends to existing locations when adding a new one', async () => {
    ctxValues.sourceLocations = { alice: [{ label: 'Hyderabad', enabled: true }] }
    render(<SourcesSidebar />)
    await userEvent.click(screen.getByTitle('Edit locations'))
    const locationInput = screen.getByPlaceholderText('New location…')
    await userEvent.type(locationInput, 'Mumbai{Enter}')
    expect(mockUpdateSourceLocations).toHaveBeenCalledWith('alice', [
      { label: 'Hyderabad', enabled: true },
      { label: 'Mumbai', enabled: true },
    ])
  })
})

// ── Location tags - display and removal ──────────────────────────────────────

describe('SourcesSidebar - location tags (display and removal)', () => {
  it('renders existing location tags for a source', async () => {
    ctxValues.sourceLocations = { alice: [{ label: 'Hyderabad', enabled: true }, { label: 'Studio 1', enabled: true }] }
    render(<SourcesSidebar />)
    await userEvent.click(screen.getByTitle('Edit locations'))
    expect(screen.getByText('Hyderabad')).toBeInTheDocument()
    expect(screen.getByText('Studio 1')).toBeInTheDocument()
  })

  it('calls updateSourceLocations with the location removed when its delete button is clicked', async () => {
    ctxValues.sourceLocations = { alice: [{ label: 'Hyderabad', enabled: true }, { label: 'Mumbai', enabled: true }] }
    render(<SourcesSidebar />)
    await userEvent.click(screen.getByTitle('Edit locations'))
    await userEvent.click(screen.getByTitle('Delete Hyderabad'))
    expect(mockUpdateSourceLocations).toHaveBeenCalledWith('alice', [{ label: 'Mumbai', enabled: true }])
  })

  it('calls updateSourceLocations with empty array when the only location is deleted', async () => {
    ctxValues.sourceLocations = { alice: [{ label: 'Hyderabad', enabled: true }] }
    render(<SourcesSidebar />)
    await userEvent.click(screen.getByTitle('Edit locations'))
    await userEvent.click(screen.getByTitle('Delete Hyderabad'))
    expect(mockUpdateSourceLocations).toHaveBeenCalledWith('alice', [])
  })

  it('does not show location tags section when source has no locations', async () => {
    ctxValues.sourceLocations = {}
    render(<SourcesSidebar />)
    await userEvent.click(screen.getByTitle('Edit locations'))
    expect(screen.queryByTitle(/^Delete /)).not.toBeInTheDocument()
  })
})

// ── Refresh buttons ───────────────────────────────────────────────────────────

describe('SourcesSidebar - refresh buttons', () => {
  it('calls fetchAllSources when Refresh All is clicked', async () => {
    render(<SourcesSidebar />)
    await userEvent.click(screen.getByText('Refresh All'))
    expect(mockFetchAllSources).toHaveBeenCalledOnce()
  })

  it('calls fetchParticipants when per-tab Refresh is clicked on webrtc tab', async () => {
    render(<SourcesSidebar />)
    await userEvent.click(screen.getByText('Refresh'))
    expect(mockFetchParticipants).toHaveBeenCalledOnce()
  })
})
