import { useState, useEffect, useCallback, useRef } from 'react'
import * as RadixDialog from '@radix-ui/react-dialog'
import { X, RefreshCw, Plus, ChevronLeft, Check, Loader2, AlertCircle, Edit2 } from 'lucide-react'
import { cn } from '../../lib/utils'
import { getStorage } from '../../lib/storage'
import { useSubscription } from '../../features/subscription/useSubscription'
import { usePublishUsage } from '../../features/subscription/usePublishUsage'
import { UpgradeModal } from '../../components/ui/UpgradeModal'
import {
  fetchRollProfiles,
  storeRtmpChannel,
  buildYtLoginUrl,
  ytExchangeCode,
  ytGetChannel,
  ytStoreChannel,
  buildFbLoginUrl,
  fbExchangeLongToken,
  fbGetPages,
  fbStorePage,
  fbGoLive,
  buildIgLoginUrl,
  igGetPagesWithBusiness,
  igGetAccountDetails,
  buildTwLoginUrl,
  twExchangeCode,
  twGetProfile,
  twStoreAccount,
  openAuthPopup,
  attachPopupListener,
  ytCreateBroadcast,
  ytBindBroadcast,
  publishVodToSocialPlatforms,
  publishVodAsLive,
  checkYtTokenHealth,
  ytRefreshAndUpdate,
  ytGetLiveStreams,
  checkFbTokenHealth,
  checkFbPageLiveEligibility,
  twRefreshAndUpdate,
  type YtVodInfo,
  type FbVodInfo,
  type IgVodInfo,
  type TwVodInfo,
  type YtLiveInfo,
  type FbLiveInfo,
  type RtmpLiveInfo,
  type RollProfile,
} from '../../lib/socialAuthService'
import { useSocialChannels } from './useSocialChannels'
import type {
  PublishType,
  ModalStep,
  EnrichedSocialChannel,
  PublishFormState,
  NewRtmpChannelForm,
  PrePostRollKey,
  PrivacyOption,
} from '../../types/mediaPublish'
import type { Asset } from '../../types/asset'
import { Select, SelectItem } from '../../components/ui/Select'

// ── Constants ──────────────────────────────────────────────────────────────────

const YT_CATEGORIES = [
  { id: 1, label: 'Film & Animation' }, { id: 2, label: 'Autos & Vehicles' },
  { id: 10, label: 'Music' }, { id: 15, label: 'Pets & Animals' },
  { id: 17, label: 'Sports' }, { id: 22, label: 'People & Blogs' },
  { id: 23, label: 'Comedy' }, { id: 24, label: 'Entertainment' },
  { id: 25, label: 'News & Politics' }, { id: 26, label: 'How-to & Style' },
  { id: 27, label: 'Education' }, { id: 28, label: 'Science & Technology' },
]

const LIVE_RTMP_PLATFORMS = [
  { platform: 'rtmp', label: 'Custom RTMP' },
  { platform: 'twitter', label: 'Twitter / X' },
  { platform: 'breakers-tv', label: 'Breakers TV' },
  { platform: 'fc2-live', label: 'FC2 Live' },
  { platform: 'vaughn-live', label: 'Vaughn Live' },
  { platform: 'nimo-tv', label: 'Nimo TV' },
]

// Platforms that use OAuth tokens and require health checks; everything else is treated as a custom RTMP stream
const SOCIAL_PLATFORMS = new Set(['facebook', 'youtube', 'twitter', 'instagram'])

const PLATFORM_INITIALS: Record<string, string> = {
  youtube: 'YT', facebook: 'FB', instagram: 'IG', twitter: 'TW',
  rtmp: 'RT', 'breakers-tv': 'BT', 'fc2-live': 'FC2', 'vaughn-live': 'VL', 'nimo-tv': 'NM',
}

function getPlatformInitials(platform: string): string {
  return PLATFORM_INITIALS[platform] ?? platform.slice(0, 2).toUpperCase()
}

function getPlatformColorClass(platform: string): string {
  switch (platform) {
    case 'youtube': return 'bg-red-600/20 text-red-400 border-red-600/30'
    case 'facebook': return 'bg-blue-600/20 text-blue-400 border-blue-600/30'
    case 'instagram': return 'bg-purple-600/20 text-purple-400 border-purple-600/30'
    case 'twitter': return 'bg-sky-600/20 text-sky-400 border-sky-600/30'
    default: return 'bg-white/10 text-white/60 border-white/20'
  }
}

const fieldCls =
  'w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder-white/30 outline-none focus:border-[#3031cb]/40 focus:ring-1 focus:ring-[#3031cb]/20 transition-colors'
const labelCls = 'text-xs text-white/50 mb-1 block'

type ChannelHealth = 'checking' | 'ok' | 'refreshing' | 'expired' | 'ineligible'

const HEALTH_TITLE: Record<ChannelHealth, string> = {
  ok:         'Connected — token is valid',
  checking:   'Checking connection…',
  refreshing: 'Refreshing token…',
  expired:    'Token expired — reconnect required',
  ineligible: 'Not eligible for live streaming',
}

function ReconnectBtn({ onReconnect }: { onReconnect: () => void }) {
  return (
    <span
      role="button"
      tabIndex={0}
      onClick={e => { e.stopPropagation(); onReconnect() }}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); e.stopPropagation(); onReconnect() } }}
      className="shrink-0 cursor-pointer whitespace-nowrap rounded border border-[#3031cb]/40 px-2.5 py-1 text-xs font-semibold text-[#3031cb] transition-colors hover:bg-[#3031cb]/10"
    >
      Reconnect
    </span>
  )
}

function HealthDot({ health }: { health?: ChannelHealth }) {
  const title = health ? HEALTH_TITLE[health] : 'RTMP — no token to verify'
  if (health === 'ok')         return <div title={title} className="h-2 w-2 shrink-0 cursor-help rounded-full bg-emerald-400" />
  if (health === 'checking')   return <div title={title} className="h-2 w-2 shrink-0 animate-pulse cursor-help rounded-full bg-white/35" />
  if (health === 'refreshing') return <div title={title} className="h-2 w-2 shrink-0 animate-pulse cursor-help rounded-full bg-amber-400" />
  if (health === 'expired')    return <div title={title} className="h-2 w-2 shrink-0 cursor-help rounded-full bg-red-400" />
  if (health === 'ineligible') return <div title={title} className="h-2 w-2 shrink-0 cursor-help rounded-full bg-orange-400" />
  return <div title={title} className="h-2 w-2 shrink-0 cursor-help rounded-full bg-white/20" />
}

// ── Component ──────────────────────────────────────────────────────────────────

interface MediaPublishModalProps {
  asset: Asset
  publishType: PublishType
  onClose: () => void
}

