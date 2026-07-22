export type PublishPlatform = 'youtube' | 'facebook' | 'instagram' | 'twitter' | 'telegram' | 'rtmp' | 'unknown'

export interface PublishHistoryRaw {
  Sno: number
  Cid: number
  Inputtype: string
  Inputurl: string
  Logourl: string
  Publishurl: string
  Status: string
  startedusername: string
  stoppedusername: string
  Starttime: number
  Endtime: number
  YT_Data: string
  facebookInfo: string
  instagramInfo: string
  twitterInfo: string
  telegramInfo: string
  Backupurl: string
  outputMode: string
}

export interface YtData {
  videoId?: string
  accessToken?: string
  refreshToken?: string
  videoThumbnailDefaultUrl?: string
  link?: string
  videoTitle?: string
  channelTitle?: string
  channelName?: string
}

export interface FbData {
  videoId?: string
  pageToken?: string
  userAccessToken?: string
  thumbnail?: string
  link?: string
  pageName?: string
  title?: string
}

export interface IgData {
  videoId?: string
  pageToken?: string
  igThumbnail?: string
  link?: string
  igUserName?: string
  title?: string
}

export interface XData {
  videoId?: string
  thumbnail?: string
  link?: string
  title?: string
  userId?: string
  userName?: string
  twitterName?: string
  accessToken?: string
  refreshToken?: string
}

export interface TelegramData {
  thumbnail?: string
  link?: string
  title?: string
}

export interface PublishHistoryRecord {
  sno: number
  cid: number
  inputType: string
  inputUrl: string
  logoUrl: string
  publishUrl: string
  status: string
  startedBy: string
  stoppedBy: string
  startTime: number
  endTime: number
  outputMode: string
  backupUrl: string
  ytData: YtData | null
  fbData: FbData | null
  igData: IgData | null
  xData: XData | null
  telegramData: TelegramData | null
  platform: PublishPlatform
  thumbnailUrl: string
  title: string
}

export interface PublishHistoryApiResponse {
  data: PublishHistoryRaw[]
  count: number
}

export interface YtStats {
  viewCount: number
  likeCount: number
  dislikeCount: number
  favoriteCount: number
  commentCount: number
}

export interface FbStats {
  views: number
  likes: number
  comments: number
}

export interface IgStats {
  likes: number
  comments: number
}

export interface XStats {
  retweets: number
  replies: number
  likes: number
  quotes: number
  bookmarks: number
  impressions: number
}

export type PlatformStats = YtStats | FbStats | IgStats | XStats

export interface StatsState {
  status: 'idle' | 'loading' | 'success' | 'error'
  data?: PlatformStats
  error?: string
}

// ── Ongoing publishes ──────────────────────────────────────────────────────

export interface OngoingPublishRaw extends PublishHistoryRaw {
  Masterid?: string
  extData?: string
  is_multiple?: boolean
  zixioutputid?: string
  is_zixioutput?: boolean
  zixiUrl?: string
  zixiUserName?: string
  zixiPassword?: string
  zixiInputId?: string
}

export interface OngoingPublish extends PublishHistoryRecord {
  masterId: string
  plCid: number | null
  isMultiple: boolean
  zixiOutputId: string
  isZixiOutput: boolean
  zixiUrl: string
  zixiUserName: string
  zixiPassword: string
  zixiInputId: string
}

export interface StopPublishPayload {
  id: string
  userid: string
  username: string
  sno?: number
  platform?: string
  cid?: number
  zixioutputid?: string
  zixiurl?: string
  zixiusername?: string
  zixipassword?: string
  zixiinputid?: string
  is_zixioutput?: boolean
}
