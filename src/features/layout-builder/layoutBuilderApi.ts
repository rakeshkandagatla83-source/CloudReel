import { apiConfig } from '../../lib/apiConfig'
import type { DbLayout, MixLayoutItem, WaterMarkItem, Source } from '../../types/layoutBuilder'

const BASE = apiConfig.studioPcrApiBase

interface LayoutsResponse {
  data: DbLayout[]
  summary?: { id: number; description: string }
}

interface ApiResponse {
  summary?: { id: number; description: string }
}

export interface UpdateLayoutPayload {
  data: {
    id: number
    cid: number
    caption: string
    windowsCount: number
    groupName: string
    pubnubMsg: string
    isTransition: number | boolean
    isSecondary: number | boolean
    isBG: number | boolean
    transitionVideo: string
    bgVideo: string
    secondaryPlayMode: string
  }
}

export interface AddLayoutPayload {
  data: Array<{
    id: number
    cid: number
    caption: string
    windowsCount: number
    groupName: string
    pubnubMsg: string
    isTransition: number
    isSecondary: number
    isBG: number
    transitionVideo: string
    bgVideo: string
    secondaryPlayMode: string
  }>
}

export async function fetchLayoutsApi(cid: string): Promise<DbLayout[]> {
  const res = await fetch(`${BASE}/pcr/v1/get?cid=${encodeURIComponent(cid)}`)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const json = (await res.json()) as LayoutsResponse
  const layouts = json.data ?? []
  if (!layouts.length) throw new Error('No layouts returned')
  return layouts
}

export async function updateLayoutApi(payload: UpdateLayoutPayload): Promise<void> {
  const res = await fetch(`${BASE}/pcr/v1/windows/update`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const json = (await res.json()) as ApiResponse
  if (json.summary?.description !== 'OK' && json.summary?.id !== 1) {
    throw new Error(JSON.stringify(json))
  }
}

export async function addLayoutApi(payload: AddLayoutPayload): Promise<void> {
  const res = await fetch(`${BASE}/pcr/v1/windows/add`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const json = (await res.json()) as ApiResponse
  if (json.summary?.id !== 1) {
    throw new Error(JSON.stringify(json))
  }
}

export async function deleteLayoutApi(id: number): Promise<void> {
  const res = await fetch(`${BASE}/pcr/v1/windows/delete`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `id=${id}`,
  })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const json = (await res.json()) as ApiResponse
  if (json.summary?.id !== 1) {
    throw new Error(json.summary?.description ?? 'Delete failed')
  }
}

export const CAPTION_VERTICAL_PADDING = 8 // px per side (top + bottom), matches CAPTION_ROTATE packet

function hexToApi(hex: string): string {
  return hex.replace('#', '0x')
}

export function buildMixList(sources: Source[]): MixLayoutItem[] {
  return sources.map((s, i) => ({
    count: i + 1,
    LocationX: Math.round(s.x),
    LocationY: Math.round(s.y),
    ImageWidth: Math.round(s.w),
    ImageHeight: Math.round(s.h),
    BackGroundColor: hexToApi(s.bgColor || '#000000'),
    BorderColor: hexToApi(s.borderColor || '#000000'),
    BorderWidth: s.borderWidth || 0,
    BorderRadius: s.borderRadius || 0,
  }))
}

export function buildWmList(sources: Source[]): WaterMarkItem[] {
  return sources.filter(s => s.showCaption).map((s, i) => ({
    count: i + 1,
    LocationX: s.x ? Math.round(s.x) : 0,
    LocationY: Math.round(s.y + s.h - (s.captionFontSize + CAPTION_VERTICAL_PADDING * 2)),
    WaterMarkWidth: s.w ? Math.round(s.w) : 0,
    WaterMarkHeight: s.captionFontSize > 0 ? Math.round(s.captionFontSize + CAPTION_VERTICAL_PADDING * 2) : 0,
    Text: s.captionText || s.label || 'water mark',
    FontColor: hexToApi(s.captionColor || '#000000'),
    FontSize: String(s.captionFontSize || 22),
    BackGroundColor: hexToApi(s.captionBg || '#ffffff').substring(0, 8),
    BorderColor: hexToApi(s.captionBorderColor || '#000000'),
    BorderWidth: s.captionBorderWidth || 0,
    BorderRadius: s.captionRadius || 0,
    Animation: s.captionAnim || 0,
    FontFamily: s.captionFont || 'Arial',
    ShowCaption: s.showCaption || false,
  }))
}
