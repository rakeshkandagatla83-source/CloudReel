import type { StreamingPreset, GfxBandAlignment, GfxBandLayout } from '../types/studio'
import { getStorage, removeStorage } from './storage'
import { apiConfig } from './apiConfig'

// ── Runtime values from app storage ───────────────────────────────────────
export function getStudioChannel(): string | null {
  return getStorage<string>('pcr_channel_name') ?? null
}
export function getStudioCid(): string | null {
  const v = getStorage<string | number>('pcr_channel_id')
  return v != null ? String(v) : null
}

// Removes all event-scoped studio state for a given cid+eventId.
// Call this before writing a new studio_event_id so stale rows/group/source
// data from the previous event does not bleed into the new one.
export function clearEventScopedStudioState(cid: string, eventId: string) {
  const prefix = `${cid}_${eventId}`
  removeStorage(`studio_rows_${prefix}`)
  removeStorage(`studio_group_${prefix}`)
  removeStorage(`studio_active_row_${prefix}`)
  removeStorage(`studio_source_locations_${prefix}`)
  removeStorage('compact_source_pool')
  removeStorage('compact_pool_event_id')
  removeStorage('compact_selected_keys')
  removeStorage('compact_preview_layout_id')
  removeStorage('compact_master_layout_id')
  removeStorage('compact_post_take_mode')
}

// ── Service base URLs (all driven by env vars) ────────────────────────────
export const STUDIO_WS_URL = apiConfig.studioWsUrl
export const CONTROL_WS_URL = apiConfig.controlWsUrl

export function getPreviewUrl(channel: string): string {
  return `${apiConfig.studioTemplateBase}/live-match-sldp/masterN.html?channel=${channel}&type=preview&controller=1`
}
export function getMasterUrl(channel: string): string {
  return `${apiConfig.studioTemplateBase}/live-match-sldp/masterN.html?channel=${channel}&type=master&controller=1`
}

export const getBgBase = () => `${apiConfig.studioCdnBase}/${getStudioChannel() ?? ''}/graphics/library/`
export const getVideoBase = () => `${apiConfig.studioCdnBase}/${getStudioChannel() ?? ''}/videos/library/`
export const DEFAULT_BG_COVER_URL = (channelName: string) =>
  `https://d2aqhkzukipl76.cloudfront.net/producer/${channelName}/bgCover/bgvideoimg.png`

export const PARTICIPANTS_API = `${apiConfig.studioConferenceBase}/describeLiveStreamOnlineList`
export const LAYOUT_API = `${apiConfig.studioPcrApiBase}/pcr/v1/get`
export const RTMP_API = `${apiConfig.dotnetApiBase}v1/JanyaGWT/GetStreams`
export const RTMP_APPLICATION_API = `${apiConfig.dotnetApiBase}v1/JanyaGWT/ApplicationSetting`
export const RTMP_PUBLISH_URL_PREFIX = 'rtmp://43.134.235.244/'
export const RTMP_PREVIEW_BASE = apiConfig.studioRtmpPreviewBase
export const SLDP_WSS_BASE = 'wss://producerprv.janya.video'
export const WEBRTC_PREVIEW_BASE = apiConfig.studioWebrtcPreviewBase

export const VIDEOS_API = 'v1/playout/getassets/with/folders'
export const MEETING_API = 'v1/Producer/add-videoconference-info'
export const GUEST_PARTICIPANTS_API = 'v1/Producer/get-videoconference-participants'
export const GUEST_THUMBNAIL_UPDATE_API = 'v1/Producer/upd-videoconference-imagepath'

export const GFX_API = `${apiConfig.studioGfxApiBase}/api/get_gfx_setup_Data/getstatus`
export const GFX_SET_API = `${apiConfig.studioGfxApiBase}/api/set_gfx_setup_Data`
export const GFX_GETVALUE_API = `${apiConfig.studioGfxApiBase}/api/get_gfx_setup_Data/getvalue`
export const GFX_GETALIGNMENT_API = `${apiConfig.studioGfxApiBase}/api/get_gfx_setup_Data/getalignment`
export const GFX_ASSETS_API = 'v1/playout/getassets'

