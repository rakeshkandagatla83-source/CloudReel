import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { GfxPanel } from '../GfxPanel'

// ── Dialog stubs ───────────────────────────────────────────────────────────
vi.mock('../GfxBandEditDialog', () => ({
  GfxBandEditDialog: ({ open, label }: { open: boolean; label: string }) =>
    open ? <div role="dialog" data-testid="edit-dialog">{label}</div> : null,
}))
vi.mock('../GfxAssetDialog', () => ({
  GfxAssetDialog: ({ open, label }: { open: boolean; label: string }) =>
    open ? <div role="dialog" data-testid="asset-dialog">{label}</div> : null,
}))
vi.mock('../GfxLayoutDialog', () => ({
  GfxLayoutDialog: ({ open, label }: { open: boolean; label: string }) =>
    open ? <div role="dialog" data-testid="layout-dialog">{label}</div> : null,
}))
vi.mock('../GfxAlignmentDialog', () => ({
  GfxAlignmentDialog: ({ open, label }: { open: boolean; label: string }) =>
    open ? <div role="dialog" data-testid="alignment-dialog">{label}</div> : null,
}))
vi.mock('../GfxLocationDialog', () => ({
  GfxLocationDialog: ({ open }: { open: boolean }) =>
    open ? <div role="dialog" data-testid="location-dialog" /> : null,
}))

// ── Context mock ───────────────────────────────────────────────────────────
const mockFetchGraphics = vi.fn()
const mockToggleGfxBand = vi.fn()

const TEMPLATE = 'template1'
const BANDS_MAP: Record<string, boolean> = {
  top_band: false,
  lower_band: true,
  ticker_band: false,
  logo_band: false,
  l_band: false,
  location_band: false,
  date_band: false,
}

const defaultCtx = {
  gfxData: { [TEMPLATE]: BANDS_MAP } as Record<string, Record<string, boolean>>,
  gfxTemplateName: TEMPLATE,
  gfxBusy: new Set<string>(),
  gfxStatus: { text: '', type: '' },
  fetchGraphics: mockFetchGraphics,
  toggleGfxBand: mockToggleGfxBand,
  fetchGfxBandContent: vi.fn().mockResolvedValue([]),
  updateGfxBandContent: vi.fn().mockResolvedValue(true),
  fetchGfxBandLocation: vi.fn().mockResolvedValue(''),
  updateGfxBandLocation: vi.fn().mockResolvedValue(true),
  fetchGfxBandAsset: vi.fn().mockResolvedValue([]),
  fetchGfxAssets: vi.fn().mockResolvedValue([]),
  fetchGfxBgAssets: vi.fn().mockResolvedValue([]),
  updateGfxBandAsset: vi.fn().mockResolvedValue(true),
  updateGfxBandLayout: vi.fn().mockResolvedValue(true),
  updateGfxBandAlignment: vi.fn().mockResolvedValue(true),
  getGfxBandLayout: vi.fn().mockReturnValue(null),
  getGfxBandPosition: vi.fn().mockReturnValue({ x: 0, y: 0 }),
  gfxAlignmentCache: {
    layout: {} as Record<string, unknown>,
    alignment: Object.fromEntries(Object.keys(BANDS_MAP).map(k => [k, { x: 0, y: 0 }])) as Record<string, unknown>,
  },
  gfxBandContent: {} as Record<string, unknown[]>,
}

let ctxOverride = { ...defaultCtx }
vi.mock('../StudioContext', () => ({ useStudioCtx: () => ctxOverride }))

function renderPanel(overrides: Partial<typeof defaultCtx> = {}) {
  ctxOverride = { ...defaultCtx, ...overrides }
  return render(<GfxPanel />)
}

/** Returns the card div wrapping the given band label text. */
function getBandCard(label: string): HTMLElement {
  return screen.getByText(label).closest('[class*="rounded-lg"]') as HTMLElement
}

beforeEach(() => { vi.clearAllMocks() })

// ── Initial state ──────────────────────────────────────────────────────────

