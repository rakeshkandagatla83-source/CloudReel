/**
 * Social Auth Service
 * Mirrors the Angular social-media.service / facebook.service / twitter.service / youtube.service.
 * All OAuth credentials sourced from D:\Git Projects\Janya_UI\Janya_UI\src\app\config\config.ts
 */

import { http } from './http'
import { apiConfig } from './apiConfig'
import { getStorage, setStorage, removeStorage } from './storage'

// ── OAuth Config (from appConfig / authConfig in Angular project) ──────────────

const FB_APP_ID      = import.meta.env.VITE_FB_APP_ID as string
const FB_APP_SECRET  = import.meta.env.VITE_FB_APP_SECRET as string
const FB_GRAPH       = 'https://graph.facebook.com/v22.0'
const FB_SCOPE       = 'publish_video pages_show_list pages_read_engagement pages_manage_metadata pages_read_user_content pages_manage_posts pages_messaging'
const IG_SCOPE       = 'instagram_basic instagram_content_publish instagram_manage_comments instagram_manage_messages pages_show_list pages_read_engagement instagram_manage_insights'

const YT_CLIENT_ID     = import.meta.env.VITE_YT_CLIENT_ID as string
const YT_CLIENT_SECRET = import.meta.env.VITE_YT_CLIENT_SECRET as string
const YT_SCOPE         = 'openid profile email https://www.googleapis.com/auth/youtube.force-ssl https://www.googleapis.com/auth/yt-analytics.readonly'

const TW_CLIENT_ID = import.meta.env.VITE_TW_CLIENT_ID as string
const TW_SCOPE     = 'tweet.read tweet.write users.read offline.access media.write'

const redirectUri = () => `${window.location.origin}/silent-refresh.html`

// ── Storage keys ──────────────────────────────────────────────────────────────

export const SOCIAL_KEYS = {
  FB: 'social_fb',
  TW: 'social_tw',
  YT: 'social_yt',
} as const

// ── Types ─────────────────────────────────────────────────────────────────────

export interface FbPage {
  pageId: string
  pageTitle: string
  pageToken: string
  pictureUrl: string
  streaming: boolean
  videoId?: string
  streamUrl?: string
}

export interface FbAccount {
  userId: string
  userName: string
  accountToken: string
  pages: FbPage[]
}

export interface TwAccount {
  userId: string
  userName: string
  twitterName: string
  userPictureUrl: string
  accessToken: string
  refreshToken: string
}

export interface YtAccount {
  ytChannelId: string
  channelName: string
  logo: string
  userName: string
  accessToken: string
  refreshToken: string
}

// ── Persisted account accessors ───────────────────────────────────────────────

export const socialStore = {
  getFb: () => getStorage<FbAccount>(SOCIAL_KEYS.FB),
  setFb: (v: FbAccount) => setStorage(SOCIAL_KEYS.FB, v),
  clearFb: () => removeStorage(SOCIAL_KEYS.FB),

  getTw: () => getStorage<TwAccount>(SOCIAL_KEYS.TW),
  setTw: (v: TwAccount) => setStorage(SOCIAL_KEYS.TW, v),
  clearTw: () => removeStorage(SOCIAL_KEYS.TW),

  getYt: () => getStorage<YtAccount>(SOCIAL_KEYS.YT),
  setYt: (v: YtAccount) => setStorage(SOCIAL_KEYS.YT, v),
  clearYt: () => removeStorage(SOCIAL_KEYS.YT),
}

// ── Popup helpers ─────────────────────────────────────────────────────────────

export function openAuthPopup(url: string): Window | null {
  return window.open(url, 'social_auth', 'width=600,height=700,scrollbars=yes,resizable=yes')
}

/**
 * Attaches a message listener (for silent-refresh.html postMessage) and a
 * closed-check interval. Returns a cleanup function.
 * Mirrors Angular SocialMediaService.initLoginInPopup + onMessage pattern.
 */