export const DEST_STORAGE_KEY = 'qpanel_destinations'
export const RECORDING_WS_URL = 'wss://recording.janya.video'
export const TELEPROMPTER_WS_URL = 'wss://ws-nrcstp.janya.video'
export const TELEPROMPTER_API = `${apiConfig.studioPcrApiBase}/v1/api/producer`
// Social panel YouTube chat credentials
export const YT_CLIENT_ID = import.meta.env.VITE_YT_CLIENT_ID as string
export const YT_CLIENT_SECRET = import.meta.env.VITE_YT_CLIENT_SECRET as string
export const YT_SCOPE = 'https://www.googleapis.com/auth/youtube.readonly'
export const GOOGLE_SHEETS_API_KEY = import.meta.env.VITE_GOOGLE_SHEETS_API_KEY as string

export const BAND_DISPLAY_NAMES: Record<string, string> = {
  date_band: 'Date Band',
  ticker_band: 'Ticker Band',
  lower_band: 'Lower Band',
  clock_band: 'Clock Band',
  logo_band: 'Logo Band',
  l_band: 'L Band',
  location_band: 'Location Band',
  top_band: 'Top Band',
  breaking_news_band: 'Breaking News',
  bottom_ticker_band: 'Bottom Ticker',
  coming_up_band: 'Coming Up',
}

// Max character limit per band text item (from new-pcr-copy reference)
export const BAND_TEXT_MAX_LENGTH: Record<string, number> = {
  top_band: 55,
  lower_band: 180,
  coming_up_band: 180,
}

// Bands with text/news content
export const TEXT_BANDS = new Set([
  'top_band', 'lower_band', 'ticker_band', 'breaking_news_band',
  'bottom_ticker_band', 'location_band', 'coming_up_band',
])

// Bands that use image asset selection
export const ASSET_BANDS = new Set(['logo_band', 'l_band'])

// Bands that have an editable layout (font color, size, family, animation)
// Excludes asset bands (logo_band, l_band) and coming_up_band (no layout data)
export const LAYOUT_BANDS = new Set([
  'top_band', 'lower_band', 'ticker_band', 'clock_band',
  'date_band', 'bottom_ticker_band', 'breaking_news_band', 'location_band',
])


// Bands with no editable content (positioning/styling only)
export const STYLING_ONLY_BANDS = new Set(['date_band', 'clock_band'])

// Bands whose alignment has a bgVideo dropdown (video + image assets)
export const BG_VIDEO_BANDS = new Set(['top_band', 'lower_band', 'location_band', 'breaking_news_band'])
// Bands whose alignment has a bgImage dropdown (image assets only)
export const BG_IMAGE_BANDS = new Set(['ticker_band', 'clock_band', 'date_band', 'bottom_ticker_band'])

// WS message type sent when band content (setvalue) is saved
export const GFX_CONTENT_WS_TYPE: Record<string, string> = {
  top_band: 'p_headerNews',
  lower_band: 'p_bottomNews',
  ticker_band: 'p_tickerNews',
  breaking_news_band: 'p_breakingNews',
  bottom_ticker_band: 'p_bottomTickerNews',
  location_band: 'p_location',
  coming_up_band: 'p_upcoming',
  logo_band: 'p_VODLogo',
  l_band: 'p_Lband',
}

// WS packet payload key for each band's content (matches Angular field names)
export const GFX_CONTENT_WS_PAYLOAD: Record<string, string> = {
  top_band: 'headerNews',
  lower_band: 'bottomNews',
  ticker_band: 'tickerNews',
  breaking_news_band: 'breakingNews',
  bottom_ticker_band: 'news',
  location_band: 'locNews',
  coming_up_band: 'comingUpNews',
  logo_band: 'VODLogo',
  l_band: 'lband',
}

// WS message type sent when band alignment (setalignment) is saved
export const GFX_ALIGNMENT_WS_TYPE: Record<string, string> = {
  top_band: 'p_headerCordinates',
  lower_band: 'p_bottomCordinates',
  breaking_news_band: 'p_breakingNewsCordinates',
  ticker_band: 'p_tickerBand',
  clock_band: 'p_clockBand',
  date_band: 'p_dateBand',
  location_band: 'p_locationCordinates',
  logo_band: 'p_voDLogoCoordinates',
  l_band: 'p_lBandCoordinates',
  bottom_ticker_band: 'p_bottomTickerCoordinates',
}

