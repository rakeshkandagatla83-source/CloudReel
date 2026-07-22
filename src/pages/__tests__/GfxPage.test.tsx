import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http } from '../../lib/http'
import { GfxPage } from '../GfxPage'

// ── Dialog stubs ───────────────────────────────────────────────────────────
vi.mock('../../features/studio/GfxBandEditDialog', () => ({
  GfxBandEditDialog: ({ open, label }: { open: boolean; label: string }) =>
    open ? <div role="dialog" data-testid="edit-dialog">{label}</div> : null,
}))
vi.mock('../../features/studio/GfxAssetDialog', () => ({
  GfxAssetDialog: ({ open, label }: { open: boolean; label: string }) =>
    open ? <div role="dialog" data-testid="asset-dialog">{label}</div> : null,
}))
vi.mock('../../features/studio/GfxLayoutDialog', () => ({
  GfxLayoutDialog: ({ open, label }: { open: boolean; label: string }) =>
    open ? <div role="dialog" data-testid="layout-dialog">{label}</div> : null,
}))
vi.mock('../../features/studio/GfxAlignmentDialog', () => ({
  GfxAlignmentDialog: ({ open }: { open: boolean }) =>
    open ? <div role="dialog" data-testid="alignment-dialog" /> : null,
}))
vi.mock('../../features/studio/GfxLocationDialog', () => ({
  GfxLocationDialog: ({ open }: { open: boolean }) =>
    open ? <div role="dialog" data-testid="location-dialog" /> : null,
}))

// ── Module mocks ───────────────────────────────────────────────────────────
vi.mock('../../lib/apiConfig', () => ({
  apiConfig: {
    studioGfxApiBase: 'http://gfx.test',
    scalaApiBase: 'http://scala.test/',
    studioCdnBase: 'http://cdn.test',
    studioWsUrl: 'ws://test',
    studioTemplateBase: 'http://template.test',
    studioPcrApiBase: 'http://pcr.test',
    dotnetApiBase: 'http://dotnet.test/',
    studioConferenceBase: 'http://conf.test',
    studioRtmpPreviewBase: 'http://rtmp.test',
    studioWebrtcPreviewBase: 'http://webrtc.test',
    meetingHostBase: 'http://meeting.test',
  },
}))

vi.mock('../../lib/storage', () => ({
  getStorage: vi.fn((key: string) => {
    if (key === 'pcr_channel_name') return 'test-ch'
    if (key === 'pcr_channel_id') return '1'
    if (key === 'pcr_token') return 'test-token'
    return null
  }),
  setStorage: vi.fn(),
  removeStorage: vi.fn(),
}))

vi.mock('../../lib/http', () => ({
  http: {
    post: vi.fn().mockResolvedValue({ assets: [] }),
    get: vi.fn(),
  },
}))

// ── Fetch fixtures ─────────────────────────────────────────────────────────
const STATUS_JSON = {
  data: [{
    templatetype: 'template1',
    statusType: {
      top_band: 'False',
      lower_band: 'True',
      ticker_band: 'False',
      logo_band: 'False',
      l_band: 'False',
      location_band: 'False',
      date_band: 'False',
      clock_band: 'False',
    },
  }],
}
const ALIGN_JSON = {
  data: [{
    layout: {},
    alignment: {
      top_band:      { x: 0, y: 0 },
      lower_band:    { x: 0, y: 0 },
      ticker_band:   { x: 0, y: 0 },
      logo_band:     { x: 0, y: 0 },
      l_band:        { x: 0, y: 0 },
      location_band: { x: 0, y: 0 },
      date_band:     { x: 0, y: 0 },
      clock_band:    { x: 0, y: 0 },
    },
  }],
}

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

function setupFetch(overrides: Record<string, unknown> = {}) {
  mockFetch.mockImplementation((url: string) => {
    if (url.includes('getstatus'))
      return Promise.resolve({ ok: true, json: () => Promise.resolve(overrides.status ?? STATUS_JSON) })
    if (url.includes('getalignment'))
      return Promise.resolve({ ok: true, json: () => Promise.resolve(ALIGN_JSON) })
    if (url.includes('getvalue/test-ch/logo_band') && overrides.logoAsset)
      return Promise.resolve({ ok: true, json: () => Promise.resolve(overrides.logoAsset) })
    if (url.includes('getvalue/test-ch/top_band') && overrides.topContent)
      return Promise.resolve({ ok: true, json: () => Promise.resolve(overrides.topContent) })
    return Promise.resolve({ ok: true, json: () => Promise.resolve([]) })
  })
}