export function attachPopupListener(
  popup: Window,
  onMessage: (params: URLSearchParams) => Promise<void>,
  onClosed: () => void,
): () => void {
  let done = false

  const finish = () => {
    if (done) return
    done = true
    window.removeEventListener('message', handler)
    clearInterval(closedCheck)
  }

  const handler = async (event: MessageEvent) => {
    if (event.origin !== window.location.origin) return
    const raw = String(event.data)
    if (!raw.includes('state') && !raw.includes('code') && !raw.includes('access_token')) return
    finish()
    try { popup.close() } catch { /* COOP header may sever opener reference; popup closes itself */ }
    // Normalise hash + query into URLSearchParams
    const normalised = raw.replace(/^[?#]/, '').replace('#', '&')
    await onMessage(new URLSearchParams(normalised))
  }

  const closedCheck = setInterval(() => {
    if (!popup || popup.closed) {
      if (!done) { finish(); onClosed() }
    }
  }, 500)

  window.addEventListener('message', handler)
  return finish
}

// ── PKCE helpers (Twitter) ────────────────────────────────────────────────────

function generateVerifier(): string {
  const arr = new Uint8Array(64)
  window.crypto.getRandomValues(arr)
  return btoa(String.fromCharCode(...Array.from(arr)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

async function generateChallenge(verifier: string): Promise<string> {
  const data = new TextEncoder().encode(verifier)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return btoa(String.fromCharCode(...Array.from(new Uint8Array(digest))))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

// ── External fetch (bypasses Axios interceptor to avoid injecting PCR token) ──

// Maps known platform API error reasons to user-friendly messages.
const YT_ERROR_REASONS: Record<string, string> = {
  authenticatedUserAccountSuspended: 'Your YouTube account has been suspended. Please contact Google support.',
  forbidden:                         'Access denied. Your YouTube account does not have permission for this action.',
  quotaExceeded:                     'YouTube API quota exceeded. Please try again later.',
  authError:                         'YouTube authentication failed. Please reconnect your account.',
  keyInvalid:                        'YouTube API key is invalid. Please contact support.',
  accountDelegationNotPermitted:     'This YouTube account cannot be accessed by the current user.',
  channelNotFound:                   'No YouTube channel was found for this account.',
  liveStreamingNotEnabled:           'Live streaming is not enabled on this YouTube account. Enable it at youtube.com/features.',
  insufficientPermissions:           'Insufficient permissions. Please reconnect and grant all requested permissions.',
}

const FB_ERROR_CODES: Record<number, string> = {
  190: 'Your Facebook/Instagram session has expired. Please reconnect your account.',
  10:  'Permission denied by Facebook. Please reconnect and grant all required permissions.',
  200: 'Permission denied by Facebook. Please reconnect and grant all required permissions.',
  368: 'Your Facebook account has been temporarily blocked. Please check your account status.',
  100: 'Invalid request to Facebook. Please try reconnecting your account.',
  4:   'Facebook API rate limit reached. Please wait a few minutes and try again.',
}

const TW_ERROR_CODES: Record<number, string> = {
  32:  'Your Twitter credentials are invalid. Please reconnect your account.',
  64:  'Your Twitter account has been suspended. Please contact Twitter support.',
  89:  'Your Twitter access token has expired. Please reconnect your account.',
  135: 'Twitter authentication failed. Please reconnect your account.',
  161: 'Twitter follow limit reached.',
  185: 'Twitter status update limit reached. Please try again later.',
  326: 'Your Twitter account has been locked. Please unlock it at twitter.com.',
  429: 'Twitter rate limit exceeded. Please wait before trying again.',
}

interface ApiErrorResponse {
  error?: {
    code?: number
    message?: string
    errors?: Array<{ reason?: string; message?: string }>
    status?: string
    // Facebook-specific fields
    error_subcode?: number
    error_user_title?: string
    error_user_msg?: string
  }
  errors?: Array<{ code?: number; message?: string }>
}

/**
 * Thrown when Facebook rejects a live stream due to account eligibility or policy
 * (i.e. the error response includes `error_user_msg` — a user-facing policy message).
 * Callers can `instanceof`-check this to show a distinct UI state.
 */
export class FbLiveEligibilityError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'FbLiveEligibilityError'
  }
}

/**
 * Thrown when a YouTube broadcast transition is rejected because the stream
 * is not yet in the required state (e.g. ready → live without going through
 * testing, or RTMP data not yet flowing). Callers should retry after a delay.
 */
export class YtInvalidTransitionError extends Error {
  constructor() {
    super('invalidTransition')
    this.name = 'YtInvalidTransitionError'
  }
}

function throwIfApiError(data: unknown, platform: 'youtube' | 'facebook' | 'twitter'): void {
  const d = data as ApiErrorResponse
  if (!d?.error && !d?.errors) return

  if (platform === 'youtube' && d.error) {
    const reason = d.error.errors?.[0]?.reason ?? ''
    // redundantTransition — broadcast already in requested state, not an error
    if (reason === 'redundantTransition') return
    // invalidTransition — stream not ready yet; caller should retry after a delay
    if (reason === 'invalidTransition') throw new YtInvalidTransitionError()
    const friendly = YT_ERROR_REASONS[reason]
    throw new Error(friendly ?? d.error.message ?? 'An unexpected YouTube error occurred.')
  }

  if (platform === 'facebook' && d.error) {
    // When Facebook provides a user-facing policy/eligibility message, surface it as a
    // FbLiveEligibilityError so callers can show a distinct ineligible UI state.
    if (d.error.error_user_msg) {
      const title = d.error.error_user_title ? `${d.error.error_user_title}: ` : ''
      throw new FbLiveEligibilityError(title + d.error.error_user_msg)
    }
    const code = d.error.code ?? 0
    const friendly = FB_ERROR_CODES[code]
    throw new Error(friendly ?? d.error.message ?? 'An unexpected Facebook error occurred.')
  }

  if (platform === 'twitter' && d.errors) {
    const first = d.errors[0]
    const friendly = first?.code ? TW_ERROR_CODES[first.code] : undefined
    throw new Error(friendly ?? first?.message ?? 'An unexpected Twitter error occurred.')
  }
}

function platformFor(url: string): 'youtube' | 'facebook' | 'twitter' {
  if (url.includes('googleapis.com') || url.includes('youtube')) return 'youtube'
  if (url.includes('facebook.com') || url.includes('graph.facebook')) return 'facebook'
  return 'twitter'
}

async function extGet<T>(url: string, token: string): Promise<T> {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
  const data = await res.json() as T
  throwIfApiError(data, platformFor(url))
  return data
}

async function extPost<T>(url: string, body: Record<string, unknown>, token?: string): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = `Bearer ${token}`
  const res = await fetch(url, { method: 'POST', headers, body: JSON.stringify(body) })
  const data = await res.json() as T
  throwIfApiError(data, platformFor(url))
  return data
}

async function extDelete(url: string, token: string): Promise<void> {
  const res = await fetch(url, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } })
  if (!res.ok && res.status !== 204) {
    const data = await res.json() as unknown
    throwIfApiError(data, platformFor(url))
  }
}

// ── Facebook ──────────────────────────────────────────────────────────────────

/** Builds the Facebook OAuth dialog URL (implicit / token flow) */
export function buildFbLoginUrl(): string {
  return `https://www.facebook.com/v22.0/dialog/oauth?client_id=${FB_APP_ID}&redirect_uri=${encodeURIComponent(redirectUri())}&state=facebook&response_type=token&scope=${encodeURIComponent(FB_SCOPE)}`
}

/**
 * Exchanges a short-lived FB token for a long-lived one via the backend proxy.
 * Mirrors: dataManager.getData(DevApiHost, Url['facebooklongtoken'] + 'fb_exchange_token/...')
 */
export async function fbExchangeLongToken(shortToken: string): Promise<string> {
  const data = await http.get<{ access_token?: string }>(
    apiConfig.dotnetApiBase,
    `v1/oauth/facebooklongtoken/fb_exchange_token/${FB_APP_ID}/${FB_APP_SECRET}/${shortToken}`,
  )
  if (!data.access_token) throw new Error('Facebook token exchange returned no access_token')
  return data.access_token
}

// ── Multi-platform metadata ────────────────────────────────────────────────────

/**
 * Shape of a single channel record returned by
 * v1/mam/get-multi-socialmedia-metadata — mirrors Angular MediaPublishComponent.getsmChannels()
 */
export interface SocialMediaMetadata {
  platform: 'youtube' | 'facebook' | 'twitter' | 'instagram' | 'rtmp'
  title: string
  accoutName: string   // note: intentional API typo
  accountId: string
  logo: string
  description: string
  token: string        // refresh token
  accessToken: string  // short-lived access token
  privacy?: string
}

/**
 * Fetches all social media channels already connected for a user/channel.
 * Mirrors: dataManager.getData(cHost, 'v1/mam/get-multi-socialmedia-metadata?cid=..&userid=..', 'jsonHeaders')
 */
export async function fetchSocialMediaMetadata(cid: string, userId: string): Promise<SocialMediaMetadata[]> {
  const data = await http.get<{ code?: number; data?: SocialMediaMetadata[] }>(
    apiConfig.dotnetApiBase,
    `v1/mam/get-multi-socialmedia-metadata?cid=${cid}&userid=${userId}`,
  )
  if (data.code !== 1 || !Array.isArray(data.data)) return []
  return data.data
}

/**
 * Saves a custom RTMP channel to the backend.
 * Mirrors: dataManager.postJsonData(DevApiHost, 'v1/gateway/add-rtmpmetadata', payload)
 */
export async function storeRtmpChannel(payload: {
  uid: string; cid: string; displayName: string; rtmpUrl: string; streamKey: string; platform: string
}): Promise<boolean> {
  const res = await http.post<{ code?: number }>(apiConfig.dotnetApiBase, 'v1/gateway/add-rtmpmetadata', payload)
  return res.code === 1
}

/** Start an RTMP stream for a saved RTMP channel. */
export async function rtmpGoLive(accountId: string, cid: string, userId: string): Promise<void> {
  await http.post(apiConfig.dotnetApiBase, 'v1/gateway/rtmp-golive', { accountId, cid, userId })
}

/** Stop an RTMP stream for a saved RTMP channel. */
export async function rtmpStopLive(accountId: string, cid: string, userId: string): Promise<void> {
  await http.post(apiConfig.dotnetApiBase, 'v1/gateway/rtmp-stoplive', { accountId, cid, userId })
}

// ── Instagram ─────────────────────────────────────────────────────────────────

/** Builds the Instagram OAuth dialog URL — same FB app, different scope + state */
export function buildIgLoginUrl(): string {
  return `https://www.facebook.com/v22.0/dialog/oauth?client_id=${FB_APP_ID}&redirect_uri=${encodeURIComponent(redirectUri())}&state=instagram&response_type=token&scope=${encodeURIComponent(IG_SCOPE)}`
}

/** GET v22.0/me/accounts — with instagram_business_account field for IG pages */
export async function igGetPagesWithBusiness(
  longToken: string,
): Promise<Array<{
  id: string; name: string; access_token: string
  instagram_business_account?: { id: string }
  picture?: { data: { url: string } }
}>> {
  const data = await extGet<{
    data?: Array<{
      id: string; name: string; access_token: string
      instagram_business_account?: { id: string }
      picture?: { data: { url: string } }
    }>
  }>(`${FB_GRAPH}/me/accounts?fields=id,name,access_token,instagram_business_account,picture`, longToken)
  return data.data ?? []
}

/**
 * GET v22.0/{igId}?fields=id,username,media_count,profile_picture_url,name
 * Mirrors FacebookService.instagramDetails()
 */
export async function igGetAccountDetails(pageToken: string, igId: string): Promise<{
  id: string; username: string; profile_picture_url: string; name: string
}> {
  return extGet<{ id: string; username: string; profile_picture_url: string; name: string }>(
    `${FB_GRAPH}/${igId}?fields=id,username,media_count,profile_picture_url,name`,
    pageToken,
  )
}

/** GET graph.facebook.com/v22.0/me */
export async function fbGetProfile(longToken: string): Promise<{ id: string; name: string }> {
  return extGet<{ id: string; name: string }>(`${FB_GRAPH}/me?fields=id,name`, longToken)
}

/** GET v22.0/me/accounts — user's pages */
export async function fbGetPages(
  longToken: string,
): Promise<Array<{ id: string; name: string; access_token: string; picture?: { data: { url: string } } }>> {
  const data = await extGet<{
    data?: Array<{ id: string; name: string; access_token: string; picture?: { data: { url: string } } }>
  }>(`${FB_GRAPH}/me/accounts?fields=id,name,access_token,picture`, longToken)
  return data.data ?? []
}

/** GET v22.0/{pageId}?fields=access_token — long-lived page token */
export async function fbGetPageToken(pageId: string, longToken: string): Promise<string> {
  const data = await extGet<{ access_token?: string }>(`${FB_GRAPH}/${pageId}?fields=access_token`, longToken)
  return data.access_token ?? ''
}

/**
 * Stores FB page metadata via backend.
 * Mirrors: dataManager.postJsonData(DevApiHost, Url['fbmanagedata'], _pageData)
 */
export async function fbStorePage(pageData: {
  UserId: string; UserName: string; AccountToken: string
  PageId: string; PageTitle: string; PageToken: string
  Chid: number; Uid: number
  IgId: string; IgUserName: string; IgProfilePictureUrl: string; IgName: string
  PageProfiePictureUrl: string
}): Promise<boolean> {
  const res = await http.post<{ code?: number }>(apiConfig.dotnetApiBase, 'v1/gateway/managefbmetadata', pageData)
  return res.code === 1
}

/**
 * Fetches saved FB pages from backend.
 * Mirrors: dataManager.getData(DevApiHost, Url['facebookpages'] + cid + '/' + uid)
 */
export async function fbLoadPages(cid: string, userId: string): Promise<FbPage[]> {
  const data = await http.get<FbPage[]>(apiConfig.dotnetApiBase, `v1/gateway/facebookpages/${cid}/${userId}`)
  return Array.isArray(data) ? data.map(p => ({ ...p, streaming: false })) : []
}

/** POST v22.0/{pageId}/live_videos — start FB live */
export async function fbGoLive(
  page: FbPage,
  title: string,
  description: string,
): Promise<{ id: string; stream_url: string; secure_stream_url: string }> {
  const data = await extPost<{ id?: string; stream_url?: string; secure_stream_url?: string }>(
    `${FB_GRAPH}/${page.pageId}/live_videos`,
    { access_token: page.pageToken, title, description, status: 'LIVE_NOW' },
  )
  if (!data.id) throw new Error('Facebook live start failed — no video ID returned')
  return {
    id: data.id,
    stream_url: data.stream_url ?? '',
    secure_stream_url: data.secure_stream_url ?? data.stream_url ?? '',
  }
}

/** GET v22.0/{videoId}?fields=status — returns live video status (e.g. "LIVE", "LIVE_STOPPED"). */
export async function fbGetLiveVideoStatus(videoId: string, pageToken: string): Promise<string> {
  const data = await extGet<{ status?: string }>(`${FB_GRAPH}/${videoId}?fields=status`, pageToken)
  return data.status ?? ''
}

/** GET v22.0/{pageId}/live_videos — returns currently live video IDs for a Facebook page. */
export async function fbGetActiveLiveVideos(pageId: string, pageToken: string): Promise<Array<{ id: string }>> {
  const data = await extGet<{ data?: Array<{ id: string }> }>(
    `${FB_GRAPH}/${pageId}/live_videos?status=LIVE&fields=id&access_token=${pageToken}`,
    pageToken,
  )
  return data.data ?? []
}

/** POST v22.0/{videoId} end_live_video — stop FB live */
export async function fbStopLive(page: FbPage): Promise<void> {
  if (!page.videoId) return
  await extPost(`${FB_GRAPH}/${page.videoId}`, { end_live_video: true, access_token: page.pageToken })
}

// ── Twitter ───────────────────────────────────────────────────────────────────

/**
 * Generates PKCE verifier + builds Twitter OAuth 2.0 authorization URL.
 * Mirrors TwitterService.twitterLogin(returnUrl=true)
 */
export async function buildTwLoginUrl(): Promise<{ url: string; verifier: string }> {
  const verifier = generateVerifier()
  const challenge = await generateChallenge(verifier)
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: TW_CLIENT_ID,
    redirect_uri: redirectUri(),
    scope: TW_SCOPE,
    state: 'twitter',
    code_challenge: challenge,
    code_challenge_method: 'S256',
    prompt: 'consent',
  })
  return { url: `https://twitter.com/i/oauth2/authorize?${params}`, verifier }
}

