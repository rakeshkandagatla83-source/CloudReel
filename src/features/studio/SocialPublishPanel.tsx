import { useState, useCallback, useEffect, useRef } from 'react'
import { Link } from 'react-router-dom'
import { Plus, ChevronDown, ChevronUp, ChevronLeft, X, Radio, Play, RefreshCw, CheckSquare, History, Wifi, AlertCircle, Eye, EyeOff } from 'lucide-react'
import { cn } from '../../lib/utils'
import { useStudioCtx } from './StudioContext'
import { getStorage, setStorage } from '../../lib/storage'
import { useSubscription } from '../../features/subscription/useSubscription'
import { useMeetingHoursUsage } from '../../features/subscription/useMeetingHoursUsage'
import { UpgradeModal } from '../../components/ui/UpgradeModal'
import {
  socialStore, openAuthPopup, attachPopupListener,
  buildFbLoginUrl, fbExchangeLongToken, fbGetProfile, fbGetPageToken, fbStorePage, fbGoLive,
  buildIgLoginUrl, igGetPagesWithBusiness, igGetAccountDetails,
  buildTwLoginUrl, twExchangeCode, twGetProfile, twStoreAccount,
  buildYtLoginUrl, ytExchangeCode, ytGetChannel, ytStoreChannel,
  fetchSocialMediaMetadata, storeRtmpChannel,
  checkFbTokenHealth, checkFbPageLiveEligibility, checkYtTokenHealth, ytRefreshAndUpdate, twRefreshAndUpdate,
  checkInstanceStatus, ytGetLiveStreams, ytCreateBroadcast, ytBindBroadcast, publishLiveToMultiPlatform,
  ytGetBroadcastStatus, ytTransitionToLive, fbGetLiveVideoStatus,
  ytGetBoundBroadcasts, ytEndBroadcast, ytDeleteBroadcast, ytGetActiveBroadcasts,
  fbGetActiveLiveVideos,
  fbUploadThumbnail, fetchThumbnailBinary,
  FbLiveEligibilityError, YtInvalidTransitionError,
} from '../../lib/socialAuthService'
import type { FbPage, YtAccount, TwAccount, SocialMediaMetadata, FbLiveInfo, YtLiveInfo, RtmpLiveInfo, YtStream } from '../../lib/socialAuthService'
import type { UserData } from '../../types/user'
import { Select, SelectItem } from '../../components/ui/Select'
import { Toaster } from '../../components/ui/Toast'

// ── Channel health state ───────────────────────────────────────────────────────

type ChannelHealth = 'checking' | 'ok' | 'refreshing' | 'expired' | 'ineligible'

const HEALTH_TITLE: Record<ChannelHealth, string> = {
  ok:         'Connected — token is valid',
  checking:   'Checking connection…',
  refreshing: 'Refreshing token…',
  expired:    'Token expired — reconnect required',
  ineligible: 'Not eligible for live streaming',
}

function HealthDot({ health }: { health?: ChannelHealth }) {
  const title = health ? HEALTH_TITLE[health] : 'RTMP — no token to verify'
  if (health === 'ok')         return <div title={title} className="w-2 h-2 rounded-full bg-emerald-400 shrink-0 cursor-help" />
  if (health === 'checking')   return <div title={title} className="w-2 h-2 rounded-full bg-secondary-text animate-pulse shrink-0 cursor-help" />
  if (health === 'refreshing') return <div title={title} className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shrink-0 cursor-help" />
  if (health === 'expired')    return <div title={title} className="w-2 h-2 rounded-full bg-red-400 shrink-0 cursor-help" />
  if (health === 'ineligible') return <div title={title} className="w-2 h-2 rounded-full bg-orange-400 shrink-0 cursor-help" />
  return <div title={title} className="w-2 h-2 rounded-full bg-surface-2 shrink-0 cursor-help" />
}

function ReconnectBtn({ onReconnect }: { onReconnect: () => void }) {
  return (
    <span
      role="button"
      tabIndex={0}
      onClick={e => { e.stopPropagation(); onReconnect() }}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); onReconnect() } }}
      className="text-[8px] font-bold text-[#3031cb] border border-[#3031cb]/30 rounded px-1 py-0.5 hover:bg-[#3031cb]/10 cursor-pointer transition-colors shrink-0 whitespace-nowrap"
    >
      Reconnect
    </span>
  )
}

// ── Channel avatar with onError fallback ───────────────────────────────────────

function ChannelAvatar({ src, fallback }: { src?: string; fallback: React.ReactNode }) {
  const [error, setError] = useState(false)
  if (src && !error) {
    return (
      <img
        src={src} alt=""
        className="w-6 h-6 rounded-lg shrink-0 object-cover"
        onError={() => setError(true)}
      />
    )
  }
  return (
    <div className="w-6 h-6 rounded-lg shrink-0 flex items-center justify-center overflow-hidden">
      {fallback}
    </div>
  )
}

// ── Inline select checkbox rendered inside each card ─────────────────────────

function SelectBox({ selected, disabled }: { selected: boolean; disabled?: boolean }) {
  return (
    <div className={cn(
      'w-3.5 h-3.5 rounded border-2 shrink-0 flex items-center justify-center transition-colors',
      disabled ? 'border-primary-border bg-surface-2 opacity-35' :
      selected ? 'bg-active-accent border-active-accent' : 'border-primary-border bg-surface-2',
    )}>
      {selected && !disabled && <span className="text-white text-[8px] font-bold leading-none">✓</span>}
    </div>
  )
}

// ── Streaming state ────────────────────────────────────────────────────────────

interface FbStreamState {
  streaming: boolean
  videoId?: string
  streamUrl?: string
}

interface YtStreamState {
  streaming: boolean
  videoId?: string
}


// ── Platform SVG icons ─────────────────────────────────────────────────────────

function YtIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#ff0000" d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6a3 3 0 0 0-2.1 2.1A31.3 31.3 0 0 0 .5 12c0 2.1.1 4.1.5 5.8a3 3 0 0 0 2.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 0 0 2.1-2.1c.4-1.7.5-3.7.5-5.8s-.1-4.1-.5-5.8z" />
      <path fill="#fff" d="M9.7 15.5V8.5l6.3 3.5-6.3 3.5z" />
    </svg>
  )
}

function FbIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#1877f2" d="M24 12.07C24 5.41 18.63 0 12 0S0 5.41 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.04V9.41c0-3.02 1.8-4.7 4.54-4.7 1.31 0 2.68.24 2.68.24v2.97h-1.5c-1.5 0-1.96.93-1.96 1.89v2.26h3.32l-.53 3.5h-2.79V24C19.61 23.1 24 18.1 24 12.07z" />
    </svg>
  )
}

function IgIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <defs>
        <linearGradient id="ig-g" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#f09433" />
          <stop offset="25%" stopColor="#e6683c" />
          <stop offset="50%" stopColor="#dc2743" />
          <stop offset="75%" stopColor="#cc2366" />
          <stop offset="100%" stopColor="#bc1888" />
        </linearGradient>
      </defs>
      <path fill="url(#ig-g)" d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
    </svg>
  )
}

function XIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.748l7.73-8.835L1.254 2.25H8.08l4.259 5.63zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  )
}

// ── RTMP platform options ──────────────────────────────────────────────────────

const LIVE_STATUS_POLL_INTERVAL_MS = 30_000

const RTMP_PLATFORM_OPTIONS = [
  { value: 'rtmp',        label: 'RTMP (Generic)' },
  { value: 'amazon-live', label: 'Amazon Live' },
  { value: 'bilibili',    label: 'Bilibili' },
  { value: 'breakers-tv', label: 'Breakers TV' },
  { value: 'douyu',       label: 'Douyu' },
  { value: 'fc2-live',    label: 'FC2 Live' },
  { value: 'huya',        label: 'Huya' },
  { value: 'kakao-tv',    label: 'Kakao TV' },
  { value: 'mlg',         label: 'MLG' },
  { value: 'mix-cloud',   label: 'Mixcloud' },
  { value: 'naver-tv',    label: 'Naver TV' },
  { value: 'nimo-tv',     label: 'Nimo TV' },
  { value: 'nono-live',   label: 'Nono Live' },
  { value: 'steam',       label: 'Steam' },
  { value: 'substack',    label: 'Substack' },
  { value: 'vaughn-live', label: 'Vaughn Live' },
  { value: 'zhanqi-tv',   label: 'Zhanqi TV' },
]

// Platforms with dedicated social API flows - everything else is treated as RTMP
const SOCIAL_PLATFORMS = new Set(['facebook', 'youtube', 'twitter', 'instagram'])

// ── Shared ─────────────────────────────────────────────────────────────────────

const inputCls = 'w-full bg-surface-2 border border-primary-border rounded-lg px-2.5 py-1.5 text-[11px] text-primary-text placeholder-secondary-text outline-none focus:border-active-accent/40 transition-colors'


// ── RTMP form (inside dialog) ──────────────────────────────────────────────────

