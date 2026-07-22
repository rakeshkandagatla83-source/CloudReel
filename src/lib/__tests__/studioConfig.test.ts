import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

const { mockGetStorage, mockRemoveStorage } = vi.hoisted(() => ({
  mockGetStorage: vi.fn(),
  mockRemoveStorage: vi.fn(),
}))

vi.mock('../storage', () => ({
  getStorage: mockGetStorage,
  removeStorage: mockRemoveStorage,
}))

vi.mock('../apiConfig', () => ({
  apiConfig: {
    dotnetApiBase: 'https://api.test/',
    scalaApiBase: 'https://scala.test/',
    studioWsUrl: 'wss://ws.test',
    controlWsUrl: 'wss://control.test',
    studioTemplateBase: 'https://template.test',
    studioCdnBase: 'https://cdn.test',
    studioConferenceBase: 'https://conf.test',
    studioPcrApiBase: 'https://pcr.test',
    studioRtmpPreviewBase: 'https://rtmp.test/preview',
    studioWebrtcPreviewBase: 'https://webrtc.test/prv',
    studioGfxApiBase: 'https://gfx.test',
    meetingHostBase: 'https://meeting.test',
  },
}))

// ── Import after mocks ─────────────────────────────────────────────────────────

import {
  getStudioChannel,
  getStudioCid,
  clearEventScopedStudioState,
  getPreviewUrl,
  getMasterUrl,
  getBgBase,
  getVideoBase,
  DEFAULT_BG_COVER_URL,
  bandLabel,
  TEXT_BANDS,
  ASSET_BANDS,
  LAYOUT_BANDS,
  STYLING_ONLY_BANDS,
  BG_VIDEO_BANDS,
  BG_IMAGE_BANDS,
  BANDS_WITH_ANIMATION,
  GFX_ALIGNMENT_DEFAULTS,
  GFX_DEFAULT_BAND_KEYS,
  GFX_BAND_DISPLAY_ORDER,
  STREAMING_PRESETS,
  GFX_FONTS,
} from '../studioConfig'

beforeEach(() => vi.clearAllMocks())

// ── getStudioChannel ──────────────────────────────────────────────────────────

describe('getStudioChannel', () => {
  it('returns channel name from storage', () => {
    mockGetStorage.mockReturnValue('my-channel')
    expect(getStudioChannel()).toBe('my-channel')
    expect(mockGetStorage).toHaveBeenCalledWith('pcr_channel_name')
  })

  it('returns null when channel name is not stored', () => {
    mockGetStorage.mockReturnValue(null)
    expect(getStudioChannel()).toBeNull()
  })
})

// ── getStudioCid ──────────────────────────────────────────────────────────────

describe('getStudioCid', () => {
  it('returns channel id as a string', () => {
    mockGetStorage.mockReturnValue('42')
    expect(getStudioCid()).toBe('42')
    expect(mockGetStorage).toHaveBeenCalledWith('pcr_channel_id')
  })

  it('coerces a numeric channel id to string', () => {
    mockGetStorage.mockReturnValue(99)
    expect(getStudioCid()).toBe('99')
  })

  it('returns null when channel id is not stored', () => {
    mockGetStorage.mockReturnValue(null)
    expect(getStudioCid()).toBeNull()
  })
})

// ── clearEventScopedStudioState ───────────────────────────────────────────────

describe('clearEventScopedStudioState', () => {
  it('removes all 4 storage keys with the cid_eventId prefix', () => {
    clearEventScopedStudioState('7', 'evt-100')
    expect(mockRemoveStorage).toHaveBeenCalledWith('studio_rows_7_evt-100')
    expect(mockRemoveStorage).toHaveBeenCalledWith('studio_group_7_evt-100')
    expect(mockRemoveStorage).toHaveBeenCalledWith('studio_active_row_7_evt-100')
    expect(mockRemoveStorage).toHaveBeenCalledWith('studio_source_locations_7_evt-100')
    expect(mockRemoveStorage).toHaveBeenCalledTimes(4)
  })

  it('uses the correct prefix for different cid and eventId values', () => {
    clearEventScopedStudioState('15', 'event-999')
    expect(mockRemoveStorage).toHaveBeenCalledWith('studio_rows_15_event-999')
    expect(mockRemoveStorage).toHaveBeenCalledWith('studio_source_locations_15_event-999')
  })
})

// ── getPreviewUrl ─────────────────────────────────────────────────────────────