/**
 * Exchanges Twitter auth code for tokens via backend.
 * Mirrors TwitterService.exchangeCodeForToken()
 */
export async function twExchangeCode(
  code: string,
  verifier: string,
): Promise<{ access_token: string; refresh_token: string }> {
  const data = await http.post<{ access_token?: string; refresh_token?: string }>(
    apiConfig.dotnetApiBase,
    'v1/oauth/exchangetokentwitter',
    { code, redirect_uri: redirectUri(), grant_type: 'authorization_code', code_verifier: verifier },
  )
  if (!data.access_token) throw new Error('Twitter code exchange returned no access_token')
  return { access_token: data.access_token, refresh_token: data.refresh_token ?? '' }
}

/**
 * Fetches Twitter profile via backend proxy.
 * Mirrors TwitterService.twitterprofile() → dataManager.getData(Url['twitterProfile'] + '?token=...')
 */
export async function twGetProfile(accessToken: string): Promise<{
  id: string; username: string; name: string; profile_image_url: string
}> {
  const data = await http.get<{ data?: { id: string; username: string; name: string; profile_image_url: string } }>(
    apiConfig.dotnetApiBase,
    `v1/gateway/twitterProfile?token=${accessToken}`,
  )
  if (!data.data?.id) throw new Error('Twitter profile fetch failed')
  return data.data
}