/** Render GfxPage and wait for band cards to appear. */
async function renderAndWait(fetchOverrides: Record<string, unknown> = {}) {
  setupFetch(fetchOverrides)
  render(<GfxPage />)
  await waitFor(() => expect(screen.getByText('Top Band')).toBeInTheDocument())
}

/** Returns the card div wrapping the given band label. */
function getBandCard(label: string): HTMLElement {
  return screen.getByText(label).closest('[class*="rounded-xl"]') as HTMLElement
}

beforeEach(() => { vi.clearAllMocks() })

// ── Loading state ──────────────────────────────────────────────────────────

describe('GfxPage — loading state', () => {
  it('shows a loading spinner before data arrives', () => {
    mockFetch.mockImplementation(() => new Promise(() => {})) // never resolves
    render(<GfxPage />)
    expect(screen.getByText(/loading graphics bands/i)).toBeInTheDocument()
  })

  it('hides spinner once bands are loaded', async () => {
    await renderAndWait()
    expect(screen.queryByText(/loading graphics bands/i)).not.toBeInTheDocument()
  })
})

// ── Band cards ─────────────────────────────────────────────────────────────

describe('GfxPage — band cards', () => {
  it('renders a card for every band returned by the API', async () => {
    await renderAndWait()
    for (const label of ['Top Band', 'Lower Band', 'Ticker Band', 'Logo Band', 'L Band', 'Location Band', 'Date Band', 'Clock Band']) {
      expect(screen.getByText(label)).toBeInTheDocument()
    }
  })

  it('shows the ON/OFF count badges in the page header', async () => {
    await renderAndWait()
    expect(screen.getByText(/1 ON/i)).toBeInTheDocument()
    expect(screen.getByText(/8 OFF/i)).toBeInTheDocument()
  })

  it('shows correct ON count (1 band is ON)', async () => {
    await renderAndWait()
    expect(screen.getByText(/1 ON/i)).toBeInTheDocument()
  })

  it('shows correct OFF count (8 bands are OFF including breaking_news_band)', async () => {
    await renderAndWait()
    expect(screen.getByText(/8 OFF/i)).toBeInTheDocument()
  })
})

// ── Empty / error states ───────────────────────────────────────────────────

describe('GfxPage — empty and error states', () => {
  it('shows all standard bands when API returns empty statusType', async () => {
    setupFetch({ status: { data: [{ templatetype: 'template1', statusType: {} }] } })
    render(<GfxPage />)
    // When statusType is empty, GFX_DEFAULT_BAND_KEYS are merged in and shown as OFF
    await waitFor(() => expect(screen.getByText('Top Band')).toBeInTheDocument())
    expect(screen.getByText('Breaking News')).toBeInTheDocument()
  })

  it('shows an error status when the fetch fails', async () => {
    mockFetch.mockImplementation(() => Promise.resolve({ ok: false, status: 500 }))
    render(<GfxPage />)
    await waitFor(() => expect(screen.getByText(/error/i)).toBeInTheDocument())
  })
})

// ── Content button: correct dialog per band type ───────────────────────────

