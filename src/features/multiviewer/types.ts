export type FrameType = 'webrtc' | 'rtmp' | ''

export interface Frame {
  id: number
  type: FrameType
  source: string
  label: string
}

export interface Source {
  id: string
  name: string
  status?: string
}

export interface MultiviewerConfig {
  channel: string
  webrtcBase: string
  rtmpBase: string
  rtmpApi: string
  rtmpToken: string
  participantsApi: string
}

export type LayoutType = 'auto' | '2' | '3' | '4'

export function buildStreamUrl(
  config: MultiviewerConfig,
  type: FrameType,
  source: string,
): string {
  if (!source || !type) return ''
  if (type === 'webrtc') {
    return `${config.webrtcBase}?streamname=20006310_${config.channel}_${source}_main`
  }
  if (type === 'rtmp') {
    return `${config.rtmpBase}?channel=${config.channel}&streamName=${source}`
  }
  return ''
}