/**
 * Stores Twitter user metadata via backend.
 * Mirrors TwitterService.manageTwitterData() → Url['twittermanagedata']
 */
export async function twStoreAccount(payload: {
  userId: string; userName: string; twitterName: string; userPictureUrl: string
  accessToken: string; refreshToken: string; chid: number; uid: number
}): Promise<boolean> {
  const res = await http.post<{ code?: number }>(apiConfig.dotnetApiBase, 'v1/gateway/managetwittermetadata', payload)
  return res.code === 1
}

/**
 * Refreshes Twitter access token via backend.
 * Mirrors TwitterService.refreshToken()
 */
export async function twRefreshToken(refreshToken: string): Promise<void> {
  await http.post(apiConfig.dotnetApiBase, `v1/oauth/twitter-refreshtoken?refreshtoken=${refreshToken}`, undefined)
}

// ── Token health checks & silent refresh ─────────────────────────────────────

/**
 * Checks whether a Facebook page is eligible for live streaming by fetching
 * its `fan_count`. Returns true if the page has 100+ followers (or if the
 * check cannot be completed due to a network error).
 */
export async function checkFbPageLiveEligibility(pageId: string, pageToken: string): Promise<boolean> {
  try {
    const res = await fetch(`${FB_GRAPH}/${pageId}?fields=fan_count&access_token=${pageToken}`)
    const data = await res.json() as { fan_count?: number; error?: unknown }
    if (data.error) return false
    return (data.fan_count ?? 0) >= 100
  } catch {
    return true // Don't block on network error
  }
}