describe('GfxPage — Content button opens correct dialog', () => {
  it('opens GfxBandEditDialog for top_band (text band)', async () => {
    await renderAndWait()
    await userEvent.click(within(getBandCard('Top Band')).getByRole('button', { name: /content/i }))
    expect(screen.getByTestId('edit-dialog')).toBeInTheDocument()
    expect(screen.queryByTestId('location-dialog')).not.toBeInTheDocument()
    expect(screen.queryByTestId('asset-dialog')).not.toBeInTheDocument()
  })

  it('opens GfxBandEditDialog for ticker_band', async () => {
    await renderAndWait()
    await userEvent.click(within(getBandCard('Ticker Band')).getByRole('button', { name: /content/i }))
    expect(screen.getByTestId('edit-dialog')).toBeInTheDocument()
  })

  it('opens GfxLocationDialog for location_band (not GfxBandEditDialog)', async () => {
    await renderAndWait()
    await userEvent.click(within(getBandCard('Location Band')).getByRole('button', { name: /content/i }))
    expect(screen.getByTestId('location-dialog')).toBeInTheDocument()
    expect(screen.queryByTestId('edit-dialog')).not.toBeInTheDocument()
  })

  it('opens GfxAssetDialog for logo_band', async () => {
    await renderAndWait()
    await userEvent.click(within(getBandCard('Logo Band')).getByRole('button', { name: /content/i }))
    expect(screen.getByTestId('asset-dialog')).toBeInTheDocument()
    expect(screen.queryByTestId('edit-dialog')).not.toBeInTheDocument()
  })

  it('opens GfxAssetDialog for l_band', async () => {
    await renderAndWait()
    await userEvent.click(within(getBandCard('L Band')).getByRole('button', { name: /content/i }))
    expect(screen.getByTestId('asset-dialog')).toBeInTheDocument()
  })

  it('passes band label into the edit dialog', async () => {
    await renderAndWait()
    await userEvent.click(within(getBandCard('Lower Band')).getByRole('button', { name: /content/i }))
    expect(screen.getByTestId('edit-dialog')).toHaveTextContent('Lower Band')
  })

  it('only one dialog is open at a time', async () => {
    await renderAndWait()
    await userEvent.click(within(getBandCard('Top Band')).getByRole('button', { name: /content/i }))
    await userEvent.click(within(getBandCard('Ticker Band')).getByRole('button', { name: /content/i }))
    expect(screen.getAllByRole('dialog')).toHaveLength(1)
  })
})

// ── Content button visibility ──────────────────────────────────────────────

describe('GfxPage — Content button visibility', () => {
  it('shows Content button on text bands', async () => {
    await renderAndWait()
    expect(within(getBandCard('Top Band')).getByRole('button', { name: /content/i })).toBeInTheDocument()
    expect(within(getBandCard('Ticker Band')).getByRole('button', { name: /content/i })).toBeInTheDocument()
    expect(within(getBandCard('Lower Band')).getByRole('button', { name: /content/i })).toBeInTheDocument()
  })

  it('shows Content button on asset bands (logo_band, l_band)', async () => {
    await renderAndWait()
    expect(within(getBandCard('Logo Band')).getByRole('button', { name: /content/i })).toBeInTheDocument()
    expect(within(getBandCard('L Band')).getByRole('button', { name: /content/i })).toBeInTheDocument()
  })

  it('hides Content button for styling-only bands (date_band, clock_band)', async () => {
    await renderAndWait()
    expect(within(getBandCard('Date Band')).queryByRole('button', { name: /content/i })).not.toBeInTheDocument()
    expect(within(getBandCard('Clock Band')).queryByRole('button', { name: /content/i })).not.toBeInTheDocument()
  })
})

// ── Layout button visibility ───────────────────────────────────────────────

describe('GfxPage — Layout button visibility', () => {
  it('shows Layout button for text bands', async () => {
    await renderAndWait()
    expect(within(getBandCard('Top Band')).getByRole('button', { name: /layout/i })).toBeInTheDocument()
    expect(within(getBandCard('Ticker Band')).getByRole('button', { name: /layout/i })).toBeInTheDocument()
  })

  it('shows Layout button for styling-only bands (date_band, clock_band)', async () => {
    await renderAndWait()
    expect(within(getBandCard('Date Band')).getByRole('button', { name: /layout/i })).toBeInTheDocument()
    expect(within(getBandCard('Clock Band')).getByRole('button', { name: /layout/i })).toBeInTheDocument()
  })

  it('hides Layout button for logo_band (asset band)', async () => {
    await renderAndWait()
    expect(within(getBandCard('Logo Band')).queryByRole('button', { name: /layout/i })).not.toBeInTheDocument()
  })

  it('hides Layout button for l_band (asset band)', async () => {
    await renderAndWait()
    expect(within(getBandCard('L Band')).queryByRole('button', { name: /layout/i })).not.toBeInTheDocument()
  })

  it('opens GfxLayoutDialog when Layout is clicked', async () => {
    await renderAndWait()
    await userEvent.click(within(getBandCard('Top Band')).getByRole('button', { name: /layout/i }))
    expect(screen.getByTestId('layout-dialog')).toBeInTheDocument()
  })

  it('passes band label into the layout dialog', async () => {
    await renderAndWait()
    await userEvent.click(within(getBandCard('Ticker Band')).getByRole('button', { name: /layout/i }))
    expect(screen.getByTestId('layout-dialog')).toHaveTextContent('Ticker Band')
  })
})

