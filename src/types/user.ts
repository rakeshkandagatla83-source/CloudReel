export interface Channel {
  id: number
  tId: number
  channelName: string
  desc: string
  icon: string
  logo: string
  status: boolean
  fps: number
  aspect: string
  resolution: string
  resolutionW: number
  resolutionH: number
  encode: boolean
  isffmpeg: boolean
  isDesktopApp: boolean
  isQC: boolean
  isMultiAudioTracksEnabled: boolean | null
  multiAudioTracksOrder: string
  playlistLimit: number
  playlistFormat: string
  contentPath: string
  contentProcessor: string
  outputStreamName: string
  inputSource: string
  rtmpType: string | null
  previewPath: string
  s3BucketName: string
  s3BucketRegion: string
  s3BucketHost: string
  s3BucketKeyID: string
  s3BukcetKeySecret: string
  s3PreviewFolder: string
  logoAlpha: number
  logoWidth: number
  logoHeight: number
  logoLocX: number
  logoLocY: number
  genres: string
  epgFormaType: string | null
  epgFormatValue: string | null
  extMetadata: string
  extMetadataName: string
  vgToken: string
  wsToken: string
  zixiIp: string
  mId: number
  roleId: number
  ctzOffset: number
  joiningDate: number
  terminateDate: number
  gfxRule: string | null
  config: string
}

export interface Tenant {
  tid: number
  tName: string
  tLogoUrl: string | null
  channels: Channel[]
}

export interface UserData {
  id: number
  firstname: string
  lastname: string
  emailAddress: string
  phoneNumber: string | null
  countryCode: string | null
  theme: string
  signInType: string
  sessionToken: string
  isAuth: boolean
  isFirstLogin: boolean
  isAdmin: boolean
  image: string | null
  hasClaimedPcrTrial: boolean
  tenants: Tenant[]
}

export interface UserResponse {
  code: number
  Message: string
  id: number
  data: UserData
}

export type AuthType = 'JANYA' | 'MSAL'