/**
 * Probes a Facebook / Instagram page token by hitting the Graph API directly.
 * Returns false if the token is expired or invalid (error.code 190).
 */
export async function checkFbTokenHealth(pageId: string, pageToken: string): Promise<boolean> {
  try {
    const res = await fetch(`${FB_GRAPH}/${pageId}?fields=id&access_token=${pageToken}`)
    const data = await res.json() as { id?: string; error?: unknown }
    return !!data.id && !data.error
  } catch {
    return false
  }
}

/**
 * Probes a YouTube access token by calling the channels list endpoint.
 * Returns false on any 4xx response (token expired / revoked).
 */
export async function checkYtTokenHealth(accessToken: string): Promise<boolean> {
  try {
    const res = await fetch(
      'https://www.googleapis.com/youtube/v3/channels?part=id&mine=true',
      { headers: { Authorization: `Bearer ${accessToken}` } },
    )
    return res.ok
  } catch {
    return false
  }
}

/**
 * Silently refreshes a YouTube access token using the stored refresh token,
 * then persists the new token to the backend. Returns the new access token.
 */
export async function ytRefreshAndUpdate(
  ch: SocialMediaMetadata,
  cid: string,
  userId: string,
): Promise<string> {
  const newAccessToken = await ytRefreshAccessToken(ch.token)
  const nowTs = Math.floor(Date.now() / 1000)
  await ytStoreChannel({
    ytChannelId: ch.accountId, channelName: ch.title, userName: ch.accoutName,
    logo: ch.logo, description: ch.description,
    accessToken: newAccessToken, refreshToken: ch.token,
    privacy: ch.privacy ?? '', remarks: '',
    cid: Number(cid), userId: Number(userId),
    createdBy: Number(userId), modifiedBy: Number(userId),
    createdDate: nowTs, modifiedDate: nowTs,
  })
  return newAccessToken
}

/**
 * Refreshes a Twitter access token via the backend proxy, then persists the
 * new tokens. Returns the new access token.
 */
export async function twRefreshAndUpdate(
  ch: SocialMediaMetadata,
  cid: string,
  userId: string,
): Promise<string> {
  const data = await http.post<{ access_token?: string; refresh_token?: string }>(
    apiConfig.dotnetApiBase,
    `v1/oauth/twitter-refreshtoken?refreshtoken=${ch.token}`,
    undefined,
  )
  if (!data.access_token) throw new Error('Twitter token refresh returned no access_token')
  await twStoreAccount({
    userId: ch.accountId, userName: ch.accoutName, twitterName: ch.title,
    userPictureUrl: ch.logo,
    accessToken: data.access_token, refreshToken: data.refresh_token ?? ch.token,
    chid: Number(cid), uid: Number(userId),
  })
  return data.access_token
}

// ── YouTube ───────────────────────────────────────────────────────────────────

