export interface ParticipantsResponse {
  TotalNum: number
  TotalPage: number
  PageNum: number
  PageSize: number
  RequestId: string
  OnlineInfo?: Array<{
    StreamName: string
    AppName: string
    DomainName: string
    PublishTimeList: Array<{ PublishTime: string }>
  }>
}

export interface LayoutEntry {
  id: number
  groupName: string
  caption: string
  windowsCount: number
  bgVideo: string
  pubnubMsg: string
}

export interface MixPosition {
  x: number
  y: number
  w: number
  h: number
}

export interface SourceLocation {
  label: string
  enabled: boolean
}

export interface ParticipantSource {
  id: string
  name: string
  protocol: 'WebRTC'
  status: 'online' | 'offline'
  publishTime?: string
  isScreenShare?: boolean
}

export interface RtmpSource {
  id: string | number
  name: string
  protocol: 'RTMP'
  status: string
  resolution?: string
}

export type AnySource = ParticipantSource | RtmpSource

export interface VideoAsset {
  name: string
  previewurl?: string
  misc?: { posterPath?: string }
  asset_duration?: number
  fps?: number
  qc?: string
  type?: string
}

export interface GfxBandData {
  [bandKey: string]: boolean
}

export type GfxData = Record<string, GfxBandData>

export interface StreamingPresetField {
  key: string
  label: string
  placeholder: string
  type: string
}

export interface StreamingPreset {
  platform: string
  icon: string
  color: string
  startApi: string
  stopApi: string
  fields: StreamingPresetField[]
}

export interface Destination {
  id: string
  platform: string
  icon: string
  color: string
  name: string
  fields: Record<string, string>
  startApi: string
  stopApi: string
  fieldDefs: StreamingPresetField[]
  streaming: boolean
}

export type LogType = 'sent' | 'master' | 'preload' | 'info' | 'err' | 'warn' | 'divider' | 'gfx'

export interface LogEntry {
  id: string
  msg: string
  type: LogType
  time: string
}

export type WsStatus = 'disconnected' | 'connected' | 'reconnecting'
export type StudioTab = 'webrtc' | 'rtmp' | 'video'
export type RightTab = 'graphics' | 'publish' | 'social'
export type StudioMode = 'preview' | 'master'
export type SourceType = 'webrtc' | 'rtmp' | 'vod'

export const MAX_SOURCE_SLOTS = 6
export const MAX_TYPE_SOURCE_SLOTS = 2

export interface SourceSlot {
  slotKey?: string  // stable identity for React key — assigned on creation, preserved through reorders
  sourceType: SourceType | ''
  sourceValue: string
  muted: boolean
  volume: number   // 0-100, default 100
  panX: number     // -300 to 300, default 0
  panY: number     // -300 to 300, default 0
  zoom: number     // 1-2, default 1
  loop: boolean    // default true, vod only
}

export interface RowState {
  captionId: string
  sources: SourceSlot[]
  gfxStart: string[]
  gfxStop: string[]
}

export interface CropRegion {
  x: number  // 0-100, % from left edge of source video
  y: number  // 0-100, % from top edge of source video
  w: number  // 0-100, % width of crop window
  h: number  // 0-100, % height of crop window
}

export interface VirtualSource {
  id: string           // stable uid e.g. "dup_1234_abc"
  name: string         // operator-defined display name
  sourceUserId: string // real TRTC participant userId this mirrors
  crop: CropRegion
  isMobileSource?: boolean // portrait orientation (9:16) if true, else landscape (16:9)
}

export interface VideoPopupState {
  name: string
  url: string
}

export interface GfxNewsItem {
  id: string
  news_value: string
  disabled: boolean
}

export interface GfxAssetItem {
  id: string
  name: string
  url: string       // s3path - used for thumbnail display and as the saved URL
  s3path?: string   // actual file path
  type?: string     // asset media type from server (e.g. 'image', 'gvideo')
}

// Background media asset for alignment dropdowns (bgVideo / bgImage fields)
export interface BgAssetItem {
  name: string    // display label (filename)
  path: string    // s3path or CDN URL — the value saved to alignment.bgVideo / bgImage
}

// Flexible per-band alignment — fields vary by band type (some use bottom/top, bgVideo/bgImage, etc.)
export type GfxBandAlignment = Record<string, number | string | boolean>

export interface GfxBandLayout {
  bg_color?: string   // absent on location_band, coming_up_band
  font_color: string
  font_family: string
  font_size: string   // API returns "30px" format
  animation?: string  // absent on location_band, coming_up_band
}

export interface GfxAlignmentCache {
  layout: Record<string, GfxBandLayout>
  alignment: Record<string, unknown>  // raw server value — scalar for corrupted channels (e.g. lower_band:54)
}

export interface ToastState {
  open: boolean
  title: string
  description?: string
  variant: 'error' | 'warning' | 'success'
}