// ── Position button ────────────────────────────────────────────────────────

describe('GfxPage — Position button', () => {
  it('shows Position button on every band card', async () => {
    await renderAndWait()
    // 8 bands in STATUS_JSON + breaking_news_band merged in from GFX_DEFAULT_BAND_KEYS = 9 total
    expect(screen.getAllByRole('button', { name: /position/i })).toHaveLength(9)
  })

  it('opens GfxAlignmentDialog when Position is clicked', async () => {
    await renderAndWait()
    await userEvent.click(within(getBandCard('Top Band')).getByRole('button', { name: /position/i }))
    expect(screen.getByTestId('alignment-dialog')).toBeInTheDocument()
  })

  it('Position button is present on asset bands (logo_band)', async () => {
    await renderAndWait()
    expect(within(getBandCard('Logo Band')).getByRole('button', { name: /position/i })).toBeInTheDocument()
  })
})

// ── Refresh button ─────────────────────────────────────────────────────────

describe('GfxPage — Refresh button', () => {
  it('re-fetches data when Refresh is clicked', async () => {
    await renderAndWait()
    const callsBefore = mockFetch.mock.calls.length
    await userEvent.click(screen.getByRole('button', { name: /refresh/i }))
    await waitFor(() => expect(mockFetch.mock.calls.length).toBeGreaterThan(callsBefore))
  })
})

// ── Band toggle ────────────────────────────────────────────────────────────

describe('GfxPage — Band toggle', () => {
  it('calls http.post with upd_display operation when toggle is clicked', async () => {
    await renderAndWait()
    // top_band is OFF → clicking its toggle turns it ON
    await userEvent.click(within(getBandCard('Top Band')).getByTitle('Turn ON'))
    await waitFor(() =>
      expect(vi.mocked(http.post)).toHaveBeenCalledWith(
        '',
        expect.stringContaining('set_gfx_setup_Data'),
        expect.objectContaining({ operation: 'upd_display', gfxtype: 'top_band' }),
      )
    )
  })

  it('lower_band is ON — toggle button shows "Turn OFF"', async () => {
    await renderAndWait()
    expect(within(getBandCard('Lower Band')).getByTitle('Turn OFF')).toBeInTheDocument()
  })

  it('top_band is OFF — toggle button shows "Turn ON"', async () => {
    await renderAndWait()
    expect(within(getBandCard('Top Band')).getByTitle('Turn ON')).toBeInTheDocument()
  })
})

// ── Content preview ────────────────────────────────────────────────────────

describe('GfxPage — content preview on card', () => {
  it('shows "No content" placeholder for text band with no saved data', async () => {
    await renderAndWait()
    await waitFor(() =>
      expect(within(getBandCard('Top Band')).getByText(/no content/i)).toBeInTheDocument()
    )
  })

  it('shows "No asset selected" for asset band with no saved selection', async () => {
    await renderAndWait()
    await waitFor(() =>
      expect(within(getBandCard('Logo Band')).getByText(/no asset selected/i)).toBeInTheDocument()
    )
  })

  it('shows "Styling & position only" label for date_band', async () => {
    await renderAndWait()
    expect(within(getBandCard('Date Band')).getByText(/styling.*position/i)).toBeInTheDocument()
  })

  it('shows text content preview when API returns saved news items for top_band', async () => {
    await renderAndWait({
      topContent: [{ id: 1, news_value: 'Breaking Story', disabled: false }],
    })
    await waitFor(() => expect(screen.getByText('Breaking Story')).toBeInTheDocument())
  })

  it('shows asset name preview when API returns saved logo_band asset', async () => {
    await renderAndWait({
      logoAsset: { Type: 'p_VODLogo', VODLogo: [{ id: '27', name: 'LOGO.mp4', url: 'http://cdn.test/LOGO.mp4' }] },
    })
    await waitFor(() => expect(screen.getByText(/LOGO\.mp4/)).toBeInTheDocument())
  })
})