/** Builds Google OAuth 2.0 authorization URL (code flow with offline access) */
export function buildYtLoginUrl(): string {
  const params = new URLSearchParams({
    client_id: YT_CLIENT_ID,
    redirect_uri: redirectUri(),
    response_type: 'code',
    access_type: 'offline',
    prompt: 'consent',
    scope: YT_SCOPE,
    state: 'youtube',
  })
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`
}

/**
 * Exchanges Google auth code for tokens (direct to Google — matches Angular pattern).
 * Angular: oauthService internally calls https://oauth2.googleapis.com/token
 */
export async function ytExchangeCode(code: string): Promise<{ access_token: string; refresh_token: string }> {
  const body = new URLSearchParams({
    code,
    client_id: YT_CLIENT_ID,
    client_secret: YT_CLIENT_SECRET,
    redirect_uri: redirectUri(),
    grant_type: 'authorization_code',
  })
  const res = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', body })
  const data = await res.json() as { access_token?: string; refresh_token?: string }
  if (!data.access_token) throw new Error('YouTube token exchange failed')
  return { access_token: data.access_token, refresh_token: data.refresh_token ?? '' }
}

/**
 * Refreshes YouTube access token (direct to Google).
 * Mirrors YoutubeService.getAccessTokenByRefreshToken()
 */
export async function ytRefreshAccessToken(refreshToken: string): Promise<string> {
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    client_id: YT_CLIENT_ID,
    client_secret: YT_CLIENT_SECRET,
    refresh_token: refreshToken,
  })
  const res = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', body })
  const data = await res.json() as { access_token?: string }
  if (!data.access_token) throw new Error('YouTube token refresh failed')
  return data.access_token
}

/**
 * Fetches YouTube channel details.
 * Mirrors YoutubeService.getChannelDetails() → youtube/v3/channels?part=snippet&mine=true
 */
export async function ytGetChannel(accessToken: string): Promise<{
  id: string; title: string; description: string; customUrl: string; logo: string
}> {
  const data = await extGet<{
    kind?: string
    items?: Array<{
      id: string
      snippet: { title: string; description: string; customUrl: string; thumbnails: { high: { url: string } } }
    }>
  }>('https://www.googleapis.com/youtube/v3/channels?part=snippet,contentDetails,statistics&mine=true', accessToken)

  if (!data.items?.length) {
    throw new Error('No YouTube channel found for this Google account. Make sure you have a YouTube channel set up at youtube.com.')
  }
  const { id, snippet } = data.items[0]
  return { id, title: snippet.title, description: snippet.description, customUrl: snippet.customUrl, logo: snippet.thumbnails.high.url }
}

/**
 * Stores YouTube metadata via backend.
 * Mirrors YoutubeService.insertOrUpdateYtMetadata() → Url['add-ytmetadata']
 */
export async function ytStoreChannel(payload: {
  ytChannelId: string; channelName: string; userName: string; logo: string; description: string
  accessToken: string; refreshToken: string; privacy: string; remarks: string
  cid: number; userId: number; createdBy: number; modifiedBy: number
  createdDate: number; modifiedDate: number
}): Promise<boolean> {
  const res = await http.post<{ code?: number }>(apiConfig.dotnetApiBase, 'v1/gateway/add-ytmetadata', payload)
  return res.code === 1
}

// ── Instance availability check ───────────────────────────────────────────────

/**
 * Checks whether a free backend instance is available for publishing.
 * Returns true if an instance is free, false if all are busy.
 */
export async function checkInstanceStatus(cid: string): Promise<boolean> {
  const data = await http.get<{ Message?: string }>(
    apiConfig.dotnetApiBase,
    `v1/gateway/get-instances-status?cid=${cid}`,
  )
  return data.Message !== 'No instances are free'
}

// ── YouTube live stream / broadcast helpers ───────────────────────────────────

export interface YtStream {
  id: string
  title: string
  url: string
  key: string
  status: string
  isDefaultStream: boolean
}

/** GET youtube/v3/liveStreams — fetches all live streams for the authenticated user. */
export async function ytGetLiveStreams(accessToken: string): Promise<YtStream[]> {
  const data = await extGet<{
    items?: Array<{
      id: string
      snippet: { title: string; isDefaultStream: boolean }
      cdn: { ingestionInfo: { ingestionAddress: string; streamName: string } }
      status: { streamStatus: string }
    }>
  }>('https://www.googleapis.com/youtube/v3/liveStreams?mine=true&part=id,snippet,cdn,status&maxResults=50', accessToken)
  return (data.items ?? []).map(s => ({
    id: s.id,
    title: s.snippet.title,
    url: s.cdn.ingestionInfo.ingestionAddress,
    key: s.cdn.ingestionInfo.streamName,
    status: s.status.streamStatus,
    isDefaultStream: s.snippet.isDefaultStream,
  }))
}

/** POST youtube/v3/liveBroadcasts — creates a live broadcast and returns its ID, chat ID, and thumbnail. */
export async function ytCreateBroadcast(
  accessToken: string,
  title: string,
  description: string,
  privacy = 'public',
  forKids = false,
): Promise<{ id: string; liveChatId: string; thumbnailUrl: string }> {
  const data = await extPost<{
    id?: string
    snippet?: { liveChatId?: string; thumbnails?: { default?: { url?: string } } }
  }>(
    'https://www.googleapis.com/youtube/v3/liveBroadcasts?part=id,snippet,status,contentDetails',
    {
      snippet: { title, description, scheduledStartTime: new Date().toISOString() },
      status: { privacyStatus: privacy, selfDeclaredMadeForKids: forKids },
      contentDetails: { enableAutoStart: true, enableAutoStop: false, enableMonitorStream: false },
    },
    accessToken,
  )
  if (!data.id) throw new Error('YouTube: failed to create live broadcast')
  return {
    id: data.id,
    liveChatId: data.snippet?.liveChatId ?? '',
    thumbnailUrl: data.snippet?.thumbnails?.default?.url ?? '',
  }
}

/** POST youtube/v3/liveBroadcasts/bind — binds a broadcast to a live stream so YouTube knows which ingestion to activate. */
export async function ytBindBroadcast(accessToken: string, broadcastId: string, streamId: string): Promise<void> {
  await extPost(
    `https://www.googleapis.com/youtube/v3/liveBroadcasts/bind?id=${broadcastId}&streamId=${streamId}&part=id,contentDetails`,
    {},
    accessToken,
  )
}

/**
 * GET youtube/v3/liveBroadcasts — returns all currently active (live/testing) broadcasts for the account.
 * Used on panel load to detect if the channel is already streaming from a previous session.
 */
export async function ytGetActiveBroadcasts(accessToken: string): Promise<Array<{ id: string; title: string }>> {
  const data = await extGet<{
    items?: Array<{ id: string; snippet?: { title?: string }; status?: { lifeCycleStatus?: string } }>
  }>(
    'https://www.googleapis.com/youtube/v3/liveBroadcasts?mine=true&part=id,snippet,status&maxResults=50',
    accessToken,
  )
  return (data.items ?? [])
    .filter(b => b.status?.lifeCycleStatus === 'live' || b.status?.lifeCycleStatus === 'testing'
      || b.status?.lifeCycleStatus === 'liveStarting' || b.status?.lifeCycleStatus === 'testStarting')
    .map(b => ({ id: b.id, title: b.snippet?.title ?? '' }))
}

/** GET youtube/v3/liveBroadcasts — returns the lifeCycleStatus of a single broadcast. */
export async function ytGetBroadcastStatus(accessToken: string, broadcastId: string): Promise<string> {
  const data = await extGet<{
    items?: Array<{ status?: { lifeCycleStatus?: string } }>
  }>(`https://www.googleapis.com/youtube/v3/liveBroadcasts?part=status&id=${encodeURIComponent(broadcastId)}`, accessToken)
  return data.items?.[0]?.status?.lifeCycleStatus ?? 'unknown'
}

/**
 * POST youtube/v3/liveBroadcasts/transition — transitions a broadcast to 'testing'.
 * Must be called before ytTransitionToLive when the broadcast is in 'ready' state.
 */
export async function ytTransitionToTesting(accessToken: string, broadcastId: string): Promise<void> {
  await extPost(
    `https://www.googleapis.com/youtube/v3/liveBroadcasts/transition?broadcastStatus=testing&id=${encodeURIComponent(broadcastId)}&part=id,status`,
    {},
    accessToken,
  )
}