// WS packet payload key for each band's alignment data (matches Angular field names)
export const GFX_ALIGNMENT_WS_PAYLOAD: Record<string, string> = {
  top_band: 'HeaderVal',
  lower_band: 'bottomVal',
  location_band: 'locationVal',
  logo_band: 'VODLogoVal',
  l_band: 'l_BandVal',
  bottom_ticker_band: 'bottomTicker',
  breaking_news_band: 'BreakingNewsVal',
  clock_band: 'clockDetails',
  date_band: 'dateDetails',
  ticker_band: 'tickerDetails',
}

// Bands that support animation in their layout settings
export const BANDS_WITH_ANIMATION = new Set([
  'top_band', 'lower_band', 'bottom_ticker_band', 'breaking_news_band',
])

// Default alignment field set per band — derived from clean API data (sbtalks-uat channel).
// Used when a band has no stored alignment, or when recovering corrupted scalar data.
export const GFX_ALIGNMENT_DEFAULTS: Record<string, GfxBandAlignment> = {
  lower_band:         { bgVideo: '', bottom: 0, left: 0, width: 100, textBottom: 0, textLeft: 0, textWidth: 100 },
  top_band:           { bgVideo: '', top: 0, left: 0, width: 100, textTop: 0, textLeft: 0 },
  breaking_news_band: { bgVideo: '', top: 0, left: 0, width: 100, textTop: 0, textLeft: 0, zIndex: false },
  ticker_band:        { bgImage: '', bottom: 0, left: 0, width: 100, textBottom: 0, textLeft: 0, textWidth: 100 },
  location_band:      { bgVideo: '', top: 0, left: 0, width: 100, textTop: 0, textLeft: 0 },
  bottom_ticker_band: { bgImage: '', bottom: 0, left: 0, width: 100, textBottom: 0, textLeft: 0, textWidth: 100 },
  date_band:          { bgImage: '', width: 0, left: 0, top: 0, textWidth: 100, textLeft: 0, textTop: 0 },
  clock_band:         { bgImage: '', width: 0, left: 0, top: 0, textWidth: 100, textLeft: 0, textTop: 0 },
  logo_band:          { top: 0, width: 0, height: 0, right: 0 },
  l_band:             { top: 0, left: 0 },
}

// Canonical ordered list of all known band keys — used to build a default band list
// when getstatus returns {} (channel has no saved GFX data yet).
export const GFX_DEFAULT_BAND_KEYS: string[] = [
  'top_band', 'lower_band', 'ticker_band', 'l_band', 'location_band',
  'date_band', 'clock_band', 'logo_band', 'breaking_news_band',
]

// Display order for band cards (GfxPage grid and GfxPanel list).
// Row 1: Top | Lower | Ticker
// Row 2: Logo | Location | L Band
// Row 3: Clock | Date | Breaking News
export const GFX_BAND_DISPLAY_ORDER: string[] = [
  'top_band', 'lower_band', 'ticker_band',
  'logo_band', 'location_band', 'l_band',
  'clock_band', 'date_band', 'breaking_news_band',
]

// Default layout applied to all LAYOUT_BANDS when getalignment returns {} (no data).
// logo_band and l_band are excluded — they are not in LAYOUT_BANDS (no Layout button).
export const GFX_DEFAULT_LAYOUT: GfxBandLayout = {
  bg_color: '',
  font_color: '#ffffff',
  font_family: 'Arial, Helvetica, sans-serif',
  font_size: '24px',
  animation: '',
}

