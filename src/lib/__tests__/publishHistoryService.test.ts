import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// ── Mocks ─────────────────────────────────────────────────────────────────────

vi.mock('../http', () => ({
  http: { get: vi.fn(), post: vi.fn() },
}))

vi.mock('../apiConfig', () => ({
  apiConfig: { dotnetApiBase: 'https://api.test/' },
}))

vi.mock('../storage', () => ({
  getStorage: vi.fn(),
}))

vi.mock('../socialAuthService', () => ({
  ytRefreshAccessToken: vi.fn(),
}))

// ── Import after mocks ─────────────────────────────────────────────────────────

import {
  transformRecord,
  formatDuration,
  formatDateTime,
  hasStats,
  getWatchLink,
  exportToCsv,
} from '../publishHistoryService'
import type { PublishHistoryRaw, PublishHistoryRecord } from '../../types/publishHistory'

beforeEach(() => vi.clearAllMocks())

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeRawRecord(overrides: Partial<PublishHistoryRaw> = {}): PublishHistoryRaw {
  return {
    Sno: 1,
    Cid: 7,
    Inputtype: 'LIVE',
    Inputurl: 'rtmp://source.example.com/stream',
    Logourl: '',
    Publishurl: '',
    Status: 'Complete',
    startedusername: 'alice',
    stoppedusername: 'bob',
    Starttime: 1700000000,
    Endtime: 1700003600,
    YT_Data: 'null',
    facebookInfo: 'null',
    instagramInfo: 'null',
    twitterInfo: 'null',
    telegramInfo: 'null',
    Backupurl: '',
    outputMode: 'YouTube',
    ...overrides,
  }
}

function makeRecord(overrides: Partial<PublishHistoryRecord> = {}): PublishHistoryRecord {
  return {
    sno: 1,
    cid: 7,
    inputType: 'LIVE',
    inputUrl: 'rtmp://source.example.com/stream',
    logoUrl: '',
    publishUrl: '',
    status: 'Complete',
    startedBy: 'alice',
    stoppedBy: 'bob',
    startTime: 1700000000,
    endTime: 1700003600,
    outputMode: 'YouTube',
    backupUrl: '',
    ytData: null,
    fbData: null,
    igData: null,
    xData: null,
    telegramData: null,
    platform: 'youtube',
    thumbnailUrl: '',
    title: 'Test Stream',
    ...overrides,
  }
}

// ── transformRecord — field mapping ───────────────────────────────────────────

describe('transformRecord — field mapping', () => {
  it('maps all scalar fields correctly', () => {
    const raw = makeRawRecord({
      Sno: 42,
      Cid: 7,
      Inputtype: 'VOD',
      Inputurl: 'https://cdn.example.com/video.mp4',
      Logourl: 'https://cdn.example.com/logo.png',
      Publishurl: 'rtmp://pub.example.com/out',
      startedusername: 'admin',
      stoppedusername: 'user',
      Starttime: 1700000000,
      Endtime: 1700003600,
      Backupurl: 'rtmp://backup.example.com/out',
      outputMode: 'Facebook',
    })
    const record = transformRecord(raw)
    expect(record.sno).toBe(42)
    expect(record.cid).toBe(7)
    expect(record.inputType).toBe('VOD')
    expect(record.inputUrl).toBe('https://cdn.example.com/video.mp4')
    expect(record.logoUrl).toBe('https://cdn.example.com/logo.png')
    expect(record.publishUrl).toBe('rtmp://pub.example.com/out')
    expect(record.startedBy).toBe('admin')
    expect(record.stoppedBy).toBe('user')
    expect(record.startTime).toBe(1700000000)
    expect(record.endTime).toBe(1700003600)
    expect(record.backupUrl).toBe('rtmp://backup.example.com/out')
  })

  it('strips "(history)" suffix from status (case-insensitive)', () => {
    expect(transformRecord(makeRawRecord({ Status: 'Complete (History)' })).status).toBe('Complete')
    expect(transformRecord(makeRawRecord({ Status: 'Stopped (HISTORY)' })).status).toBe('Stopped')
    expect(transformRecord(makeRawRecord({ Status: 'Running (history) ' })).status).toBe('Running')
  })

  it('leaves status unchanged when it has no "(history)" suffix', () => {
    expect(transformRecord(makeRawRecord({ Status: 'Complete' })).status).toBe('Complete')
  })

  it('parses YT_Data JSON into ytData', () => {
    const ytData = { videoId: 'vid-abc', videoTitle: 'My Stream' }
    const record = transformRecord(makeRawRecord({ YT_Data: JSON.stringify(ytData), outputMode: 'YouTube' }))
    expect(record.ytData).toEqual(ytData)
  })

  it('parses facebookInfo JSON into fbData', () => {
    const fbData = { videoId: 'fb-123', title: 'FB Live', pageToken: 'tok' }
    const record = transformRecord(makeRawRecord({ facebookInfo: JSON.stringify(fbData), outputMode: 'Facebook' }))
    expect(record.fbData).toEqual(fbData)
  })

  it('parses instagramInfo JSON into igData', () => {
    const igData = { videoId: 'ig-999', igUserName: 'testuser' }
    const record = transformRecord(makeRawRecord({ instagramInfo: JSON.stringify(igData), outputMode: 'Instagram' }))
    expect(record.igData).toEqual(igData)
  })

  it('parses twitterInfo JSON into xData', () => {
    const xData = { videoId: 'tweet-id', userName: 'tester' }
    const record = transformRecord(makeRawRecord({ twitterInfo: JSON.stringify(xData), outputMode: 'Twitter' }))
    expect(record.xData).toEqual(xData)
  })

  it('returns null for platform data fields when JSON is "null"', () => {
    const record = transformRecord(makeRawRecord())
    expect(record.ytData).toBeNull()
    expect(record.fbData).toBeNull()
    expect(record.igData).toBeNull()
    expect(record.xData).toBeNull()
    expect(record.telegramData).toBeNull()
  })

  it('returns null for platform data when JSON is malformed', () => {
    const record = transformRecord(makeRawRecord({ YT_Data: 'not-valid-json', outputMode: 'YouTube' }))
    expect(record.ytData).toBeNull()
  })
})