describe('getPreviewUrl', () => {
  it('returns preview URL with channel param', () => {
    expect(getPreviewUrl('sbtalks')).toBe(
      'https://template.test/live-match-sldp/masterN.html?channel=sbtalks&type=preview&controller=1',
    )
  })

  it('encodes special characters in channel name', () => {
    const url = getPreviewUrl('test-channel')
    expect(url).toContain('channel=test-channel')
    expect(url).toContain('type=preview')
  })
})

// ── getMasterUrl ──────────────────────────────────────────────────────────────

describe('getMasterUrl', () => {
  it('returns master URL with channel param', () => {
    expect(getMasterUrl('sbtalks')).toBe(
      'https://template.test/live-match-sldp/masterN.html?channel=sbtalks&type=master&controller=1',
    )
  })
})

// ── getBgBase ─────────────────────────────────────────────────────────────────

describe('getBgBase', () => {
  it('returns CDN URL with channel from storage', () => {
    mockGetStorage.mockReturnValue('my-channel')
    expect(getBgBase()).toBe('https://cdn.test/my-channel/graphics/library/')
  })

  it('uses empty string for channel when storage returns null', () => {
    mockGetStorage.mockReturnValue(null)
    expect(getBgBase()).toBe('https://cdn.test//graphics/library/')
  })
})

// ── getVideoBase ──────────────────────────────────────────────────────────────

describe('getVideoBase', () => {
  it('returns CDN URL with channel from storage', () => {
    mockGetStorage.mockReturnValue('my-channel')
    expect(getVideoBase()).toBe('https://cdn.test/my-channel/videos/library/')
  })

  it('uses empty string for channel when storage returns null', () => {
    mockGetStorage.mockReturnValue(null)
    expect(getVideoBase()).toBe('https://cdn.test//videos/library/')
  })
})

// ── DEFAULT_BG_COVER_URL ──────────────────────────────────────────────────────

describe('DEFAULT_BG_COVER_URL', () => {
  it('returns the correct cloudfront URL with channel name', () => {
    expect(DEFAULT_BG_COVER_URL('my-channel')).toBe(
      'https://d2aqhkzukipl76.cloudfront.net/producer/my-channel/bgCover/bgvideoimg.png',
    )
  })

  it('interpolates any channel name correctly', () => {
    const url = DEFAULT_BG_COVER_URL('sbtalks-uat')
    expect(url).toContain('/producer/sbtalks-uat/')
    expect(url).toContain('bgvideoimg.png')
  })
})

// ── bandLabel ─────────────────────────────────────────────────────────────────

describe('bandLabel', () => {
  it('returns display name from BAND_DISPLAY_NAMES map', () => {
    expect(bandLabel('lower_band')).toBe('Lower Band')
    expect(bandLabel('ticker_band')).toBe('Ticker Band')
    expect(bandLabel('logo_band')).toBe('Logo Band')
    expect(bandLabel('breaking_news_band')).toBe('Breaking News')
    expect(bandLabel('bottom_ticker_band')).toBe('Bottom Ticker')
    expect(bandLabel('coming_up_band')).toBe('Coming Up')
  })

  it('falls back to title-cased key for unknown bands', () => {
    expect(bandLabel('custom_band')).toBe('Custom Band')
    expect(bandLabel('my_special_band')).toBe('My Special Band')
  })
})

// ── TEXT_BANDS ────────────────────────────────────────────────────────────────

describe('TEXT_BANDS', () => {
  it('includes all text/news content bands', () => {
    expect(TEXT_BANDS.has('top_band')).toBe(true)
    expect(TEXT_BANDS.has('lower_band')).toBe(true)
    expect(TEXT_BANDS.has('ticker_band')).toBe(true)
    expect(TEXT_BANDS.has('breaking_news_band')).toBe(true)
    expect(TEXT_BANDS.has('bottom_ticker_band')).toBe(true)
    expect(TEXT_BANDS.has('location_band')).toBe(true)
    expect(TEXT_BANDS.has('coming_up_band')).toBe(true)
  })

  it('excludes asset-only bands', () => {
    expect(TEXT_BANDS.has('logo_band')).toBe(false)
    expect(TEXT_BANDS.has('l_band')).toBe(false)
  })
})

// ── ASSET_BANDS ───────────────────────────────────────────────────────────────

