export interface AssetMisc {
  posterPath: string
  category: string
  subCategory: string
  sub_category: string
  tags: string
  code: string
  remarks: string
  playbackurl: string
  seriesName: string
  season: number
  episode: number
  metadata: string
  aFpath: string
}

export interface Asset {
  aid: number
  name: string
  displayname: string
  filesize: number
  bitrate: number
  fps: number
  asset_duration: number
  uploadedon: number
  createdon: number
  priorityUpdatedTime: number
  qc: string
  qc_count: number
  type: string
  mode: string
  path: string
  s3path: string
  timecodein: number
  priority: number
  videoId: number
  mediainfo: string
  previewurl: string
  misc: AssetMisc
}

export interface AssetsResponse {
  assets: Asset[]
  resultCount: number
}

export interface AssetFilterState {
  name: string
  category: string
  subCategory: string
  createFrom: number
  createTo: number
  uploadFrom: number
  uploadTo: number
  order: string
  pgno: number
  pgsize: number
}
