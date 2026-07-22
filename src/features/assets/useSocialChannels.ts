import { useState, useCallback } from 'react'
import { getStorage } from '../../lib/storage'
import { fetchSocialMediaMetadata, type SocialMediaMetadata } from '../../lib/socialAuthService'
import type { EnrichedSocialChannel, PrivacyOption } from '../../types/mediaPublish'

function toEnrichedDefaults(raw: SocialMediaMetadata): EnrichedSocialChannel {
  return {
    ...raw,
    privacy: ((raw.privacy || 'public') as PrivacyOption),
    streams: [],
    selectedStream: null,
    isSelected: false,
    disabledReason: undefined,
    youtubeCategory: 25,
  }
}

export function useSocialChannels() {
  const [channels, setChannels] = useState<EnrichedSocialChannel[]>([])
  const [isLoadingChannels, setIsLoadingChannels] = useState(false)
  const [loadChannelsError, setLoadChannelsError] = useState<string | null>(null)

  const loadChannels = useCallback(async () => {
    const cid = getStorage<string>('pcr_channel_id') ?? ''
    const userId = getStorage<string>('pcr_user_id') ?? ''
    setIsLoadingChannels(true)
    setLoadChannelsError(null)
    try {
      const rawChannels = await fetchSocialMediaMetadata(cid, userId)
      setChannels(rawChannels.map(toEnrichedDefaults))
    } catch {
      setLoadChannelsError('Failed to load social media channels')
      setChannels([])
    } finally {
      setIsLoadingChannels(false)
    }
  }, [])

  return { channels, setChannels, isLoadingChannels, loadChannelsError, loadChannels }
}