export function MediaPublishModal({ asset, publishType, onClose }: MediaPublishModalProps) {
  const cid = getStorage<string>('pcr_channel_id') ?? ''
  const userId = getStorage<string>('pcr_user_id') ?? ''

  // Subscription quota checks
  const { isSubscribed, billingPeriodEnd } = useSubscription()
  const { uploads: uploadUsage, publishingHours } = usePublishUsage()

  const [quotaModalOpen, setQuotaModalOpen] = useState(false)
  const [quotaModalType, setQuotaModalType] = useState<'uploads' | 'publishing-hours'>('uploads')

  const [publishForm, setPublishForm] = useState<PublishFormState>({
    title: asset.displayname || asset.name,
    description: '',
    privacy: 'public',
    isForKids: false,
    preRollId: 0,
    postRollId: 0,
  })

  const [allRollProfiles, setAllRollProfiles] = useState<RollProfile[]>([])
  const [prePostKey, setPrePostKey] = useState<PrePostRollKey>('')
  const [filteredRolls, setFilteredRolls] = useState<RollProfile[]>([])

  const [modalStep, setModalStep] = useState<ModalStep>('EventSummary')

  const [channelBeingEdited, setChannelBeingEdited] = useState<EnrichedSocialChannel | null>(null)
  const [editedChannelIndex, setEditedChannelIndex] = useState(-1)

  const [newRtmpForm, setNewRtmpForm] = useState<NewRtmpChannelForm>({
    platform: 'rtmp', displayName: '', rtmpUrl: '', streamKey: '',
  })
  const [isAddingRtmpChannel, setIsAddingRtmpChannel] = useState(false)
  const [addRtmpError, setAddRtmpError] = useState('')

  const [igLiveForm, setIgLiveForm] = useState({ displayName: '', rtmpUrl: '', streamKey: '' })

  const [isAddingChannel, setIsAddingChannel] = useState(false)
  const [addChannelError, setAddChannelError] = useState('')

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  const { channels, setChannels, isLoadingChannels, loadChannelsError, loadChannels } = useSocialChannels()
  const [channelHealthMap, setChannelHealthMap] = useState<Record<string, ChannelHealth>>({})
  const healthChecksRanRef = useRef(false)

  useEffect(() => {
    loadChannels()
    if (publishType === 'vodToVod') {
      fetchRollProfiles(cid).then(setAllRollProfiles)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Reset health checks flag and map whenever channels start reloading
  const handlePrePostKeyChange = useCallback((key: PrePostRollKey) => {
    setPrePostKey(key)
    setPublishForm(prev => ({ ...prev, preRollId: 0, postRollId: 0 }))
    if (!key) { setFilteredRolls([]); return }
    setFilteredRolls(allRollProfiles.filter(r => {
      if (key === 'both') return r.preRollId !== 0 && r.postRollId !== 0
      if (key === 'pre') return r.preRollId !== 0 && r.postRollId === 0
      if (key === 'post') return r.postRollId !== 0 && r.preRollId === 0
      return false
    }))
  }, [allRollProfiles])

  const handleChannelToggle = useCallback((index: number) => {
    setChannels(prev => prev.map((ch, i) => i === index ? { ...ch, isSelected: !ch.isSelected } : ch))
  }, [setChannels])

  const handleEditOpen = useCallback((channel: EnrichedSocialChannel, index: number) => {
    setChannelBeingEdited({ ...channel, privacy: channel.privacy || publishForm.privacy })
    setEditedChannelIndex(index)
    setModalStep('EditChannel')
  }, [publishForm.privacy])

  const handleEditSave = useCallback(() => {
    if (!channelBeingEdited) return
    setChannels(prev => prev.map((ch, i) => i === editedChannelIndex ? channelBeingEdited : ch))
    setModalStep('AllChannels')
  }, [channelBeingEdited, editedChannelIndex, setChannels])

  const runHealthChecks = useCallback(async (loadedChannels: EnrichedSocialChannel[]) => {
    const checkable = loadedChannels.filter(ch => SOCIAL_PLATFORMS.has(ch.platform))
    if (checkable.length === 0) return

    setChannelHealthMap(prev => {
      const next = { ...prev }
      checkable.forEach(ch => { next[ch.accountId] = 'checking' })
      return next
    })

    await Promise.all(checkable.map(async (ch) => {
      try {
        if (ch.platform === 'youtube') {
          const isTokenHealthy = await checkYtTokenHealth(ch.accessToken)
          if (isTokenHealthy) {
            if (publishType === 'vodToLive') {
              const streams = await ytGetLiveStreams(ch.accessToken)
              const availableStream = streams.find(s => s.status !== 'active') ?? streams.find(s => s.isDefaultStream) ?? streams[0]
              setChannels(prev => prev.map(c => c.accountId === ch.accountId
                ? { ...c, streams, selectedStream: availableStream ?? null, disabledReason: streams.length === 0 ? 'No live streams found on this YouTube channel' : undefined }
                : c))
              setChannelHealthMap(prev => ({ ...prev, [ch.accountId]: streams.length > 0 ? 'ok' : 'ineligible' }))
            } else {
              setChannelHealthMap(prev => ({ ...prev, [ch.accountId]: 'ok' }))
            }
          } else {
            setChannelHealthMap(prev => ({ ...prev, [ch.accountId]: 'refreshing' }))
            try {
              const newToken = await ytRefreshAndUpdate(ch, cid, userId)
              setChannels(prev => prev.map(c => c.accountId === ch.accountId ? { ...c, accessToken: newToken, disabledReason: undefined } : c))
              if (publishType === 'vodToLive') {
                const streams = await ytGetLiveStreams(newToken)
                const availableStream = streams.find(s => s.status !== 'active') ?? streams.find(s => s.isDefaultStream) ?? streams[0]
                setChannels(prev => prev.map(c => c.accountId === ch.accountId
                  ? { ...c, streams, selectedStream: availableStream ?? null, disabledReason: streams.length === 0 ? 'No live streams found on this YouTube channel' : undefined }
                  : c))
                setChannelHealthMap(prev => ({ ...prev, [ch.accountId]: streams.length > 0 ? 'ok' : 'ineligible' }))
              } else {
                setChannelHealthMap(prev => ({ ...prev, [ch.accountId]: 'ok' }))
              }
            } catch {
              setChannelHealthMap(prev => ({ ...prev, [ch.accountId]: 'expired' }))
            }
          }
        } else if (ch.platform === 'facebook') {
          const isTokenHealthy = await checkFbTokenHealth(ch.accountId, ch.accessToken)
          if (!isTokenHealthy) {
            setChannelHealthMap(prev => ({ ...prev, [ch.accountId]: 'expired' }))
            setChannels(prev => prev.map(c => c.accountId === ch.accountId ? { ...c, disabledReason: 'Token expired — please reconnect' } : c))
            return
          }
          if (publishType === 'vodToLive') {
            const isEligible = await checkFbPageLiveEligibility(ch.accountId, ch.accessToken)
            setChannelHealthMap(prev => ({ ...prev, [ch.accountId]: isEligible ? 'ok' : 'ineligible' }))
            if (!isEligible) setChannels(prev => prev.map(c => c.accountId === ch.accountId ? { ...c, disabledReason: 'Page needs 100+ followers to go live' } : c))
          } else {
            setChannelHealthMap(prev => ({ ...prev, [ch.accountId]: 'ok' }))
          }
        } else if (ch.platform === 'instagram') {
          const isTokenHealthy = await checkFbTokenHealth(ch.accountId, ch.accessToken)
          setChannelHealthMap(prev => ({ ...prev, [ch.accountId]: isTokenHealthy ? 'ok' : 'expired' }))
          if (!isTokenHealthy) setChannels(prev => prev.map(c => c.accountId === ch.accountId ? { ...c, disabledReason: 'Token expired — please reconnect' } : c))
        } else if (ch.platform === 'twitter') {
          setChannelHealthMap(prev => ({ ...prev, [ch.accountId]: 'refreshing' }))
          try {
            const newToken = await twRefreshAndUpdate(ch, cid, userId)
            setChannels(prev => prev.map(c => c.accountId === ch.accountId ? { ...c, accessToken: newToken } : c))
            setChannelHealthMap(prev => ({ ...prev, [ch.accountId]: 'ok' }))
          } catch {
            // Show expired state but do NOT set disabledReason — keep row selectable
            // so the user can still click Reconnect without the row being grayed out
            setChannelHealthMap(prev => ({ ...prev, [ch.accountId]: 'expired' }))
          }
        }
      } catch {
        setChannelHealthMap(prev => ({ ...prev, [ch.accountId]: 'expired' }))
      }
    }))
  }, [cid, userId, publishType, setChannels])

  // Reset health checks flag and map whenever channels start reloading
  useEffect(() => {
    if (isLoadingChannels) {
      healthChecksRanRef.current = false
      setChannelHealthMap({})
    }
  }, [isLoadingChannels])

  // Run per-channel health checks once after channels finish loading
  useEffect(() => {
    if (!isLoadingChannels && channels.length > 0 && !healthChecksRanRef.current) {
      healthChecksRanRef.current = true
      void runHealthChecks(channels)
    }
  }, [isLoadingChannels, channels, runHealthChecks])

  const handleAddRtmpChannel = useCallback(async () => {
    if (!newRtmpForm.displayName || !newRtmpForm.rtmpUrl || !newRtmpForm.streamKey) return
    setIsAddingRtmpChannel(true)
    setAddRtmpError('')
    try {
      const success = await storeRtmpChannel({
        uid: userId, cid,
        displayName: newRtmpForm.displayName,
        rtmpUrl: newRtmpForm.rtmpUrl,
        streamKey: newRtmpForm.streamKey,
        platform: newRtmpForm.platform,
      })
      if (!success) throw new Error('Failed to save RTMP channel')
      await loadChannels()
      setNewRtmpForm({ platform: 'rtmp', displayName: '', rtmpUrl: '', streamKey: '' })
      setModalStep('AllChannels')
    } catch (err) {
      setAddRtmpError(err instanceof Error ? err.message : 'Failed to add channel')
    } finally {
      setIsAddingRtmpChannel(false)
    }
  }, [newRtmpForm, cid, userId, loadChannels])

  const handleAddInstagramLive = useCallback(() => {
    if (!igLiveForm.displayName || !igLiveForm.rtmpUrl || !igLiveForm.streamKey) return
    const igChannel: EnrichedSocialChannel = {
      platform: 'instagram', title: igLiveForm.displayName, accoutName: 'rtmp',
      accountId: igLiveForm.rtmpUrl, token: igLiveForm.streamKey, accessToken: '',
      logo: '', description: '', privacy: 'public',
      streams: [], selectedStream: null, isSelected: false,
      disabledReason: undefined, youtubeCategory: 0,
    }
    setChannels(prev => [...prev, igChannel])
    setIgLiveForm({ displayName: '', rtmpUrl: '', streamKey: '' })
    setModalStep('AllChannels')
  }, [igLiveForm, setChannels])

  const addOAuthChannel = useCallback(async (
    loginUrl: string,
    onCode: (params: URLSearchParams) => Promise<void>,
  ) => {
    const popup = openAuthPopup(loginUrl)
    if (!popup) throw new Error('Popup was blocked. Please allow popups for this site and try again.')
    await new Promise<void>((resolve, reject) => {
      const cleanup = attachPopupListener(
        popup,
        async (params) => { try { await onCode(params); cleanup(); resolve() } catch (err) { cleanup(); reject(err) } },
        () => { reject(new Error('Authentication window was closed without completing login.')) },
      )
    })
  }, [])

  const handleReconnect = useCallback(async (platform: string) => {
    setIsAddingChannel(true); setAddChannelError('')
    try {
      if (platform === 'youtube') {
        await addOAuthChannel(buildYtLoginUrl(), async (params) => {
          const code = params.get('code')
          if (!code) throw new Error('No authorization code received from Google.')
          const { access_token, refresh_token } = await ytExchangeCode(code)
          const channelInfo = await ytGetChannel(access_token)
          const nowTs = Math.floor(Date.now() / 1000)
          await ytStoreChannel({
            ytChannelId: channelInfo.id, channelName: channelInfo.title,
            userName: channelInfo.customUrl || channelInfo.title,
            logo: channelInfo.logo, description: channelInfo.description,
            accessToken: access_token, refreshToken: refresh_token,
            privacy: 'public', remarks: '',
            cid: Number(cid), userId: Number(userId),
            createdBy: Number(userId), modifiedBy: Number(userId),
            createdDate: nowTs, modifiedDate: nowTs,
          })
        })
      } else if (platform === 'facebook' || platform === 'instagram') {
        const loginUrl = platform === 'instagram' ? buildIgLoginUrl() : buildFbLoginUrl()
        await addOAuthChannel(loginUrl, async (params) => {
          const token = params.get('access_token')
          if (!token) throw new Error('No access token received.')
          const longToken = await fbExchangeLongToken(token)
          const pages = await fbGetPages(longToken)
          await Promise.all(pages.map(page => fbStorePage({
            UserId: '', UserName: '', AccountToken: longToken,
            PageId: page.id, PageTitle: page.name, PageToken: page.access_token,
            Chid: Number(cid), Uid: Number(userId),
            IgId: '', IgUserName: '', IgProfilePictureUrl: '', IgName: '',
            PageProfiePictureUrl: page.picture?.data?.url ?? '',
          })))
        })
      } else if (platform === 'twitter') {
        const { url: twUrl, verifier } = await buildTwLoginUrl()
        await addOAuthChannel(twUrl, async (params) => {
          const code = params.get('code')
          if (!code) throw new Error('No authorization code received from Twitter.')
          const { access_token, refresh_token } = await twExchangeCode(code, verifier)
          const profile = await twGetProfile(access_token)
          await twStoreAccount({
            userId: profile.id, userName: profile.username, twitterName: profile.name,
            userPictureUrl: profile.profile_image_url,
            accessToken: access_token, refreshToken: refresh_token,
            chid: Number(cid), uid: Number(userId),
          })
        })
      }
      await loadChannels()
      setModalStep('AllChannels')
    } catch (err) {
      setAddChannelError(err instanceof Error ? err.message : 'Failed to reconnect channel')
    } finally {
      setIsAddingChannel(false)
    }
  }, [addOAuthChannel, cid, userId, loadChannels])

  const handleAddYoutubeChannel = useCallback(async () => {
    setIsAddingChannel(true); setAddChannelError('')
    try {
      await addOAuthChannel(buildYtLoginUrl(), async (params) => {
        const code = params.get('code')
        if (!code) throw new Error('No authorization code received from Google.')
        const { access_token, refresh_token } = await ytExchangeCode(code)
        const channelInfo = await ytGetChannel(access_token)
        const nowTs = Math.floor(Date.now() / 1000)
        await ytStoreChannel({
          ytChannelId: channelInfo.id, channelName: channelInfo.title,
          userName: channelInfo.customUrl || channelInfo.title,
          logo: channelInfo.logo, description: channelInfo.description,
          accessToken: access_token, refreshToken: refresh_token,
          privacy: 'public', remarks: '',
          cid: Number(cid), userId: Number(userId),
          createdBy: Number(userId), modifiedBy: Number(userId),
          createdDate: nowTs, modifiedDate: nowTs,
        })
      })
      await loadChannels(); setModalStep('AllChannels')
    } catch (err) {
      setAddChannelError(err instanceof Error ? err.message : 'Failed to add YouTube channel')
    } finally { setIsAddingChannel(false) }
  }, [addOAuthChannel, cid, userId, loadChannels])

  const handleAddFacebookChannel = useCallback(async () => {
    setIsAddingChannel(true); setAddChannelError('')
    try {
      await addOAuthChannel(buildFbLoginUrl(), async (params) => {
        const shortToken = params.get('access_token')
        if (!shortToken) throw new Error('No access token received from Facebook.')
        const longToken = await fbExchangeLongToken(shortToken)
        const pages = await fbGetPages(longToken)
        await Promise.all(pages.map(page => fbStorePage({
          UserId: '', UserName: '', AccountToken: longToken,
          PageId: page.id, PageTitle: page.name, PageToken: page.access_token,
          Chid: Number(cid), Uid: Number(userId),
          IgId: '', IgUserName: '', IgProfilePictureUrl: '', IgName: '',
          PageProfiePictureUrl: page.picture?.data?.url ?? '',
        })))
      })
      await loadChannels(); setModalStep('AllChannels')
    } catch (err) {
      setAddChannelError(err instanceof Error ? err.message : 'Failed to add Facebook channel')
    } finally { setIsAddingChannel(false) }
  }, [addOAuthChannel, cid, userId, loadChannels])

  const handleAddInstagramChannel = useCallback(async () => {
    setIsAddingChannel(true); setAddChannelError('')
    try {
      await addOAuthChannel(buildIgLoginUrl(), async (params) => {
        const shortToken = params.get('access_token')
        if (!shortToken) throw new Error('No access token received from Instagram.')
        const longToken = await fbExchangeLongToken(shortToken)
        const pages = await igGetPagesWithBusiness(longToken)
        const igPages = pages.filter(p => p.instagram_business_account?.id)
        await Promise.all(igPages.map(async page => {
          const igId = page.instagram_business_account!.id
          let igDetails = { username: '', profile_picture_url: '', name: '' }
          try { igDetails = await igGetAccountDetails(page.access_token, igId) } catch { /* ok */ }
          await fbStorePage({
            UserId: '', UserName: '', AccountToken: longToken,
            PageId: page.id, PageTitle: page.name, PageToken: page.access_token,
            Chid: Number(cid), Uid: Number(userId),
            IgId: igId, IgUserName: igDetails.username,
            IgProfilePictureUrl: igDetails.profile_picture_url, IgName: igDetails.name,
            PageProfiePictureUrl: page.picture?.data?.url ?? '',
          })
        }))
      })
      await loadChannels(); setModalStep('AllChannels')
    } catch (err) {
      setAddChannelError(err instanceof Error ? err.message : 'Failed to add Instagram channel')
    } finally { setIsAddingChannel(false) }
  }, [addOAuthChannel, cid, userId, loadChannels])

  const handleAddTwitterChannel = useCallback(async () => {
    setIsAddingChannel(true); setAddChannelError('')
    try {
      const { url, verifier } = await buildTwLoginUrl()
      await addOAuthChannel(url, async (params) => {
        const code = params.get('code')
        if (!code) throw new Error('No authorization code received from Twitter.')
        const { access_token, refresh_token } = await twExchangeCode(code, verifier)
        const profile = await twGetProfile(access_token)
        await twStoreAccount({
          userId: profile.id, userName: profile.username, twitterName: profile.name,
          userPictureUrl: profile.profile_image_url,
          accessToken: access_token, refreshToken: refresh_token,
          chid: Number(cid), uid: Number(userId),
        })
      })
      await loadChannels(); setModalStep('AllChannels')
    } catch (err) {
      setAddChannelError(err instanceof Error ? err.message : 'Failed to add Twitter channel')
    } finally { setIsAddingChannel(false) }
  }, [addOAuthChannel, cid, userId, loadChannels])

  const handleSubmit = useCallback(async () => {
    const selectedChannels = channels.filter(ch => ch.isSelected)
    if (selectedChannels.length === 0) return

    // Check quota before publishing
    if (isSubscribed) {
      if (publishType === 'vodToVod' && uploadUsage.isAtLimit) {
        setQuotaModalType('uploads')
        setQuotaModalOpen(true)
        return
      }
      if (publishType === 'vodToLive' && publishingHours.isAtLimit) {
        setQuotaModalType('publishing-hours')
        setQuotaModalOpen(true)
        return
      }
    }

    setIsSubmitting(true); setSubmitError('')
    try {
      if (publishType === 'vodToVod') {
        const youTubeInfo: YtVodInfo[] = []
        const facebookInfo: FbVodInfo[] = []
        const twitterInfo: TwVodInfo[] = []
        const instagramInfo: IgVodInfo[] = []
        for (const ch of selectedChannels) {
          if (ch.platform === 'youtube') {
            youTubeInfo.push({
              accessToken: ch.accessToken, refreshToken: ch.token,
              channelTitle: ch.title, channelId: ch.accountId, channelName: ch.accoutName,
              videoTitle: publishForm.title, videoDescription: publishForm.description,
              videoPrivacyStatus: publishForm.privacy, videoForKids: publishForm.isForKids,
              categoryId: String(ch.youtubeCategory || 25),
              videoId: '', videoThumbnailDefaultUrl: '', tags: [], thumbnailUrl: '',
              link: 'https://www.youtube.com/watch?v=',
            })
          } else if (ch.platform === 'facebook') {
            facebookInfo.push({
              title: publishForm.title, description: publishForm.description, thumbnail: '',
              userAccessToken: ch.token, pageId: ch.accountId, pageName: ch.title, pageToken: ch.accessToken,
              link: 'https://www.facebook.com/watch/?v=', videoId: '',
            })
          } else if (ch.platform === 'instagram') {
            instagramInfo.push({
              caption: publishForm.description, userAccessToken: ch.token,
              pageId: ch.accountId, pageName: ch.title, pageToken: ch.accessToken,
              link: '', videoId: '',
              igId: ch.accountId, igUserName: ch.accoutName, igName: ch.accoutName, igThumbnail: ch.logo,
            })
          } else if (ch.platform === 'twitter') {
            twitterInfo.push({
              description: publishForm.description, userId: ch.accountId, userName: ch.accoutName,
              userPictureUrl: ch.logo, twitterName: ch.title,
              accessToken: ch.accessToken, refreshToken: ch.token,
              link: '', videoId: '', thumbnail: '', uId: userId,
            })
          }
        }
        await publishVodToSocialPlatforms({
          cid: Number(cid), userId: Number(userId),
          inputType: 'vod upload', inputUrl: String(asset.aid),
          logo: 0, publishMode: 'rtmp', userName: userId,
          outputMode: 'vod upload', extData: {},
          preRoll: publishForm.preRollId, postRoll: publishForm.postRollId,
          youTubeInfo, facebookInfo, twitterInfo, instagramInfo,
        })
      } else {
        const youTubeInfo: YtLiveInfo[] = []
        const facebookInfo: FbLiveInfo[] = []
        const twitterInfo: RtmpLiveInfo[] = []
        const instagramInfo: RtmpLiveInfo[] = []
        const rtmpInfo: RtmpLiveInfo[] = []
        for (const ch of selectedChannels) {
          if (ch.platform === 'youtube') {
            const broadcast = await ytCreateBroadcast(ch.accessToken, publishForm.title, publishForm.description, publishForm.privacy, publishForm.isForKids)
            if (ch.selectedStream) await ytBindBroadcast(ch.accessToken, broadcast.id, ch.selectedStream.id)
            youTubeInfo.push({
              accessToken: ch.accessToken, refreshToken: ch.token,
              channelTitle: ch.title, channelId: ch.accountId, channelName: ch.accoutName,
              videoTitle: publishForm.title, videoDescription: publishForm.description,
              videoPrivacyStatus: publishForm.privacy, videoForKids: publishForm.isForKids,
              categoryId: String(ch.youtubeCategory || 25),
              videoId: broadcast.id, chatId: broadcast.liveChatId,
              link: `https://www.youtube.com/watch?v=${broadcast.id}`,
              studioLink: `https://studio.youtube.com/video/${broadcast.id}/livestreaming`,
              publishUrl: ch.selectedStream?.url ?? '', streamId: ch.selectedStream?.id ?? '',
              streamKey: ch.selectedStream?.key ?? '', streamTitle: ch.selectedStream?.title ?? '',
              videoShedularStarttime: new Date().toISOString(),
              videoThumbnailDefaultUrl: '', tags: [], thumbnailUrl: '',
            })
          } else if (ch.platform === 'facebook') {
            const fbLive = await fbGoLive(
              { pageId: ch.accountId, pageTitle: ch.title, pageToken: ch.accessToken, pictureUrl: ch.logo, streaming: false },
              publishForm.title, publishForm.description,
            )
            const rtmpParts = (fbLive.secure_stream_url || fbLive.stream_url || '').split('/rtmp/')
            facebookInfo.push({
              title: publishForm.title, description: publishForm.description, thumbnail: '',
              userAccessToken: ch.token, pageId: ch.accountId, pageName: ch.title, pageToken: ch.accessToken,
              link: `https://www.facebook.com/watch/?v=${fbLive.id}`,
              videoId: fbLive.id,
              publishUrl: rtmpParts.length === 2 ? `${rtmpParts[0]}/rtmp` : (rtmpParts[0] ?? ''),
              streamKey: rtmpParts.length === 2 ? rtmpParts[1] : '',
            })
          } else if (ch.platform === 'instagram') {
            instagramInfo.push({ publishUrl: ch.accountId, streamKey: ch.token, outputMode: 'instagram' })
          } else if (ch.platform === 'twitter') {
            twitterInfo.push({ publishUrl: ch.accountId, streamKey: ch.token, outputMode: 'twitter' })
          } else {
            rtmpInfo.push({ publishUrl: ch.accountId, streamKey: ch.token, outputMode: ch.platform })
          }
        }
        await publishVodAsLive({
          cid: Number(cid), userId: Number(userId),
          inputType: 'vod', inputUrl: String(asset.aid),
          logo: 0, publishMode: 'rtmp', userName: userId,
          outputMode: 'rtmp', extData: {},
          preRoll: 0, postRoll: 0,
          aspectRatio: '', videoResolution: '', videoBitRate: '',
          audioBitRate: '', fps: '', vCodec: '', aCodec: '', publishProfileName: '',
          youTubeInfo, facebookInfo, twitterInfo, instagramInfo, rtmpInfo,
        })
      }
      setModalStep('Submitting')
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to publish. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }, [channels, publishForm, asset, publishType, cid, userId])

  // ── Derived ───────────────────────────────────────────────────────────────────

  const selectedChannelCount = channels.filter(ch => ch.isSelected).length
  const isTitleValid = publishForm.title.trim().length > 0
  const stepTitle = (publishType === 'vodToLive' && modalStep === 'EventSummary')
    ? 'Media Publish as Live'
    : ({ EventSummary: 'Media Publish', AllChannels: 'Select Channels', NewChannel: 'Add Channel', RtmpForm: 'Custom RTMP', EditChannel: 'Channel Settings', InstagramLiveForm: 'Instagram Live', Submitting: 'Publishing...' } as Record<ModalStep, string>)[modalStep]

  const visibleChannels = channels.filter(ch => {
    if (publishType === 'vodToVod' && ch.accoutName === 'rtmp') return false
    if (publishType === 'vodToLive' && (ch.platform === 'instagram' || ch.platform === 'twitter') && ch.accoutName !== 'rtmp') return false
    return true
  })

  const isBackable = modalStep === 'AllChannels' || modalStep === 'NewChannel' || modalStep === 'RtmpForm' || modalStep === 'EditChannel' || modalStep === 'InstagramLiveForm'

  return (
    <RadixDialog.Root open onOpenChange={(isOpen) => { if (!isOpen) onClose() }}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <RadixDialog.Content
          id="mam-publish-modal"
          onInteractOutside={e => e.preventDefault()}
          aria-describedby={undefined}
          className={cn(
            'fixed left-1/2 top-1/2 z-50 w-full max-w-xl -translate-x-1/2 -translate-y-1/2',
            'flex flex-col max-h-[90vh] bg-secondary-bg border border-white/8 rounded-2xl shadow-2xl shadow-black/60',
            'data-[state=open]:animate-in data-[state=closed]:animate-out',
            'data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
            'data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95',
            'data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%]',
            'data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]',
            'duration-200',
          )}
        >
          <RadixDialog.Title className="sr-only">{stepTitle}</RadixDialog.Title>
          {/* Header */}
          <div id="mam-publish-header" className="flex items-center justify-between gap-3 border-b border-white/8 px-5 py-4 shrink-0">
            <div id="mam-publish-header-left" className="flex items-center gap-2.5 min-w-0">
              {isBackable && (
                <button
                  id="mam-publish-btn-back"
                  type="button"
                  onClick={() => {
                    if (modalStep === 'AllChannels') setModalStep('EventSummary')
                    else setModalStep('AllChannels')
                  }}
                  className="flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-lg text-white/40 transition-colors hover:bg-white/8 hover:text-white"
                >
                  <ChevronLeft size={16} />
                </button>
              )}
              <div id="mam-publish-header-text" className="min-w-0">
                <RadixDialog.Title id="mam-publish-title" className="text-sm font-semibold text-white">
                  {stepTitle}
                </RadixDialog.Title>
                <RadixDialog.Description id="mam-publish-subtitle" className="text-xs text-white/40 truncate">
                  {asset.displayname || asset.name}
                </RadixDialog.Description>
              </div>
            </div>
            {modalStep !== 'Submitting' && (
              <button
                id="mam-publish-btn-close"
                type="button"
                onClick={onClose}
                className="flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-lg text-white/40 transition-colors hover:bg-white/8 hover:text-white"
              >
                <X size={15} />
              </button>
            )}
          </div>

          {/* Body */}
          <div id="mam-publish-body" className="flex-1 overflow-y-auto">

            {/* ── EventSummary ────────────────────────────────────────────── */}
            {modalStep === 'EventSummary' && (
              <div id="mam-publish-step-summary" className="space-y-4 p-5">
                {asset.misc?.posterPath && (
                  <div id="mam-publish-thumbnail-wrap" className="relative w-full overflow-hidden rounded-xl bg-black/40" style={{ paddingBottom: '30%' }}>
                    <img id="mam-publish-thumbnail" src={asset.misc.posterPath} alt={asset.name} className="absolute inset-0 h-full w-full object-cover" />
                  </div>
                )}
                <div id="mam-publish-field-title">
                  <label id="mam-publish-label-title" htmlFor="mam-publish-input-title" className={labelCls}>
                    Title <span className="text-red-400">*</span>
                  </label>
                  <input id="mam-publish-input-title" type="text" value={publishForm.title}
                    onChange={e => setPublishForm(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Enter title..." className={fieldCls} />
                </div>
                <div id="mam-publish-field-description">
                  <label id="mam-publish-label-description" htmlFor="mam-publish-input-description" className={labelCls}>Description</label>
                  <textarea id="mam-publish-input-description" value={publishForm.description} rows={3}
                    onChange={e => setPublishForm(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Enter description..." className={cn(fieldCls, 'resize-none')} />
                </div>
                <div id="mam-publish-field-privacy">
                  <label id="mam-publish-label-privacy" className={labelCls}>Visibility</label>
                  <Select value={publishForm.privacy} className="w-full"
                    onValueChange={v => setPublishForm(prev => ({ ...prev, privacy: v as PrivacyOption }))}>
                    <SelectItem value="public">Public</SelectItem>
                    <SelectItem value="unlisted">Unlisted</SelectItem>
                    <SelectItem value="private">Private</SelectItem>
                  </Select>
                </div>
                <div id="mam-publish-field-forkids" className="flex items-center justify-between">
                  <label id="mam-publish-label-forkids" className="text-xs text-white/50">Made for Kids</label>
                  <div id="mam-publish-forkids-options" className="flex gap-4">
                    {([false, true] as const).map(val => (
                      <label key={String(val)} id={`mam-publish-forkids-option-${val}`} className="flex cursor-pointer items-center gap-1.5 text-xs text-white/60">
                        <input id={`mam-publish-forkids-radio-${val}`} type="radio" name="mam-forkids"
                          checked={publishForm.isForKids === val}
                          onChange={() => setPublishForm(prev => ({ ...prev, isForKids: val }))}
                          className="accent-blue-500" />
                        {val ? 'Yes' : 'No'}
                      </label>
                    ))}
                  </div>
                </div>
                {publishType === 'vodToVod' && allRollProfiles.length > 0 && (
                  <div id="mam-publish-field-roll" className="space-y-1.5">
                    <label id="mam-publish-label-roll" className={labelCls}>Roll</label>
                    <div id="mam-publish-roll-selects" className="flex gap-2">
                      <Select value={prePostKey} placeholder="None" className="flex-1"
                        onValueChange={v => handlePrePostKeyChange(v as PrePostRollKey)}>
                        <SelectItem value="">None</SelectItem>
                        <SelectItem value="pre">Pre Roll</SelectItem>
                        <SelectItem value="post">Post Roll</SelectItem>
                        <SelectItem value="both">Both</SelectItem>
                      </Select>
                      {filteredRolls.length > 0 && (
                        <Select placeholder="Select profile" className="flex-1"
                          value={filteredRolls.find(r => r.preRollId === publishForm.preRollId && r.postRollId === publishForm.postRollId)?.profileName ?? ''}
                          onValueChange={v => {
                            const roll = filteredRolls.find(r => r.profileName === v)
                            setPublishForm(prev => ({ ...prev, preRollId: roll?.preRollId ?? 0, postRollId: roll?.postRollId ?? 0 }))
                          }}>
                          {filteredRolls.map(roll => (
                            <SelectItem key={roll.profileName} value={roll.profileName}>{roll.profileName}</SelectItem>
                          ))}
                        </Select>
                      )}
                    </div>
                  </div>
                )}
                <div id="mam-publish-summary-footer" className="flex justify-end gap-2 pt-1">
                  <button id="mam-publish-btn-cancel" type="button" onClick={onClose}
                    className="cursor-pointer rounded-lg border border-white/10 px-4 py-2 text-xs text-white/50 transition-colors hover:bg-white/5">
                    Cancel
                  </button>
                  <button id="mam-publish-btn-next" type="button" onClick={() => setModalStep('AllChannels')}
                    disabled={!isTitleValid}
                    className="cursor-pointer rounded-lg bg-[#3031cb] px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#2626a8] disabled:cursor-not-allowed disabled:opacity-40">
                    Next: Select Channels
                  </button>
                </div>
              </div>
            )}

            {/* ── AllChannels ──────────────────────────────────────────────── */}
            {modalStep === 'AllChannels' && (
              <div id="mam-publish-step-channels" className="flex flex-col">
                <div id="mam-publish-channels-toolbar" className="flex items-center justify-between border-b border-white/5 px-5 py-2.5">
                  <span id="mam-publish-channels-count" className="text-xs text-white/40">
                    {visibleChannels.length} channel{visibleChannels.length !== 1 ? 's' : ''}
                  </span>
                  <div id="mam-publish-channels-toolbar-actions" className="flex items-center gap-1.5">
                    <button id="mam-publish-btn-refresh-channels" type="button" onClick={loadChannels}
                      disabled={isLoadingChannels}
                      className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg text-white/40 transition-colors hover:bg-white/8 hover:text-white disabled:opacity-30">
                      <RefreshCw size={12} className={isLoadingChannels ? 'animate-spin' : ''} />
                    </button>
                    <button id="mam-publish-btn-add-channel" type="button"
                      onClick={() => { setAddChannelError(''); setModalStep('NewChannel') }}
                      className="flex cursor-pointer items-center gap-1 rounded-lg border border-white/10 px-2.5 py-1.5 text-[11px] text-white/70 transition-colors hover:bg-white/5">
                      <Plus size={11} /> Add
                    </button>
                  </div>
                </div>
                {loadChannelsError && (
                  <div id="mam-publish-channels-load-error" className="mx-5 mt-3 flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-400">
                    <AlertCircle size={12} /> {loadChannelsError}
                  </div>
                )}
                <div id="mam-publish-channels-list" className="min-h-28 max-h-[32rem] overflow-y-auto divide-y divide-white/5">
                  {isLoadingChannels && (
                    <div id="mam-publish-channels-loading" className="flex items-center justify-center gap-2 py-10 text-sm text-white/40">
                      <Loader2 size={15} className="animate-spin" /> Loading channels...
                    </div>
                  )}
                  {!isLoadingChannels && visibleChannels.length === 0 && (
                    <div id="mam-publish-channels-empty" className="flex flex-col items-center justify-center gap-1 py-10 text-center">
                      <p className="text-sm text-white/40">No channels connected</p>
                      <p className="text-xs text-white/25">Click "Add" to connect a social media account</p>
                    </div>
                  )}
                  {!isLoadingChannels && visibleChannels.map((ch) => {
                    const globalIndex = channels.indexOf(ch)
                    const channelHealth = !SOCIAL_PLATFORMS.has(ch.platform) ? undefined : (channelHealthMap[ch.accountId] ?? 'checking')
                    return (
                      <div key={`${ch.platform}-${ch.accountId}`} id={`mam-publish-channel-row-${ch.accountId}`}
                        className={cn('flex items-center gap-3 px-5 py-3 transition-colors', ch.disabledReason ? 'opacity-50' : 'hover:bg-white/2')}>
                        <div id={`mam-publish-channel-badge-${ch.accountId}`}
                          className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border text-[10px] font-bold', getPlatformColorClass(ch.platform))}>
                          {getPlatformInitials(ch.platform)}
                        </div>
                        <div id={`mam-publish-channel-info-${ch.accountId}`} className="min-w-0 flex-1 flex items-center gap-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <p className="truncate text-[13px] font-medium text-white/90">{ch.title}</p>
                              <HealthDot health={channelHealth} />
                            </div>
                            <p className="text-[11px] text-white/40">
                              {ch.disabledReason ?? (ch.accoutName === 'rtmp' ? 'Custom RTMP' : ch.platform)}
                            </p>
                          </div>
                          {channelHealth === 'expired' && (
                            <ReconnectBtn onReconnect={() => handleReconnect(ch.platform)} />
                          )}
                        </div>
                        <div id={`mam-publish-channel-controls-${ch.accountId}`} className="flex shrink-0 items-center gap-2">
                          {!ch.disabledReason && (
                            <button id={`mam-publish-channel-btn-edit-${ch.accountId}`} type="button"
                              onClick={e => { e.stopPropagation(); handleEditOpen(ch, globalIndex) }}
                              className="flex h-6 w-6 cursor-pointer items-center justify-center rounded text-white/30 transition-colors hover:bg-white/8 hover:text-white/70">
                              <Edit2 size={11} />
                            </button>
                          )}
                          <div role="checkbox" aria-checked={ch.isSelected}
                            id={`mam-publish-channel-checkbox-${ch.accountId}`}
                            onClick={() => !ch.disabledReason && channelHealth !== 'expired' && channelHealth !== 'checking' && channelHealth !== 'refreshing' && handleChannelToggle(globalIndex)}
                            className={cn(
                              'flex h-5 w-5 items-center justify-center rounded border-2 transition-colors',
                              ch.disabledReason || channelHealth === 'expired' || channelHealth === 'checking' || channelHealth === 'refreshing'
                                ? 'cursor-not-allowed border-white/10 opacity-40'
                                : ch.isSelected ? 'cursor-pointer border-blue-500 bg-blue-500'
                                : 'cursor-pointer border-white/30 hover:border-white/60',
                            )}>
                            {ch.isSelected && <Check size={11} className="text-white" />}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
                <div id="mam-publish-channels-footer" className="flex items-center justify-between gap-3 border-t border-white/8 px-5 py-3 shrink-0">
                  <span id="mam-publish-channels-selected-count" className="text-xs text-white/40">
                    {selectedChannelCount > 0 ? `${selectedChannelCount} selected` : 'Select channels above'}
                  </span>
                  <div id="mam-publish-channels-footer-actions" className="flex items-center gap-2">
                    {submitError && (
                      <span id="mam-publish-submit-error" className="max-w-52 truncate text-xs text-red-400">{submitError}</span>
                    )}
                    <button id="mam-publish-btn-create-event" type="button" onClick={handleSubmit}
                      disabled={selectedChannelCount === 0 || isSubmitting}
                      className="flex cursor-pointer items-center gap-2 rounded-lg bg-[#3031cb] px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#2626a8] disabled:cursor-not-allowed disabled:opacity-40">
                      {isSubmitting && <Loader2 size={12} className="animate-spin" />}
                      {publishType === 'vodToVod' ? 'Publish' : 'Start Live'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ── NewChannel ───────────────────────────────────────────────── */}
            {modalStep === 'NewChannel' && (
              <div id="mam-publish-step-new-channel" className="p-5">
                {addChannelError && (
                  <div id="mam-publish-add-channel-error" className="mb-4 flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-400">
                    <AlertCircle size={12} /> {addChannelError}
                  </div>
                )}
                {isAddingChannel && (
                  <div id="mam-publish-add-channel-loading" className="mb-4 flex items-center justify-center gap-2 rounded-lg border border-white/8 bg-white/5 px-3 py-4 text-xs text-white/60">
                    <Loader2 size={14} className="animate-spin" /> Connecting account...
                  </div>
                )}
                <div id="mam-publish-platform-grid" className="grid grid-cols-2 gap-3">
                  <button id="mam-publish-btn-add-youtube" type="button" onClick={handleAddYoutubeChannel} disabled={isAddingChannel}
                    className="flex cursor-pointer items-center gap-3 rounded-xl border border-white/8 bg-white/3 p-4 text-left transition-all hover:border-red-500/40 hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-40">
                    <div id="mam-publish-icon-youtube" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-red-600/30 bg-red-600/20 text-[11px] font-bold text-red-400">YT</div>
                    <div><p className="text-sm font-medium text-white/90">YouTube</p><p className="text-[11px] text-white/40">Connect channel</p></div>
                  </button>
                  <button id="mam-publish-btn-add-facebook" type="button" onClick={handleAddFacebookChannel} disabled={isAddingChannel}
                    className="flex cursor-pointer items-center gap-3 rounded-xl border border-white/8 bg-white/3 p-4 text-left transition-all hover:border-blue-500/40 hover:bg-blue-500/10 disabled:cursor-not-allowed disabled:opacity-40">
                    <div id="mam-publish-icon-facebook" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-blue-600/30 bg-blue-600/20 text-[11px] font-bold text-blue-400">FB</div>
                    <div><p className="text-sm font-medium text-white/90">Facebook</p><p className="text-[11px] text-white/40">Connect page</p></div>
                  </button>
                  <button id="mam-publish-btn-add-instagram" type="button" disabled={isAddingChannel}
                    onClick={publishType === 'vodToVod' ? handleAddInstagramChannel : () => setModalStep('InstagramLiveForm')}
                    className="flex cursor-pointer items-center gap-3 rounded-xl border border-white/8 bg-white/3 p-4 text-left transition-all hover:border-purple-500/40 hover:bg-purple-500/10 disabled:cursor-not-allowed disabled:opacity-40">
                    <div id="mam-publish-icon-instagram" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-purple-600/30 bg-purple-600/20 text-[11px] font-bold text-purple-400">IG</div>
                    <div><p className="text-sm font-medium text-white/90">Instagram</p><p className="text-[11px] text-white/40">{publishType === 'vodToVod' ? 'Connect account' : 'RTMP stream'}</p></div>
                  </button>
                  {publishType === 'vodToVod' ? (
                    <button id="mam-publish-btn-add-twitter" type="button" onClick={handleAddTwitterChannel} disabled={isAddingChannel}
                      className="flex cursor-pointer items-center gap-3 rounded-xl border border-white/8 bg-white/3 p-4 text-left transition-all hover:border-sky-500/40 hover:bg-sky-500/10 disabled:cursor-not-allowed disabled:opacity-40">
                      <div id="mam-publish-icon-twitter" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-sky-600/30 bg-sky-600/20 text-[11px] font-bold text-sky-400">TW</div>
                      <div><p className="text-sm font-medium text-white/90">Twitter / X</p><p className="text-[11px] text-white/40">Connect account</p></div>
                    </button>
                  ) : (
                    LIVE_RTMP_PLATFORMS.map(({ platform, label }) => (
                      <button key={platform} id={`mam-publish-btn-add-rtmp-${platform}`} type="button" disabled={isAddingChannel}
                        onClick={() => { setNewRtmpForm(prev => ({ ...prev, platform })); setAddRtmpError(''); setModalStep('RtmpForm') }}
                        className="flex cursor-pointer items-center gap-3 rounded-xl border border-white/8 bg-white/3 p-4 text-left transition-all hover:border-white/20 hover:bg-white/6 disabled:cursor-not-allowed disabled:opacity-40">
                        <div id={`mam-publish-icon-rtmp-${platform}`} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-white/15 bg-white/10 text-[10px] font-bold text-white/60">
                          {getPlatformInitials(platform)}
                        </div>
                        <div><p className="text-sm font-medium text-white/90">{label}</p><p className="text-[11px] text-white/40">RTMP stream</p></div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* ── RtmpForm ─────────────────────────────────────────────────── */}
            {modalStep === 'RtmpForm' && (
              <div id="mam-publish-step-rtmp-form" className="space-y-4 p-5">
                {addRtmpError && (
                  <div id="mam-publish-rtmp-error" className="flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-400">
                    <AlertCircle size={12} /> {addRtmpError}
                  </div>
                )}
                <div id="mam-publish-rtmp-field-name">
                  <label id="mam-publish-rtmp-label-name" htmlFor="mam-publish-rtmp-input-name" className={labelCls}>Display Name <span className="text-red-400">*</span></label>
                  <input id="mam-publish-rtmp-input-name" type="text" value={newRtmpForm.displayName}
                    onChange={e => setNewRtmpForm(prev => ({ ...prev, displayName: e.target.value }))}
                    placeholder="e.g. My Stream" className={fieldCls} />
                </div>
                <div id="mam-publish-rtmp-field-url">
                  <label id="mam-publish-rtmp-label-url" htmlFor="mam-publish-rtmp-input-url" className={labelCls}>RTMP URL <span className="text-red-400">*</span></label>
                  <textarea id="mam-publish-rtmp-input-url" rows={2} value={newRtmpForm.rtmpUrl}
                    onChange={e => setNewRtmpForm(prev => ({ ...prev, rtmpUrl: e.target.value }))}
                    placeholder="rtmp://..." className={cn(fieldCls, 'resize-none font-mono text-xs')} />
                </div>
                <div id="mam-publish-rtmp-field-key">
                  <label id="mam-publish-rtmp-label-key" htmlFor="mam-publish-rtmp-input-key" className={labelCls}>Stream Key <span className="text-red-400">*</span></label>
                  <textarea id="mam-publish-rtmp-input-key" rows={2} value={newRtmpForm.streamKey}
                    onChange={e => setNewRtmpForm(prev => ({ ...prev, streamKey: e.target.value }))}
                    placeholder="Stream key..." className={cn(fieldCls, 'resize-none font-mono text-xs')} />
                </div>
                <div id="mam-publish-rtmp-footer" className="flex justify-end gap-2 pt-1">
                  <button id="mam-publish-rtmp-btn-cancel" type="button" onClick={() => setModalStep('NewChannel')}
                    className="cursor-pointer rounded-lg border border-white/10 px-4 py-2 text-xs text-white/50 transition-colors hover:bg-white/5">Cancel</button>
                  <button id="mam-publish-rtmp-btn-save" type="button" onClick={handleAddRtmpChannel}
                    disabled={!newRtmpForm.displayName || !newRtmpForm.rtmpUrl || !newRtmpForm.streamKey || isAddingRtmpChannel}
                    className="flex cursor-pointer items-center gap-2 rounded-lg bg-[#3031cb] px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#2626a8] disabled:cursor-not-allowed disabled:opacity-40">
                    {isAddingRtmpChannel && <Loader2 size={12} className="animate-spin" />}
                    Save Channel
                  </button>
                </div>
              </div>
            )}

            {/* ── InstagramLiveForm ────────────────────────────────────────── */}
            {modalStep === 'InstagramLiveForm' && (
              <div id="mam-publish-step-ig-live-form" className="space-y-4 p-5">
                <p id="mam-publish-ig-live-hint" className="text-xs text-white/40">Enter your Instagram Live RTMP details to stream to Instagram.</p>
                <div id="mam-publish-ig-live-field-name">
                  <label id="mam-publish-ig-live-label-name" htmlFor="mam-publish-ig-live-input-name" className={labelCls}>Display Name <span className="text-red-400">*</span></label>
                  <input id="mam-publish-ig-live-input-name" type="text" value={igLiveForm.displayName}
                    onChange={e => setIgLiveForm(prev => ({ ...prev, displayName: e.target.value }))}
                    placeholder="e.g. Instagram Live" className={fieldCls} />
                </div>
                <div id="mam-publish-ig-live-field-url">
                  <label id="mam-publish-ig-live-label-url" htmlFor="mam-publish-ig-live-input-url" className={labelCls}>RTMP URL <span className="text-red-400">*</span></label>
                  <textarea id="mam-publish-ig-live-input-url" rows={2} value={igLiveForm.rtmpUrl}
                    onChange={e => setIgLiveForm(prev => ({ ...prev, rtmpUrl: e.target.value }))}
                    placeholder="rtmp://..." className={cn(fieldCls, 'resize-none font-mono text-xs')} />
                </div>
                <div id="mam-publish-ig-live-field-key">
                  <label id="mam-publish-ig-live-label-key" htmlFor="mam-publish-ig-live-input-key" className={labelCls}>Stream Key <span className="text-red-400">*</span></label>
                  <textarea id="mam-publish-ig-live-input-key" rows={2} value={igLiveForm.streamKey}
                    onChange={e => setIgLiveForm(prev => ({ ...prev, streamKey: e.target.value }))}
                    placeholder="Stream key..." className={cn(fieldCls, 'resize-none font-mono text-xs')} />
                </div>
                <div id="mam-publish-ig-live-footer" className="flex justify-end gap-2 pt-1">
                  <button id="mam-publish-ig-live-btn-cancel" type="button" onClick={() => setModalStep('NewChannel')}
                    className="cursor-pointer rounded-lg border border-white/10 px-4 py-2 text-xs text-white/50 transition-colors hover:bg-white/5">Cancel</button>
                  <button id="mam-publish-ig-live-btn-add" type="button" onClick={handleAddInstagramLive}
                    disabled={!igLiveForm.displayName || !igLiveForm.rtmpUrl || !igLiveForm.streamKey}
                    className="cursor-pointer rounded-lg bg-[#3031cb] px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#2626a8] disabled:cursor-not-allowed disabled:opacity-40">
                    Add Channel
                  </button>
                </div>
              </div>
            )}

            {/* ── EditChannel ──────────────────────────────────────────────── */}
            {modalStep === 'EditChannel' && channelBeingEdited && (
              <div id="mam-publish-step-edit-channel" className="space-y-4 p-5">
                <div id="mam-publish-edit-channel-platform" className="flex items-center gap-3">
                  <div id="mam-publish-edit-channel-badge" className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border text-xs font-bold', getPlatformColorClass(channelBeingEdited.platform))}>
                    {getPlatformInitials(channelBeingEdited.platform)}
                  </div>
                  <div id="mam-publish-edit-channel-info">
                    <p id="mam-publish-edit-channel-title" className="text-sm font-semibold text-white">{channelBeingEdited.title}</p>
                    <p id="mam-publish-edit-channel-platform-label" className="text-xs capitalize text-white/40">{channelBeingEdited.platform}</p>
                  </div>
                </div>
                {!SOCIAL_PLATFORMS.has(channelBeingEdited.platform) && (
                  <>
                    <div id="mam-publish-edit-field-rtmp-url">
                      <label id="mam-publish-edit-label-rtmp-url" className={labelCls}>RTMP URL</label>
                      <p id="mam-publish-edit-rtmp-url-value" className="break-all font-mono text-xs text-white/60">{channelBeingEdited.accountId}</p>
                    </div>
                    <div id="mam-publish-edit-field-stream-key">
                      <label id="mam-publish-edit-label-stream-key" className={labelCls}>Stream Key</label>
                      <p id="mam-publish-edit-stream-key-value" className="break-all font-mono text-xs text-white/60">{channelBeingEdited.token}</p>
                    </div>
                  </>
                )}
                {channelBeingEdited.platform === 'youtube' && channelBeingEdited.streams.length > 0 && (
                  <div id="mam-publish-edit-field-stream">
                    <label id="mam-publish-edit-label-stream" className={labelCls}>Live Stream</label>
                    <Select value={channelBeingEdited.selectedStream?.id ?? ''} placeholder="Select stream" className="w-full"
                      onValueChange={v => {
                        const stream = channelBeingEdited.streams.find(s => s.id === v) ?? null
                        setChannelBeingEdited(prev => prev ? { ...prev, selectedStream: stream } : prev)
                      }}>
                      {channelBeingEdited.streams.map(stream => (
                        <SelectItem key={stream.id} value={stream.id} disabled={stream.status === 'active'}>
                          {stream.title}{stream.status === 'active' ? ' (active)' : ''}
                        </SelectItem>
                      ))}
                    </Select>
                  </div>
                )}
                <div id="mam-publish-edit-field-description">
                  <label id="mam-publish-edit-label-description" htmlFor="mam-publish-edit-input-description" className={labelCls}>Description</label>
                  <textarea id="mam-publish-edit-input-description" rows={2}
                    value={channelBeingEdited.description}
                    onChange={e => setChannelBeingEdited(prev => prev ? { ...prev, description: e.target.value } : prev)}
                    placeholder="Custom description for this channel..." className={cn(fieldCls, 'resize-none')} />
                </div>
                {(channelBeingEdited.platform === 'youtube' || channelBeingEdited.platform === 'facebook') && (
                  <div id="mam-publish-edit-field-privacy">
                    <label id="mam-publish-edit-label-privacy" className={labelCls}>Visibility</label>
                    <Select value={channelBeingEdited.privacy} className="w-full"
                      onValueChange={v => setChannelBeingEdited(prev => prev ? { ...prev, privacy: v as PrivacyOption } : prev)}>
                      <SelectItem value="public">Public</SelectItem>
                      <SelectItem value="unlisted">Unlisted</SelectItem>
                      <SelectItem value="private">Private</SelectItem>
                    </Select>
                  </div>
                )}
                {channelBeingEdited.platform === 'youtube' && (
                  <div id="mam-publish-edit-field-category">
                    <label id="mam-publish-edit-label-category" className={labelCls}>Category</label>
                    <Select value={String(channelBeingEdited.youtubeCategory || 25)} className="w-full"
                      onValueChange={v => setChannelBeingEdited(prev => prev ? { ...prev, youtubeCategory: Number(v) } : prev)}>
                      {YT_CATEGORIES.map(cat => (
                        <SelectItem key={cat.id} value={String(cat.id)}>{cat.label}</SelectItem>
                      ))}
                    </Select>
                  </div>
                )}
                <div id="mam-publish-edit-channel-footer" className="flex justify-end gap-2 pt-1">
                  <button id="mam-publish-edit-btn-cancel" type="button" onClick={() => setModalStep('AllChannels')}
                    className="cursor-pointer rounded-lg border border-white/10 px-4 py-2 text-xs text-white/50 transition-colors hover:bg-white/5">Cancel</button>
                  <button id="mam-publish-edit-btn-save" type="button" onClick={handleEditSave}
                    className="cursor-pointer rounded-lg bg-[#3031cb] px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#2626a8]">Save</button>
                </div>
              </div>
            )}

            {/* ── Submitting ───────────────────────────────────────────────── */}
            {modalStep === 'Submitting' && (
              <div id="mam-publish-step-submitting" className="flex flex-col items-center gap-4 p-10 text-center">
                <div id="mam-publish-submitting-icon" className="flex h-14 w-14 items-center justify-center rounded-full border border-[#3031cb]/30 bg-[#3031cb]/15">
                  <Check size={24} className="text-[#3031cb]" />
                </div>
                <div id="mam-publish-submitting-text">
                  <p id="mam-publish-submitting-title" className="text-sm font-semibold text-white">
                    {publishType === 'vodToVod' ? 'Upload in Progress' : 'Live Stream Started'}
                  </p>
                  <p id="mam-publish-submitting-subtitle" className="mt-1 text-xs text-white/40">
                    {publishType === 'vodToVod'
                      ? 'Your video is being uploaded to the selected platforms.'
                      : 'Your asset is now streaming as a live broadcast to the selected platforms.'}
                  </p>
                </div>
                <button id="mam-publish-btn-done" type="button" onClick={onClose}
                  className="mt-2 cursor-pointer rounded-lg bg-[#3031cb] px-6 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#2626a8]">
                  Done
                </button>
              </div>
            )}

          </div>
        </RadixDialog.Content>
      </RadixDialog.Portal>

      <UpgradeModal
        id="mam-publish-quota-modal"
        open={quotaModalOpen}
        onOpenChange={setQuotaModalOpen}
        featureType={quotaModalType === 'uploads' ? 'uploads' : 'publishing-hours'}
        used={quotaModalType === 'uploads' ? uploadUsage.used : publishingHours.hoursUsed}
        limit={quotaModalType === 'uploads' ? uploadUsage.limit : publishingHours.limit}
        unit={quotaModalType === 'uploads' ? 'uploads' : 'hours'}
        resetDate={billingPeriodEnd?.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })}
      />
    </RadixDialog.Root>
  )
}
