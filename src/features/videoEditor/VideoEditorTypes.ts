export interface ImageOverlay {
  id: number
  type: 'image'
  name: string
  url: string
  xPct: number
  yPct: number
  wPct: number
  opacity: number
  rotation: number
  showFrom: number
  showTo: number
}

export interface TextOverlay {
  id: number
  type: 'text'
  name: string
  text: string
  xPct: number
  yPct: number
  wPct: number
  opacity: number
  rotation: number
  showFrom: number
  showTo: number
  fontSize: number
  fontFamily: string
  fontColor: string
  bgColor: string
  bgOpacity: number
  bold: boolean
  italic: boolean
  underline: boolean
  align: 'left' | 'center' | 'right'
  letterSpacing: number
  lineHeight: number
  padding: number
  borderRadius: number
  strokeColor: string
  strokeWidth: number
  shadow: boolean
  shadowColor: string
  shadowBlur: number
}

export type Overlay = ImageOverlay | TextOverlay

export interface AudioTrack {
  id: number
  name: string
  url: string
  duration: number
  startTime: number
  volume: number
  muted: boolean
}

export type AspectRatio = 'free' | '16:9' | '9:16' | '1:1' | '4:3' | '21:9' | '4:5'

export const AR_MAP: Record<string, number> = {
  free: 0,
  '16:9': 16 / 9,
  '9:16': 9 / 16,
  '1:1': 1,
  '4:3': 4 / 3,
  '21:9': 21 / 9,
  '4:5': 4 / 5,
}

export const FONTS = [
  'Arial',
  'Georgia',
  'Impact',
  'Courier New',
  'Verdana',
  'Trebuchet MS',
  'Tahoma',
  'Times New Roman',
  'Helvetica',
]

export function fmtTime(s: number): string {
  s = Math.max(0, s)
  return `${pad(Math.floor(s / 60))}:${pad(Math.floor(s % 60))}`
}

export function fmtTimeFull(s: number): string {
  s = Math.max(0, s)
  return `${pad(Math.floor(s / 3600))}:${pad(Math.floor((s % 3600) / 60))}:${pad(Math.floor(s % 60))}`
}

function pad(n: number): string {
  return String(Math.floor(n)).padStart(2, '0')
}
