import { http } from './http'
import { apiConfig } from './apiConfig'
import { getStorage } from './storage'
import { ytRefreshAccessToken } from './socialAuthService'
import type {
  PublishHistoryRaw,
  PublishHistoryRecord,
  PublishHistoryApiResponse,
  YtStats,
  FbStats,
  IgStats,
  XStats,
  YtData,
  FbData,
  IgData,
  XData,
  TelegramData,
  PublishPlatform,
  PlatformStats,
} from '../types/publishHistory'

const FB_GRAPH = 'https://graph.facebook.com/v22.0'

interface RawPublishRecord {
  Inputtype: string
  outputMode: string
  Starttime: number
  Endtime: number
}

export async function fetchPublishRecordsInRange(cid: string, startDate: Date, endDate: Date): Promise<RawPublishRecord[]> {
  const start = Math.floor(startDate.getTime() / 1000)
  const end = Math.floor(endDate.getTime() / 1000)
  const data = await http.get<{
    data: Array<{ Inputtype?: string; outputMode?: string; Starttime?: number; Endtime?: number }>
  }>(
    apiConfig.dotnetApiBase,
    `v1/gateway/status-history/${cid}/${start}/${end}/desc?pagenumber=1&rowsperpage=1000`,
  )
  const records = Array.isArray(data.data) ? data.data : []
  return records.map(r => ({
    Inputtype: String(r.Inputtype ?? ''),
    outputMode: String(r.outputMode ?? ''),
    Starttime: Number(r.Starttime ?? 0),
    Endtime: Number(r.Endtime ?? 0),
  }))
}

function safeParse<T>(json: string | null | undefined): T | null {
  if (!json) return null
  try {
    return JSON.parse(json) as T
  } catch {
    return null
  }
}

function parsePlatform(outputMode: string): PublishPlatform {
  const m = outputMode.toLowerCase().replace(/\s+/g, '')
  if (m.includes('youtube')) return 'youtube'
  if (m.includes('instagram')) return 'instagram'
  if (m.includes('facebook')) return 'facebook'
  if (m.includes('twitter')) return 'twitter'
  if (m.includes('telegram')) return 'telegram'
  if (m.includes('rtmp')) return 'rtmp'
  return 'unknown'
}

function extractTitle(
  raw: PublishHistoryRaw,
  yt: YtData | null,
  fb: FbData | null,
  ig: IgData | null,
  x: XData | null,
): string {
  const t = yt?.videoTitle ?? fb?.title ?? ig?.title ?? x?.title ?? ''
  if (t) return t
  const url = raw.Inputurl ?? ''
  const parts = url.split('/')
  const last = parts[parts.length - 1] ?? ''
  return last.replace(/\.[^.]+$/, '') || (url.split('?')[0].split('/').pop() ?? '—')
}

export function transformRecord(raw: PublishHistoryRaw): PublishHistoryRecord {
  const ytData = safeParse<YtData>(raw.YT_Data)
  const fbData = safeParse<FbData>(raw.facebookInfo)
  const igData = safeParse<IgData>(raw.instagramInfo)
  const xData = safeParse<XData>(raw.twitterInfo)
  const telegramData = safeParse<TelegramData>(raw.telegramInfo)
  const platform = parsePlatform(raw.outputMode)
  const thumbnailUrl =
    ytData?.videoThumbnailDefaultUrl ??
    fbData?.thumbnail ??
    igData?.igThumbnail ??
    xData?.thumbnail ??
    telegramData?.thumbnail ??
    ''
  const title = extractTitle(raw, ytData, fbData, igData, xData)
  return {
    sno: raw.Sno,
    cid: raw.Cid,
    inputType: raw.Inputtype ?? '',
    inputUrl: raw.Inputurl ?? '',
    logoUrl: raw.Logourl ?? '',
    publishUrl: raw.Publishurl ?? '',
    status: (raw.Status ?? '').replace(/\s*\(history\)\s*/i, '').trim(),
    startedBy: raw.startedusername ?? '',
    stoppedBy: raw.stoppedusername ?? '',
    startTime: raw.Starttime ?? 0,
    endTime: raw.Endtime ?? 0,
    outputMode: raw.outputMode ?? '',
    backupUrl: raw.Backupurl ?? '',
    ytData,
    fbData,
    igData,
    xData,
    telegramData,
    platform,
    thumbnailUrl,
    title,
  }
}

export interface FetchHistoryParams {
  cid: string
  startDate: Date
  endDate: Date
  sortOrder: 'asc' | 'desc'
  page: number
  pageSize: number
}

export async function fetchPublishHistory(
  params: FetchHistoryParams,
): Promise<{ records: PublishHistoryRecord[]; total: number }> {
  const { cid, startDate, endDate, sortOrder, page, pageSize } = params
  const start = Math.floor(startDate.getTime() / 1000)
  const end = Math.floor(endDate.getTime() / 1000)
  const data = await http.get<PublishHistoryApiResponse>(
    apiConfig.dotnetApiBase,
    `v1/gateway/status-history/${cid}/${start}/${end}/${sortOrder}?pagenumber=${page}&rowsperpage=${pageSize}`,
  )
  return {
    records: Array.isArray(data.data) ? data.data.map(transformRecord) : [],
    total: data.count ?? 0,
  }
}

