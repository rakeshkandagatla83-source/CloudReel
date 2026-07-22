import { useState, useCallback, useRef } from 'react'
import type { Source, Background, DbLayout, LocalTemplate, PubnubMsg, MixLayoutItem, WaterMarkItem, SaveStatus } from '../../types/layoutBuilder'
import { getStorage, setStorage } from '../../lib/storage'
import { getStudioCid, getBgBase } from '../../lib/studioConfig'
import {
  buildMixList,
  buildWmList,
  updateLayoutApi,
  addLayoutApi,
} from './layoutBuilderApi'

export const CANVAS_W = 1920
export const CANVAS_H = 1080
export const CANVAS_SCALE = 0.45
const STORAGE_KEY = 'lb_templates'

export function snapVal(v: number, s = 10): number {
  return Math.round(v / s) * s
}

function apiColorToHex(raw: string): string {
  return '#' + raw.replace('0x', '').replace('#', '')
}

function makeDefaultSource(n: number, x?: number, y?: number): Omit<Source, 'id'> {
  return {
    label: `Source ${n + 1}`,
    x: Math.max(0, x ?? 50 + n * 30),
    y: Math.max(0, y ?? 50 + n * 30),
    w: 400,
    h: 225,
    bgColor: '#000000',
    borderColor: '#ffffff',
    borderWidth: 0,
    borderRadius: 0,
    showCaption: true,
    captionText: '',
    captionBg: '#ffffff',
    captionColor: '#000000',
    captionFont: 'Arial',
    captionFontSize: 18,
    captionBorderColor: '#ffffff',
    captionBorderWidth: 0,
    captionRadius: 0,
    captionAnim: 0,
  }
}

const DEFAULT_BG: Background = { color: '#1a1a2e', imageUrl: '', bgAssetName: '', imageFit: 'cover' }

export interface UseLayoutBuilderReturn {
  sources: Source[]
  bg: Background
  selectedId: string | null
  dbLayoutMeta: DbLayout | null
  editingId: string | null
  editingName: string
  builderGroup: string
  builderCaption: string
  builderIsBg: boolean
  setBuilderGroup: (v: string) => void
  setBuilderCaption: (v: string) => void
  setBuilderIsBg: (v: boolean) => void
  saveStatus: SaveStatus
  saveMessage: string
  addSource: (x?: number, y?: number) => Source
  deleteSelected: () => void
  selectSource: (id: string | null) => void
  updateSource: (id: string, patch: Partial<Source>) => void
  moveSource: (id: string, x: number, y: number) => void
  resizeSource: (id: string, w: number, h: number) => void
  resizeTransformSource: (id: string, x: number, y: number, w: number, h: number) => void
  clipboardSource: Omit<Source, 'id'> | null
  copySource: (id: string) => void
  pasteSource: () => string | null
  duplicateSource: (id: string) => string | null
  setBg: (patch: Partial<Background>) => void
  importDbLayout: (layout: DbLayout) => void
  resetBuilder: () => void
  openLocalTemplate: (tpl: LocalTemplate) => void
  saveLocal: (name: string, groupName: string) => boolean
  saveToDb: (groupName: string, captionName: string) => Promise<void>
  addToDb: (groupName: string, captionName: string) => Promise<void>
  getLocalTemplates: () => LocalTemplate[]
  deleteLocalTemplate: (id: string) => void
  getGroupSuggestions: () => string[]
}

