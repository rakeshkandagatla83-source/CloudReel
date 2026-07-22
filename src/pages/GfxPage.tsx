import { useState, useCallback, useEffect, useRef, memo } from 'react'
import { Layers, RefreshCw, Loader2, Pencil, Palette, MoveUpRight, ToggleLeft, ToggleRight, Image } from 'lucide-react'
import { cn } from '../lib/utils'
import {
  GFX_API, GFX_SET_API, GFX_GETVALUE_API, GFX_GETALIGNMENT_API, GFX_ASSETS_API,
  bandLabel, getStudioChannel, getStudioCid,
  TEXT_BANDS, ASSET_BANDS, STYLING_ONLY_BANDS, LAYOUT_BANDS,
  GFX_CONTENT_WS_TYPE, GFX_CONTENT_WS_PAYLOAD,
  GFX_ALIGNMENT_WS_TYPE, GFX_ALIGNMENT_WS_PAYLOAD,
  BG_VIDEO_BANDS, BG_IMAGE_BANDS,
  getBgBase,
  GFX_DEFAULT_BAND_KEYS, GFX_DEFAULT_LAYOUT, GFX_ALIGNMENT_DEFAULTS, GFX_BAND_DISPLAY_ORDER,
} from '../lib/studioConfig'
import { http } from '../lib/http'
import { apiConfig } from '../lib/apiConfig'
import { fetchGfxAssets as fetchGfxAssetsLib } from '../lib/gfxAssets'
import { getStorage } from '../lib/storage'
import { GfxBandEditDialog } from '../features/studio/GfxBandEditDialog'
import { GfxAssetDialog } from '../features/studio/GfxAssetDialog'
import { GfxLayoutDialog } from '../features/studio/GfxLayoutDialog'
import { GfxAlignmentDialog } from '../features/studio/GfxAlignmentDialog'
import { GfxLocationDialog } from '../features/studio/GfxLocationDialog'
import type { GfxNewsItem, GfxBandLayout, GfxBandAlignment, GfxAssetItem, GfxAlignmentCache, BgAssetItem } from '../types/studio'


// Band colour dots used in the band cards
const BAND_COLORS: Record<string, string> = {
  top_band:           '#3b82f6',
  lower_band:         '#3031cb',
  ticker_band:        '#fbbf24',
  l_band:             '#8b5cf6',
  location_band:      '#14b8a6',
  date_band:          '#22c55e',
  clock_band:         '#10b981',
  logo_band:          '#ec4899',
  breaking_news_band: '#ef4444',
  coming_up_band:     '#f97316',
  bottom_ticker_band: '#eab308',
}
const DEFAULT_COLOR = '#ffffff55'

interface BandStatus { key: string; isOn: boolean }

type DialogType = 'content' | 'layout' | 'alignment'
interface ActiveDialog { bandKey: string; type: DialogType }

// ── Helpers ───────────────────────────────────────────────────────────────────
function parseGfxArray<T>(raw: unknown): T[] {
  if (Array.isArray(raw)) return raw as T[]
  const data = (raw as { data?: unknown }).data
  if (Array.isArray(data)) return data as T[]
  return []
}