function RtmpForm({ onSaved }: { onSaved: () => void }) {
  const { cid, addLog } = useStudioCtx()
  const userId = getStorage<string>('pcr_user_id') ?? ''
  const [platform, setPlatform] = useState('rtmp')
  const [label, setLabel] = useState('')
  const [url, setUrl] = useState('')
  const [key, setKey] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<{ url?: string; key?: string }>({})

  function validate(): boolean {
    const errs: { url?: string; key?: string } = {}
    if (!url.trim()) errs.url = 'RTMP URL is required.'
    else if (!/^rtmps?:\/\/.+/i.test(url.trim())) errs.url = 'Must start with rtmp:// or rtmps://'
    if (!key.trim()) errs.key = 'Stream key is required.'
    setFieldErrors(errs)
    return Object.keys(errs).length === 0
  }

  async function save() {
    setSaveError(null)
    if (!validate()) return
    setSaving(true)
    try {
      const ok = await storeRtmpChannel({
        uid: userId,
        cid,
        displayName: (label.trim() || RTMP_PLATFORM_OPTIONS.find(p => p.value === platform)?.label) ?? platform,
        rtmpUrl: url.trim(),
        streamKey: key.trim(),
        platform,
      })
      if (!ok) throw new Error('Server returned an error — channel not saved.')
      addLog(`RTMP: channel saved`, 'info')
      onSaved()
    } catch (e) {
      const msg = (e as Error).message
      addLog(`RTMP: ${msg}`, 'err')
      setSaveError(msg)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-2.5 p-4 pt-3">
      <div className="flex flex-col gap-1">
        <label className="text-[10px] text-secondary-text font-medium">Platform</label>
        <Select value={platform} onValueChange={setPlatform} className="w-full">
          {RTMP_PLATFORM_OPTIONS.map(p => (
            <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
          ))}
        </Select>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-[10px] text-secondary-text font-medium">Label <span className="text-secondary-text/60">(optional)</span></label>
        <input
          value={label} onChange={e => setLabel(e.target.value)}
          placeholder="e.g. My Stream"
          autoComplete="off"
          className={inputCls}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-[10px] text-secondary-text font-medium">
          RTMP URL <span className="text-active-accent">*</span>
        </label>
        <input
          value={url} onChange={e => { setUrl(e.target.value); setFieldErrors(prev => ({ ...prev, url: undefined })) }}
          placeholder="rtmp://live.example.com/live"
          autoComplete="off"
          className={cn(inputCls, fieldErrors.url && 'border-red-500/50')}
        />
        {fieldErrors.url && <p className="text-[10px] text-red-400">{fieldErrors.url}</p>}
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-[10px] text-secondary-text font-medium">
          Stream Key <span className="text-active-accent">*</span>
        </label>
        <input
          value={key} onChange={e => { setKey(e.target.value); setFieldErrors(prev => ({ ...prev, key: undefined })) }}
          placeholder="xxxx-xxxx-xxxx-xxxx"
          type="password"
          autoComplete="new-password"
          className={cn(inputCls, fieldErrors.key && 'border-red-500/50')}
        />
        {fieldErrors.key && <p className="text-[10px] text-red-400">{fieldErrors.key}</p>}
      </div>

      {saveError && (
        <p className="text-[10px] text-red-700 bg-red-100 border border-red-200 rounded-lg px-2.5 py-2 leading-relaxed">
          {saveError}
        </p>
      )}

      <button
        type="button" onClick={() => void save()} disabled={saving}
        className="w-full py-2 rounded-lg bg-amber-100 border border-amber-200 text-amber-700 hover:bg-amber-200 disabled:opacity-40 disabled:cursor-not-allowed font-semibold text-[11px] cursor-pointer transition-colors mt-0.5 flex items-center justify-center gap-1.5"
      >
        {saving && <RefreshCw size={10} className="animate-spin" />}
        {saving ? 'Saving…' : 'Save Channel'}
      </button>
    </div>
  )
}

// ── Add Channel Dialog ─────────────────────────────────────────────────────────

type OAuthPlatformId = 'youtube' | 'facebook' | 'instagram' | 'twitter'

const OAUTH_PLATFORMS: Array<{ id: OAuthPlatformId; label: string; border: string; iconBg: string }> = [
  { id: 'youtube',   label: 'YouTube',     border: 'border-red-500/20 hover:border-red-500/40 hover:bg-red-50',        iconBg: 'bg-red-100' },
  { id: 'facebook',  label: 'Facebook',    border: 'border-[#1877f2]/20 hover:border-[#1877f2]/40 hover:bg-[#1877f2]/10', iconBg: 'bg-[#1877f2]/10' },
  { id: 'instagram', label: 'Instagram',   border: 'border-pink-500/20 hover:border-pink-500/40 hover:bg-pink-50',    iconBg: 'bg-pink-100' },
  { id: 'twitter',   label: 'X / Twitter', border: 'border-primary-border hover:border-active-accent/40 hover:bg-surface-2',              iconBg: 'bg-surface-2' },
]

interface AddChannelDialogProps {
  open: boolean
  onClose: () => void
  onConnected: () => void
}

function AddChannelDialog({ open, onClose, onConnected }: AddChannelDialogProps) {
  const { cid, addLog } = useStudioCtx()
  const userId = getStorage<string>('pcr_user_id') ?? ''
  const [step, setStep] = useState<'pick' | 'rtmp'>('pick')
  const [busy, setBusy] = useState<OAuthPlatformId | null>(null)
  const [connectError, setConnectError] = useState<string | null>(null)

  function fail(platform: string, e: unknown) {
    const msg = (e as Error).message ?? 'An unexpected error occurred.'
    addLog(`${platform}: ${msg}`, 'err')
    setConnectError(msg)
  }

  const connectYt = useCallback(() => {
    setConnectError(null)
    const popup = openAuthPopup(buildYtLoginUrl())
    if (!popup) { fail('YouTube', new Error('Popup blocked — please allow popups for this site.')); return }
    setBusy('youtube')
    attachPopupListener(popup, async (params) => {
      try {
        const code = params.get('code')
        if (!code || params.get('state') !== 'youtube') throw new Error('Invalid YouTube callback params')
        const tokens = await ytExchangeCode(code)
        const channel = await ytGetChannel(tokens.access_token)
        const nowTs = Math.floor(Date.now() / 1000)
        await ytStoreChannel({
          ytChannelId: channel.id, channelName: channel.title, userName: channel.customUrl,
          logo: channel.logo, description: channel.description,
          accessToken: tokens.access_token, refreshToken: tokens.refresh_token,
          privacy: '', remarks: '',
          cid: Number(cid), userId: Number(userId), createdBy: Number(userId), modifiedBy: Number(userId),
          createdDate: nowTs, modifiedDate: nowTs,
        })
        socialStore.setYt({
          ytChannelId: channel.id, channelName: channel.title, logo: channel.logo,
          userName: channel.customUrl, accessToken: tokens.access_token, refreshToken: tokens.refresh_token,
        })
        addLog(`YouTube: connected — ${channel.title}`, 'info')
        onConnected(); onClose()
      } catch (e) { fail('YouTube', e) }
      finally { setBusy(null) }
    }, () => setBusy(null))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cid, userId, addLog, onConnected, onClose])

  const connectFb = useCallback(() => {
    setConnectError(null)
    const popup = openAuthPopup(buildFbLoginUrl())
    if (!popup) { fail('Facebook', new Error('Popup blocked — please allow popups for this site.')); return }
    setBusy('facebook')
    attachPopupListener(popup, async (params) => {
      try {
        const shortToken = params.get('access_token')
        if (!shortToken) throw new Error('No access_token in Facebook callback')
        const longToken = await fbExchangeLongToken(shortToken)
        const profile = await fbGetProfile(longToken)
        const rawPages = await igGetPagesWithBusiness(longToken)
        const resolvedPages: FbPage[] = []
        for (const p of rawPages) {
          const pageToken = await fbGetPageToken(p.id, longToken)
          await fbStorePage({
            UserId: profile.id, UserName: profile.name, AccountToken: longToken,
            PageId: p.id, PageTitle: p.name, PageToken: pageToken,
            Chid: Number(cid), Uid: Number(userId),
            IgId: '', IgUserName: '', IgProfilePictureUrl: '', IgName: '',
            PageProfiePictureUrl: p.picture?.data?.url ?? '',
          })
          resolvedPages.push({ pageId: p.id, pageTitle: p.name, pageToken, pictureUrl: p.picture?.data?.url ?? '', streaming: false })
        }
        socialStore.setFb({ userId: profile.id, userName: profile.name, accountToken: longToken, pages: resolvedPages })
        addLog(`Facebook: connected as ${profile.name} — ${resolvedPages.length} page(s)`, 'info')
        onConnected(); onClose()
      } catch (e) { fail('Facebook', e) }
      finally { setBusy(null) }
    }, () => setBusy(null))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cid, userId, addLog, onConnected, onClose])

  const connectIg = useCallback(() => {
    setConnectError(null)
    const popup = openAuthPopup(buildIgLoginUrl())
    if (!popup) { fail('Instagram', new Error('Popup blocked — please allow popups for this site.')); return }
    setBusy('instagram')
    attachPopupListener(popup, async (params) => {
      try {
        const shortToken = params.get('access_token')
        if (!shortToken || params.get('state') !== 'instagram') throw new Error('Invalid Instagram callback params')
        const longToken = await fbExchangeLongToken(shortToken)
        const profile = await fbGetProfile(longToken)
        const allPages = await igGetPagesWithBusiness(longToken)
        const igPages = allPages.filter(p => p.instagram_business_account?.id)
        if (igPages.length === 0) throw new Error('No Instagram Business Account is linked to this Facebook account. Please link one at business.facebook.com.')
        let connected = 0
        for (const p of igPages) {
          const pageToken = await fbGetPageToken(p.id, longToken)
          const igData = await igGetAccountDetails(pageToken, p.instagram_business_account!.id)
          await fbStorePage({
            UserId: profile.id, UserName: profile.name, AccountToken: longToken,
            PageId: p.id, PageTitle: p.name, PageToken: pageToken,
            Chid: Number(cid), Uid: Number(userId),
            IgId: igData.id, IgUserName: igData.username,
            IgProfilePictureUrl: igData.profile_picture_url, IgName: igData.name,
            PageProfiePictureUrl: p.picture?.data?.url ?? '',
          })
          connected++
        }
        addLog(`Instagram: connected ${connected} account(s)`, 'info')
        onConnected(); onClose()
      } catch (e) { fail('Instagram', e) }
      finally { setBusy(null) }
    }, () => setBusy(null))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cid, userId, addLog, onConnected, onClose])

  const connectTw = useCallback(async () => {
    setConnectError(null)
    setBusy('twitter')
    try {
      const { url, verifier } = await buildTwLoginUrl()
      sessionStorage.setItem('twitter_pkce_verifier', verifier)
      const popup = openAuthPopup(url)
      if (!popup) { fail('Twitter', new Error('Popup blocked — please allow popups for this site.')); setBusy(null); return }
      attachPopupListener(popup, async (params) => {
        try {
          const code = params.get('code')
          if (!code || params.get('state') !== 'twitter') throw new Error('Invalid Twitter callback params')
          const tokens = await twExchangeCode(code, sessionStorage.getItem('twitter_pkce_verifier') ?? '')
          const profile = await twGetProfile(tokens.access_token)
          await twStoreAccount({
            userId: profile.id, userName: profile.username, twitterName: profile.name,
            userPictureUrl: profile.profile_image_url,
            accessToken: tokens.access_token, refreshToken: tokens.refresh_token,
            chid: Number(cid), uid: Number(userId),
          })
          socialStore.setTw({
            userId: profile.id, userName: profile.username, twitterName: profile.name,
            userPictureUrl: profile.profile_image_url,
            accessToken: tokens.access_token, refreshToken: tokens.refresh_token,
          })
          addLog(`Twitter: connected as @${profile.username}`, 'info')
          onConnected(); onClose()
        } catch (e) { fail('Twitter', e) }
        finally { setBusy(null) }
      }, () => setBusy(null))
    } catch (e) { fail('Twitter', e); setBusy(null) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cid, userId, addLog, onConnected, onClose])

  function handleOAuth(id: OAuthPlatformId) {
    if (id === 'youtube') connectYt()
    else if (id === 'facebook') connectFb()
    else if (id === 'instagram') connectIg()
    else void connectTw()
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-xs bg-surface border border-primary-border rounded-2xl shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 px-4 py-3 border-b border-primary-border">
          {step === 'rtmp' && (
            <button type="button" onClick={() => { setStep('pick'); setConnectError(null) }} className="text-secondary-text hover:text-primary-text cursor-pointer transition-colors shrink-0">
              <ChevronLeft size={14} />
            </button>
          )}
          <h3 className="text-[12px] font-semibold text-primary-text flex-1">
            {step === 'rtmp' ? 'RTMP / Custom Channel' : 'Add Channel'}
          </h3>
          <button type="button" onClick={onClose} className="text-secondary-text hover:text-primary-text cursor-pointer transition-colors">
            <X size={14} />
          </button>
        </div>

        {connectError && (
          <div className="mx-3 mt-3 px-3 py-2.5 rounded-lg bg-red-100 border border-red-200 text-[11px] text-red-700 leading-relaxed">
            {connectError}
          </div>
        )}

        {step === 'pick' ? (
          <div className="p-3 flex flex-col gap-2">
            {/* OAuth platforms 2x2 grid */}
            <div className="grid grid-cols-2 gap-2">
              {OAUTH_PLATFORMS.map(p => (
                <button
                  key={p.id}
                  type="button"
                  disabled={busy !== null}
                  onClick={() => handleOAuth(p.id)}
                  className={cn(
                    'flex flex-col items-center gap-2.5 py-4 rounded-xl border cursor-pointer transition-all disabled:opacity-50 disabled:cursor-not-allowed',
                    p.border,
                  )}
                >
                  <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center', p.iconBg)}>
                    {p.id === 'youtube'   && <YtIcon size={20} />}
                    {p.id === 'facebook'  && <FbIcon size={20} />}
                    {p.id === 'instagram' && <IgIcon size={20} />}
                    {p.id === 'twitter'   && <XIcon size={16} />}
                  </div>
                  <span className="text-[10px] font-semibold text-secondary-text">
                    {busy === p.id ? 'Connecting…' : p.label}
                  </span>
                </button>
              ))}
            </div>
            {/* RTMP full-width */}
            <button
              type="button"
              disabled={busy !== null}
              onClick={() => { setConnectError(null); setStep('rtmp') }}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-amber-200 hover:border-amber-400 hover:bg-amber-50 cursor-pointer transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
                <Radio size={18} className="text-amber-600" />
              </div>
              <div className="text-left">
                <p className="text-[11px] font-semibold text-primary-text">RTMP / Custom</p>
                <p className="text-[9px] text-secondary-text">Generic RTMP, Amazon Live, Bilibili & more</p>
              </div>
            </button>
          </div>
        ) : (
          <RtmpForm onSaved={() => { onConnected(); onClose() }} />
        )}
      </div>
    </div>
  )
}

// ── Facebook page card ─────────────────────────────────────────────────────────

interface FbPageCardProps {
  page: FbPage
  health?: ChannelHealth
  selectMode?: boolean
  selected?: boolean
  selectDisabled?: boolean
  onSelect?: () => void
  onGoLive: (title: string, desc: string) => Promise<void>
  onReconnect: () => void
  onMetaChange?: (title: string, desc: string) => void
  goLiveDisabled?: boolean
  initialTitle?: string
  initialDesc?: string
}

function FbPageCard({ page, health, selectMode, selected, selectDisabled, onSelect, onGoLive, onReconnect, onMetaChange, goLiveDisabled, initialTitle = '', initialDesc = '' }: FbPageCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [title, setTitle] = useState(initialTitle)
  const [desc, setDesc] = useState(initialDesc)

  return (
    <div className={cn('rounded-lg border overflow-hidden transition-colors',
      selected && selectMode ? 'border-active-accent' : page.streaming ? 'border-active-accent/30 bg-active-accent/5' : 'border-primary-border bg-surface',
    )}>
      <button
        type="button"
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center gap-2 px-2.5 py-2 cursor-pointer hover:bg-surface-2 transition-colors"
      >
        {selectMode && (
          <span
            onClick={e => { e.stopPropagation(); if (!selectDisabled) onSelect?.() }}
            className={selectDisabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}
          >
            <SelectBox selected={!!selected} disabled={selectDisabled} />
          </span>
        )}
        <ChannelAvatar
          src={page.pictureUrl}
          fallback={<div className="w-full h-full bg-[#1877f2]/20 flex items-center justify-center"><FbIcon size={12} /></div>}
        />
        <div className="flex-1 min-w-0 text-left">
          <p title={page.pageTitle} className="text-[11px] text-primary-text font-semibold truncate">{page.pageTitle}</p>
          <p className="text-[9px] text-secondary-text">Facebook Page</p>
        </div>
        {page.streaming
          ? <span className="text-[8px] font-bold text-active-accent animate-pulse shrink-0 mr-1">● LIVE</span>
          : <HealthDot health={health} />
        }
        {health === 'expired' && !page.streaming && <ReconnectBtn onReconnect={onReconnect} />}
        {expanded ? <ChevronUp size={9} className="text-secondary-text shrink-0" /> : <ChevronDown size={9} className="text-secondary-text shrink-0" />}
      </button>
      {expanded && !page.streaming && (
        <div className="px-2.5 pb-2.5 border-t border-primary-border flex flex-col gap-1.5 pt-2">
          {health === 'ineligible' ? (
            <p className="text-[10px] text-orange-700 bg-orange-100 border border-orange-200 rounded-lg px-2.5 py-2 leading-relaxed">
              This page is not eligible to go live. You may need more followers or additional permissions.
            </p>
          ) : (
            <>
              <input value={title} onChange={e => { setTitle(e.target.value); onMetaChange?.(e.target.value, desc) }} placeholder="Stream title *" className={inputCls} />
              <input value={desc} onChange={e => { setDesc(e.target.value); onMetaChange?.(title, e.target.value) }} placeholder="Description" className={inputCls} />
              <button
                type="button" onClick={() => onGoLive(title, desc)} disabled={goLiveDisabled || !title.trim()}
                className="w-full py-1.5 rounded-lg bg-emerald-100 text-emerald-700 hover:bg-emerald-200 disabled:opacity-30 disabled:cursor-not-allowed text-[10px] font-bold cursor-pointer transition-colors flex items-center justify-center gap-1"
              >
                <Play size={9} /> Go Live
              </button>
            </>
          )}
          {page.streamUrl && <p className="text-[9px] text-secondary-text break-all leading-relaxed">{page.streamUrl}</p>}
        </div>
      )}
    </div>
  )
}

// ── YouTube channel card ───────────────────────────────────────────────────────

function YtChannelCard({ account, health, streaming, streams, suspended, selectMode, selected, selectDisabled, onSelect, onGoLive, onReconnect, onRefreshStreams, onMetaChange, onStreamChange, goLiveDisabled, initialTitle = '', initialDesc = '' }: {
  account: YtAccount; health?: ChannelHealth; streaming?: boolean; streams?: YtStream[]; suspended?: boolean
  selectMode?: boolean; selected?: boolean; selectDisabled?: boolean; onSelect?: () => void
  onGoLive: (title: string, desc: string, streamId?: string) => void
  onReconnect: () => void
  onRefreshStreams: () => Promise<void>
  onMetaChange?: (title: string, desc: string) => void
  onStreamChange?: (streamId: string) => void
  goLiveDisabled?: boolean
  initialTitle?: string; initialDesc?: string
}) {
  const { addLog } = useStudioCtx()
  const [busy, setBusy] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [title, setTitle] = useState(initialTitle)
  const [desc, setDesc] = useState(initialDesc)
  const [selectedStreamId, setSelectedStreamId] = useState<string>('')
  const [streamBoundBroadcasts, setStreamBoundBroadcasts] = useState<Array<{ id: string; title: string; lifeCycleStatus: string }>>([])

  // Reset selection if the previously-selected stream was removed from the list (e.g. after going live)
  useEffect(() => {
    if (selectedStreamId && streams && !streams.some(s => s.id === selectedStreamId)) {
      setSelectedStreamId('')
      setStreamBoundBroadcasts([])
    }
  }, [streams, selectedStreamId])

  // Default to first available stream when streams load
  const effectiveStreamId = selectedStreamId || streams?.[0]?.id || ''

  const handleStreamChange = useCallback(async (streamId: string) => {
    setSelectedStreamId(streamId)
    onStreamChange?.(streamId)
    setStreamBoundBroadcasts([])
    try {
      const boundBroadcasts = await ytGetBoundBroadcasts(account.accessToken, streamId)
      setStreamBoundBroadcasts(boundBroadcasts)
    } catch {
      // best-effort — don't block the user if this check fails
    }
  }, [account.accessToken, onStreamChange])

  const handleRefresh = useCallback(async () => {
    setBusy(true)
    try {
      await onRefreshStreams()
      addLog('YouTube: streams refreshed', 'info')
    } catch (e) { addLog(`YouTube: ${(e as Error).message}`, 'err') }
    finally { setBusy(false) }
  }, [onRefreshStreams, addLog])

  return (
    <div className={cn('rounded-lg border bg-surface overflow-hidden transition-colors', selected && selectMode ? 'border-active-accent' : 'border-primary-border')}>
      <button
        type="button"
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center gap-2 px-2.5 py-2 cursor-pointer hover:bg-surface-2 transition-colors"
      >
        {selectMode && (
          <span
            onClick={e => { e.stopPropagation(); if (!selectDisabled) onSelect?.() }}
            className={selectDisabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}
          >
            <SelectBox selected={!!selected} disabled={selectDisabled} />
          </span>
        )}
        <ChannelAvatar
          src={account.logo}
          fallback={<div className="w-full h-full bg-red-600/15 flex items-center justify-center"><YtIcon size={14} /></div>}
        />
        <div className="flex-1 min-w-0 text-left">
          <p title={account.channelName} className="text-[11px] text-primary-text font-semibold truncate">{account.channelName}</p>
          <p title={account.userName} className="text-[9px] text-secondary-text truncate">{account.userName}</p>
        </div>
        {streaming && (
          <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-100 border border-emerald-300 text-[9px] text-emerald-700 font-bold shrink-0">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" /> LIVE
          </span>
        )}
        <HealthDot health={health} />
        {health === 'expired' && <ReconnectBtn onReconnect={onReconnect} />}
        {expanded ? <ChevronUp size={9} className="text-secondary-text shrink-0" /> : <ChevronDown size={9} className="text-secondary-text shrink-0" />}
      </button>
      {suspended && (
        <div id={`studio-social-yt-suspended-banner-${account.ytChannelId}`} className="px-2.5 py-1.5 bg-red-100 border-t border-red-200 flex items-center gap-1.5">
          <AlertCircle size={10} className="text-red-600 shrink-0" />
          <p className="text-[9px] text-red-800 leading-relaxed">
            This YouTube account is suspended. Please contact Google support.
          </p>
        </div>
      )}
      {expanded && (
        <div className="px-2.5 pb-2.5 border-t border-primary-border pt-2 flex flex-col gap-1.5">
          {streaming && (
            <p className="text-[9px] text-amber-800 bg-amber-100 border border-amber-200 rounded px-2 py-1.5 leading-relaxed">
              Already live — starting a new broadcast alongside the current stream.
            </p>
          )}
          {streams && streams.length > 0 ? (
            <>
              <div className="flex flex-col gap-0.5">
                <label className="text-[9px] text-secondary-text font-medium">Stream</label>
                <Select
                  value={effectiveStreamId}
                  onValueChange={handleStreamChange}
                  className="w-full"
                >
                  {streams.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.title}</SelectItem>
                  ))}
                </Select>
                {streamBoundBroadcasts.length > 0 && (
                  <div id={`studio-social-yt-stream-bound-warning-${effectiveStreamId}`} className="mt-1 flex items-start gap-1.5 rounded px-2 py-1.5 bg-amber-100 border border-amber-200">
                    <AlertCircle size={10} className="text-amber-600 shrink-0 mt-0.5" />
                    <p className="text-[9px] text-amber-800 leading-relaxed">
                      Stream key is already assigned to{' '}
                      <span className="font-semibold text-amber-900">
                        {streamBoundBroadcasts.map(b => `"${b.title}"`).join(', ')}
                      </span>. Going live will close {streamBoundBroadcasts.length === 1 ? 'that broadcast' : 'those broadcasts'} and reassign the stream key.
                    </p>
                  </div>
                )}
              </div>
              <input value={title} onChange={e => { setTitle(e.target.value); onMetaChange?.(e.target.value, desc) }} placeholder="Stream title *" className={inputCls} />
              <input value={desc} onChange={e => { setDesc(e.target.value); onMetaChange?.(title, e.target.value) }} placeholder="Description" className={inputCls} />
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => onGoLive(title, desc, effectiveStreamId || undefined)}
                  disabled={goLiveDisabled || busy || !title.trim() || health === 'expired'}
                  className="flex-1 py-1.5 rounded-lg bg-emerald-100 text-emerald-700 hover:bg-emerald-200 disabled:opacity-30 disabled:cursor-not-allowed text-[10px] font-bold cursor-pointer transition-colors flex items-center justify-center gap-1"
                >
                  <Play size={9} /> Go Live
                </button>
                <button
                  type="button" onClick={handleRefresh} disabled={busy}
                  title="Refresh streams"
                  className="flex items-center gap-1 px-2 py-1.5 text-[10px] text-secondary-text hover:text-primary-text cursor-pointer transition-colors disabled:opacity-40 rounded-lg border border-primary-border"
                >
                  <RefreshCw size={9} className={busy ? 'animate-spin' : ''} />
                </button>
              </div>
            </>
          ) : (
            <>
              {health !== 'expired' && (
                <p className="text-[9px] text-orange-800 bg-orange-100 border border-orange-200 rounded px-2 py-1.5 leading-relaxed">
                  No available streams — create one in YouTube Studio first.
                </p>
              )}
              <button
                type="button" onClick={handleRefresh} disabled={busy}
                title="Refresh streams"
                className="flex items-center justify-center gap-1.5 w-full py-1.5 text-[10px] text-secondary-text hover:text-primary-text cursor-pointer transition-colors disabled:opacity-40 rounded-lg border border-primary-border hover:bg-surface-2"
              >
                <RefreshCw size={9} className={busy ? 'animate-spin' : ''} />
                Refresh streams
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}

// ── Twitter channel card ───────────────────────────────────────────────────────

function TwChannelCard({ account, health, selectMode, selected, selectDisabled, onSelect, onGoLive, onReconnect, onMetaChange, goLiveDisabled, initialTitle = '', initialDesc = '' }: {
  account: TwAccount; health?: ChannelHealth
  selectMode?: boolean; selected?: boolean; selectDisabled?: boolean; onSelect?: () => void
  onGoLive: (title: string, desc: string) => Promise<void>
  onReconnect: () => void
  onMetaChange?: (title: string, desc: string) => void
  goLiveDisabled?: boolean
  initialTitle?: string; initialDesc?: string
}) {
  const [expanded, setExpanded] = useState(false)
  const [title, setTitle] = useState(initialTitle)
  const [desc, setDesc] = useState(initialDesc)
  const [busy, setBusy] = useState(false)

  return (
    <div className={cn('rounded-lg border bg-surface overflow-hidden transition-colors', selected && selectMode ? 'border-active-accent' : 'border-primary-border')}>
      <button
        type="button"
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center gap-2 px-2.5 py-2 cursor-pointer hover:bg-surface-2 transition-colors"
      >
        {selectMode && (
          <span
            onClick={e => { e.stopPropagation(); if (!selectDisabled) onSelect?.() }}
            className={selectDisabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}
          >
            <SelectBox selected={!!selected} disabled={selectDisabled} />
          </span>
        )}
        <ChannelAvatar
          src={account.userPictureUrl}
          fallback={<div className="w-full h-full bg-surface-2 flex items-center justify-center"><XIcon size={12} /></div>}
        />
        <div className="flex-1 min-w-0 text-left">
          <p title={account.twitterName} className="text-[11px] text-primary-text font-semibold truncate">{account.twitterName}</p>
          <p title={`@${account.userName}`} className="text-[9px] text-secondary-text truncate">@{account.userName}</p>
        </div>
        <HealthDot health={health} />
        {health === 'expired' && <ReconnectBtn onReconnect={onReconnect} />}
        {expanded ? <ChevronUp size={9} className="text-secondary-text shrink-0" /> : <ChevronDown size={9} className="text-secondary-text shrink-0" />}
      </button>
      {expanded && (
        <div className="px-2.5 pb-2.5 border-t border-primary-border pt-2 flex flex-col gap-1.5">
          <input value={title} onChange={e => { setTitle(e.target.value); onMetaChange?.(e.target.value, desc) }} placeholder="Stream title *" className={inputCls} />
          <input value={desc} onChange={e => { setDesc(e.target.value); onMetaChange?.(title, e.target.value) }} placeholder="Description" className={inputCls} />
          <button
            type="button"
            onClick={async () => { setBusy(true); try { await onGoLive(title, desc) } finally { setBusy(false) } }}
            disabled={goLiveDisabled || busy || !title.trim() || health === 'expired'}
            className="flex-1 py-1.5 rounded-lg bg-emerald-100 text-emerald-700 hover:bg-emerald-200 disabled:opacity-30 disabled:cursor-not-allowed text-[10px] font-bold cursor-pointer transition-colors flex items-center justify-center gap-1"
          >
            {busy ? <RefreshCw size={9} className="animate-spin" /> : <Play size={9} />} Go Live
          </button>
        </div>
      )}
    </div>
  )
}

// ── Instagram channel card ─────────────────────────────────────────────────────

function IgChannelCard({ ch, health, selectMode, selected, selectDisabled, onSelect, onGoLive, onReconnect, onMetaChange, goLiveDisabled, initialTitle = '', initialDesc = '' }: {
  ch: SocialMediaMetadata; health?: ChannelHealth
  selectMode?: boolean; selected?: boolean; selectDisabled?: boolean; onSelect?: () => void
  onGoLive: (title: string, desc: string) => Promise<void>
  onReconnect: () => void
  onMetaChange?: (title: string, desc: string) => void
  goLiveDisabled?: boolean
  initialTitle?: string; initialDesc?: string
}) {
  const [expanded, setExpanded] = useState(false)
  const [title, setTitle] = useState(initialTitle)
  const [desc, setDesc] = useState(initialDesc)
  const [busy, setBusy] = useState(false)

  return (
    <div className={cn('rounded-lg border bg-pink-50 overflow-hidden transition-colors', selected && selectMode ? 'border-active-accent' : 'border-pink-200')}>
      <button
        type="button"
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center gap-2 px-2.5 py-2 cursor-pointer hover:bg-surface-2 transition-colors"
      >
        {selectMode && (
          <span
            onClick={e => { e.stopPropagation(); if (!selectDisabled) onSelect?.() }}
            className={selectDisabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}
          >
            <SelectBox selected={!!selected} disabled={selectDisabled} />
          </span>
        )}
        <ChannelAvatar
          src={ch.logo}
          fallback={<div className="w-full h-full bg-pink-100 flex items-center justify-center"><IgIcon size={12} /></div>}
        />
        <div className="flex-1 min-w-0 text-left">
          <p title={ch.title} className="text-[11px] text-primary-text font-semibold truncate">{ch.title}</p>
          <p title={`@${ch.accoutName}`} className="text-[9px] text-secondary-text truncate">@{ch.accoutName}</p>
        </div>
        <HealthDot health={health} />
        {health === 'expired' && <ReconnectBtn onReconnect={onReconnect} />}
        {expanded ? <ChevronUp size={9} className="text-secondary-text shrink-0" /> : <ChevronDown size={9} className="text-secondary-text shrink-0" />}
      </button>
      {expanded && (
        <div className="px-2.5 pb-2.5 border-t border-primary-border pt-2 flex flex-col gap-1.5">
          <input value={title} onChange={e => { setTitle(e.target.value); onMetaChange?.(e.target.value, desc) }} placeholder="Stream title *" className={inputCls} />
          <input value={desc} onChange={e => { setDesc(e.target.value); onMetaChange?.(title, e.target.value) }} placeholder="Description" className={inputCls} />
          <button
            type="button"
            onClick={async () => { setBusy(true); try { await onGoLive(title, desc) } finally { setBusy(false) } }}
            disabled={goLiveDisabled || busy || !title.trim() || health === 'expired'}
            className="flex-1 py-1.5 rounded-lg bg-emerald-100 text-emerald-700 hover:bg-emerald-200 disabled:opacity-30 disabled:cursor-not-allowed text-[10px] font-bold cursor-pointer transition-colors flex items-center justify-center gap-1"
          >
            {busy ? <RefreshCw size={9} className="animate-spin" /> : <Play size={9} />} Go Live
          </button>
        </div>
      )}
    </div>
  )
}

// ── RTMP / custom channel card ─────────────────────────────────────────────────

function RtmpChannelCard({ ch, selectMode, selected, onSelect, streaming, onGoLive, goLiveDisabled }: {
  ch: SocialMediaMetadata; selectMode?: boolean; selected?: boolean; onSelect?: () => void
  streaming: boolean; onGoLive: () => Promise<void>; goLiveDisabled?: boolean
}) {
  const platformLabel = RTMP_PLATFORM_OPTIONS.find(p => p.value === ch.platform)?.label ?? ch.platform
  const [expanded, setExpanded] = useState(false)
  const [busy, setBusy] = useState(false)
  const [isStreamKeyVisible, setIsStreamKeyVisible] = useState(false)

  return (
    <div className={cn('rounded-lg border overflow-hidden transition-colors',
      selected && selectMode ? 'border-active-accent' : streaming ? 'border-amber-400 bg-amber-50' : 'border-amber-200 bg-amber-50',
    )}>
      <button
        type="button"
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center gap-2 px-2.5 py-2 cursor-pointer hover:bg-surface-2 transition-colors"
      >
        {selectMode && (
          <span onClick={e => { e.stopPropagation(); onSelect?.() }} className="cursor-pointer">
            <SelectBox selected={!!selected} />
          </span>
        )}
        <div className="w-6 h-6 rounded-lg bg-amber-100 shrink-0 flex items-center justify-center">
          <Radio size={12} className="text-amber-400" />
        </div>
        <div className="flex-1 min-w-0 text-left">
          <p title={ch.title} className="text-[11px] text-primary-text font-semibold truncate">{ch.title}</p>
          <p className="text-[9px] text-secondary-text truncate">{platformLabel}</p>
        </div>
        {streaming
          ? <span className="text-[8px] font-bold text-active-accent animate-pulse shrink-0 mr-1">● LIVE</span>
          : <div title="RTMP — no token to verify" className="w-2 h-2 rounded-full bg-surface-2 shrink-0 cursor-help" />
        }
        {expanded ? <ChevronUp size={9} className="text-secondary-text shrink-0" /> : <ChevronDown size={9} className="text-secondary-text shrink-0" />}
      </button>
      {expanded && !streaming && (
        <div className="px-2.5 pb-2.5 border-t border-primary-border pt-2 flex flex-col gap-1.5">
          <div className="flex flex-col gap-0.5">
            <span className="text-[9px] text-secondary-text font-medium">RTMP URL</span>
            <p className="text-[10px] text-primary-text break-all leading-relaxed font-mono">{ch.accountId}</p>
          </div>
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center justify-between">
              <span className="text-[9px] text-secondary-text font-medium">Stream Key</span>
              <button
                id="rtmp-stream-key-toggle"
                type="button"
                onClick={() => setIsStreamKeyVisible(v => !v)}
                className="text-secondary-text hover:text-primary-text cursor-pointer transition-colors"
                title={isStreamKeyVisible ? 'Hide stream key' : 'Show stream key'}
              >
                {isStreamKeyVisible ? <EyeOff size={10} /> : <Eye size={10} />}
              </button>
            </div>
            <p className="text-[10px] text-secondary-text font-mono tracking-wider break-all">
              {isStreamKeyVisible ? ch.token : '•'.repeat(Math.min(ch.token.length, 24))}
            </p>
          </div>
          <button
            type="button"
            onClick={async () => { setBusy(true); try { await onGoLive() } finally { setBusy(false) } }}
            disabled={goLiveDisabled || busy}
            className="w-full py-1.5 rounded-lg bg-emerald-100 text-emerald-700 hover:bg-emerald-200 disabled:opacity-30 disabled:cursor-not-allowed text-[10px] font-bold cursor-pointer transition-colors flex items-center justify-center gap-1"
          >
            {busy ? <RefreshCw size={9} className="animate-spin" /> : <Play size={9} />} Go Live
          </button>
        </div>
      )}
    </div>
  )
}

// ── Batch Publish Dialog ───────────────────────────────────────────────────────

interface GoingLiveEntry {
  id: string
  platform: string
  name: string
  accessToken: string
  pageToken: string
  videoId: string
  status: 'pending' | 'live' | 'failed'
}

const PLATFORM_DOT: Record<string, string> = {
  youtube: 'bg-red-500',
  facebook: 'bg-blue-500',
  instagram: 'bg-pink-500',
  twitter: 'bg-black/40',
  rtmp: 'bg-purple-500',
  telegram: 'bg-sky-500',
}

const GOING_LIVE_MSGS = [
  'Sending stream to all platforms…',
  'Connecting your broadcast…',
  'Routing video signal…',
  'Waiting for streams to go live…',
  'Your audience is almost ready…',
  'Stream handshake in progress…',
  'Reaching out to the platforms…',
  'Almost there…',
  'Just a few more seconds…',
  'Syncing with the live endpoints…',
]

interface BatchPublishDialogProps {
  open: boolean
  onClose: () => void
  channelCount: number
  hasYouTube: boolean
  initialTitle: string
  initialDesc?: string
  busy: boolean
  goingLive?: { entries: GoingLiveEntry[]; message: string } | null
  staleBroadcastWarnings?: Array<{ channelTitle: string; broadcastTitles: string[] }>
  onBulkChange?: (title: string, desc: string) => void
  onSubmit: (data: { title: string; desc: string; visibility: string; forKids: boolean }) => void
}

function BatchPublishDialog({ open, onClose, channelCount, hasYouTube, initialTitle, initialDesc = '', busy, goingLive, staleBroadcastWarnings = [], onBulkChange, onSubmit }: BatchPublishDialogProps) {
  const [title, setTitle] = useState(initialTitle)
  const [desc, setDesc] = useState(initialDesc)
  const [visibility, setVisibility] = useState('public')
  const [forKids, setForKids] = useState(false)

  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTitle(initialTitle)
      setDesc(initialDesc)
      setVisibility('public')
      setForKids(false)
    }
  }, [open, initialTitle, initialDesc])

  if (!open) return null

  const isPolling = !!goingLive

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-sm bg-surface border border-primary-border rounded-2xl shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-primary-border">
          <div>
            <h3 className="text-[13px] font-semibold text-primary-text">
              {isPolling ? 'Going Live…' : 'Publish Live'}
            </h3>
            <p className="text-[10px] text-secondary-text mt-0.5">
              {isPolling ? goingLive.message : 'Choose your title, description and details'}
            </p>
          </div>
          {isPolling ? (
            <button
              id="studio-batch-dialog-btn-dismiss"
              type="button"
              onClick={onClose}
              title="Dismiss — publishing continues in the background"
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] text-secondary-text hover:text-primary-text border border-primary-border hover:bg-surface-2 cursor-pointer transition-colors"
            >
              <X size={10} /> Dismiss
            </button>
          ) : (
            <button
              id="studio-batch-dialog-btn-close"
              type="button"
              onClick={onClose}
              className="text-secondary-text hover:text-primary-text cursor-pointer transition-colors"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {isPolling ? (
          /* ── Going Live Status Screen ── */
          <div className="p-4 flex flex-col gap-3">
            {/* Animated broadcast wave */}
            <div className="flex items-center justify-center py-2">
              <div className="relative flex items-center justify-center">
                <span className="absolute w-12 h-12 rounded-full bg-active-accent/10 animate-ping" />
                <span className="absolute w-8 h-8 rounded-full bg-active-accent/15 animate-ping [animation-delay:0.3s]" />
                <Radio size={18} className="text-active-accent relative z-10" />
              </div>
            </div>

            {/* Per-platform status list */}
            <div className="flex flex-col gap-2">
              {goingLive.entries.map(entry => (
                <div key={entry.id} className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-surface-2 border border-primary-border">
                  <span className={cn(
                    'w-2 h-2 rounded-full shrink-0',
                    PLATFORM_DOT[entry.platform] ?? 'bg-surface-2',
                    entry.status === 'pending' && 'animate-pulse',
                  )} />
                  <span className="flex-1 text-[11px] text-primary-text truncate">{entry.name}</span>
                  {entry.status === 'pending' && (
                    <span className="flex items-center gap-1 text-[10px] text-amber-700">
                      <RefreshCw size={9} className="animate-spin" />
                      Connecting
                    </span>
                  )}
                  {entry.status === 'live' && (
                    <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-emerald-100 border border-emerald-300 text-[10px] text-emerald-700 font-semibold">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                      LIVE
                    </span>
                  )}
                  {entry.status === 'failed' && (
                    <span className="text-[10px] text-orange-700">Timed out</span>
                  )}
                </div>
              ))}
            </div>

            {/* Progress bar */}
            {(() => {
              const done = goingLive.entries.filter(e => e.status !== 'pending').length
              const pct = Math.round((done / goingLive.entries.length) * 100)
              return (
                <div className="space-y-1">
                  <div className="h-1 rounded-full bg-surface-2 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-linear-to-r from-active-accent to-emerald-500 transition-all duration-700"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-secondary-text text-center">{done} of {goingLive.entries.length} live</p>
                </div>
              )
            })()}
          </div>
        ) : (
          /* ── Form ── */
          <div className="p-4 flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] text-secondary-text font-medium">
                Title <span className="text-active-accent">*</span>
              </label>
              <input
                value={title}
                onChange={e => { setTitle(e.target.value); onBulkChange?.(e.target.value, desc) }}
                placeholder="Stream title"
                autoFocus
                className={inputCls}
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] text-secondary-text font-medium">Description</label>
              <textarea
                value={desc}
                onChange={e => { setDesc(e.target.value); onBulkChange?.(title, e.target.value) }}
                placeholder="Stream description"
                rows={3}
                className={cn(inputCls, 'resize-none')}
              />
            </div>

            {hasYouTube && (
              <div className="flex gap-3">
                <div className="flex flex-col gap-1 flex-1">
                  <label className="text-[10px] text-secondary-text font-medium">Visibility</label>
                  <Select value={visibility} onValueChange={setVisibility} className="w-full">
                    <SelectItem value="public">Public</SelectItem>
                    <SelectItem value="unlisted">Unlisted</SelectItem>
                    <SelectItem value="private">Private</SelectItem>
                  </Select>
                </div>
                <div className="flex flex-col gap-1 shrink-0">
                  <label className="text-[10px] text-secondary-text font-medium">For Kids</label>
                  <div className="flex items-center gap-3 h-7.5">
                    <label className="flex items-center gap-1.5 cursor-pointer text-[11px] text-secondary-text">
                      <input type="radio" name="batch-forkids" checked={forKids} onChange={() => setForKids(true)} className="accent-blue-500" />
                      Yes
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer text-[11px] text-secondary-text">
                      <input type="radio" name="batch-forkids" checked={!forKids} onChange={() => setForKids(false)} className="accent-blue-500" />
                      No
                    </label>
                  </div>
                </div>
              </div>
            )}

            {staleBroadcastWarnings.length > 0 && (
              <div id="studio-batch-dialog-stale-broadcast-warning" className="flex items-start gap-1.5 rounded-lg px-2.5 py-2 bg-amber-100 border border-amber-200">
                <AlertCircle size={11} className="text-amber-600 shrink-0 mt-0.5" />
                <div className="flex flex-col gap-0.5">
                  <p className="text-[10px] font-semibold text-amber-800">Stream key conflict detected</p>
                  {staleBroadcastWarnings.map(w => (
                    <p key={w.channelTitle} className="text-[9px] text-amber-700 leading-relaxed">
                      <span className="font-medium">{w.channelTitle}</span>: {w.broadcastTitles.map(t => `"${t}"`).join(', ')} will be closed to free the stream key.
                    </p>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2 rounded-lg border border-primary-border text-secondary-text hover:text-primary-text text-[11px] cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => onSubmit({ title, desc, visibility, forKids })}
                disabled={busy || !title.trim()}
                className="flex-1 py-2 rounded-lg bg-active-accent/15 border border-active-accent/25 text-active-accent hover:bg-active-accent/25 disabled:opacity-40 disabled:cursor-not-allowed font-bold text-[11px] cursor-pointer transition-colors flex items-center justify-center gap-1.5"
              >
                {busy ? <RefreshCw size={10} className="animate-spin" /> : <Radio size={10} />}
                {busy ? 'Starting…' : `Go Live — ${channelCount} channel${channelCount > 1 ? 's' : ''}`}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Main Panel ─────────────────────────────────────────────────────────────────

export function SocialPublishPanel() {
  const { cid, addLog } = useStudioCtx()
  const userId = getStorage<string>('pcr_user_id') ?? ''
  const user = getStorage<UserData>('pcr_user')
  const userName = user ? `${user.firstname} ${user.lastname}`.trim() || user.emailAddress : userId

  // Subscription quota checks
  const { isSubscribed, planLimits, billingPeriodEnd } = useSubscription()
  const meetingHours = useMeetingHoursUsage()

  const [collapsed, setCollapsed] = useState(() => getStorage<boolean>('studio_social_collapsed') ?? true)
  const [quotaModalOpen, setQuotaModalOpen] = useState(false)
  const [quotaModalReason, setQuotaModalReason] = useState<'no-subscription' | 'insufficient-hours' | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const hasLoadedChannelsRef = useRef(false)

  useEffect(() => { setStorage('studio_social_collapsed', collapsed) }, [collapsed])

  const [apiChannels, setApiChannels] = useState<SocialMediaMetadata[]>([])
  const [loading, setLoading] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)

  const [fbStreaming, setFbStreaming] = useState<Record<string, FbStreamState>>({})
  const [ytStreaming, setYtStreaming] = useState<Record<string, YtStreamState>>({})
  const [ytAvailableStreams, setYtAvailableStreams] = useState<Record<string, YtStream[]>>({})
  const [ytSelectedStreams, setYtSelectedStreams] = useState<Record<string, string>>({})
  const [ytSuspendedAccountIds, setYtSuspendedAccountIds] = useState<Set<string>>(new Set())
  const [rtmpStreaming, setRtmpStreaming] = useState<Record<string, boolean>>({})
  const [health, setHealth] = useState<Record<string, ChannelHealth>>({})
  // Overrides access tokens updated by silent refresh, keyed by accountId
  const [tokenOverrides, setTokenOverrides] = useState<Record<string, string>>({})

  // Poll live status for active FB and YT streams so the LIVE pill clears when a stream ends
  useEffect(() => {
    const hasActiveFbStreams = Object.values(fbStreaming).some(s => s.streaming)
    const hasActiveYtStreams = Object.values(ytStreaming).some(s => s.streaming)
    if (!hasActiveFbStreams && !hasActiveYtStreams) return

    const interval = setInterval(async () => {
      for (const [pageId, state] of Object.entries(fbStreaming)) {
        if (!state.streaming || !state.videoId) continue
        const ch = apiChannels.find(c => c.accountId === pageId)
        if (!ch) continue
        const pageToken = tokenOverrides[pageId] ?? ch.accessToken
        try {
          const status = await fbGetLiveVideoStatus(state.videoId, pageToken)
          if (status !== 'LIVE' && status !== 'LIVE_NOW') {
            setFbStreaming(prev => ({ ...prev, [pageId]: { ...prev[pageId], streaming: false } }))
          }
        } catch { /* ignore — keep showing LIVE if check fails */ }
      }

      for (const [channelId, state] of Object.entries(ytStreaming)) {
        if (!state.streaming || !state.videoId) continue
        const ch = apiChannels.find(c => c.accountId === channelId)
        if (!ch) continue
        const accessToken = tokenOverrides[channelId] ?? ch.accessToken
        try {
          const status = await ytGetBroadcastStatus(accessToken, state.videoId)
          if (status === 'complete' || status === 'revoked') {
            setYtStreaming(prev => ({ ...prev, [channelId]: { ...prev[channelId], streaming: false } }))
          }
        } catch { /* ignore — keep showing LIVE if check fails */ }
      }
    }, LIVE_STATUS_POLL_INTERVAL_MS)

    return () => clearInterval(interval)
  }, [fbStreaming, ytStreaming, apiChannels, tokenOverrides])

  const [suspendedToastOpen, setSuspendedToastOpen] = useState(false)
  const [suspendedToastDesc, setSuspendedToastDesc] = useState('')

  function markYtAccountSuspended(accountId: string, channelTitle: string) {
    setYtSuspendedAccountIds(prev => new Set(prev).add(accountId))
    setSuspendedToastDesc(`YouTube channel "${channelTitle}" has been suspended. Please contact Google support.`)
    setSuspendedToastOpen(true)
  }

  // Multi-select / batch publish
  const eventTitle = String(getStorage<unknown>('studio_event_title') ?? '')
  const eventDescription = String(getStorage<unknown>('studio_event_description') ?? '')

  const [selectMode, setSelectMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [batchDialogOpen, setBatchDialogOpen] = useState(false)
  const [batchBusy, setBatchBusy] = useState(false)
  const [batchStaleBroadcastWarnings, setBatchStaleBroadcastWarnings] = useState<Array<{ channelTitle: string; broadcastTitles: string[] }>>([])
  const [batchStaleCheckBusy, setBatchStaleCheckBusy] = useState(false)
  const [goingLiveEntries, setGoingLiveEntries] = useState<GoingLiveEntry[] | null>(null)
  const [goingLiveMsg, setGoingLiveMsg] = useState('')
  const [instanceAvailable, setInstanceAvailable] = useState<boolean | null>(null)
  const [instanceChecking, setInstanceChecking] = useState(false)

  // Single-channel YouTube go live via modal
  const [ytSingleTarget, setYtSingleTarget] = useState<{ ch: SocialMediaMetadata; streamId?: string } | null>(null)
  const [ytSingleDialogOpen, setYtSingleDialogOpen] = useState(false)
  const [ytSingleBusy, setYtSingleBusy] = useState(false)

  // Per-channel title/desc — keyed by accountId, initialised from event values
  const [channelMeta, setChannelMeta] = useState<Record<string, { title: string; desc: string }>>({})
  const [customisedChannelIds, setCustomisedChannelIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    setChannelMeta(prev => {
      const next = { ...prev }
      apiChannels.forEach(ch => {
        if (!next[ch.accountId]) next[ch.accountId] = { title: eventTitle, desc: eventDescription }
      })
      return next
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiChannels])

  function handleMetaChange(id: string, title: string, desc: string) {
    setChannelMeta(prev => ({ ...prev, [id]: { title, desc } }))
    setCustomisedChannelIds(prev => { const next = new Set(prev); next.add(id); return next })
  }

  function handleBulkMetaChange(title: string, desc: string) {
    setChannelMeta(prev => {
      const next = { ...prev }
      selectedIds.forEach(id => {
        if (!customisedChannelIds.has(id)) next[id] = { title, desc }
      })
      return next
    })
  }

  function toggleSelect(id: string) {
    if (health[id] === 'ineligible') return
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  // Remove any selected channels that become ineligible after health checks complete
  useEffect(() => {
    setSelectedIds(prev => {
      const filtered = new Set([...prev].filter(id => health[id] !== 'ineligible'))
      return filtered.size === prev.size ? prev : filtered
    })
  }, [health])

  function exitSelectMode() {
    setSelectMode(false)
    setSelectedIds(new Set())
    setBatchDialogOpen(false)
  }

  const runHealthChecks = useCallback(async (channels: SocialMediaMetadata[]) => {
    const checkable = channels.filter(ch => SOCIAL_PLATFORMS.has(ch.platform))
    if (checkable.length === 0) return

    setHealth(prev => {
      const next = { ...prev }
      checkable.forEach(ch => { next[ch.accountId] = 'checking' })
      return next
    })

    await Promise.all(checkable.map(async (ch) => {
      try {
        if (ch.platform === 'facebook') {
          const tokenOk = await checkFbTokenHealth(ch.accountId, ch.accessToken)
          if (!tokenOk) { setHealth(prev => ({ ...prev, [ch.accountId]: 'expired' })); return }
          const eligible = await checkFbPageLiveEligibility(ch.accountId, ch.accessToken)
          setHealth(prev => ({ ...prev, [ch.accountId]: eligible ? 'ok' : 'ineligible' }))
          if (!eligible) addLog(`Facebook page "${ch.title}" is not eligible for live streaming (needs 100+ followers)`, 'warn')
          try {
            const activeLiveVideos = await fbGetActiveLiveVideos(ch.accountId, ch.accessToken)
            if (activeLiveVideos.length > 0) {
              setFbStreaming(prev => ({ ...prev, [ch.accountId]: { streaming: true, videoId: activeLiveVideos[0].id } }))
            }
          } catch { /* best-effort — don't fail health check if live status fetch fails */ }

        } else if (ch.platform === 'instagram') {
          const ok = await checkFbTokenHealth(ch.accountId, ch.accessToken)
          setHealth(prev => ({ ...prev, [ch.accountId]: ok ? 'ok' : 'expired' }))

        } else if (ch.platform === 'youtube') {
          const ok = await checkYtTokenHealth(ch.accessToken)
          if (ok) {
            try {
              const [streams, activeBroadcasts] = await Promise.all([
                ytGetLiveStreams(ch.accessToken),
                ytGetActiveBroadcasts(ch.accessToken),
              ])
              const available = streams.filter(s => s.status === 'inactive' || s.status === 'ready')
              setYtAvailableStreams(prev => ({ ...prev, [ch.accountId]: available }))
              setHealth(prev => ({ ...prev, [ch.accountId]: available.length > 0 ? 'ok' : 'ineligible' }))
              if (available.length === 0) addLog(`YouTube "${ch.title}": no available streams — create one in YouTube Studio`, 'warn')
              if (activeBroadcasts.length > 0) {
                setYtStreaming(prev => ({ ...prev, [ch.accountId]: { streaming: true, videoId: activeBroadcasts[0].id } }))
              }
            } catch (e) {
              const msg = (e as Error).message ?? ''
              if (msg.includes('suspended')) markYtAccountSuspended(ch.accountId, ch.title)
              addLog(`YouTube "${ch.title}": ${msg}`, 'err')
              setHealth(prev => ({ ...prev, [ch.accountId]: 'ok' }))
            }
          } else {
            setHealth(prev => ({ ...prev, [ch.accountId]: 'refreshing' }))
            try {
              const newToken = await ytRefreshAndUpdate(ch, cid, userId)
              setTokenOverrides(prev => ({ ...prev, [ch.accountId]: newToken }))
              addLog('YouTube: access token silently refreshed', 'info')
              try {
                const [streams, activeBroadcasts] = await Promise.all([
                  ytGetLiveStreams(newToken),
                  ytGetActiveBroadcasts(newToken),
                ])
                const available = streams.filter(s => s.status === 'inactive' || s.status === 'ready')
                setYtAvailableStreams(prev => ({ ...prev, [ch.accountId]: available }))
                setHealth(prev => ({ ...prev, [ch.accountId]: available.length > 0 ? 'ok' : 'ineligible' }))
                if (available.length === 0) addLog(`YouTube "${ch.title}": no available streams — create one in YouTube Studio`, 'warn')
                if (activeBroadcasts.length > 0) {
                  setYtStreaming(prev => ({ ...prev, [ch.accountId]: { streaming: true, videoId: activeBroadcasts[0].id } }))
                }
              } catch (e) {
                const msg = (e as Error).message ?? ''
                if (msg.includes('suspended')) markYtAccountSuspended(ch.accountId, ch.title)
                addLog(`YouTube "${ch.title}": ${msg}`, 'err')
                setHealth(prev => ({ ...prev, [ch.accountId]: 'ok' }))
              }
            } catch {
              setHealth(prev => ({ ...prev, [ch.accountId]: 'expired' }))
              addLog('YouTube: token expired — reconnect required', 'warn')
            }
          }

        } else if (ch.platform === 'twitter') {
          // Health check via backend proxy (CORS blocks direct Twitter API calls)
          let ok = false
          try { await twGetProfile(ch.accessToken); ok = true } catch { ok = false }
          if (ok) {
            setHealth(prev => ({ ...prev, [ch.accountId]: 'ok' }))
          } else {
            setHealth(prev => ({ ...prev, [ch.accountId]: 'refreshing' }))
            try {
              const newToken = await twRefreshAndUpdate(ch, cid, userId)
              setTokenOverrides(prev => ({ ...prev, [ch.accountId]: newToken }))
              setHealth(prev => ({ ...prev, [ch.accountId]: 'ok' }))
              addLog('Twitter: access token silently refreshed', 'info')
            } catch {
              setHealth(prev => ({ ...prev, [ch.accountId]: 'expired' }))
              addLog('Twitter: token expired — reconnect required', 'warn')
            }
          }
        }
      } catch {
        setHealth(prev => ({ ...prev, [ch.accountId]: 'expired' }))
      }
    }))
  }, [cid, userId, addLog])

  const loadChannels = useCallback(async () => {
    if (!cid || !userId) return
    setLoading(true)
    setFetchError(null)
    try {
      const channels = await fetchSocialMediaMetadata(cid, userId)
      setApiChannels(channels)
      setFbStreaming({})
      setYtStreaming({})
      setYtAvailableStreams({})
      setYtSuspendedAccountIds(new Set())
      setRtmpStreaming({})
      setTokenOverrides({})
      setHealth({})
      void runHealthChecks(channels)
    } catch (e) {
      setFetchError((e as Error).message)
      addLog(`Social: ${(e as Error).message}`, 'err')
    } finally {
      setLoading(false)
    }
  }, [cid, userId, addLog, runHealthChecks])

  useEffect(() => {
    if (!collapsed && !hasLoadedChannelsRef.current) {
      hasLoadedChannelsRef.current = true
      void loadChannels()
    }
  }, [collapsed, loadChannels])

  async function rtmpGoLivePage(ch: SocialMediaMetadata) {
    try {
      await publishLiveToMultiPlatform({
        ...buildBasePayload(),
        youTubeInfo: [], facebookInfo: [], twitterInfo: [], instagramInfo: [],
        rtmpInfo: [{ publishUrl: ch.accountId, streamKey: ch.token, outputMode: ch.platform }],
      })
      setRtmpStreaming(prev => ({ ...prev, [ch.accountId]: true }))
      addLog(`RTMP: live started — ${ch.title}`, 'info')
    } catch (e) { addLog(`RTMP: ${(e as Error).message}`, 'err') }
  }

  function buildBasePayload() {
    return {
      cid, userId, inputType: 'live' as const, inputUrl: '0' as const,
      logo: 0 as const, publishMode: 'rtmp' as const, userName,
      preRoll: 0 as const, postRoll: 0 as const,
      is_zixioutput: true as const, zixiInputId: 'pcr-master' as const, is_multiple: true as const,
      aspectRatio: '', videoResolution: '', videoBitRate: '',
      audioBitRate: '', fps: '', vCodec: '', aCodec: '', publishProfileName: '',
    }
  }

  const fetchInstanceStatus = useCallback(async () => {
    if (!cid) return
    setInstanceChecking(true)
    try {
      const free = await checkInstanceStatus(cid)
      setInstanceAvailable(free)
      if (!free) addLog('No streaming instances are currently free.', 'warn')
    } catch {
      setInstanceAvailable(false)
      addLog('Could not check instance status.', 'err')
    } finally {
      setInstanceChecking(false)
    }
  }, [cid, addLog])

  useEffect(() => { void fetchInstanceStatus() }, [fetchInstanceStatus])

  async function fbGoLivePage(page: FbPage, title: string, desc: string) {
    if (!title.trim()) { addLog('Facebook: stream title is required', 'warn'); return }
    try {
      const { id, secure_stream_url } = await fbGoLive(page, title, desc)
      const parts = secure_stream_url.split('/rtmp/')
      const ch = apiChannels.find(c => c.accountId === page.pageId)
      const eventThumbnailUrl = getStorage<string>('studio_event_thumbnail') ?? ''
      if (eventThumbnailUrl) {
        const thumbnailBinary = await fetchThumbnailBinary(eventThumbnailUrl)
        if (thumbnailBinary) await fbUploadThumbnail(page.pageToken, id, thumbnailBinary)
      }
      const fbInfo: FbLiveInfo = {
        title, description: desc, thumbnail: '',
        userAccessToken: ch?.token ?? page.pageToken,
        pageId: page.pageId, pageName: page.pageTitle, pageToken: page.pageToken,
        link: `https://www.facebook.com/watch/?v=${id}`,
        videoId: id, publishUrl: parts[0] + '/rtmp', streamKey: parts[1] ?? '',
      }
      await publishLiveToMultiPlatform({
        ...buildBasePayload(),
        facebookInfo: [fbInfo], youTubeInfo: [], twitterInfo: [], instagramInfo: [], rtmpInfo: [],
      })
      setFbStreaming(prev => ({ ...prev, [page.pageId]: { streaming: true, videoId: id, streamUrl: secure_stream_url } }))
      addLog(`Facebook: live started on "${page.pageTitle}"`, 'info')
    } catch (e) {
      if (e instanceof FbLiveEligibilityError) setHealth(prev => ({ ...prev, [page.pageId]: 'ineligible' }))
      addLog(`Facebook: ${(e as Error).message}`, 'err')
    }
  }

  async function ytGoLivePage(ch: SocialMediaMetadata, title: string, desc: string, streamId?: string, visibility = 'public', forKids = false) {
    if (!title.trim()) { addLog('YouTube: stream title is required', 'warn'); return }
    const accessToken = tokenOverrides[ch.accountId] ?? ch.accessToken
    try {
      // Always fetch fresh streams — cached streams may still list ones already active
      const allStreams = await ytGetLiveStreams(accessToken)
      const available = allStreams.filter(s => s.status === 'inactive' || s.status === 'ready')
      const stream = (streamId ? available.find(s => s.id === streamId) : undefined)
        ?? available.find(s => s.isDefaultStream)
        ?? available[0]
      if (!stream) { addLog('YouTube: no available streams (all active or none found)', 'warn'); return }
      // Clean up any stale broadcasts from previous sessions that are still bound to this stream
      const staleBroadcasts = await ytGetBoundBroadcasts(accessToken, stream.id)
      for (const staleBroadcast of staleBroadcasts) {
        const isStarted = staleBroadcast.lifeCycleStatus === 'live' || staleBroadcast.lifeCycleStatus === 'liveStarting'
          || staleBroadcast.lifeCycleStatus === 'testing' || staleBroadcast.lifeCycleStatus === 'testStarting'
        if (isStarted) {
          await ytEndBroadcast(accessToken, staleBroadcast.id)
        } else {
          await ytDeleteBroadcast(accessToken, staleBroadcast.id)
        }
        addLog(`YouTube: closed stale broadcast "${staleBroadcast.title}" to free stream key`, 'info')
      }
      const broadcast = await ytCreateBroadcast(accessToken, title, desc, visibility, forKids)
      await ytBindBroadcast(accessToken, broadcast.id, stream.id)
      const eventThumbnailUrl = getStorage<string>('studio_event_thumbnail') ?? ''
      const thumbnailUrl = eventThumbnailUrl || broadcast.thumbnailUrl
      const ytInfo: YtLiveInfo = {
        accessToken, refreshToken: ch.token,
        channelTitle: ch.title, channelId: ch.accountId, channelName: ch.accoutName,
        videoTitle: title, videoDescription: desc, videoPrivacyStatus: visibility, videoForKids: forKids,
        link: `https://www.youtube.com/watch?v=${broadcast.id}`,
        categoryId: '25', videoId: broadcast.id, videoThumbnailDefaultUrl: thumbnailUrl,
        tags: [], chatId: broadcast.liveChatId,
        publishUrl: stream.url, streamId: stream.id, streamKey: stream.key, streamTitle: stream.title,
        studioLink: `https://studio.youtube.com/video/${broadcast.id}/livestreaming`,
        videoShedularStarttime: new Date().toISOString(), thumbnailUrl: thumbnailUrl,
      }
      await publishLiveToMultiPlatform({
        ...buildBasePayload(),
        youTubeInfo: [ytInfo], facebookInfo: [], twitterInfo: [], instagramInfo: [], rtmpInfo: [],
      })
      // Remove used stream from cache so it no longer appears as available
      setYtAvailableStreams(prev => ({
        ...prev,
        [ch.accountId]: (prev[ch.accountId] ?? []).filter(s => s.id !== stream.id),
      }))
      setYtStreaming(prev => ({ ...prev, [ch.accountId]: { streaming: true, videoId: broadcast.id } }))
      addLog(`YouTube: live started — ${ch.title}`, 'info')
    } catch (e) {
      const msg = (e as Error).message ?? ''
      if (msg.includes('suspended')) markYtAccountSuspended(ch.accountId, ch.title)
      addLog(`YouTube: ${msg}`, 'err')
    }
  }

  async function twGoLivePage(ch: SocialMediaMetadata, title: string, desc: string) {
    if (!title.trim()) { addLog('Twitter: stream title is required', 'warn'); return }
    try {
      await publishLiveToMultiPlatform({
        ...buildBasePayload(),
        twitterInfo: [{ title, description: desc, publishUrl: ch.accountId, streamKey: ch.token, outputMode: 'twitter' }],
        facebookInfo: [], youTubeInfo: [], instagramInfo: [], rtmpInfo: [],
      })
      addLog(`Twitter: live started — ${ch.title}`, 'info')
    } catch (e) { addLog(`Twitter: ${(e as Error).message}`, 'err') }
  }

  async function igGoLivePage(ch: SocialMediaMetadata, title: string, desc: string) {
    if (!title.trim()) { addLog('Instagram: stream title is required', 'warn'); return }
    try {
      await publishLiveToMultiPlatform({
        ...buildBasePayload(),
        instagramInfo: [{ title, description: desc, publishUrl: ch.accountId, streamKey: ch.token, outputMode: 'instagram' }],
        facebookInfo: [], youTubeInfo: [], twitterInfo: [], rtmpInfo: [],
      })
      addLog(`Instagram: live started — ${ch.title}`, 'info')
    } catch (e) { addLog(`Instagram: ${(e as Error).message}`, 'err') }
  }

  async function openBatchDialog() {
    setBatchStaleBroadcastWarnings([])
    setBatchStaleCheckBusy(true)
    try {
      const selectedYtChannels = visible.filter(ch => ch.platform === 'youtube' && selectedIds.has(ch.accountId))
      const warnings: Array<{ channelTitle: string; broadcastTitles: string[] }> = []
      await Promise.all(selectedYtChannels.map(async ch => {
        const accessToken = tokenOverrides[ch.accountId] ?? ch.accessToken
        const streams = await ytGetLiveStreams(accessToken)
        const preferredStreamId = ytSelectedStreams[ch.accountId]
        const stream = (preferredStreamId ? streams.find(s => s.id === preferredStreamId && (s.status === 'inactive' || s.status === 'ready')) : undefined)
          ?? streams.find(s => s.isDefaultStream && (s.status === 'inactive' || s.status === 'ready'))
          ?? streams.find(s => s.status === 'inactive' || s.status === 'ready')
        if (!stream) return
        const staleBroadcasts = await ytGetBoundBroadcasts(accessToken, stream.id)
        if (staleBroadcasts.length > 0) {
          warnings.push({ channelTitle: ch.title, broadcastTitles: staleBroadcasts.map(b => b.title) })
        }
      }))
      setBatchStaleBroadcastWarnings(warnings)
    } catch {
      // best-effort — proceed without warnings if check fails
    } finally {
      setBatchStaleCheckBusy(false)
    }
    setBatchDialogOpen(true)
  }

  async function batchGoLive({ title, desc, visibility, forKids }: { title: string; desc: string; visibility: string; forKids: boolean }) {
    if (!title.trim()) return

    // Check subscription
    if (!isSubscribed) {
      setQuotaModalReason('no-subscription')
      setQuotaModalOpen(true)
      addLog('Studio publish blocked: no active subscription', 'warn')
      return
    }

    // Check meeting hours quota
    if (meetingHours.isAtLimit) {
      setQuotaModalReason('insufficient-hours')
      setQuotaModalOpen(true)
      addLog('Studio publish blocked: meeting hours limit reached', 'warn')
      return
    }

    if (meetingHours.hoursUsed > 0 && meetingHours.hoursUsed >= meetingHours.limit * 0.9) {
      addLog(`Warning: ${Math.round((meetingHours.limit - meetingHours.hoursUsed) * 10) / 10} meeting hours remaining`, 'warn')
    }

    setBatchBusy(true)
    try {
      const batchEventThumbnailUrl = getStorage<string>('studio_event_thumbnail') ?? ''
      const batchThumbnailBinary = batchEventThumbnailUrl ? await fetchThumbnailBinary(batchEventThumbnailUrl) : null

      const selected = visible.filter(ch => {
        const selectionId = !SOCIAL_PLATFORMS.has(ch.platform) ? `${ch.accountId}::${ch.token}` : ch.accountId
        return selectedIds.has(selectionId)
      })
      const facebookInfo: FbLiveInfo[] = []
      const youTubeInfo: YtLiveInfo[] = []
      const twitterInfo: RtmpLiveInfo[] = []
      const instagramInfo: RtmpLiveInfo[] = []
      const rtmpInfo: RtmpLiveInfo[] = []

      await Promise.all(selected.map(async ch => {
        const accessToken = tokenOverrides[ch.accountId] ?? ch.accessToken
        if (ch.platform === 'facebook') {
          const { title: chTitle, desc: chDesc } = channelMeta[ch.accountId] ?? { title, desc }
          const page: FbPage = { pageId: ch.accountId, pageTitle: ch.title, pageToken: accessToken, pictureUrl: ch.logo, streaming: false }
          try {
            const { id, secure_stream_url } = await fbGoLive(page, chTitle, chDesc)
            const parts = secure_stream_url.split('/rtmp/')
            if (batchThumbnailBinary) await fbUploadThumbnail(accessToken, id, batchThumbnailBinary)
            facebookInfo.push({
              title: chTitle, description: chDesc, thumbnail: '',
              userAccessToken: ch.token, pageId: ch.accountId, pageName: ch.title, pageToken: accessToken,
              link: `https://www.facebook.com/watch/?v=${id}`,
              videoId: id, publishUrl: parts[0] + '/rtmp', streamKey: parts[1] ?? '',
            })
            setFbStreaming(prev => ({ ...prev, [ch.accountId]: { streaming: true, videoId: id, streamUrl: secure_stream_url } }))
          } catch (e) {
            if (e instanceof FbLiveEligibilityError) setHealth(prev => ({ ...prev, [ch.accountId]: 'ineligible' }))
            addLog(`Facebook "${ch.title}": ${(e as Error).message}`, 'err')
          }
        } else if (ch.platform === 'youtube') {
          const { title: chTitle, desc: chDesc } = channelMeta[ch.accountId] ?? { title, desc }
          try {
            const streams = await ytGetLiveStreams(accessToken)
            const preferredStreamId = ytSelectedStreams[ch.accountId]
            const stream = (preferredStreamId ? streams.find(s => s.id === preferredStreamId && (s.status === 'inactive' || s.status === 'ready')) : undefined)
              ?? streams.find(s => s.isDefaultStream && (s.status === 'inactive' || s.status === 'ready'))
              ?? streams.find(s => s.status === 'inactive' || s.status === 'ready')
            if (!stream) { addLog(`YouTube "${ch.title}": no available streams`, 'warn'); return }
            const staleBroadcasts = await ytGetBoundBroadcasts(accessToken, stream.id)
            for (const staleBroadcast of staleBroadcasts) {
              const isStarted = staleBroadcast.lifeCycleStatus === 'live' || staleBroadcast.lifeCycleStatus === 'liveStarting'
                || staleBroadcast.lifeCycleStatus === 'testing' || staleBroadcast.lifeCycleStatus === 'testStarting'
              if (isStarted) {
                await ytEndBroadcast(accessToken, staleBroadcast.id)
              } else {
                await ytDeleteBroadcast(accessToken, staleBroadcast.id)
              }
              addLog(`YouTube "${ch.title}": closed stale broadcast "${staleBroadcast.title}" to free stream key`, 'info')
            }
            const broadcast = await ytCreateBroadcast(accessToken, chTitle, chDesc, visibility, forKids)
            await ytBindBroadcast(accessToken, broadcast.id, stream.id)
            const batchThumbnailUrl = batchEventThumbnailUrl || broadcast.thumbnailUrl
            youTubeInfo.push({
              accessToken, refreshToken: ch.token,
              channelTitle: ch.title, channelId: ch.accountId, channelName: ch.accoutName,
              videoTitle: chTitle, videoDescription: chDesc, videoPrivacyStatus: visibility, videoForKids: forKids,
              link: `https://www.youtube.com/watch?v=${broadcast.id}`,
              categoryId: '25', videoId: broadcast.id, videoThumbnailDefaultUrl: batchThumbnailUrl,
              tags: [], chatId: broadcast.liveChatId,
              publishUrl: stream.url, streamId: stream.id, streamKey: stream.key, streamTitle: stream.title,
              studioLink: `https://studio.youtube.com/video/${broadcast.id}/livestreaming`,
              videoShedularStarttime: new Date().toISOString(), thumbnailUrl: batchThumbnailUrl,
            })
            // Remove used stream from cache so it no longer appears as available
            setYtAvailableStreams(prev => ({
              ...prev,
              [ch.accountId]: (prev[ch.accountId] ?? []).filter(s => s.id !== stream.id),
            }))
            setYtStreaming(prev => ({ ...prev, [ch.accountId]: { streaming: true, videoId: broadcast.id } }))
          } catch (e) {
            const msg = (e as Error).message ?? ''
            if (msg.includes('suspended')) markYtAccountSuspended(ch.accountId, ch.title)
            addLog(`YouTube "${ch.title}": ${msg}`, 'err')
          }
        } else if (ch.platform === 'twitter') {
          const { title: chTitle, desc: chDesc } = channelMeta[ch.accountId] ?? { title, desc }
          twitterInfo.push({ title: chTitle, description: chDesc, publishUrl: ch.accountId, streamKey: ch.token, outputMode: 'twitter' })
        } else if (ch.platform === 'instagram') {
          const { title: chTitle, desc: chDesc } = channelMeta[ch.accountId] ?? { title, desc }
          instagramInfo.push({ title: chTitle, description: chDesc, publishUrl: ch.accountId, streamKey: ch.token, outputMode: 'instagram' })
        } else if (!SOCIAL_PLATFORMS.has(ch.platform)) {
          rtmpInfo.push({ publishUrl: ch.accountId, streamKey: ch.token, outputMode: ch.platform })
        }
      }))

      const total = facebookInfo.length + youTubeInfo.length + twitterInfo.length + instagramInfo.length + rtmpInfo.length
      if (total > 0) {
        await publishLiveToMultiPlatform({
          ...buildBasePayload(),
          youTubeInfo, facebookInfo, twitterInfo, instagramInfo, rtmpInfo,
        })
        addLog(`Publishing live to ${total} platform${total > 1 ? 's' : ''}`, 'info')

        // ── Poll platforms for live confirmation ───────────────────────────────
        // Deselect channels but keep dialog open until all streams confirm live
        setSelectMode(false)
        setSelectedIds(new Set())

        const pollList: GoingLiveEntry[] = [
          ...youTubeInfo.map(y => ({ id: y.channelId, platform: 'youtube', name: y.channelTitle, accessToken: y.accessToken, pageToken: '', videoId: y.videoId, status: 'pending' as const })),
          ...facebookInfo.map(f => ({ id: f.pageId, platform: 'facebook', name: f.pageName, accessToken: f.pageToken, pageToken: f.pageToken, videoId: f.videoId, status: 'pending' as const })),
          ...twitterInfo.map(t => ({ id: `tw::${t.publishUrl}`, platform: 'twitter', name: 'X / Twitter', accessToken: '', pageToken: '', videoId: '', status: 'pending' as const })),
          ...instagramInfo.map(i => ({ id: `ig::${i.publishUrl}`, platform: 'instagram', name: 'Instagram', accessToken: '', pageToken: '', videoId: '', status: 'pending' as const })),
          ...rtmpInfo.map(r => ({ id: `rtmp::${r.publishUrl}::${r.streamKey}`, platform: 'rtmp', name: selected.find(c => c.accountId === r.publishUrl)?.title ?? 'RTMP', accessToken: '', pageToken: '', videoId: '', status: 'pending' as const })),
        ]
        setGoingLiveEntries(pollList)

        // Rotate engaging messages while polling
        let msgIdx = 0
        setGoingLiveMsg(GOING_LIVE_MSGS[0])
        const msgInterval = setInterval(() => {
          msgIdx = (msgIdx + 1) % GOING_LIVE_MSGS.length
          setGoingLiveMsg(GOING_LIVE_MSGS[msgIdx])
        }, 3000)

        // Platforms without a live-status API auto-confirm after 15s
        const autoConfirmIds = new Set([
          ...twitterInfo.map(t => `tw::${t.publishUrl}`),
          ...instagramInfo.map(i => `ig::${i.publishUrl}`),
          ...rtmpInfo.map(r => `rtmp::${r.publishUrl}::${r.streamKey}`),
        ])
        const MAX_WAIT = 90_000
        const POLL_INTERVAL = 5_000
        const AUTO_CONFIRM_DELAY = 15_000
        const startTime = Date.now()
        const liveSet = new Set<string>()

        while (liveSet.size < pollList.length && Date.now() - startTime < MAX_WAIT) {
          await new Promise<void>(r => setTimeout(r, POLL_INTERVAL))
          const elapsed = Date.now() - startTime

          // Auto-confirm non-pollable platforms after delay
          if (elapsed >= AUTO_CONFIRM_DELAY) {
            for (const id of autoConfirmIds) {
              if (!liveSet.has(id)) {
                liveSet.add(id)
                setGoingLiveEntries(prev => prev?.map(x => x.id === id ? { ...x, status: 'live' } : x) ?? null)
              }
            }
          }

          // Poll YouTube — transition ready/testing directly to live
          for (const y of youTubeInfo) {
            if (liveSet.has(y.channelId)) continue
            try {
              const status = await ytGetBroadcastStatus(y.accessToken, y.videoId)
              if (status === 'live' || status === 'liveStarting') {
                liveSet.add(y.channelId)
                setGoingLiveEntries(prev => prev?.map(x => x.id === y.channelId ? { ...x, status: 'live' } : x) ?? null)
              } else if (status === 'ready' || status === 'testing' || status === 'testStarting') {
                try { await ytTransitionToLive(y.accessToken, y.videoId) } catch (e) {
                  if (!(e instanceof YtInvalidTransitionError)) throw e
                  // Not ready to go live yet — will retry on next poll cycle
                }
              }
            } catch { /* ignore transient poll errors */ }
          }

          // Poll Facebook — mark live when status is LIVE
          for (const f of facebookInfo) {
            if (liveSet.has(f.pageId)) continue
            try {
              const status = await fbGetLiveVideoStatus(f.videoId, f.pageToken)
              if (status === 'LIVE' || status === 'LIVE_NOW') {
                liveSet.add(f.pageId)
                setGoingLiveEntries(prev => prev?.map(x => x.id === f.pageId ? { ...x, status: 'live' } : x) ?? null)
              }
            } catch { /* ignore */ }
          }
        }

        clearInterval(msgInterval)

        // Mark any remaining entries as timed out
        setGoingLiveEntries(prev => prev?.map(x => liveSet.has(x.id) ? x : { ...x, status: 'failed' }) ?? null)

        // Let user see the final confirmed state before closing
        await new Promise<void>(r => setTimeout(r, 2000))
        setGoingLiveEntries(null)
        setBatchDialogOpen(false)
        return
      }
      exitSelectMode()
    } finally {
      setBatchBusy(false)
    }
  }

  const visible = apiChannels
  const hasYtSelected = visible.some(ch => ch.platform === 'youtube' && selectedIds.has(ch.accountId))

  return (
    <>
      <div className={cn('mx-2 mb-2 mt-1 flex flex-col bg-surface-2 border border-primary-border rounded-xl overflow-hidden', collapsed ? 'shrink-0' : 'flex-1 min-h-0')}>
        <div className="shrink-0 flex items-center px-3 py-2.5 gap-2">
          <button
            type="button"
            onClick={() => setCollapsed(v => !v)}
            className="flex-1 flex items-center gap-2 cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <h4 className="text-[10px] text-secondary-text font-semibold uppercase tracking-wider">Social Publishing</h4>
              {visible.length > 0 && (
                <span className="text-[9px] font-bold text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 rounded-full px-1.5 py-0.5 leading-none">
                  {visible.length}
                </span>
              )}
            </div>
            {collapsed ? <ChevronDown size={12} className="text-secondary-text ml-auto" /> : <ChevronUp size={12} className="text-secondary-text ml-auto" />}
          </button>
          <div className="flex items-center gap-1 shrink-0">
            <Link
              to="/publish?tab=ongoing"
              target="_blank"
              rel="noopener noreferrer"
              title="Ongoing publishes"
              onClick={e => e.stopPropagation()}
              className="flex items-center gap-1 px-1.5 py-1 rounded-md text-secondary-text hover:text-emerald-600 hover:bg-emerald-50 transition-colors cursor-pointer"
            >
              <Wifi size={10} />
            </Link>
            <Link
              to="/publish?tab=history"
              target="_blank"
              rel="noopener noreferrer"
              title="Publish history"
              onClick={e => e.stopPropagation()}
              className="flex items-center gap-1 px-1.5 py-1 rounded-md text-secondary-text hover:text-primary-text hover:bg-surface-2 transition-colors cursor-pointer"
            >
              <History size={10} />
            </Link>
          </div>
        </div>

        {!collapsed && (
          <div className="flex-1 min-h-0 flex flex-col overflow-hidden border-t border-primary-border">
            <div className="flex-1 min-h-0 overflow-y-auto px-3 pt-2.5 pb-2 space-y-1.5">
            {loading && (
              <div className="flex items-center justify-center gap-1.5 py-4 text-[10px] text-secondary-text/60">
                <RefreshCw size={11} className="animate-spin" /> Loading channels…
              </div>
            )}
            {fetchError && !loading && (
              <p className="text-center text-[10px] text-red-400/70 py-2">{fetchError}</p>
            )}
            {!loading && !fetchError && visible.length === 0 && (
              <p className="text-center text-[10px] text-secondary-text py-3">No channels connected yet.</p>
            )}

            {!loading && visible.map(ch => {
              const chHealth = health[ch.accountId]
              const accessToken = tokenOverrides[ch.accountId] ?? ch.accessToken
              const isIneligible = chHealth === 'ineligible'
              const selectionId = !SOCIAL_PLATFORMS.has(ch.platform) ? `${ch.accountId}::${ch.token}` : ch.accountId
              const isSelected = selectedIds.has(selectionId)

              // Platform limit gating: disable if at limit and not selected
              const isAtPlatformLimit = planLimits && selectedIds.size >= planLimits.maxPlatforms
              const selectDisabled: boolean = isIneligible || !!(isAtPlatformLimit && !isSelected)

              const sel = { selectMode, selected: isSelected, selectDisabled, onSelect: () => toggleSelect(selectionId) }
              const goLiveDisabled = instanceAvailable !== true

              if (ch.platform === 'facebook') {
                const s = fbStreaming[ch.accountId]
                const page: FbPage = {
                  pageId: ch.accountId, pageTitle: ch.title, pageToken: accessToken,
                  pictureUrl: ch.logo, streaming: s?.streaming ?? false,
                  videoId: s?.videoId, streamUrl: s?.streamUrl,
                }
                return (
                  <FbPageCard
                    key={`fb_${ch.accountId}`} page={page} health={chHealth} {...sel}
                    onGoLive={(title, desc) => fbGoLivePage(page, title, desc)}
                    onReconnect={() => setDialogOpen(true)}
                    onMetaChange={(t, d) => handleMetaChange(ch.accountId, t, d)}
                    goLiveDisabled={goLiveDisabled}
                    initialTitle={channelMeta[ch.accountId]?.title ?? eventTitle}
                    initialDesc={channelMeta[ch.accountId]?.desc ?? eventDescription}
                  />
                )
              }
              if (ch.platform === 'youtube') {
                const acc: YtAccount = {
                  ytChannelId: ch.accountId, channelName: ch.title, logo: ch.logo,
                  userName: ch.accoutName, accessToken, refreshToken: ch.token,
                }
                return (
                  <YtChannelCard
                    key={`yt_${ch.accountId}`} account={acc} health={chHealth} {...sel}
                    streaming={ytStreaming[ch.accountId]?.streaming}
                    streams={ytAvailableStreams[ch.accountId]}
                    suspended={ytSuspendedAccountIds.has(ch.accountId)}
                    onGoLive={(title, desc, streamId) => { handleMetaChange(ch.accountId, title, desc); setYtSingleTarget({ ch, streamId }); setYtSingleDialogOpen(true) }}
                    onStreamChange={streamId => setYtSelectedStreams(prev => ({ ...prev, [ch.accountId]: streamId }))}
                    onReconnect={() => setDialogOpen(true)}
                    onRefreshStreams={async () => {
                      const fresh = await ytGetLiveStreams(accessToken)
                      const available = fresh.filter(s => s.status === 'inactive' || s.status === 'ready')
                      setYtAvailableStreams(prev => ({ ...prev, [ch.accountId]: available }))
                      if (!available.length) setHealth(prev => ({ ...prev, [ch.accountId]: 'ineligible' }))
                      else if (health[ch.accountId] === 'ineligible') setHealth(prev => ({ ...prev, [ch.accountId]: 'ok' }))
                    }}
                    onMetaChange={(t, d) => handleMetaChange(ch.accountId, t, d)}
                    goLiveDisabled={goLiveDisabled}
                    initialTitle={channelMeta[ch.accountId]?.title ?? eventTitle}
                    initialDesc={channelMeta[ch.accountId]?.desc ?? eventDescription}
                  />
                )
              }
              if (ch.platform === 'twitter') {
                const acc: TwAccount = {
                  userId: ch.accountId, userName: ch.accoutName, twitterName: ch.title,
                  userPictureUrl: ch.logo, accessToken, refreshToken: ch.token,
                }
                return (
                  <TwChannelCard
                    key={`tw_${ch.accountId}`} account={acc} health={chHealth} {...sel}
                    onGoLive={(title, desc) => twGoLivePage(ch, title, desc)}
                    onReconnect={() => setDialogOpen(true)}
                    onMetaChange={(t, d) => handleMetaChange(ch.accountId, t, d)}
                    goLiveDisabled={goLiveDisabled}
                    initialTitle={channelMeta[ch.accountId]?.title ?? eventTitle}
                    initialDesc={channelMeta[ch.accountId]?.desc ?? eventDescription}
                  />
                )
              }
              if (ch.platform === 'instagram') {
                return (
                  <IgChannelCard
                    key={`ig_${ch.accountId}`} ch={{ ...ch, accessToken }} health={chHealth} {...sel}
                    onGoLive={(title, desc) => igGoLivePage(ch, title, desc)}
                    onReconnect={() => setDialogOpen(true)}
                    onMetaChange={(t, d) => handleMetaChange(ch.accountId, t, d)}
                    goLiveDisabled={goLiveDisabled}
                    initialTitle={channelMeta[ch.accountId]?.title ?? eventTitle}
                    initialDesc={channelMeta[ch.accountId]?.desc ?? eventDescription}
                  />
                )
              }
              return (
                <RtmpChannelCard
                  key={`rtmp_${ch.accountId}`} ch={ch} {...sel}
                  streaming={rtmpStreaming[ch.accountId] ?? false}
                  onGoLive={() => rtmpGoLivePage(ch)}
                  goLiveDisabled={goLiveDisabled}
                />
              )
            })}
            </div>

            <div className="shrink-0 px-3 pb-3 pt-1.5 flex flex-col gap-1.5 border-t border-primary-border">
            {/* Instance status banner */}
            {instanceAvailable === false && (
              <div className="flex items-center gap-2 px-2.5 py-2 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                <span className="text-amber-400 shrink-0 text-[11px]">⚠</span>
                <p className="text-[10px] text-amber-300 leading-relaxed flex-1">No streaming instances are available right now.</p>
                <button
                  type="button"
                  onClick={() => void fetchInstanceStatus()}
                  disabled={instanceChecking}
                  title="Retry"
                  className="flex items-center gap-1 px-1.5 py-1 rounded text-amber-400 hover:text-amber-200 hover:bg-amber-400/10 cursor-pointer transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                >
                  <RefreshCw size={9} className={instanceChecking ? 'animate-spin' : ''} />
                </button>
              </div>
            )}
            {instanceAvailable === null && (
              <div className="flex items-center gap-2 px-2.5 py-1.5 text-[10px] text-secondary-text/60">
                <RefreshCw size={9} className="animate-spin shrink-0" /> Checking instance availability…
              </div>
            )}
            {/* Batch action bar */}
            {selectMode && selectedIds.size > 0 && (
              <div className="flex items-center justify-between mt-0.5 px-2 py-1.5 bg-surface rounded-lg border border-primary-border">
                <p className="text-[9px] text-secondary-text">{selectedIds.size} channel{selectedIds.size > 1 ? 's' : ''} selected</p>
                <button
                  type="button"
                  onClick={() => void openBatchDialog()}
                  disabled={batchBusy || batchStaleCheckBusy}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#3031cb]/15 border border-[#3031cb]/25 text-[#3031cb] hover:bg-[#3031cb]/25 disabled:opacity-40 disabled:cursor-not-allowed font-bold text-[10px] cursor-pointer transition-colors"
                >
                  {(batchBusy || batchStaleCheckBusy) ? <RefreshCw size={9} className="animate-spin" /> : <Radio size={9} />}
                  {batchBusy ? 'Starting…' : batchStaleCheckBusy ? 'Checking…' : 'Go Live'}
                </button>
              </div>
            )}

            <div className="flex gap-1.5 mt-1">
              {selectMode ? (
                <button
                  type="button"
                  onClick={exitSelectMode}
                  className="flex-1 py-2 rounded-lg border border-[#3031cb]/30 bg-[#3031cb]/8 text-[#3031cb] text-[11px] cursor-pointer transition-colors flex items-center justify-center gap-1.5"
                >
                  <X size={11} /> Cancel Selection
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => setDialogOpen(true)}
                    className="flex-1 py-2 rounded-lg border border-dashed border-primary-border text-secondary-text hover:text-primary-text hover:bg-surface-2 text-[11px] cursor-pointer transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Plus size={11} /> Add Channel
                  </button>
                  {visible.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setSelectMode(true)}
                      title="Select multiple channels to go live at once"
                      className="px-3 py-2 rounded-lg border border-dashed border-primary-border text-secondary-text hover:text-primary-text hover:bg-surface-2 cursor-pointer transition-colors"
                    >
                      <CheckSquare size={11} />
                    </button>
                  )}
                </>
              )}
              <button
                type="button"
                onClick={() => void loadChannels()}
                disabled={loading}
                title="Refresh channels"
                className="px-3 py-2 rounded-lg border border-dashed border-primary-border text-secondary-text hover:text-primary-text hover:bg-surface-2 cursor-pointer transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <RefreshCw size={11} className={loading ? 'animate-spin' : ''} />
              </button>
            </div>
            </div>
          </div>
        )}
      </div>

      <AddChannelDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onConnected={() => void loadChannels()}
      />

      <BatchPublishDialog
        open={batchDialogOpen}
        onClose={() => setBatchDialogOpen(false)}
        channelCount={selectedIds.size}
        hasYouTube={hasYtSelected}
        initialTitle={eventTitle}
        initialDesc={eventDescription}
        busy={batchBusy}
        goingLive={goingLiveEntries ? { entries: goingLiveEntries, message: goingLiveMsg } : null}
        staleBroadcastWarnings={batchStaleBroadcastWarnings}
        onBulkChange={(t, d) => handleBulkMetaChange(t, d)}
        onSubmit={data => void batchGoLive(data)}
      />

      <BatchPublishDialog
        open={ytSingleDialogOpen}
        onClose={() => setYtSingleDialogOpen(false)}
        channelCount={1}
        hasYouTube={true}
        initialTitle={channelMeta[ytSingleTarget?.ch.accountId ?? '']?.title ?? eventTitle}
        initialDesc={channelMeta[ytSingleTarget?.ch.accountId ?? '']?.desc ?? eventDescription}
        busy={ytSingleBusy}
        onSubmit={({ title, desc, visibility, forKids }) => {
          if (!ytSingleTarget) return
          setYtSingleBusy(true)
          void ytGoLivePage(ytSingleTarget.ch, title, desc, ytSingleTarget.streamId, visibility, forKids)
            .finally(() => { setYtSingleBusy(false); setYtSingleDialogOpen(false) })
        }}
      />

      <Toaster
        id="studio-social-yt-suspended-toast"
        open={suspendedToastOpen}
        onOpenChange={setSuspendedToastOpen}
        title="YouTube Account Suspended"
        description={suspendedToastDesc}
        variant="error"
      />

      <UpgradeModal
        id="studio-go-live-quota-modal"
        open={quotaModalOpen}
        onOpenChange={setQuotaModalOpen}
        featureType={quotaModalReason === 'no-subscription' ? 'no-subscription' : 'meeting-hours'}
        customTitle={quotaModalReason === 'no-subscription' ? 'Subscription Required' : undefined}
        customSubtitle={quotaModalReason === 'no-subscription' ? 'You need an active subscription to go live and publish to platforms.' : undefined}
        used={quotaModalReason === 'no-subscription' ? undefined : meetingHours.hoursUsed}
        limit={quotaModalReason === 'no-subscription' ? undefined : meetingHours.limit}
        unit={quotaModalReason === 'no-subscription' ? undefined : 'hours'}
        resetDate={quotaModalReason === 'no-subscription' ? undefined : billingPeriodEnd?.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })}
      />
    </>
  )
}