describe('GfxPanel — initial state', () => {
  it('calls fetchGraphics when Refresh is clicked', async () => {
    renderPanel()
    await userEvent.click(screen.getByRole('button', { name: /refresh/i }))
    expect(mockFetchGraphics).toHaveBeenCalledTimes(1)
  })

  it('shows empty-state prompt when no template is loaded', () => {
    renderPanel({ gfxData: {}, gfxTemplateName: '' })
    expect(screen.getByText(/click.*refresh to load/i)).toBeInTheDocument()
  })

  it('shows the template name above the band list', () => {
    renderPanel()
    expect(screen.getByText(TEMPLATE)).toBeInTheDocument()
  })
})

// ── Band cards ─────────────────────────────────────────────────────────────

describe('GfxPanel — band cards', () => {
  it('renders a card for every band in the template', () => {
    renderPanel()
    expect(screen.getByText('Top Band')).toBeInTheDocument()
    expect(screen.getByText('Lower Band')).toBeInTheDocument()
    expect(screen.getByText('Ticker Band')).toBeInTheDocument()
    expect(screen.getByText('Logo Band')).toBeInTheDocument()
    expect(screen.getByText('L Band')).toBeInTheDocument()
    expect(screen.getByText('Location Band')).toBeInTheDocument()
    expect(screen.getByText('Date Band')).toBeInTheDocument()
  })
})

// ── Toggle ─────────────────────────────────────────────────────────────────

describe('GfxPanel — toggle', () => {
  it('calls toggleGfxBand(key, true) when turning an OFF band ON', async () => {
    renderPanel()
    // top_band is first and OFF
    await userEvent.click(screen.getAllByRole('checkbox')[0])
    expect(mockToggleGfxBand).toHaveBeenCalledWith('top_band', true)
  })

  it('calls toggleGfxBand(key, false) when turning an ON band OFF', async () => {
    renderPanel()
    const bandIndex = Object.keys(BANDS_MAP).indexOf('lower_band')
    await userEvent.click(screen.getAllByRole('checkbox')[bandIndex])
    expect(mockToggleGfxBand).toHaveBeenCalledWith('lower_band', false)
  })

  it('disables the checkbox while that band is busy', () => {
    renderPanel({ gfxBusy: new Set(['top_band']) })
    expect(screen.getAllByRole('checkbox')[0]).toBeDisabled()
  })

  it('non-busy bands remain enabled when another band is busy', () => {
    renderPanel({ gfxBusy: new Set(['top_band']) })
    const bandIndex = Object.keys(BANDS_MAP).indexOf('lower_band')
    expect(screen.getAllByRole('checkbox')[bandIndex]).not.toBeDisabled()
  })
})

// ── Status banner ──────────────────────────────────────────────────────────

describe('GfxPanel — status banner', () => {
  it('shows status text when gfxStatus has content', () => {
    renderPanel({ gfxStatus: { text: 'Error: failed', type: 'err' } })
    expect(screen.getByText('Error: failed')).toBeInTheDocument()
  })

  it('hides status banner when text is empty', () => {
    renderPanel({ gfxStatus: { text: '', type: '' } })
    expect(screen.queryByText('✓ 7 bands')).not.toBeInTheDocument()
  })
})

// ── Refresh button ─────────────────────────────────────────────────────────

describe('GfxPanel — Refresh button', () => {
  it('calls fetchGraphics when Refresh is clicked', async () => {
    renderPanel()
    mockFetchGraphics.mockClear()
    await userEvent.click(screen.getByRole('button', { name: /refresh/i }))
    expect(mockFetchGraphics).toHaveBeenCalledTimes(1)
  })
})

// ── Content button: dialog selection ──────────────────────────────────────