// ── Hook ──────────────────────────────────────────────────────────────────────
function useGfx() {
  const channel = getStudioChannel() ?? ''
  const cid = getStudioCid() ?? ''
  const token = getStorage<string>('pcr_token') ?? ''

  const [bands, setBands] = useState<BandStatus[]>([])
  const [templateType, setTemplateType] = useState('template1')
  const [loading, setLoading] = useState(false)
  const [busy, setBusy] = useState<Set<string>>(new Set())
  const [status, setStatus] = useState({ text: '', type: '' })
  const [bandContent, setBandContent] = useState<Record<string, GfxNewsItem[]>>({})
  const [bandAssets, setBandAssets] = useState<Record<string, GfxAssetItem[]>>({})
  const [alignCache, setAlignCache] = useState<GfxAlignmentCache>({ layout: {}, alignment: {} })
  const bgAssetsCacheRef = useRef<Record<string, BgAssetItem[]>>({})

  useEffect(()=>{document.title='CloudReel - Graphics'},[])

  const refresh = useCallback(async () => {
    setLoading(true)
    setStatus({ text: 'Loading…', type: 'loading' })
    try {
      const [statusRes, alignRes] = await Promise.all([
        fetch(`${GFX_API}/${channel}/-1`),
        fetch(`${GFX_GETALIGNMENT_API}/${channel}/-1`),
      ])
      if (!statusRes.ok) throw new Error(`HTTP ${statusRes.status}`)
      // Parse both JSON responses in parallel so all state updates land in one React batch
      const [rawStatusJson, rawAlignJson] = await Promise.all([
        statusRes.json(),
        alignRes.ok ? alignRes.json() : Promise.resolve(null),
      ])
      const statusJson = rawStatusJson as { data?: Array<{ templatetype?: string; statusType?: Record<string, unknown> }> }
      const alignJson  = rawAlignJson  as { data?: Array<{ layout?: Record<string, GfxBandLayout>; alignment?: Record<string, unknown> }> } | null

      // Detect empty {} response — channel exists but has no saved GFX data yet
      const isStatusEmpty = Object.keys(rawStatusJson as object).length === 0
      const isAlignEmpty  = rawAlignJson !== null && Object.keys(rawAlignJson as object).length === 0

      let result: BandStatus[]
      let tplName: string
      if (isStatusEmpty) {
        // No data: show all known bands with status OFF
        result  = GFX_DEFAULT_BAND_KEYS.map(key => ({ key, isOn: false }))
        tplName = 'template1'
      } else {
        const tpl = statusJson.data?.[0]
        if (!tpl) throw new Error('No data')
        tplName = tpl.templatetype ?? 'template1'
        const raw = tpl.statusType ?? {}
        result = Object.keys(raw).map(key => ({
          key,
          isOn: raw[key] === 'True' || raw[key] === true || raw[key] === 'true',
        }))
        // Merge in any missing standard bands with OFF state
        const existingKeys = new Set(result.map(b => b.key))
        GFX_DEFAULT_BAND_KEYS.forEach(key => {
          if (!existingKeys.has(key)) result.push({ key, isOn: false })
        })
      }

      const alignData = alignJson?.data?.[0]
      // All state updates in one synchronous block — React 18 batches these into a single commit
      setTemplateType(tplName)
      setBands(result)
      setStatus({ text: 'ok', type: 'ok' })
      if (isAlignEmpty) {
        // No alignment data: use per-band defaults (0 for all numeric fields).
        const defaultAlignment: Record<string, unknown> = { ...GFX_ALIGNMENT_DEFAULTS }
        const defaultLayout: Record<string, GfxBandLayout> = Object.fromEntries(
          [...LAYOUT_BANDS].map(key => [key, { ...GFX_DEFAULT_LAYOUT }])
        )
        setAlignCache({ layout: defaultLayout, alignment: defaultAlignment })
      } else if (alignData) {
        const mergedAlignment = { ...alignData.alignment }
        Object.keys(GFX_ALIGNMENT_DEFAULTS).forEach(key => {
          const existing = mergedAlignment[key]
          const isEmpty = existing !== null && typeof existing === 'object' && Object.keys(existing as object).length === 0
          if (!(key in mergedAlignment) || isEmpty) mergedAlignment[key] = GFX_ALIGNMENT_DEFAULTS[key]
        })
        setAlignCache({ layout: alignData.layout ?? {}, alignment: mergedAlignment })
      }
      bgAssetsCacheRef.current = {}

      // Prefetch bg assets for all bg bands (fire-and-forget, non-critical)
      const bgBandKeys = result.map(b => b.key).filter(k => BG_VIDEO_BANDS.has(k) || BG_IMAGE_BANDS.has(k))
      if (bgBandKeys.length > 0) {
        void (async () => {
          try {
            const bgPayload = new URLSearchParams({ cid, status: 'A', pgno: '0', pgsize: '0', category: 'S' })
            const bgJson = await http.post<{ assets?: Array<{ name: string; type: string; s3path?: string }> }>(
              apiConfig.scalaApiBase, GFX_ASSETS_API, bgPayload.toString(),
              { headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'x-auth-token': token, 'x-channel-id': cid } },
            )
            const rawAssets = bgJson.assets || []
            const fallbackBase = getBgBase()
            const videoExts = /\.(mp4|webm|png)$/i
            const imgExts   = /\.(png|gif)$/i
            const cache: Record<string, BgAssetItem[]> = {}
            bgBandKeys.forEach(bandKey => {
              const isVideoBand = BG_VIDEO_BANDS.has(bandKey)
              cache[bandKey] = rawAssets
                .filter(a => isVideoBand
                  ? (a.type === 'gvideo' || a.type === 'image') && videoExts.test(a.s3path ?? '')
                  : a.type === 'image' && imgExts.test(a.s3path ?? ''))
                .map(a => ({ name: a.name, path: a.s3path || `${fallbackBase}${a.name}` }))
            })
            bgAssetsCacheRef.current = cache
          } catch { /* non-critical, dialog will fall back to on-demand fetch */ }
        })()
      }
    } catch (e) {
      setStatus({ text: `Error: ${(e as Error).message}`, type: 'err' })
    } finally {
      setLoading(false)
    }
  }, [channel])

  const toggleBand = useCallback(async (key: string, newVal: boolean) => {
    setBusy(prev => new Set([...prev, key]))
    const wsPacket = { Type: 'upd_display', channel, displayValue: bandLabel(key), tempType: key, displayType: newVal, template_type: templateType, methodType: 'preview' }
    try {
      await http.post('', GFX_SET_API, { channel, operation: 'upd_display', gfxtype: key, displayname: 'T', category: 'preview', data: JSON.stringify(wsPacket) })
      setBands(prev => prev.map(b => b.key === key ? { ...b, isOn: newVal } : b))
    } catch { /* ignore */ } finally {
      setBusy(prev => { const s = new Set(prev); s.delete(key); return s })
    }
  }, [channel, templateType])

  const fetchBandContent = useCallback(async (bandKey: string): Promise<GfxNewsItem[]> => {
    try {
      const res = await fetch(`${GFX_GETVALUE_API}/${channel}/${bandKey}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const items = parseGfxArray<GfxNewsItem>(await res.json())
      setBandContent(prev => ({ ...prev, [bandKey]: items }))
      return items
    } catch { return [] }
  }, [channel])

  const fetchLocationContent = useCallback(async (): Promise<string> => {
    try {
      const res = await fetch(`${GFX_GETVALUE_API}/${channel}/location_band`)
      if (!res.ok) return ''
      const raw = await res.json() as unknown
      if (typeof raw === 'string') return raw
      if (typeof raw === 'object' && raw !== null) {
        const obj = raw as Record<string, unknown>
        if (typeof obj.locNews === 'string') return obj.locNews
      }
      return ''
    } catch { return '' }
  }, [channel])

  const saveLocationContent = useCallback(async (text: string): Promise<boolean> => {
    const wsPacket = { Type: 'p_location', channel, locNews: text, locationToggle: false, template_type: templateType }
    try {
      await http.post('', GFX_SET_API, {
        channel, operation: 'setvalue', gfxtype: 'location_band',
        displayname: 'T', category: 'preview', data: JSON.stringify(wsPacket),
      })
      void refresh()
      return true
    } catch { return false }
  }, [channel, templateType, refresh])

  const saveBandContent = useCallback(async (bandKey: string, items: GfxNewsItem[]): Promise<boolean> => {
    const wsType = GFX_CONTENT_WS_TYPE[bandKey]
    const payloadKey = GFX_CONTENT_WS_PAYLOAD[bandKey]
    const displayStyle = bands.find(b => b.key === bandKey)?.isOn ?? false
    const apiPayloadPart = payloadKey ? { [payloadKey]: items } : {}
    // Angular order: Type → channel → [payloadKey] → displayStyle → template_type → methodType
    const apiDataPacket = { Type: wsType, channel, ...apiPayloadPart, displayStyle, template_type: templateType, methodType: 'preview' }
    try {
      await http.post('', GFX_SET_API, {
        channel, operation: 'setvalue', gfxtype: bandKey,
        displayname: 'T', category: 'preview', data: JSON.stringify(apiDataPacket),
      })
      setBandContent(prev => ({ ...prev, [bandKey]: items }))
      void refresh()
      return true
    } catch { return false }
  }, [channel, templateType, bands, refresh])

  const fetchBandAsset = useCallback(async (bandKey: string): Promise<GfxAssetItem[]> => {
    try {
      const res = await fetch(`${GFX_GETVALUE_API}/${channel}/${bandKey}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const raw = await res.json() as unknown
      // Angular saves the full WS packet as the data field; extract items from band-specific key
      const payloadKey = GFX_CONTENT_WS_PAYLOAD[bandKey]
      let items: GfxAssetItem[]
      if (payloadKey && typeof raw === 'object' && raw !== null && !Array.isArray(raw)) {
        const nested = (raw as Record<string, unknown>)[payloadKey]
        items = Array.isArray(nested) ? nested as GfxAssetItem[] : parseGfxArray<GfxAssetItem>(raw)
      } else {
        items = parseGfxArray<GfxAssetItem>(raw)
      }
      setBandAssets(prev => ({ ...prev, [bandKey]: items }))
      return items
    } catch { return [] }
  }, [channel])

  const fetchGfxAssets = useCallback((bandKey: string): Promise<GfxAssetItem[]> => {
    return fetchGfxAssetsLib(cid, token, bandKey)
  }, [cid, token])

  const saveBandAsset = useCallback(async (bandKey: string, items: GfxAssetItem[]): Promise<boolean> => {
    const saveItems = items.map(({ id, name, url, s3path }) => ({
      id, name,
      url: bandKey === 'logo_band' ? (s3path || url) : url,
    }))
    const wsPacket: Record<string, unknown> = bandKey === 'logo_band'
      ? { Type: 'p_VODLogo', channel, VODLogo: saveItems, VODLogoToggle: false, template_type: templateType }
      : { Type: 'p_Lband',   channel, lband: saveItems,   lbandToggle: false,   template_type: templateType }
    try {
      await http.post('', GFX_SET_API, {
        channel, operation: 'setvalue', gfxtype: bandKey,
        displayname: 'T', category: 'preview', data: JSON.stringify(wsPacket),
      })
      void refresh()
      return true
    } catch { return false }
  }, [channel, templateType, refresh])

  const fetchGfxBgAssets = useCallback(async (bandKey: string): Promise<BgAssetItem[]> => {
    const cached = bgAssetsCacheRef.current[bandKey]
    if (cached !== undefined) return cached
    try {
      const payload = new URLSearchParams({ cid, status: 'A', pgno: '0', pgsize: '0', category: 'S' })
      const json = await http.post<{ assets?: Array<{ name: string; type: string; s3path?: string }> }>(
        apiConfig.scalaApiBase, GFX_ASSETS_API, payload.toString(),
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'x-auth-token': token, 'x-channel-id': cid } },
      )
      const isVideoBand = BG_VIDEO_BANDS.has(bandKey)
      const fallbackBase = getBgBase()
      const videoExts = /\.(mp4|webm|png)$/i
      const imgExts   = /\.(png|gif)$/i
      const result = (json.assets || [])
        .filter(a => isVideoBand
          ? (a.type === 'gvideo' || a.type === 'image') && videoExts.test(a.s3path ?? '')
          : a.type === 'image' && imgExts.test(a.s3path ?? ''))
        .map(a => ({ name: a.name, path: a.s3path || `${fallbackBase}${a.name}` }))
      bgAssetsCacheRef.current = { ...bgAssetsCacheRef.current, [bandKey]: result }
      return result
    } catch { return [] }
  }, [cid, token, channel])

  const getBandLayout = useCallback((bandKey: string): GfxBandLayout | null => {
    return alignCache.layout[bandKey] ?? null
  }, [alignCache])

  const getBandPosition = useCallback((bandKey: string): GfxBandAlignment | null | 'corrupted' => {
    const raw = alignCache.alignment[bandKey]
    if (raw === undefined) return null
    if (typeof raw === 'number' || typeof raw === 'string') return 'corrupted'
    if (raw === null || typeof raw !== 'object') return null
    return raw as GfxBandAlignment
  }, [alignCache])

  const saveBandLayout = useCallback(async (bandKey: string, layout: GfxBandLayout): Promise<boolean> => {
    try {
      await http.post('', GFX_SET_API, {
        channel, operation: 'setlayout', gfxtype: bandKey,
        displayname: 'T', category: 'preview',
        data: JSON.stringify({ Type: 'p_Layout', channel, LayoutDesg: layout, template_type: templateType }),
      })
      setAlignCache(prev => ({ ...prev, layout: { ...prev.layout, [bandKey]: layout } }))
      void refresh()
      return true
    } catch { return false }
  }, [channel, templateType, refresh])

  const saveBandAlignment = useCallback(async (bandKey: string, alignment: GfxBandAlignment): Promise<boolean> => {
    const wsType = GFX_ALIGNMENT_WS_TYPE[bandKey]
    const payloadKey = GFX_ALIGNMENT_WS_PAYLOAD[bandKey]
    // Angular order: Type → channel → [payloadKey] → template_type → methodType
    const payloadPart = payloadKey
      ? { [payloadKey]: alignment }
      : { alignment: { ...alignCache.alignment, [bandKey]: alignment } }
    const wsPacket = {
      Type: wsType ?? 'p_settings_alignment',
      channel,
      ...payloadPart,
      template_type: templateType,
      methodType: 'preview',
    }
    try {
      await http.post('', GFX_SET_API, {
        channel, operation: 'setalignment', gfxtype: bandKey,
        displayname: 'T', category: 'preview', data: JSON.stringify(wsPacket),
      })
      setAlignCache(prev => ({ ...prev, alignment: { ...prev.alignment, [bandKey]: alignment } }))
      void refresh()
      return true
    } catch { return false }
  }, [channel, templateType, alignCache, refresh])

  useEffect(() => { void refresh() }, [refresh])

  // Populate content/asset previews after initial bands load.
  // The undefined check prevents re-fetching when bands change due to a toggle
  // (content is already cached) while still fetching on a full refresh that
  // resets bandContent/bandAssets to {}.
  useEffect(() => {
    bands.forEach(b => {
      if (TEXT_BANDS.has(b.key) && bandContent[b.key] === undefined) void fetchBandContent(b.key)
      else if (ASSET_BANDS.has(b.key) && bandAssets[b.key] === undefined) void fetchBandAsset(b.key)
    })
  }, [bands]) // eslint-disable-line react-hooks/exhaustive-deps

  return {
    channel, bands, loading, busy, status, bandContent, bandAssets, alignCache,
    refresh, toggleBand,
    fetchBandContent, saveBandContent,
    fetchLocationContent, saveLocationContent,
    fetchBandAsset, fetchGfxAssets, fetchGfxBgAssets, saveBandAsset,
    getBandLayout, getBandPosition,
    saveBandLayout, saveBandAlignment,
  }
}