// ── transformRecord — platform detection ──────────────────────────────────────

describe('transformRecord — platform detection', () => {
  it.each<[string, string]>([
    ['YouTube Live', 'youtube'],
    ['Facebook', 'facebook'],
    ['Instagram Reels', 'instagram'],
    ['Twitter', 'twitter'],
    ['Telegram', 'telegram'],
    ['Custom RTMP', 'rtmp'],
    ['Direct Stream', 'unknown'],
  ])('maps outputMode "%s" to platform "%s"', (outputMode, expectedPlatform) => {
    const record = transformRecord(makeRawRecord({ outputMode }))
    expect(record.platform).toBe(expectedPlatform)
  })
})

// ── transformRecord — thumbnail priority ──────────────────────────────────────

describe('transformRecord — thumbnail priority', () => {
  it('uses YT thumbnail first when multiple are present', () => {
    const record = transformRecord(makeRawRecord({
      YT_Data: JSON.stringify({ videoThumbnailDefaultUrl: 'yt-thumb.jpg' }),
      facebookInfo: JSON.stringify({ thumbnail: 'fb-thumb.jpg' }),
      outputMode: 'YouTube',
    }))
    expect(record.thumbnailUrl).toBe('yt-thumb.jpg')
  })

  it('falls back to Facebook thumbnail when YT has none', () => {
    const record = transformRecord(makeRawRecord({
      facebookInfo: JSON.stringify({ thumbnail: 'fb-thumb.jpg' }),
      outputMode: 'Facebook',
    }))
    expect(record.thumbnailUrl).toBe('fb-thumb.jpg')
  })

  it('falls back to Instagram thumbnail', () => {
    const record = transformRecord(makeRawRecord({
      instagramInfo: JSON.stringify({ igThumbnail: 'ig-thumb.jpg' }),
      outputMode: 'Instagram',
    }))
    expect(record.thumbnailUrl).toBe('ig-thumb.jpg')
  })

  it('falls back to Twitter thumbnail', () => {
    const record = transformRecord(makeRawRecord({
      twitterInfo: JSON.stringify({ thumbnail: 'x-thumb.jpg' }),
      outputMode: 'Twitter',
    }))
    expect(record.thumbnailUrl).toBe('x-thumb.jpg')
  })

  it('falls back to Telegram thumbnail', () => {
    const record = transformRecord(makeRawRecord({
      telegramInfo: JSON.stringify({ thumbnail: 'tg-thumb.jpg' }),
      outputMode: 'Telegram',
    }))
    expect(record.thumbnailUrl).toBe('tg-thumb.jpg')
  })

  it('returns empty string when no thumbnail is present', () => {
    const record = transformRecord(makeRawRecord())
    expect(record.thumbnailUrl).toBe('')
  })
})

// ── transformRecord — title extraction ────────────────────────────────────────

