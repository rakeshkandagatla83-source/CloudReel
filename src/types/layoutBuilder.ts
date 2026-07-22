export interface Source {
  id: string
  label: string
  x: number
  y: number
  w: number
  h: number
  bgColor: string
  borderColor: string
  borderWidth: number
  borderRadius: number
  showCaption: boolean
  captionText: string
  captionFont: string
  captionFontSize: number
  captionColor: string
  captionBg: string
  captionBorderColor: string
  captionBorderWidth: number
  captionRadius: number
  captionAnim: number
}

export interface Background {
  color: string
  imageUrl: string
  bgAssetName: string
  imageFit: 'cover' | 'contain' | 'fill' | 'none'
}

export interface MixLayoutItem {
  count: number
  LocationX: number
  LocationY: number
  ImageWidth: number
  ImageHeight: number
  BackGroundColor: string
  BorderColor: string
  BorderWidth: number
  BorderRadius: number
}

export interface WaterMarkItem {
  count: number
  LocationX: number
  LocationY: number
  WaterMarkWidth: number
  WaterMarkHeight: number
  Text: string
  FontColor: string
  FontSize: string
  BackGroundColor: string
  BorderColor: string
  BorderWidth: number
  BorderRadius: number
  Animation: number
  FontFamily: string
  ShowCaption: boolean
}

export interface PubnubMsg {
  MixLayoutList: MixLayoutItem[]
  WaterMarkList: WaterMarkItem[]
}

export interface DbLayout {
  id: number
  cid: number
  caption: string
  groupName: string
  windowsCount: number
  pubnubMsg: string
  isTransition: number | boolean
  isSecondary: number | boolean
  isBG: number | boolean
  transitionVideo: string
  bgVideo: string
  secondaryPlayMode: string
}

export interface LocalTemplate {
  id: string
  name: string
  groupName: string
  isBg: boolean
  sources: Omit<Source, 'id'>[]
  bg: Background
  updatedAt: number
}

export type DbFetchStatus = 'idle' | 'loading' | 'ok' | 'error'
export type SaveStatus = 'idle' | 'saving' | 'ok' | 'error'