describe('ASSET_BANDS', () => {
  it('contains logo_band and l_band', () => {
    expect(ASSET_BANDS.has('logo_band')).toBe(true)
    expect(ASSET_BANDS.has('l_band')).toBe(true)
  })

  it('does not include text bands', () => {
    expect(ASSET_BANDS.has('ticker_band')).toBe(false)
    expect(ASSET_BANDS.has('lower_band')).toBe(false)
  })
})

// ── LAYOUT_BANDS ──────────────────────────────────────────────────────────────

describe('LAYOUT_BANDS', () => {
  it('includes bands with editable layout', () => {
    expect(LAYOUT_BANDS.has('top_band')).toBe(true)
    expect(LAYOUT_BANDS.has('lower_band')).toBe(true)
    expect(LAYOUT_BANDS.has('ticker_band')).toBe(true)
    expect(LAYOUT_BANDS.has('clock_band')).toBe(true)
    expect(LAYOUT_BANDS.has('date_band')).toBe(true)
    expect(LAYOUT_BANDS.has('bottom_ticker_band')).toBe(true)
    expect(LAYOUT_BANDS.has('breaking_news_band')).toBe(true)
    expect(LAYOUT_BANDS.has('location_band')).toBe(true)
  })

  it('excludes asset bands and coming_up_band', () => {
    expect(LAYOUT_BANDS.has('logo_band')).toBe(false)
    expect(LAYOUT_BANDS.has('l_band')).toBe(false)
    expect(LAYOUT_BANDS.has('coming_up_band')).toBe(false)
  })
})

// ── STYLING_ONLY_BANDS ────────────────────────────────────────────────────────

describe('STYLING_ONLY_BANDS', () => {
  it('contains date_band and clock_band', () => {
    expect(STYLING_ONLY_BANDS.has('date_band')).toBe(true)
    expect(STYLING_ONLY_BANDS.has('clock_band')).toBe(true)
  })

  it('does not include text-editable bands', () => {
    expect(STYLING_ONLY_BANDS.has('ticker_band')).toBe(false)
    expect(STYLING_ONLY_BANDS.has('lower_band')).toBe(false)
  })
})

// ── BG_VIDEO_BANDS ────────────────────────────────────────────────────────────

describe('BG_VIDEO_BANDS', () => {
  it('contains all bands with a bgVideo alignment dropdown', () => {
    expect(BG_VIDEO_BANDS.has('top_band')).toBe(true)
    expect(BG_VIDEO_BANDS.has('lower_band')).toBe(true)
    expect(BG_VIDEO_BANDS.has('location_band')).toBe(true)
    expect(BG_VIDEO_BANDS.has('breaking_news_band')).toBe(true)
  })
})

// ── BG_IMAGE_BANDS ────────────────────────────────────────────────────────────

describe('BG_IMAGE_BANDS', () => {
  it('contains all bands with a bgImage alignment dropdown', () => {
    expect(BG_IMAGE_BANDS.has('ticker_band')).toBe(true)
    expect(BG_IMAGE_BANDS.has('clock_band')).toBe(true)
    expect(BG_IMAGE_BANDS.has('date_band')).toBe(true)
    expect(BG_IMAGE_BANDS.has('bottom_ticker_band')).toBe(true)
  })

  it('does not include video-background bands', () => {
    expect(BG_IMAGE_BANDS.has('top_band')).toBe(false)
    expect(BG_IMAGE_BANDS.has('lower_band')).toBe(false)
  })
})

// ── BANDS_WITH_ANIMATION ──────────────────────────────────────────────────────

describe('BANDS_WITH_ANIMATION', () => {
  it('contains all animation-supported bands', () => {
    expect(BANDS_WITH_ANIMATION.has('top_band')).toBe(true)
    expect(BANDS_WITH_ANIMATION.has('lower_band')).toBe(true)
    expect(BANDS_WITH_ANIMATION.has('bottom_ticker_band')).toBe(true)
    expect(BANDS_WITH_ANIMATION.has('breaking_news_band')).toBe(true)
  })

  it('does not include non-animated bands', () => {
    expect(BANDS_WITH_ANIMATION.has('clock_band')).toBe(false)
    expect(BANDS_WITH_ANIMATION.has('logo_band')).toBe(false)
  })
})

// ── GFX_ALIGNMENT_DEFAULTS ────────────────────────────────────────────────────