describe('transformRecord — title extraction', () => {
  it('uses YouTube videoTitle first', () => {
    const record = transformRecord(makeRawRecord({
      YT_Data: JSON.stringify({ videoTitle: 'YT Title' }),
      outputMode: 'YouTube',
    }))
    expect(record.title).toBe('YT Title')
  })

  it('falls back to Facebook title', () => {
    const record = transformRecord(makeRawRecord({
      facebookInfo: JSON.stringify({ title: 'FB Title' }),
      outputMode: 'Facebook',
    }))
    expect(record.title).toBe('FB Title')
  })

  it('falls back to Instagram title', () => {
    const record = transformRecord(makeRawRecord({
      instagramInfo: JSON.stringify({ title: 'IG Title' }),
      outputMode: 'Instagram',
    }))
    expect(record.title).toBe('IG Title')
  })

  it('falls back to Twitter title', () => {
    const record = transformRecord(makeRawRecord({
      twitterInfo: JSON.stringify({ title: 'X Title' }),
      outputMode: 'Twitter',
    }))
    expect(record.title).toBe('X Title')
  })

  it('extracts filename without extension from Inputurl when no platform title exists', () => {
    const record = transformRecord(makeRawRecord({
      Inputurl: 'rtmp://server.com/live/my-event-video.mp4',
      outputMode: 'Direct',
    }))
    expect(record.title).toBe('my-event-video')
  })
})

// ── formatDuration ────────────────────────────────────────────────────────────

describe('formatDuration', () => {
  it('formats 0 seconds as "0s"', () => {
    expect(formatDuration(0)).toBe('0s')
  })

  it('formats seconds less than 60', () => {
    expect(formatDuration(1)).toBe('1s')
    expect(formatDuration(45)).toBe('45s')
    expect(formatDuration(59)).toBe('59s')
  })

  it('formats exactly 60 seconds as "1m"', () => {
    expect(formatDuration(60)).toBe('1m')
  })

  it('formats minutes with remaining seconds', () => {
    expect(formatDuration(90)).toBe('1m 30s')
    expect(formatDuration(125)).toBe('2m 5s')
  })

  it('formats whole minutes without seconds suffix', () => {
    expect(formatDuration(120)).toBe('2m')
    expect(formatDuration(180)).toBe('3m')
  })

  it('formats hours and minutes (seconds omitted when hours > 0)', () => {
    expect(formatDuration(3600)).toBe('1h 0m')
    expect(formatDuration(3661)).toBe('1h 1m')
    expect(formatDuration(7320)).toBe('2h 2m')
  })
})

// ── formatDateTime ────────────────────────────────────────────────────────────

describe('formatDateTime', () => {
  it("returns '—' for epoch 0", () => {
    expect(formatDateTime(0)).toBe('—')
  })

  it('returns a non-empty string for a valid epoch', () => {
    const result = formatDateTime(1700000000)
    expect(result).not.toBe('—')
    expect(result.length).toBeGreaterThan(0)
  })
})

// ── hasStats ──────────────────────────────────────────────────────────────────

describe('hasStats', () => {
  it('returns true for youtube when videoId is present', () => {
    expect(hasStats(makeRecord({ platform: 'youtube', ytData: { videoId: 'abc' } }))).toBe(true)
  })

  it('returns false for youtube when videoId is absent', () => {
    expect(hasStats(makeRecord({ platform: 'youtube', ytData: {} }))).toBe(false)
  })

  it('returns false for youtube when ytData is null', () => {
    expect(hasStats(makeRecord({ platform: 'youtube', ytData: null }))).toBe(false)
  })

  it('returns true for facebook when videoId and pageToken are present', () => {
    expect(
      hasStats(makeRecord({ platform: 'facebook', fbData: { videoId: 'fb-vid', pageToken: 'tok' } })),
    ).toBe(true)
  })

  it('returns false for facebook when pageToken is missing', () => {
    expect(hasStats(makeRecord({ platform: 'facebook', fbData: { videoId: 'fb-vid' } }))).toBe(false)
  })

  it('returns false for facebook when videoId is missing', () => {
    expect(hasStats(makeRecord({ platform: 'facebook', fbData: { pageToken: 'tok' } }))).toBe(false)
  })

  it('returns true for instagram when videoId and pageToken are present', () => {
    expect(
      hasStats(makeRecord({ platform: 'instagram', igData: { videoId: 'ig-vid', pageToken: 'tok' } })),
    ).toBe(true)
  })

  it('returns false for instagram when pageToken is missing', () => {
    expect(hasStats(makeRecord({ platform: 'instagram', igData: { videoId: 'ig-vid' } }))).toBe(false)
  })

  it('returns true for twitter when xData is present', () => {
    expect(hasStats(makeRecord({ platform: 'twitter', xData: { videoId: 'tweet-id' } }))).toBe(true)
  })

  it('returns false for twitter when xData is null', () => {
    expect(hasStats(makeRecord({ platform: 'twitter', xData: null }))).toBe(false)
  })

  it('returns false for telegram, rtmp, and unknown', () => {
    expect(hasStats(makeRecord({ platform: 'telegram' }))).toBe(false)
    expect(hasStats(makeRecord({ platform: 'rtmp' }))).toBe(false)
    expect(hasStats(makeRecord({ platform: 'unknown' }))).toBe(false)
  })
})