/** POST youtube/v3/liveBroadcasts/transition — transitions a broadcast from testing to live. */
export async function ytTransitionToLive(accessToken: string, broadcastId: string): Promise<void> {
  await extPost(
    `https://www.googleapis.com/youtube/v3/liveBroadcasts/transition?broadcastStatus=live&id=${encodeURIComponent(broadcastId)}&part=id,status`,
    {},
    accessToken,
  )
}

/** POST youtube/v3/liveBroadcasts/transition — ends a live broadcast by transitioning to 'complete'. */
export async function ytEndBroadcast(accessToken: string, broadcastId: string): Promise<void> {
  await extPost(
    `https://www.googleapis.com/youtube/v3/liveBroadcasts/transition?broadcastStatus=complete&id=${broadcastId}&part=id,status`,
    {},
    accessToken,
  )
}

/** DELETE youtube/v3/liveBroadcasts — deletes a broadcast that has not yet started (created/ready state). */
export async function ytDeleteBroadcast(accessToken: string, broadcastId: string): Promise<void> {
  await extDelete(
    `https://www.googleapis.com/youtube/v3/liveBroadcasts?id=${encodeURIComponent(broadcastId)}`,
    accessToken,
  )
}

/**
 * GET youtube/v3/liveBroadcasts — returns all non-complete broadcasts bound to the given streamId.
 * Used to detect stale broadcasts from a previous session before starting a new one.
 */
export async function ytGetBoundBroadcasts(
  accessToken: string,
  streamId: string,
): Promise<Array<{ id: string; lifeCycleStatus: string; title: string }>> {
  const data = await extGet<{
    items?: Array<{
      id: string
      snippet?: { title?: string }
      status?: { lifeCycleStatus?: string }
      contentDetails?: { boundStreamId?: string }
    }>
  }>(
    'https://www.googleapis.com/youtube/v3/liveBroadcasts?mine=true&part=id,snippet,status,contentDetails&maxResults=50',
    accessToken,
  )
  return (data.items ?? [])
    .filter(b => {
      const status = b.status?.lifeCycleStatus ?? ''
      const boundStreamId = b.contentDetails?.boundStreamId ?? ''
      return boundStreamId === streamId && status !== 'complete' && status !== 'revoked' && status !== 'reclaimed'
    })
    .map(b => ({
      id: b.id,
      lifeCycleStatus: b.status?.lifeCycleStatus ?? 'unknown',
      title: b.snippet?.title ?? '',
    }))
}

// ── Backend multi-platform publish ────────────────────────────────────────────

export interface FbLiveInfo {
  title: string; description: string; thumbnail: string
  userAccessToken: string; pageId: string; pageName: string; pageToken: string
  link: string; videoId: string; publishUrl: string; streamKey: string
}

export interface YtLiveInfo {
  accessToken: string; refreshToken: string
  channelTitle: string; channelId: string; channelName: string
  videoTitle: string; videoDescription: string; videoPrivacyStatus: string; videoForKids: boolean
  link: string; categoryId: string; videoId: string; videoThumbnailDefaultUrl: string
  tags: string[]; chatId: string; publishUrl: string; streamId: string
  streamKey: string; streamTitle: string; studioLink: string
  videoShedularStarttime: string; thumbnailUrl: string
}

export interface RtmpLiveInfo { title?: string; description?: string; publishUrl: string; streamKey: string; outputMode: string }

export interface PublishLivePayload {
  cid: string | number; userId: string | number
  inputType: 'live'; inputUrl: '0'
  logo: 0; publishMode: 'rtmp'; userName: string
  preRoll: 0; postRoll: 0
  is_zixioutput: true; zixiInputId: 'pcr-master'; is_multiple: true
  aspectRatio: string; videoResolution: string; videoBitRate: string
  audioBitRate: string; fps: string; vCodec: string; aCodec: string
  publishProfileName: string
  youTubeInfo: YtLiveInfo[]
  facebookInfo: FbLiveInfo[]
  twitterInfo: RtmpLiveInfo[]
  instagramInfo: RtmpLiveInfo[]
  rtmpInfo: RtmpLiveInfo[]
}

/**
 * POST v1/gateway/rtmp-multi-socialmedia-platform — starts publishing the studio
 * output (Zixi PCR-MASTER stream) to all provided social media destinations.
 */
export async function publishLiveToMultiPlatform(payload: PublishLivePayload): Promise<void> {
  await http.post(apiConfig.dotnetApiBase, 'v1/gateway/rtmp-multi-socialmedia-platform', payload)
}

export interface StartRtmpPublishPayload {
  cid: string | number; userId: string | number
  inputType: 'live'; inputUrl: '0'
  logo: 0; publishMode: 'rtmp'; userName: string
  publishUrl: string; streamKey: string; outputMode: string
  preRoll: 0; postRoll: 0
  is_zixioutput: true; zixiInputId: 'pcr-master'
  aspectRatio: string; videoResolution: string; videoBitRate: string
  audioBitRate: string; fps: string; vCodec: string; aCodec: string
  publishProfileName: string
  youTubeInfo: ''; facebookInfo: ''; twitterInfo: ''; instagramInfo: ''
}

/**
 * POST v1/gateway/start-publish — starts a single RTMP channel live stream.
 * Used for individual (non-batch) RTMP go-live, matching Angular publish.component.ts.
 */
export async function startRtmpPublish(payload: StartRtmpPublishPayload): Promise<void> {
  await http.post(apiConfig.dotnetApiBase, 'v1/gateway/start-publish', payload)
}

export interface ThumbnailBinary { buffer: ArrayBuffer; contentType: string }

/**
 * Fetches an image URL once and returns the binary data for reuse across multiple platform uploads.
 * Returns null if the fetch fails — callers should skip the upload in that case.
 */
export async function fetchThumbnailBinary(imageUrl: string): Promise<ThumbnailBinary | null> {
  try {
    const response = await fetch(imageUrl)
    if (!response.ok) return null
    const buffer = await response.arrayBuffer()
    const contentType = response.headers.get('content-type') ?? 'image/jpeg'
    return { buffer, contentType }
  } catch {
    return null
  }
}

