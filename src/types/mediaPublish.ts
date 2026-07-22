import type { SocialMediaMetadata, YtStream } from '../lib/socialAuthService'

export type PublishType = 'vodToVod' | 'vodToLive'

export type ModalStep =
  | 'EventSummary'
  | 'AllChannels'
  | 'NewChannel'
  | 'RtmpForm'
  | 'EditChannel'
  | 'InstagramLiveForm'
  | 'Submitting'

export type PrivacyOption = 'public' | 'unlisted' | 'private'

export type PrePostRollKey = 'both' | 'pre' | 'post' | ''

export interface EnrichedSocialChannel extends SocialMediaMetadata {
  privacy: PrivacyOption
  streams: YtStream[]
  selectedStream: YtStream | null
  isSelected: boolean
  disabledReason: string | undefined
  youtubeCategory: number
}

export interface PublishFormState {
  title: string
  description: string
  privacy: PrivacyOption
  isForKids: boolean
  preRollId: number
  postRollId: number
}

export interface NewRtmpChannelForm {
  platform: string
  displayName: string
  rtmpUrl: string
  streamKey: string
}