// Font options with CSS values matching the Angular project's fontOptions
export const GFX_FONTS: Array<{ label: string; value: string }> = [
  { label: 'Arial', value: 'Arial, Helvetica, sans-serif' },
  { label: 'Courier New', value: '"Courier New", Courier, monospace' },
  { label: 'Georgia', value: 'Georgia, "Times New Roman", Times, serif' },
  { label: 'Impact', value: 'Impact, Haettenschweiler, "Arial Narrow Bold", sans-serif' },
  { label: 'Lucida Sans', value: '"Lucida Sans", "Lucida Sans Regular", "Lucida Grande", "Lucida Sans Unicode", Geneva, Verdana, sans-serif' },
  { label: 'Palatino', value: '"Palatino Linotype", "Book Antiqua", Palatino, serif' },
  { label: 'Segoe UI', value: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif' },
  { label: 'Tahoma', value: 'Tahoma, Geneva, Verdana, sans-serif' },
  { label: 'Times New Roman', value: '"Times New Roman", Times, serif' },
  { label: 'Trebuchet MS', value: '"Trebuchet MS", "Lucida Sans Unicode", "Lucida Grande", "Lucida Sans", Arial, sans-serif' },
  { label: 'Verdana', value: 'Verdana, Geneva, Tahoma, sans-serif' },
  { label: 'Bebas Neue', value: '"Bebas Neue", cursive' },
  { label: 'Lato', value: 'Lato, sans-serif' },
  { label: 'Montserrat', value: 'Montserrat, sans-serif' },
  { label: 'Open Sans', value: '"Open Sans", sans-serif' },
  { label: 'Oswald', value: 'Oswald, sans-serif' },
  { label: 'Poppins', value: 'Poppins, sans-serif' },
  { label: 'Raleway', value: 'Raleway, sans-serif' },
  { label: 'Roboto', value: 'Roboto, sans-serif' },
]

export function bandLabel(key: string): string {
  return BAND_DISPLAY_NAMES[key] ?? key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

export const LOCAL_VIDEOS = [
  'Big_Buck_Bunny.mp4', 'Intro_Video.mp4', 'Chapter_01.mp4', 'Chapter_02.mp4',
  'Summary.mp4', 'Promo.mp4', 'Keynote.mp4', 'Demo.mp4', 'Closing.mp4', 'Bonus.mp4',
]

export const STREAMING_PRESETS: StreamingPreset[] = [
  {
    platform: 'YouTube', icon: '▶', color: '#ff0000',
    startApi: 'https://your-api.example.com/streaming/youtube/start',
    stopApi: 'https://your-api.example.com/streaming/youtube/stop',
    fields: [
      { key: 'streamKey', label: 'Stream Key', placeholder: 'xxxx-xxxx-xxxx-xxxx', type: 'text' },
      { key: 'title', label: 'Title', placeholder: 'Live Stream Title', type: 'text' },
      { key: 'privacy', label: 'Privacy', placeholder: 'public / unlisted', type: 'text' },
    ],
  },
  {
    platform: 'Facebook', icon: 'f', color: '#1877f2',
    startApi: 'https://your-api.example.com/streaming/facebook/start',
    stopApi: 'https://your-api.example.com/streaming/facebook/stop',
    fields: [
      { key: 'streamKey', label: 'Stream Key', placeholder: 'FB stream key', type: 'text' },
      { key: 'pageId', label: 'Page ID', placeholder: 'your-page-id', type: 'text' },
      { key: 'accessToken', label: 'Access Token', placeholder: 'EAA...', type: 'password' },
    ],
  },
  {
    platform: 'Twitch', icon: 'T', color: '#9146ff',
    startApi: 'https://your-api.example.com/streaming/twitch/start',
    stopApi: 'https://your-api.example.com/streaming/twitch/stop',
    fields: [
      { key: 'streamKey', label: 'Stream Key', placeholder: 'live_xxxxxxxxxx', type: 'text' },
      { key: 'channel', label: 'Channel', placeholder: 'your_channel', type: 'text' },
    ],
  },
  {
    platform: 'Custom RTMP', icon: '⬡', color: '#ff9f43',
    startApi: 'https://your-api.example.com/streaming/rtmp/start',
    stopApi: 'https://your-api.example.com/streaming/rtmp/stop',
    fields: [
      { key: 'rtmpUrl', label: 'RTMP URL', placeholder: 'rtmp://your-server/live', type: 'text' },
      { key: 'streamKey', label: 'Stream Key', placeholder: 'stream-key', type: 'text' },
      { key: 'username', label: 'Username', placeholder: '(optional)', type: 'text' },
      { key: 'password', label: 'Password', placeholder: '(optional)', type: 'password' },
    ],
  },
]