describe('GfxPanel — Content button opens correct dialog', () => {
  it('opens GfxBandEditDialog for a text band (top_band)', async () => {
    renderPanel()
    await userEvent.click(within(getBandCard('Top Band')).getByTitle('Edit content'))
    expect(screen.getByTestId('edit-dialog')).toBeInTheDocument()
    expect(screen.queryByTestId('location-dialog')).not.toBeInTheDocument()
    expect(screen.queryByTestId('asset-dialog')).not.toBeInTheDocument()
  })

  it('opens GfxBandEditDialog for ticker_band', async () => {
    renderPanel()
    await userEvent.click(within(getBandCard('Ticker Band')).getByTitle('Edit content'))
    expect(screen.getByTestId('edit-dialog')).toBeInTheDocument()
  })

  it('opens GfxLocationDialog for location_band (not GfxBandEditDialog)', async () => {
    renderPanel()
    await userEvent.click(within(getBandCard('Location Band')).getByTitle('Edit content'))
    expect(screen.getByTestId('location-dialog')).toBeInTheDocument()
    expect(screen.queryByTestId('edit-dialog')).not.toBeInTheDocument()
  })

  it('opens GfxAssetDialog for logo_band', async () => {
    renderPanel()
    await userEvent.click(within(getBandCard('Logo Band')).getByTitle('Edit content'))
    expect(screen.getByTestId('asset-dialog')).toBeInTheDocument()
    expect(screen.queryByTestId('edit-dialog')).not.toBeInTheDocument()
  })

  it('opens GfxAssetDialog for l_band', async () => {
    renderPanel()
    await userEvent.click(within(getBandCard('L Band')).getByTitle('Edit content'))
    expect(screen.getByTestId('asset-dialog')).toBeInTheDocument()
  })

  it('passes band label to edit dialog', async () => {
    renderPanel()
    await userEvent.click(within(getBandCard('Top Band')).getByTitle('Edit content'))
    expect(screen.getByTestId('edit-dialog')).toHaveTextContent('Top Band')
  })

  it('closes dialog when it is dismissed', async () => {
    renderPanel()
    await userEvent.click(within(getBandCard('Top Band')).getByTitle('Edit content'))
    expect(screen.getByTestId('edit-dialog')).toBeInTheDocument()
    // Only one dialog can be open at a time — opening another closes the previous
    await userEvent.click(within(getBandCard('Ticker Band')).getByTitle('Edit content'))
    expect(screen.getAllByRole('dialog')).toHaveLength(1)
  })
})

// ── Layout button visibility ───────────────────────────────────────────────

describe('GfxPanel — Layout button', () => {
  it('shows Layout button for text bands', () => {
    renderPanel()
    expect(within(getBandCard('Top Band')).getByTitle('Edit layout')).toBeInTheDocument()
    expect(within(getBandCard('Ticker Band')).getByTitle('Edit layout')).toBeInTheDocument()
    expect(within(getBandCard('Lower Band')).getByTitle('Edit layout')).toBeInTheDocument()
  })

  it('hides Layout button for logo_band (asset band)', () => {
    renderPanel()
    expect(within(getBandCard('Logo Band')).queryByTitle('Edit layout')).not.toBeInTheDocument()
  })

  it('hides Layout button for l_band (asset band)', () => {
    renderPanel()
    expect(within(getBandCard('L Band')).queryByTitle('Edit layout')).not.toBeInTheDocument()
  })

  it('opens GfxLayoutDialog when Layout is clicked', async () => {
    renderPanel()
    await userEvent.click(within(getBandCard('Top Band')).getByTitle('Edit layout'))
    expect(screen.getByTestId('layout-dialog')).toBeInTheDocument()
  })

  it('passes band label to layout dialog', async () => {
    renderPanel()
    await userEvent.click(within(getBandCard('Lower Band')).getByTitle('Edit layout'))
    expect(screen.getByTestId('layout-dialog')).toHaveTextContent('Lower Band')
  })
})

// ── Position button ────────────────────────────────────────────────────────

describe('GfxPanel — Position button', () => {
  it('shows a Position button on every band card', () => {
    renderPanel()
    const positionBtns = screen.getAllByTitle('Edit position')
    expect(positionBtns).toHaveLength(Object.keys(BANDS_MAP).length)
  })

  it('opens GfxAlignmentDialog when Position is clicked', async () => {
    renderPanel()
    await userEvent.click(within(getBandCard('Top Band')).getByTitle('Edit position'))
    expect(screen.getByTestId('alignment-dialog')).toBeInTheDocument()
  })

  it('passes band label to alignment dialog', async () => {
    renderPanel()
    await userEvent.click(within(getBandCard('Lower Band')).getByTitle('Edit position'))
    expect(screen.getByTestId('alignment-dialog')).toHaveTextContent('Lower Band')
  })

  it('Position button is shown on asset bands too (logo_band)', () => {
    renderPanel()
    expect(within(getBandCard('Logo Band')).getByTitle('Edit position')).toBeInTheDocument()
  })
})