/**
 * Uploads pre-fetched thumbnail binary to a YouTube broadcast via the Thumbnails API.
 * Returns the uploaded thumbnail URL, or empty string if the upload fails (non-fatal).
 * Mirrors Angular publish.component.ts youtubeuploadthumbnail().
 */
export async function ytUploadThumbnail(accessToken: string, videoId: string, thumbnail: ThumbnailBinary): Promise<string> {
  const uploadResponse = await fetch(
    `https://www.googleapis.com/upload/youtube/v3/thumbnails/set?videoId=${videoId}&uploadType=media`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': thumbnail.contentType },
      body: thumbnail.buffer,
    },
  )
  if (!uploadResponse.ok) return ''
  const data = await uploadResponse.json() as { items?: Array<{ default?: { url?: string } }> }
  return data.items?.[0]?.default?.url ?? ''
}

/**
 * Uploads pre-fetched thumbnail binary to a Facebook live video via the Graph API.
 * Mirrors Angular publish.component.ts fbthumbnail().
 */
export async function fbUploadThumbnail(pageToken: string, videoId: string, thumbnail: ThumbnailBinary): Promise<void> {
  const imageBlob = new Blob([thumbnail.buffer], { type: thumbnail.contentType })
  const formData = new FormData()
  formData.append('source', imageBlob)
  formData.append('access_token', pageToken)
  await fetch(`${FB_GRAPH}/${videoId}/thumbnails`, { method: 'POST', body: formData })
}

// ── MAM Asset Publish ─────────────────────────────────────────────────────────

export interface RollProfile {
  preRollId: number
  postRollId: number
  profileName: string
}

/**
 * GET v1/gateway/get-apm/{cid} — fetches pre/post roll profiles for the channel.
 * Mirrors Angular MediaPublishComponent ngOnInit roll data fetch.
 */
export async function fetchRollProfiles(cid: string): Promise<RollProfile[]> {
  try {
    const data = await http.get<RollProfile[]>(apiConfig.dotnetApiBase, `v1/gateway/get-apm/${cid}`)
    return Array.isArray(data) ? data : []
  } catch {
    return []
  }
}

/**
 * GET v1/gateway/get-uploadinstance-status — checks if a VOD upload instance is free.
 * Mirrors Angular addBG() check for vodToVod publish type.
 */
export async function checkUploadInstanceStatus(): Promise<boolean> {
  try {
    const data = await http.get<{ Message?: string }>(
      apiConfig.dotnetApiBase,
      'v1/gateway/get-uploadinstance-status',
    )
    return data.Message !== 'No instances are free'
  } catch {
    return false
  }
}

// ── VOD-to-VOD payload types ──────────────────────────────────────────────────

export interface YtVodInfo {
  accessToken: string; refreshToken: string
  channelTitle: string; channelId: string; channelName: string
  videoTitle: string; videoDescription: string; videoPrivacyStatus: string; videoForKids: boolean
  categoryId: string; videoId: string; videoThumbnailDefaultUrl: string
  tags: string[]; thumbnailUrl: string; link: string
}

export interface FbVodInfo {
  title: string; description: string; thumbnail: string
  userAccessToken: string; pageId: string; pageName: string; pageToken: string
  link: string; videoId: string
}

export interface IgVodInfo {
  caption: string; userAccessToken: string; pageId: string; pageName: string; pageToken: string
  link: string; videoId: string
  igId: string; igUserName: string; igName: string; igThumbnail: string
}

export interface TwVodInfo {
  description: string; userId: string; userName: string; userPictureUrl: string; twitterName: string
  accessToken: string; refreshToken: string; link: string; videoId: string; thumbnail: string; uId: string
}

export interface VodToVodPayload {
  cid: string | number; userId: string | number
  inputType: 'vod upload'
  inputUrl: string
  logo: 0; publishMode: 'rtmp'; userName: string
  outputMode: 'vod upload'
  extData: Record<string, never>
  preRoll: number; postRoll: number
  youTubeInfo: YtVodInfo[]
  facebookInfo: FbVodInfo[]
  twitterInfo: TwVodInfo[]
  instagramInfo: IgVodInfo[]
}

export interface VodToLivePayload {
  cid: string | number; userId: string | number
  inputType: 'vod'
  inputUrl: string
  logo: 0; publishMode: 'rtmp'; userName: string
  outputMode: 'rtmp'
  extData: Record<string, never>
  preRoll: number; postRoll: number
  aspectRatio: string; videoResolution: string; videoBitRate: string
  audioBitRate: string; fps: string; vCodec: string; aCodec: string
  publishProfileName: string
  youTubeInfo: YtLiveInfo[]
  facebookInfo: FbLiveInfo[]
  twitterInfo: RtmpLiveInfo[]
  instagramInfo: RtmpLiveInfo[]
  rtmpInfo: RtmpLiveInfo[]
}

/**
 * POST v1/gateway/upload-multi-socialmedia-platform — uploads a MAM VOD asset
 * to multiple social media platforms simultaneously.
 * Mirrors Angular MediaPublishComponent.submit() for publishType === 'vodToVod'.
 */
export async function publishVodToSocialPlatforms(payload: VodToVodPayload): Promise<void> {
  await http.post(apiConfig.dotnetApiBase, 'v1/gateway/upload-multi-socialmedia-platform', payload)
}

/**
 * POST v1/gateway/rtmp-multi-socialmedia-platform — streams a MAM VOD asset as
 * a live broadcast to multiple social media platforms simultaneously.
 * Mirrors Angular MediaPublishComponent.submit() for publishType === 'vodToLive'.
 */
export async function publishVodAsLive(payload: VodToLivePayload): Promise<void> {
  await http.post(apiConfig.dotnetApiBase, 'v1/gateway/rtmp-multi-socialmedia-platform', payload)
}