describe('GFX_ALIGNMENT_DEFAULTS', () => {
  it('has an entry for every key in GFX_DEFAULT_BAND_KEYS', () => {
    for (const key of GFX_DEFAULT_BAND_KEYS) {
      expect(GFX_ALIGNMENT_DEFAULTS).toHaveProperty(key)
    }
  })

  it('has an entry for bottom_ticker_band', () => {
    expect(GFX_ALIGNMENT_DEFAULTS).toHaveProperty('bottom_ticker_band')
  })

  it('each alignment entry is a non-null object', () => {
    for (const alignment of Object.values(GFX_ALIGNMENT_DEFAULTS)) {
      expect(alignment).not.toBeNull()
      expect(typeof alignment).toBe('object')
    }
  })
})

// ── GFX_DEFAULT_BAND_KEYS and GFX_BAND_DISPLAY_ORDER ─────────────────────────

describe('GFX_DEFAULT_BAND_KEYS and GFX_BAND_DISPLAY_ORDER', () => {
  it('both have the same set of band keys', () => {
    expect(new Set(GFX_DEFAULT_BAND_KEYS)).toEqual(new Set(GFX_BAND_DISPLAY_ORDER))
  })

  it('GFX_DEFAULT_BAND_KEYS has 9 bands', () => {
    expect(GFX_DEFAULT_BAND_KEYS).toHaveLength(9)
  })

  it('GFX_BAND_DISPLAY_ORDER has 9 bands', () => {
    expect(GFX_BAND_DISPLAY_ORDER).toHaveLength(9)
  })

  it('both include top_band, lower_band, and breaking_news_band', () => {
    expect(GFX_DEFAULT_BAND_KEYS).toContain('top_band')
    expect(GFX_DEFAULT_BAND_KEYS).toContain('lower_band')
    expect(GFX_DEFAULT_BAND_KEYS).toContain('breaking_news_band')
    expect(GFX_BAND_DISPLAY_ORDER).toContain('top_band')
    expect(GFX_BAND_DISPLAY_ORDER).toContain('lower_band')
    expect(GFX_BAND_DISPLAY_ORDER).toContain('breaking_news_band')
  })
})

// ── STREAMING_PRESETS ─────────────────────────────────────────────────────────

describe('STREAMING_PRESETS', () => {
  it('has exactly 4 platforms', () => {
    expect(STREAMING_PRESETS).toHaveLength(4)
  })

  it('includes YouTube, Facebook, Twitch, and Custom RTMP', () => {
    const platforms = STREAMING_PRESETS.map(p => p.platform)
    expect(platforms).toContain('YouTube')
    expect(platforms).toContain('Facebook')
    expect(platforms).toContain('Twitch')
    expect(platforms).toContain('Custom RTMP')
  })

  it('each preset has platform, icon, color, startApi, stopApi, and fields', () => {
    for (const preset of STREAMING_PRESETS) {
      expect(preset).toHaveProperty('platform')
      expect(preset).toHaveProperty('icon')
      expect(preset).toHaveProperty('color')
      expect(preset).toHaveProperty('startApi')
      expect(preset).toHaveProperty('stopApi')
      expect(Array.isArray(preset.fields)).toBe(true)
    }
  })

  it('each preset has at least one field', () => {
    for (const preset of STREAMING_PRESETS) {
      expect(preset.fields.length).toBeGreaterThan(0)
    }
  })

  it('every field has key, label, placeholder, and type', () => {
    for (const preset of STREAMING_PRESETS) {
      for (const field of preset.fields) {
        expect(field).toHaveProperty('key')
        expect(field).toHaveProperty('label')
        expect(field).toHaveProperty('placeholder')
        expect(field).toHaveProperty('type')
      }
    }
  })
})

// ── GFX_FONTS ─────────────────────────────────────────────────────────────────

describe('GFX_FONTS', () => {
  it('every font has a non-empty label and value', () => {
    for (const font of GFX_FONTS) {
      expect(typeof font.label).toBe('string')
      expect(font.label.length).toBeGreaterThan(0)
      expect(typeof font.value).toBe('string')
      expect(font.value.length).toBeGreaterThan(0)
    }
  })

  it('contains at least 10 font options', () => {
    expect(GFX_FONTS.length).toBeGreaterThanOrEqual(10)
  })

  it('contains Arial and Roboto', () => {
    const labels = GFX_FONTS.map(f => f.label)
    expect(labels).toContain('Arial')
    expect(labels).toContain('Roboto')
  })
})