// ── getWatchLink ──────────────────────────────────────────────────────────────

describe('getWatchLink', () => {
  it('returns YouTube link when ytData.link is present', () => {
    const record = makeRecord({
      ytData: { link: 'https://youtu.be/abc' },
      fbData: { link: 'https://fb.com/vid' },
    })
    expect(getWatchLink(record)).toBe('https://youtu.be/abc')
  })

  it('falls back to Facebook link when no YouTube link', () => {
    const record = makeRecord({ fbData: { link: 'https://fb.com/vid' } })
    expect(getWatchLink(record)).toBe('https://fb.com/vid')
  })

  it('falls back to Instagram link', () => {
    const record = makeRecord({ igData: { link: 'https://ig.com/reel/abc' } })
    expect(getWatchLink(record)).toBe('https://ig.com/reel/abc')
  })

  it('falls back to Twitter link', () => {
    const record = makeRecord({ xData: { link: 'https://x.com/tweet/123' } })
    expect(getWatchLink(record)).toBe('https://x.com/tweet/123')
  })

  it('returns empty string when no links exist', () => {
    expect(getWatchLink(makeRecord())).toBe('')
  })

  it('returns empty string when all data is null', () => {
    const record = makeRecord({ ytData: null, fbData: null, igData: null, xData: null })
    expect(getWatchLink(record)).toBe('')
  })
})

// ── exportToCsv ───────────────────────────────────────────────────────────────

describe('exportToCsv', () => {
  let mockAnchor: { href: string; download: string; click: ReturnType<typeof vi.fn> }

  beforeEach(() => {
    mockAnchor = { href: '', download: '', click: vi.fn() }
    vi.spyOn(document, 'createElement').mockReturnValueOnce(mockAnchor as unknown as HTMLElement)
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-url')
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('sets the correct filename on the anchor and triggers click', () => {
    exportToCsv([], 'history.csv')
    expect(mockAnchor.download).toBe('history.csv')
    expect(mockAnchor.click).toHaveBeenCalledOnce()
  })

  it('sets the blob URL on the anchor href', () => {
    exportToCsv([], 'test.csv')
    expect(mockAnchor.href).toBe('blob:mock-url')
  })

  it('revokes the object URL after triggering download', () => {
    exportToCsv([], 'test.csv')
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url')
  })

  it('produces correct CSV headers as the first row', async () => {
    let capturedBlob: Blob | undefined
    vi.spyOn(URL, 'createObjectURL').mockImplementation((obj: Blob | MediaSource) => {
      capturedBlob = obj as Blob
      return 'blob:captured'
    })
    exportToCsv([], 'test.csv')
    const csvText = await capturedBlob!.text()
    expect(csvText.split('\n')[0]).toBe(
      '#,Platform,Type,Title,Status,Start Time,End Time,Duration,Started By,Stopped By,Link',
    )
  })

  it('produces a data row for each record', async () => {
    let capturedBlob: Blob | undefined
    vi.spyOn(URL, 'createObjectURL').mockImplementation((obj: Blob | MediaSource) => {
      capturedBlob = obj as Blob
      return 'blob:captured'
    })
    const records = [
      makeRecord({ sno: 5, platform: 'youtube', inputType: 'LIVE', title: 'My Stream', status: 'Complete', startedBy: 'alice', stoppedBy: 'bob', startTime: 0, endTime: 0 }),
    ]
    exportToCsv(records, 'test.csv')
    const csvText = await capturedBlob!.text()
    const rows = csvText.split('\n')
    expect(rows).toHaveLength(2)
    expect(rows[1]).toContain('5,youtube,LIVE,"My Stream",Complete')
  })

  it('uses "—" for zero start and end timestamps', async () => {
    let capturedBlob: Blob | undefined
    vi.spyOn(URL, 'createObjectURL').mockImplementation((obj: Blob | MediaSource) => {
      capturedBlob = obj as Blob
      return 'blob:captured'
    })
    exportToCsv([makeRecord({ startTime: 0, endTime: 0 })], 'test.csv')
    const csvText = await capturedBlob!.text()
    const dataRow = csvText.split('\n')[1]
    const dashCount = (dataRow.match(/—/g) ?? []).length
    expect(dashCount).toBeGreaterThanOrEqual(2)
  })

  it('escapes double quotes in title', async () => {
    let capturedBlob: Blob | undefined
    vi.spyOn(URL, 'createObjectURL').mockImplementation((obj: Blob | MediaSource) => {
      capturedBlob = obj as Blob
      return 'blob:captured'
    })
    exportToCsv([makeRecord({ title: 'He said "hello"' })], 'test.csv')
    const csvText = await capturedBlob!.text()
    expect(csvText).toContain('"He said ""hello"""')
  })
})