export function useLayoutBuilder(): UseLayoutBuilderReturn {
  const idRef = useRef(1)
  const sourcesRef = useRef<Source[]>([])
  const bgRef = useRef<Background>({ ...DEFAULT_BG })
  const dbMetaRef = useRef<DbLayout | null>(null)
  const editingIdRef = useRef<string | null>(null)

  const [sources, setSourcesState] = useState<Source[]>([])
  const [bg, setBgState] = useState<Background>({ ...DEFAULT_BG })
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [dbLayoutMeta, setDbLayoutMetaState] = useState<DbLayout | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const [builderGroup, setBuilderGroup] = useState('')
  const [builderCaption, setBuilderCaption] = useState('')
  const [builderIsBg, setBuilderIsBg] = useState(false)
  const builderIsBgRef = useRef(false)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const [saveMessage, setSaveMessage] = useState('')
  const [clipboardSource, setClipboardSource] = useState<Omit<Source, 'id'> | null>(null)
  const clipboardRef = useRef<Omit<Source, 'id'> | null>(null)

  const setIsBg = useCallback((v: boolean) => {
    builderIsBgRef.current = v
    setBuilderIsBg(v)
  }, [])

  const setSources = useCallback((next: Source[]) => {
    sourcesRef.current = next
    setSourcesState(next)
  }, [])

  const setBg = useCallback((patch: Partial<Background>) => {
    const next = { ...bgRef.current, ...patch }
    bgRef.current = next
    setBgState(next)
  }, [])

  const setDbLayoutMeta = useCallback((meta: DbLayout | null) => {
    dbMetaRef.current = meta
    setDbLayoutMetaState(meta)
  }, [])

  const makeId = useCallback(() => `src_${idRef.current++}`, [])

  const addSource = useCallback(
    (x?: number, y?: number): Source => {
      const n = sourcesRef.current.length
      const s: Source = { id: makeId(), ...makeDefaultSource(n, x, y) }
      setSources([...sourcesRef.current, s])
      return s
    },
    [makeId, setSources],
  )

  const deleteSelected = useCallback(() => {
    setSelectedId((prev) => {
      if (!prev) return null
      setSources(sourcesRef.current.filter((s) => s.id !== prev))
      return null
    })
  }, [setSources])

  const selectSource = useCallback((id: string | null) => {
    setSelectedId(id)
  }, [])

  const updateSource = useCallback(
    (id: string, patch: Partial<Source>) => {
      setSources(sourcesRef.current.map((s) => (s.id === id ? { ...s, ...patch } : s)))
    },
    [setSources],
  )

  const moveSource = useCallback(
    (id: string, x: number, y: number) => {
      setSources(sourcesRef.current.map((s) => (s.id === id ? { ...s, x, y } : s)))
    },
    [setSources],
  )

  const resizeSource = useCallback(
    (id: string, w: number, h: number) => {
      setSources(sourcesRef.current.map((s) => (s.id === id ? { ...s, w, h } : s)))
    },
    [setSources],
  )

  const resizeTransformSource = useCallback(
    (id: string, x: number, y: number, w: number, h: number) => {
      setSources(sourcesRef.current.map((s) => (s.id === id ? { ...s, x, y, w, h } : s)))
    },
    [setSources],
  )

  const copySource = useCallback((id: string) => {
    const src = sourcesRef.current.find((s) => s.id === id)
    if (!src) return
    const { id: _srcId, ...rest } = src
    void _srcId
    clipboardRef.current = rest
    setClipboardSource(rest)
  }, [])

  const pasteSource = useCallback((): string | null => {
    const clipboard = clipboardRef.current
    if (!clipboard) return null
    const n = sourcesRef.current.length
    const newX = snapVal(Math.min(CANVAS_W - clipboard.w, clipboard.x + 30))
    const newY = snapVal(Math.min(CANVAS_H - clipboard.h, clipboard.y + 30))
    const newId = makeId()
    const s: Source = { id: newId, ...clipboard, x: newX, y: newY, label: `Source ${n + 1}` }
    setSources([...sourcesRef.current, s])
    setSelectedId(newId)
    return newId
  }, [makeId, setSources])

  const duplicateSource = useCallback((id: string): string | null => {
    const src = sourcesRef.current.find((s) => s.id === id)
    if (!src) return null
    const n = sourcesRef.current.length
    const newX = snapVal(Math.min(CANVAS_W - src.w, src.x + 30))
    const newY = snapVal(Math.min(CANVAS_H - src.h, src.y + 30))
    const newId = makeId()
    const s: Source = { ...src, id: newId, x: newX, y: newY, label: `Source ${n + 1}` }
    setSources([...sourcesRef.current, s])
    setSelectedId(newId)
    return newId
  }, [makeId, setSources])

  const importDbLayout = useCallback(
    (layout: DbLayout) => {
      let mixList: MixLayoutItem[] = []
      let wmList: WaterMarkItem[] = []
      try {
        const parsed = JSON.parse(layout.pubnubMsg) as PubnubMsg
        mixList = parsed.MixLayoutList ?? []
        wmList = parsed.WaterMarkList ?? []
      } catch {
        // ignore malformed pubnubMsg
      }

      const imported: Source[] = mixList.map((m, i) => {
        const wm = (wmList[i] ?? {}) as Partial<WaterMarkItem>
        return {
          id: makeId(),
          label: `Source ${i + 1}`,
          x: m.LocationX,
          y: m.LocationY,
          w: m.ImageWidth,
          h: m.ImageHeight,
          bgColor: apiColorToHex(m.BackGroundColor ?? '0x000000'),
          borderColor: apiColorToHex(m.BorderColor ?? '0x000000'),
          borderWidth: m.BorderWidth ?? 0,
          borderRadius: m.BorderRadius ?? 0,
          captionText: wm.Text ?? '',
          captionFont: wm.FontFamily ?? 'Arial',
          captionFontSize: Number(wm.FontSize) || 18,
          captionColor: apiColorToHex(wm.FontColor ?? '0x000000'),
          captionBg: apiColorToHex(wm.BackGroundColor ?? '0xffffff'),
          captionBorderColor: apiColorToHex(wm.BorderColor ?? '0x000000'),
          captionBorderWidth: wm.BorderWidth ?? 0,
          captionRadius: wm.BorderRadius ?? 0,
          captionAnim: wm.Animation ?? 0,
          showCaption: wm.ShowCaption ?? false,
        }
      })

      setSources(imported)
      const bgAssetName = layout.bgVideo ?? ''
      const newBg: Background = {
        ...DEFAULT_BG,
        bgAssetName,
        imageUrl: bgAssetName ? `${getBgBase()}${bgAssetName}` : '',
      }
      bgRef.current = newBg
      setBgState(newBg)
      setSelectedId(null)
      setDbLayoutMeta(layout)
      editingIdRef.current = null
      setEditingId(null)
      setEditingName(layout.caption)
      setBuilderGroup(layout.groupName ?? '')
      setBuilderCaption(layout.caption ?? '')
      setIsBg(Boolean(layout.isBG))
      setSaveStatus('idle')
      setSaveMessage('')
    },
    [makeId, setSources, setDbLayoutMeta, setIsBg],
  )

  const resetBuilder = useCallback(() => {
    setSources([])
    const newBg = { ...DEFAULT_BG }
    bgRef.current = newBg
    setBgState(newBg)
    setSelectedId(null)
    setDbLayoutMeta(null)
    editingIdRef.current = null
    setEditingId(null)
    setEditingName('')
    setBuilderGroup('')
    setBuilderCaption('')
    setIsBg(false)
    setSaveStatus('idle')
    setSaveMessage('')
  }, [setSources, setDbLayoutMeta, setIsBg])

  const openLocalTemplate = useCallback(
    (tpl: LocalTemplate) => {
      const loaded = tpl.sources.map((s) => ({ ...s, id: makeId() }))
      setSources(loaded)
      const newBg = { ...tpl.bg }
      bgRef.current = newBg
      setBgState(newBg)
      setSelectedId(null)
      setDbLayoutMeta(null)
      editingIdRef.current = tpl.id
      setEditingId(tpl.id)
      setEditingName(tpl.name)
      setBuilderGroup(tpl.groupName ?? '')
      setBuilderCaption(tpl.name ?? '')
      setIsBg(tpl.isBg ?? false)
      setSaveStatus('idle')
      setSaveMessage('')
    },
    [makeId, setSources, setDbLayoutMeta, setIsBg],
  )

  const getLocalTemplates = useCallback((): LocalTemplate[] => {
    return getStorage<LocalTemplate[]>(STORAGE_KEY) ?? []
  }, [])

  const saveLocal = useCallback(
    (name: string, groupName: string): boolean => {
      try {
        const id = editingIdRef.current ?? `tpl_${Date.now()}`
        const tpl: LocalTemplate = {
          id,
          name,
          groupName,
          isBg: builderIsBgRef.current,
          sources: sourcesRef.current.map((s) => {
            const { id: _srcId, ...rest } = s
            void _srcId
            return rest
          }),
          bg: { ...bgRef.current },
          updatedAt: Date.now(),
        }
        const all = getStorage<LocalTemplate[]>(STORAGE_KEY) ?? []
        const idx = all.findIndex((t) => t.id === id)
        if (idx >= 0) all[idx] = tpl
        else all.unshift(tpl)
        setStorage(STORAGE_KEY, all)
        editingIdRef.current = id
        setEditingId(id)
        setEditingName(name)
        return true
      } catch {
        return false
      }
    },
    [],
  )

  const deleteLocalTemplate = useCallback((id: string) => {
    const all = getStorage<LocalTemplate[]>(STORAGE_KEY) ?? []
    setStorage(STORAGE_KEY, all.filter((t) => t.id !== id))
  }, [])

  const saveToDb = useCallback(
    async (groupName: string, captionName: string) => {
      const meta = dbMetaRef.current
      if (!meta) throw new Error('No DB layout loaded')
      setSaveStatus('saving')
      setSaveMessage('Saving...')
      try {
        const mixList = buildMixList(sourcesRef.current)
        const wmList = buildWmList(sourcesRef.current)
        const pubnubMsg = JSON.stringify({ MixLayoutList: mixList, WaterMarkList: wmList })
        await updateLayoutApi({
          data: {
            id: meta.id,
            cid: meta.cid,
            caption: captionName,
            windowsCount: sourcesRef.current.length,
            groupName,
            pubnubMsg,
            isTransition: meta.isTransition,
            isSecondary: meta.isSecondary,
            isBG: builderIsBgRef.current ? 1 : 0,
            transitionVideo: meta.transitionVideo || '',
            bgVideo: bgRef.current.bgAssetName,
            secondaryPlayMode: meta.secondaryPlayMode || '',
          },
        })
        const updatedMeta = {
          ...meta,
          windowsCount: sourcesRef.current.length,
          pubnubMsg,
          groupName,
          caption: captionName,
        }
        dbMetaRef.current = updatedMeta
        setDbLayoutMetaState(updatedMeta)
        setSaveStatus('ok')
        setSaveMessage('Saved to DB')
      } catch (e) {
        setSaveStatus('error')
        setSaveMessage(e instanceof Error ? e.message : 'Save failed')
        throw e
      }
    },
    [],
  )

  const addToDb = useCallback(
    async (groupName: string, captionName: string) => {
      const cid = Number(getStudioCid() ?? 0)
      setSaveStatus('saving')
      setSaveMessage('Adding...')
      try {
        const mixList = buildMixList(sourcesRef.current)
        const wmList = buildWmList(sourcesRef.current)
        const pubnubMsg = JSON.stringify({ MixLayoutList: mixList, WaterMarkList: wmList })
        await addLayoutApi({
          data: [
            {
              id: 0,
              cid,
              caption: captionName,
              windowsCount: sourcesRef.current.length,
              groupName,
              pubnubMsg,
              isTransition: 0,
              isSecondary: 0,
              isBG: builderIsBgRef.current ? 1 : 0,
              transitionVideo: '',
              bgVideo: bgRef.current.bgAssetName,
              secondaryPlayMode: '',
            },
          ],
        })
        setSaveStatus('ok')
        setSaveMessage('Added to DB')
      } catch (e) {
        setSaveStatus('error')
        setSaveMessage(e instanceof Error ? e.message : 'Add failed')
        throw e
      }
    },
    [],
  )

  const getGroupSuggestions = useCallback((): string[] => {
    const stored = getStorage<LocalTemplate[]>(STORAGE_KEY) ?? []
    return [...new Set(stored.map((t) => t.groupName).filter(Boolean))].sort()
  }, [])

  return {
    sources,
    bg,
    selectedId,
    dbLayoutMeta,
    editingId,
    editingName,
    builderGroup,
    builderCaption,
    builderIsBg,
    setBuilderGroup,
    setBuilderCaption,
    setBuilderIsBg: setIsBg,
    saveStatus,
    saveMessage,
    addSource,
    deleteSelected,
    selectSource,
    updateSource,
    moveSource,
    resizeSource,
    resizeTransformSource,
    clipboardSource,
    copySource,
    pasteSource,
    duplicateSource,
    setBg,
    importDbLayout,
    resetBuilder,
    openLocalTemplate,
    saveLocal,
    saveToDb,
    addToDb,
    getLocalTemplates,
    deleteLocalTemplate,
    getGroupSuggestions,
  }
}