export async function fetchYtStats(record: PublishHistoryRecord): Promise<YtStats> {
  const yt = record.ytData
  if (!yt?.videoId) throw new Error('No YouTube video ID')
  let token = yt.accessToken ?? ''
  if (!token && yt.refreshToken) token = await ytRefreshAccessToken(yt.refreshToken)
  const res = await fetch(
    `https://www.googleapis.com/youtube/v3/videos?part=statistics&id=${yt.videoId}`,
    { headers: { Authorization: `Bearer ${token}` } },
  )
  const data = (await res.json()) as {
    items?: Array<{ statistics: Record<string, string> }>
  }
  const s = data.items?.[0]?.statistics ?? {}
  return {
    viewCount: parseInt(s.viewCount ?? '0', 10),
    likeCount: parseInt(s.likeCount ?? '0', 10),
    dislikeCount: parseInt(s.dislikeCount ?? '0', 10),
    favoriteCount: parseInt(s.favoriteCount ?? '0', 10),
    commentCount: parseInt(s.commentCount ?? '0', 10),
  }
}

export async function fetchFbStats(record: PublishHistoryRecord): Promise<FbStats> {
  const fb = record.fbData
  if (!fb?.videoId || !fb.pageToken) throw new Error('No Facebook video data')
  const isVod = record.outputMode.toLowerCase().includes('vod')
  const fields = isVod
    ? 'likes.summary(true),comments.summary(true),views'
    : 'likes.summary(true),views'
  const res = await fetch(
    `${FB_GRAPH}/${fb.videoId}?fields=${fields}&access_token=${fb.pageToken}`,
  )
  const data = (await res.json()) as {
    views?: number
    likes?: { summary?: { total_count?: number } }
    comments?: { summary?: { total_count?: number } }
    error?: unknown
  }
  if (data.error) throw new Error('Facebook stats unavailable')
  return {
    views: data.views ?? 0,
    likes: data.likes?.summary?.total_count ?? 0,
    comments: data.comments?.summary?.total_count ?? 0,
  }
}

export async function fetchIgStats(record: PublishHistoryRecord): Promise<IgStats> {
  const ig = record.igData
  if (!ig?.videoId || !ig.pageToken) throw new Error('No Instagram video data')
  const res = await fetch(
    `${FB_GRAPH}/${ig.videoId}?fields=like_count,comments_count&access_token=${ig.pageToken}`,
  )
  const data = (await res.json()) as {
    like_count?: number
    comments_count?: number
    error?: unknown
  }
  if (data.error) throw new Error('Instagram stats unavailable')
  return { likes: data.like_count ?? 0, comments: data.comments_count ?? 0 }
}

export async function fetchXStats(record: PublishHistoryRecord): Promise<XStats> {
  if (!record.xData) throw new Error('No Twitter data')
  const cid = getStorage<string>('pcr_channel_id') ?? ''
  const data = await http.post<{
    data?: {
      public_metrics?: {
        retweet_count?: number
        reply_count?: number
        like_count?: number
        quote_count?: number
        bookmark_count?: number
        impression_count?: number
      }
    }
  }>(apiConfig.dotnetApiBase, 'v1/gateway/twitterStatics', {
    Sno: record.sno,
    Cid: cid,
    xData: record.xData,
  })
  const m = data.data?.public_metrics ?? {}
  return {
    retweets: m.retweet_count ?? 0,
    replies: m.reply_count ?? 0,
    likes: m.like_count ?? 0,
    quotes: m.quote_count ?? 0,
    bookmarks: m.bookmark_count ?? 0,
    impressions: m.impression_count ?? 0,
  }
}

export async function loadPlatformStats(record: PublishHistoryRecord): Promise<PlatformStats> {
  switch (record.platform) {
    case 'youtube':
      return fetchYtStats(record)
    case 'facebook':
      return fetchFbStats(record)
    case 'instagram':
      return fetchIgStats(record)
    case 'twitter':
      return fetchXStats(record)
    default:
      throw new Error(`Stats not available for ${record.platform}`)
  }
}

export function exportToCsv(records: PublishHistoryRecord[], filename: string): void {
  const headers = [
    '#',
    'Platform',
    'Type',
    'Title',
    'Status',
    'Start Time',
    'End Time',
    'Duration',
    'Started By',
    'Stopped By',
    'Link',
  ]
  const rows = records.map(r => {
    const link = r.ytData?.link ?? r.fbData?.link ?? r.igData?.link ?? r.xData?.link ?? ''
    const dur =
      r.endTime > r.startTime ? formatDuration(r.endTime - r.startTime) : '—'
    return [
      r.sno,
      r.platform,
      r.inputType,
      `"${r.title.replace(/"/g, '""')}"`,
      r.status,
      r.startTime ? new Date(r.startTime * 1000).toLocaleString() : '—',
      r.endTime ? new Date(r.endTime * 1000).toLocaleString() : '—',
      dur,
      r.startedBy,
      r.stoppedBy,
      link,
    ].join(',')
  })
  const csv = [headers.join(','), ...rows].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}h ${m}m`
  return s > 0 ? `${m}m ${s}s` : `${m}m`
}

export function formatDateTime(epoch: number): string {
  if (!epoch) return '—'
  return new Date(epoch * 1000).toLocaleString('default', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  })
}

export function hasStats(record: PublishHistoryRecord): boolean {
  switch (record.platform) {
    case 'youtube':
      return Boolean(record.ytData?.videoId)
    case 'facebook':
      return Boolean(record.fbData?.videoId && record.fbData.pageToken)
    case 'instagram':
      return Boolean(record.igData?.videoId && record.igData.pageToken)
    case 'twitter':
      return Boolean(record.xData)
    default:
      return false
  }
}

export function getWatchLink(record: PublishHistoryRecord): string {
  return (
    record.ytData?.link ??
    record.fbData?.link ??
    record.igData?.link ??
    record.xData?.link ??
    ''
  )
}