// ── Band card ─────────────────────────────────────────────────────────────────
interface BandCardProps {
  bandKey: string
  isOn: boolean
  isBusy: boolean
  color: string
  preview: string | undefined
  isTextBand: boolean
  isAssetBand: boolean
  isStylingOnly: boolean
  hasContent: boolean
  hasLayout: boolean
  hasPosition: boolean
  isBandCorrupted: boolean
  onToggle: (key: string, newValue: boolean) => void
  onOpenDialog: (key: string, type: DialogType) => void
}

const BandCard = memo(function BandCard({
  bandKey, isOn, isBusy, color, preview,
  isTextBand, isAssetBand, isStylingOnly,
  hasContent, hasLayout, hasPosition,
  isBandCorrupted,
  onToggle, onOpenDialog,
}: BandCardProps) {
  const label = bandLabel(bandKey)
  const visibleButtonCount = (hasContent ? 1 : 0) + (hasLayout ? 1 : 0) + (hasPosition ? 1 : 0)
  return (
    <div
      id={`gfx-band-card-${bandKey}`}
      className={cn(
        'flex flex-col gap-3 p-4 rounded-xl border transition-all',
        isBandCorrupted ? 'bg-amber-100 border-amber-300' :
        isOn ? 'bg-[#24dd6e]/15 border-[#24dd6e]/30' : 'bg-surface-2 border-primary-border hover:border-secondary-text/30 hover:bg-surface-2/80',
        isBusy && 'opacity-50 pointer-events-none',
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="shrink-0 w-2.5 h-2.5 rounded-sm" style={{ background: color, opacity: isOn ? 1 : 0.3 }} />
          <div className="min-w-0">
            <p className={cn('text-base font-medium leading-tight truncate', isBandCorrupted ? 'text-amber-600' : 'text-primary-text')}>
              {label}
            </p>
          </div>
        </div>
        <button
          id={`gfx-btn-toggle-${bandKey}`}
          type="button"
          disabled={isBusy || (isBandCorrupted && !isOn)}
          onClick={() => onToggle(bandKey, !isOn)}
          title={isBandCorrupted && !isOn ? 'Fix corrupted position data before turning on' : isOn ? 'Turn OFF' : 'Turn ON'}
          className="shrink-0 cursor-pointer transition-transform hover:scale-105 active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed w-7 h-7 flex items-center justify-center"
        >
          {isBusy ? <Loader2 size={22} className="animate-spin text-secondary-text/50" /> :
            isOn ? <ToggleRight size={28} className="text-[#24dd6e]" /> :
            <ToggleLeft size={28} className="text-secondary-text/40" />}
        </button>
      </div>

      {isTextBand && (
        <p className="text-base text-secondary-text italic leading-snug line-clamp-2 min-h-[2lh]">
          {preview ?? 'No content — click Content to add news items'}
        </p>
      )}
      {isAssetBand && (
        <p className="text-base text-secondary-text italic leading-snug min-h-lh">
          {preview ? `Asset: ${preview}` : 'No asset selected — click Content to choose'}
        </p>
      )}
      {isStylingOnly && (
        <p className="text-base text-secondary-text/70 italic min-h-lh">Styling &amp; position only</p>
      )}

      <div className={cn('grid gap-1.5',
        visibleButtonCount === 3 ? 'grid-cols-3' :
        visibleButtonCount === 2 ? 'grid-cols-2' : 'grid-cols-1')}>
        {hasContent && (
          <button
            id={`gfx-btn-content-${bandKey}`}
            type="button"
            onClick={() => onOpenDialog(bandKey, 'content')}
            className="flex h-10 flex-row items-center justify-center gap-2 px-2 rounded-lg border border-primary-border bg-surface text-secondary-text hover:text-primary-text hover:bg-surface-2 hover:border-secondary-text/30 cursor-pointer transition-colors"
          >
            {isAssetBand ? <Image size={16} /> : <Pencil size={16} />}
            <span className="text-base font-semibold">Content</span>
          </button>
        )}
        {hasLayout && (
          <button
            id={`gfx-btn-layout-${bandKey}`}
            type="button"
            onClick={() => onOpenDialog(bandKey, 'layout')}
            className="flex h-10 flex-row items-center justify-center gap-2 px-2 rounded-lg border border-primary-border bg-surface text-secondary-text hover:text-primary-text hover:bg-surface-2 hover:border-secondary-text/30 cursor-pointer transition-colors"
          >
            <Palette size={16} />
            <span className="text-base font-semibold">Layout</span>
          </button>
        )}
        {hasPosition && (
          <button
            id={`gfx-btn-position-${bandKey}`}
            type="button"
            onClick={() => onOpenDialog(bandKey, 'alignment')}
            className="flex h-10 flex-row items-center justify-center gap-2 px-2 rounded-lg border border-primary-border bg-surface text-secondary-text hover:text-primary-text hover:bg-surface-2 hover:border-secondary-text/30 cursor-pointer transition-colors"
          >
            <MoveUpRight size={16} />
            <span className="text-base font-semibold">Position</span>
          </button>
        )}
      </div>
    </div>
  )
})

// ── Page ──────────────────────────────────────────────────────────────────────
export function GfxPage() {
  const {
    bands, loading, busy, status, bandContent, bandAssets, alignCache,
    refresh, toggleBand,
    fetchBandContent, saveBandContent,
    fetchLocationContent, saveLocationContent,
    fetchBandAsset, fetchGfxAssets, fetchGfxBgAssets, saveBandAsset,
    getBandLayout, getBandPosition,
    saveBandLayout, saveBandAlignment,
  } = useGfx()

  const [activeDialog, setActiveDialog] = useState<ActiveDialog | null>(null)

  const openDialog = useCallback((bandKey: string, type: DialogType) => setActiveDialog({ bandKey, type }), [])
  const closeDialog = useCallback(() => setActiveDialog(null), [])

  const activeBandKey  = activeDialog?.bandKey ?? ''
  const activeBandName = activeBandKey ? bandLabel(activeBandKey) : ''

  // Text band callbacks
  const loadContent   = useCallback(() => fetchBandContent(activeBandKey), [activeBandKey, fetchBandContent])
  const saveContent   = useCallback((items: GfxNewsItem[]) => saveBandContent(activeBandKey, items), [activeBandKey, saveBandContent])

  // Location band callbacks
  const loadLocation  = useCallback(() => fetchLocationContent(), [fetchLocationContent])
  const saveLocation  = useCallback((text: string) => saveLocationContent(text), [saveLocationContent])

  // Asset band callbacks
  const loadAssetSelection = useCallback(() => fetchBandAsset(activeBandKey), [activeBandKey, fetchBandAsset])
  const loadAssetLibrary   = useCallback(() => fetchGfxAssets(activeBandKey), [activeBandKey, fetchGfxAssets])
  const saveAsset          = useCallback((items: GfxAssetItem[]) => saveBandAsset(activeBandKey, items), [activeBandKey, saveBandAsset])

  // Layout callbacks — pre-populated from cached getalignment data
  const loadLayout  = useCallback((): Promise<GfxBandLayout | null> => Promise.resolve(getBandLayout(activeBandKey)), [activeBandKey, getBandLayout])
  const saveLayout  = useCallback((l: GfxBandLayout) => saveBandLayout(activeBandKey, l), [activeBandKey, saveBandLayout])

  // Alignment callbacks — pre-populated from cached getalignment data
  const loadAlignment  = useCallback((): Promise<GfxBandAlignment | null | 'corrupted'> => Promise.resolve(getBandPosition(activeBandKey)), [activeBandKey, getBandPosition])
  const loadBgAssets   = useCallback((): Promise<BgAssetItem[]> => fetchGfxBgAssets(activeBandKey), [activeBandKey, fetchGfxBgAssets])
  const saveAlignment  = useCallback((a: GfxBandAlignment) => saveBandAlignment(activeBandKey, a), [activeBandKey, saveBandAlignment])

  const visibleBands = bands
    .filter(band => {
      const raw = alignCache.alignment[band.key]
      return !(raw !== null && raw !== undefined && typeof raw === 'object' && Object.keys(raw as object).length === 0)
    })
    .sort((bandA, bandB) => {
      const indexA = GFX_BAND_DISPLAY_ORDER.indexOf(bandA.key)
      const indexB = GFX_BAND_DISPLAY_ORDER.indexOf(bandB.key)
      const orderA = indexA === -1 ? GFX_BAND_DISPLAY_ORDER.length : indexA
      const orderB = indexB === -1 ? GFX_BAND_DISPLAY_ORDER.length : indexB
      return orderA - orderB
    })
  const onBands  = visibleBands.filter(b => b.isOn).length
  const offBands = visibleBands.length - onBands

  return (
    <div className="flex flex-col h-full bg-primary-bg">
      {/* Page header */}
      <div className="shrink-0 flex flex-wrap items-center gap-3 px-5 py-3 border-b border-b-white/6">
        <div className="flex items-center gap-2 text-white">
          <Layers size={18} className="text-[#3031cb]" />
          <span className="text-base font-semibold tracking-wide">Graphics Management</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-950/30 border border-emerald-400/18 text-base text-emerald-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> {onBands} ON
          </span>
          <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/3 border border-white/8 text-base text-white/80">
            {offBands} OFF
          </span>
        </div>
        {status.text && (
          <span className={cn('text-base px-2.5 py-1 rounded-full border',
            status.type === 'ok'  ? 'text-emerald-400 bg-emerald-950/20 border-emerald-400/18' :
            status.type === 'err' ? 'text-red-400 bg-red-950/20 border-red-400/18' :
                                    'text-amber-400 bg-amber-950/20 border-amber-400/18')}>
            {status.type === 'ok' ? `${visibleBands.length} bands` : status.text}
          </span>
        )}
        <div className="ml-auto">
          <button type="button" onClick={refresh} disabled={loading}
            className="flex h-10 items-center gap-1.5 px-4 text-base border border-white/8 bg-white/3 text-white/72 hover:text-white hover:bg-white/7 rounded-lg cursor-pointer transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
            <RefreshCw size={16} className={cn(loading && 'animate-spin')} /> Refresh
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">

        {/* ── Left: Band cards ──────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto p-4 min-w-0">
          {loading && visibleBands.length === 0 ? (
            <div className="flex items-center justify-center gap-2 pt-20 text-white/50">
              <Loader2 size={18} className="animate-spin" />
              <span className="text-base">Loading graphics bands…</span>
            </div>
          ) : visibleBands.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 pt-20">
              <Layers size={32} className="text-white/20" />
              <p className="text-base text-white/50">No bands found. Click Refresh to load.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {visibleBands.map(band => {
                const isTextBand   = TEXT_BANDS.has(band.key)
                const isAssetBand  = ASSET_BANDS.has(band.key)
                const rawAlignment = alignCache.alignment[band.key]
                const isBandCorrupted = typeof rawAlignment === 'number' || typeof rawAlignment === 'string'
                const hasPosition = typeof rawAlignment === 'number'
                  || typeof rawAlignment === 'string'
                  || (rawAlignment !== null && rawAlignment !== undefined && typeof rawAlignment === 'object' && Object.keys(rawAlignment as object).length > 0)
                const textPreview  = isTextBand  ? bandContent[band.key]?.find(i => !i.disabled)?.news_value : undefined
                const assetPreview = isAssetBand ? bandAssets[band.key]?.[0]?.name : undefined
                return (
                  <BandCard
                    key={band.key}
                    bandKey={band.key}
                    isOn={band.isOn}
                    isBusy={busy.has(band.key)}
                    color={BAND_COLORS[band.key] ?? DEFAULT_COLOR}
                    preview={textPreview ?? assetPreview}
                    isTextBand={isTextBand}
                    isAssetBand={isAssetBand}
                    isStylingOnly={STYLING_ONLY_BANDS.has(band.key)}
                    hasContent={isTextBand || isAssetBand}
                    hasLayout={LAYOUT_BANDS.has(band.key)}
                    hasPosition={hasPosition}
                    isBandCorrupted={isBandCorrupted}
                    onToggle={toggleBand}
                    onOpenDialog={openDialog}
                  />
                )
              })}
            </div>
          )}
        </div>

        {/* ── Right: Canvas preview panel ───────────────────────────────────── */}
        {/* TODO: Re-enable once band alignment values are verified and corrected */}
        {/* <div className="w-96 shrink-0 border-l border-white/6 flex flex-col overflow-hidden bg-[#070c15]">
          ...canvas preview and legend...
        </div> */}
      </div>

      {/* Dialogs */}
      {activeDialog?.type === 'content' && TEXT_BANDS.has(activeBandKey) && activeBandKey !== 'location_band' && (
        <GfxBandEditDialog open onOpenChange={o => { if (!o) closeDialog() }}
          label={activeBandName} onLoad={loadContent} onSave={saveContent} />
      )}
      {activeDialog?.type === 'content' && activeBandKey === 'location_band' && (
        <GfxLocationDialog open onOpenChange={o => { if (!o) closeDialog() }}
          onLoad={loadLocation} onSave={saveLocation} />
      )}
      {activeDialog?.type === 'content' && ASSET_BANDS.has(activeBandKey) && (
        <GfxAssetDialog open onOpenChange={o => { if (!o) closeDialog() }}
          bandKey={activeBandKey} label={activeBandName}
          onLoadSelection={loadAssetSelection} onLoadLibrary={loadAssetLibrary} onSave={saveAsset} />
      )}
      {activeDialog?.type === 'layout' && (
        <GfxLayoutDialog open onOpenChange={o => { if (!o) closeDialog() }}
          bandKey={activeBandKey} label={activeBandName} onLoad={loadLayout} onSave={saveLayout} />
      )}
      {activeDialog?.type === 'alignment' && (
        <GfxAlignmentDialog open onOpenChange={o => { if (!o) closeDialog() }}
          bandKey={activeBandKey} label={activeBandName} onLoad={loadAlignment} onSave={saveAlignment} onLoadBgAssets={loadBgAssets} />
      )}
    </div>
  )
}
