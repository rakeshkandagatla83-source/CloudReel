import { http } from './http'
import { apiConfig } from './apiConfig'
import { GFX_ASSETS_API } from './studioConfig'
import type { GfxAssetItem } from '../types/studio'

const LBAND_EXTS = /\.(png|gif)$/i
const LOGO_EXTS = /\.(png|gif|jpe?g|webp|mp4|webm)$/i

interface RawAsset {
  aid: number
  name: string
  type: string
  previewurl: string
  s3path?: string
}

export async function fetchGfxAssets(cid: string, token: string, bandKey: string): Promise<GfxAssetItem[]> {
  try {
    const payload = new URLSearchParams({ cid, status: 'A', pgno: '0', pgsize: '0', category: 'S' })
    const json = await http.post<{ assets?: RawAsset[] }>(
      apiConfig.scalaApiBase, GFX_ASSETS_API, payload.toString(),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'x-auth-token': token, 'x-channel-id': cid } },
    )
    const isLogoBand = bandKey === 'logo_band'
    return (json.assets || [])
      .filter(a => {
        const assetUrl = a.s3path || ''
        return isLogoBand
          ? (a.type === 'image' || a.type === 'gvideo') && LOGO_EXTS.test(assetUrl)
          : a.type === 'image' && LBAND_EXTS.test(assetUrl)
      })
      .map(a => ({ id: String(a.aid), name: a.name, url: a.s3path || '', s3path: a.s3path, type: a.type }))
  } catch {
    return []
  }
}
