import { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import {
  Search,
  LayoutGrid,
  List,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  CloudUpload,
  X,
  Check,
  Grid2x2,
  StretchHorizontal,
  Table2,
  Trash2,
  Pencil,
  Eye,
  Download,
} from 'lucide-react'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import * as RadixDialog from '@radix-ui/react-dialog'
import { getStorage, setStorage, removeStorage } from '../lib/storage'
import { http } from '../lib/http'
import { apiConfig } from '../lib/apiConfig'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { UpgradeModal } from '../components/ui/UpgradeModal'
import * as Toast from '@radix-ui/react-toast'
import { useSubscription } from '../features/subscription/useSubscription'
import { useAssets } from '../features/assets/useAssets'
import { AssetGrid, type GridSize } from '../features/assets/AssetGrid'
import { AssetList, ALL_COLUMNS, DEFAULT_VISIBLE, type ColumnKey } from '../features/assets/AssetList'
import { AssetFilters } from '../features/assets/AssetFilters'
import { AssetPreviewPanel } from '../features/assets/AssetPreviewPanel'
import { UploadModal } from '../features/assets/UploadModal'
import { MediaPublishModal } from '../features/assets/MediaPublishModal'
import { SORT_OPTIONS } from '../features/assets/assetUtils'
import { getVideoBase, getBgBase } from '../lib/studioConfig'
import { checkUploadInstanceStatus, checkInstanceStatus } from '../lib/socialAuthService'
import type { Asset, AssetFilterState } from '../types/asset'
import type { PublishType } from '../types/mediaPublish'

type ViewMode = 'grid' | 'list'

const PAGE_SIZE_OPTIONS = [25, 50, 100, 200]

export function AssetsPage() {
  const { assets, loading, error, filters, applyFilters, goToPage, hasMore, totalPages, refetch } = useAssets()
  const { isSubscribed } = useSubscription()

  const [view, setView] = useState<ViewMode>(() => getStorage<ViewMode>('pcr_mam_view') ?? 'grid')
  const [gridSize, setGridSize] = useState<GridSize>(() => getStorage<GridSize>('pcr_mam_grid_size') ?? 'md')
  const [visibleCols, setVisibleCols] = useState<Set<ColumnKey>>(DEFAULT_VISIBLE)

  const toggleCol = useCallback((key: ColumnKey) => {
    setVisibleCols((prev) => {
      const next = new Set(prev)
      if (next.has(key)) {
        if (next.size <= 2) return prev
        next.delete(key)
      } else {
        next.add(key)
      }
      return next
    })
  }, [])
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [uploadOpen, setUploadOpen] = useState(false)
  const [uploadMinimized, setUploadMinimized] = useState(false)
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null)
  const [checkedIds, setCheckedIds] = useState(new Set<number>())
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [assetToDelete, setAssetToDelete] = useState<Asset | null>(null)
  const [confirmSingleDeleteOpen, setConfirmSingleDeleteOpen] = useState(false)
  const [assetToRename, setAssetToRename] = useState<Asset | null>(null)
  const [renameDialogOpen, setRenameDialogOpen] = useState(false)
  const [renameDraft, setRenameDraft] = useState('')
  const [renaming, setRenaming] = useState(false)
  const [searchDraft, setSearchDraft] = useState(filters.name)
  const [toastOpen, setToastOpen] = useState(false)
  const [toastMsg, setToastMsg] = useState('')
  const [toastTitle, setToastTitle] = useState('Failed to load assets')
  const [toastVariant, setToastVariant] = useState<'error' | 'success'>('error')
  const errorShown = useRef<string | null>(null)
  const [mediaPublishTarget, setMediaPublishTarget] = useState<{ asset: Asset; publishType: PublishType } | null>(null)
  const [noSubModalOpen, setNoSubModalOpen] = useState(false)

  useEffect(() => {
    document.title = 'CloudReel - Media Asset Management'
    return () => { removeStorage('pcr_mam_pgno') }
  }, [])

  // Show toast when error changes
  useEffect(() => {
    if (error && error !== errorShown.current) {
      errorShown.current = error
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setToastVariant('error')
      setToastTitle('Failed to load assets')
      setToastMsg(error)
      setToastOpen(true)
    }
  }, [error])

  // Clear selection on page/filter change
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setCheckedIds(new Set()) }, [filters])

  useEffect(() => { setStorage('pcr_mam_view', view) }, [view])
  useEffect(() => { setStorage('pcr_mam_grid_size', gridSize) }, [gridSize])

  const handleSearch = useCallback(() => {
    applyFilters({ name: searchDraft })
  }, [applyFilters, searchDraft])

  const handleSearchKey = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') handleSearch()
    },
    [handleSearch],
  )

  const handleClearSearch = useCallback(() => {
    setSearchDraft('')
    applyFilters({ name: '' })
  }, [applyFilters])

  const handleApplyFilters = useCallback(
    (updates: Partial<AssetFilterState>) => {
      applyFilters(updates)
    },
    [applyFilters],
  )

  const handleSelect = useCallback((asset: Asset) => {
    setSelectedAsset((prev) => (prev?.aid === asset.aid ? null : asset))
  }, [])

  const handleClosePreview = useCallback(() => setSelectedAsset(null), [])

  const handleCheck = useCallback((asset: Asset) => {
    setCheckedIds((prev) => {
      const next = new Set(prev)
      if (next.has(asset.aid)) next.delete(asset.aid)
      else next.add(asset.aid)
      return next
    })
  }, [])

  const handleCheckAll = useCallback(() => {
    if (assets.length > 0 && assets.every((a) => checkedIds.has(a.aid))) {
      setCheckedIds(new Set())
    } else {
      setCheckedIds(new Set(assets.map((a) => a.aid)))
    }
  }, [assets, checkedIds])

  const handleClearChecked = useCallback(() => setCheckedIds(new Set()), [])

  const handleMenuDelete = useCallback((asset: Asset) => {
    setAssetToDelete(asset)
    setConfirmSingleDeleteOpen(true)
  }, [])

  const downloadAsset = useCallback((asset: Asset) => {
    const isGraphic = asset.misc?.category === 'S'
    const url = (isGraphic ? getBgBase() : getVideoBase()) + encodeURIComponent(asset.name)
    const anchor = document.createElement('a')
    anchor.href = url
    anchor.target = '_blank'
    anchor.rel = 'noopener noreferrer'
    anchor.click()
  }, [])

  const handleMenuDownload = useCallback((asset: Asset) => {
    downloadAsset(asset)
  }, [downloadAsset])

  const handleMenuPublish = useCallback(async (asset: Asset) => {
    if (!isSubscribed) {
      setNoSubModalOpen(true)
      return
    }
    const isAvailable = await checkUploadInstanceStatus()
    if (!isAvailable) {
      setToastVariant('error')
      setToastTitle('Instance not available')
      setToastMsg('The media publish instance is currently busy. Please try again later.')
      setToastOpen(true)
      return
    }
    setMediaPublishTarget({ asset, publishType: 'vodToVod' })
  }, [isSubscribed])

  const handleMenuPublishAsLive = useCallback(async (asset: Asset) => {
    if (!isSubscribed) {
      setNoSubModalOpen(true)
      return
    }
    const cid = getStorage<string>('pcr_channel_id') ?? ''
    const isAvailable = await checkInstanceStatus(cid)
    if (!isAvailable) {
      setToastVariant('error')
      setToastTitle('Instance not available')
      setToastMsg('The live publish instance is currently busy. Please try again later.')
      setToastOpen(true)
      return
    }
    setMediaPublishTarget({ asset, publishType: 'vodToLive' })
  }, [isSubscribed])

  const handleBulkDownload = useCallback(() => {
    assets.filter(a => checkedIds.has(a.aid)).forEach((asset) => downloadAsset(asset))
  }, [assets, checkedIds, downloadAsset])

  const handleSingleDeleteConfirm = useCallback(async () => {
    if (!assetToDelete) return
    const asset = assetToDelete
    const token = getStorage<string>('pcr_token') ?? ''
    const cid = getStorage<string>('pcr_channel_id') ?? ''
    const userId = getStorage<string>('pcr_user_id') ?? ''
    const headers = { 'Content-Type': 'application/json', 'x-auth-token': token, 'x-channel-id': cid }
    const startTime = Date.now()
    let remarks = 'Deleted (Library)'
    try {
      const res = await http.post<{ code: number; message?: string }>(
        apiConfig.scalaApiBase,
        'v1/playout/multi/delAssets',
        { cid: Number(cid), aids: [asset.aid] },
        { headers },
      )
      const success = res.code === 1
      remarks = success ? 'Deleted (Library)' : (res.message ?? 'Delete failed')
      setToastVariant(success ? 'success' : 'error')
      setToastTitle(success ? 'Deleted successfully' : 'Delete failed')
      setToastMsg(success ? `"${asset.name}" deleted.` : remarks)
      setToastOpen(true)
      if (success) refetch()
    } catch {
      remarks = 'Delete failed'
      setToastVariant('error')
      setToastTitle('Delete failed')
      setToastMsg('An error occurred while deleting the asset.')
      setToastOpen(true)
    }
    const endTime = Date.now()
    http.post(
      apiConfig.scalaApiBase,
      'v1/playout/addassethistory',
      {
        cid: Number(cid),
        aid: asset.aid,
        aname: asset.name,
        finalaname: '',
        task: 'Delete',
        filesize: asset.filesize,
        starttime: startTime,
        endtime: endTime,
        status: 'Done',
        remarks,
        userid: Number(userId),
      },
      { headers },
    ).catch(() => {})
    setAssetToDelete(null)
  }, [assetToDelete, refetch])

  const handleMenuRename = useCallback((asset: Asset) => {
    setAssetToRename(asset)
    setRenameDraft(asset.name)
    setRenameDialogOpen(true)
  }, [])

  const handleRenameConfirm = useCallback(async () => {
    if (!assetToRename || !renameDraft.trim()) return
    const token = getStorage<string>('pcr_token') ?? ''
    const cid = getStorage<string>('pcr_channel_id') ?? ''
    const userId = getStorage<string>('pcr_user_id') ?? ''
    const headers = { 'Content-Type': 'application/json', 'x-auth-token': token, 'x-channel-id': cid }
    setRenaming(true)
    try {
      const res = await http.post<{ code: number; message?: string }>(
        apiConfig.scalaApiBase,
        'v2/playout/renameasset',
        {
          aid: assetToRename.aid,
          newassetname: renameDraft.trim(),
          newdisplayname: assetToRename.displayname,
          uid: Number(userId),
        },
        { headers },
      )
      const success = res.code === 1
      if (success) {
        http.post(
          apiConfig.scalaApiBase,
          'v1/qc/add',
          {
            aid: assetToRename.aid,
            remarks: assetToRename.misc?.remarks ?? '',
            tags: assetToRename.misc?.tags ?? '',
            subCategory: assetToRename.misc?.subCategory ?? '',
            season: assetToRename.misc?.season ?? 0,
            episode: assetToRename.misc?.episode ?? 0,
          },
          { headers },
        ).catch(() => {})
        refetch()
      }
      setToastVariant(success ? 'success' : 'error')
      setToastTitle(success ? 'Renamed successfully' : 'Rename failed')
      setToastMsg(success ? `Asset renamed to "${renameDraft.trim()}".` : (res.message ?? 'Rename failed'))
      setToastOpen(true)
    } catch {
      setToastVariant('error')
      setToastTitle('Rename failed')
      setToastMsg('An error occurred while renaming the asset.')
      setToastOpen(true)
    }
    setRenaming(false)
    setRenameDialogOpen(false)
    setAssetToRename(null)
  }, [assetToRename, renameDraft, refetch])

  const handleDeleteConfirm = useCallback(async () => {
    const token = getStorage<string>('pcr_token') ?? ''
    const cid = getStorage<string>('pcr_channel_id') ?? ''
    const userId = getStorage<string>('pcr_user_id') ?? ''
    const toDelete = assets.filter((a) => checkedIds.has(a.aid))
    if (toDelete.length === 0) return
    setDeleting(true)
    const startTime = Date.now()
    const headers = { 'Content-Type': 'application/json', 'x-auth-token': token, 'x-channel-id': cid }
    let remarks = 'Deleted (Library)'
    try {
      const res = await http.post<{ code: number; message?: string }>(
        apiConfig.scalaApiBase,
        'v1/playout/multi/delAssets',
        { cid: Number(cid), aids: toDelete.map((a) => a.aid) },
        { headers },
      )
      const success = res.code === 1
      remarks = success ? 'Deleted (Library)' : (res.message ?? 'Delete failed')
      setToastVariant(success ? 'success' : 'error')
      setToastTitle(success ? 'Deleted successfully' : 'Delete failed')
      setToastMsg(success ? `${toDelete.length} asset${toDelete.length !== 1 ? 's' : ''} deleted.` : remarks)
      setToastOpen(true)
    } catch {
      remarks = 'Delete failed'
      setToastVariant('error')
      setToastTitle('Delete failed')
      setToastMsg('An error occurred while deleting assets.')
      setToastOpen(true)
    }
    const endTime = Date.now()
    await Promise.allSettled(
      toDelete.map((asset) =>
        http.post(
          apiConfig.scalaApiBase,
          'v1/playout/addassethistory',
          {
            cid: Number(cid),
            aid: asset.aid,
            aname: asset.name,
            finalaname: '',
            task: 'Delete',
            filesize: asset.filesize,
            starttime: startTime,
            endtime: endTime,
            status: 'Done',
            remarks,
            userid: Number(userId),
          },
          { headers },
        ),
      ),
    )
    setDeleting(false)
    setCheckedIds(new Set())
    refetch()
  }, [assets, checkedIds, refetch])

  const handlePageSizeChange = useCallback(
    (size: number) => {
      applyFilters({ pgsize: size })
    },
    [applyFilters],
  )

  const pageNumbers = useMemo((): (number | '...')[] => {
    const cur = filters.pgno
    const windowSize = 2
    const start = Math.max(2, cur - windowSize)
    const rawEnd = cur + (hasMore ? windowSize : 0)
    const end = totalPages ? Math.min(totalPages, rawEnd) : rawEnd
    const pages: (number | '...')[] = [1]
    if (start > 2) pages.push('...')
    for (let i = start; i <= end; i++) pages.push(i)
    return pages
  }, [filters.pgno, hasMore, totalPages])

  const handleSortChange = useCallback(
    (value: string) => {
      applyFilters({ order: value })
    },
    [applyFilters],
  )

  const currentSort = SORT_OPTIONS.find((o) => o.value === filters.order) ?? SORT_OPTIONS[0]
  const allChecked = assets.length > 0 && assets.every((a) => checkedIds.has(a.aid))
  const someChecked = !allChecked && assets.some((a) => checkedIds.has(a.aid))

  return (
    <Toast.Provider swipeDirection="right">
      <div className="flex h-full flex-col">
        <div className="flex-1 overflow-y-auto px-6 py-8">
          {/* Header row — heading + controls + upload */}
          <div className="mb-4 flex flex-wrap items-center gap-2.5">
            {/* Heading */}
            <div className="mr-2 shrink-0">
              <h1 className="text-xl font-bold tracking-tight text-white">Media Assets</h1>
              <p className="text-base text-white/60">Browse, search and manage your media library</p>
            </div>

            {/* Search */}
            <div className="relative flex min-w-0 flex-1 items-center sm:max-w-xs">
              <Search size={16} className="pointer-events-none absolute left-3 text-white/40" />
              <input
                type="text"
                placeholder="Search assets…"
                value={searchDraft}
                onChange={(e) => setSearchDraft(e.target.value)}
                onKeyDown={handleSearchKey}
                className="h-10 w-full rounded-xl border border-white/10 bg-white/5 pl-9 pr-9 text-base text-white placeholder-white/30 outline-none transition-colors hover:border-white/20 focus:border-white/30 focus:ring-1 focus:ring-white/20"
              />
              {searchDraft && (
                <button onClick={handleClearSearch} className="absolute right-3 cursor-pointer text-white/40 hover:text-white/80">
                  <X size={16} />
                </button>
              )}
            </div>

            {/* Filters toggle */}
            <button
              onClick={() => setFiltersOpen((v) => !v)}
              className={`flex h-10 cursor-pointer items-center gap-1.5 rounded-xl border px-3.5 text-base transition-colors ${filtersOpen
                ? 'border-blue-500/40 bg-blue-500/10 text-blue-400'
                : 'border-white/10 bg-white/5 text-white/60 hover:border-white/20 hover:text-white/80'
                }`}
            >
              <SlidersHorizontal size={14} />
              Filters
            </button>

            {/* Sort */}
            <DropdownMenu.Root>
              <DropdownMenu.Trigger asChild>
                <button className="flex h-10 cursor-pointer items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3.5 text-base text-white/60 transition-colors hover:border-white/20 hover:text-white/80 focus-visible:outline-none">
                  <span>{currentSort.label}</span>
                  <svg width="10" height="6" viewBox="0 0 10 6" fill="none" className="text-white/40">
                    <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              </DropdownMenu.Trigger>
              <DropdownMenu.Portal>
                <DropdownMenu.Content align="end" sideOffset={6} className="z-50 min-w-45 overflow-hidden rounded-xl border border-white/15 bg-[#111827] p-1 shadow-2xl shadow-black/60">
                  {SORT_OPTIONS.map((opt) => (
                    <DropdownMenu.Item
                      key={opt.value}
                      onSelect={() => handleSortChange(opt.value)}
                      className="flex cursor-pointer select-none items-center justify-between gap-2 rounded-lg px-3 py-2 text-base text-white/70 outline-none transition-colors hover:bg-white/8 hover:text-white data-highlighted:bg-white/8 data-highlighted:text-white"
                    >
                      {opt.label}
                      {filters.order === opt.value && <Check size={12} className="text-blue-400" />}
                    </DropdownMenu.Item>
                  ))}
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>

            {/* Bulk actions */}
            {checkedIds.size > 0 && (
              <div id="assets-bulk-actions" className="flex items-center gap-1.5">
                <span className="text-base text-white/50">{checkedIds.size} selected</span>
                <button
                  id="assets-bulk-btn-download"
                  onClick={handleBulkDownload}
                  className="flex h-10 cursor-pointer items-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-3.5 text-base text-white/70 transition-colors hover:border-white/25 hover:bg-white/10"
                >
                  <Download size={14} />
                  Download
                </button>
                <button
                  id="assets-bulk-btn-delete"
                  onClick={() => setConfirmDeleteOpen(true)}
                  disabled={deleting}
                  className="flex h-10 cursor-pointer items-center gap-1.5 rounded-xl border border-red-500/30 bg-red-500/10 px-3.5 text-base text-red-400 transition-colors hover:border-red-500/50 hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Trash2 size={14} />
                  Delete
                </button>
                <button
                  id="assets-bulk-btn-clear"
                  onClick={handleClearChecked}
                  className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg border border-white/10 bg-white/5 text-white/40 transition-colors hover:border-white/20 hover:text-white/70"
                >
                  <X size={14} />
                </button>
              </div>
            )}

            {/* ml-auto pushes view + upload to the end */}
            <div className="ml-auto flex items-center gap-2">
              {/* Columns dropdown — list view only */}
              {view === 'list' && (
                <DropdownMenu.Root>
                  <DropdownMenu.Trigger asChild>
                    <button className="flex h-10 cursor-pointer items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3.5 text-base text-white/60 transition-colors hover:border-white/20 hover:text-white/80 focus-visible:outline-none">
                      <Eye size={14} />
                      Columns
                    </button>
                  </DropdownMenu.Trigger>
                  <DropdownMenu.Portal>
                    <DropdownMenu.Content
                      align="end"
                      sideOffset={6}
                      className="z-50 min-w-44 overflow-hidden rounded-xl border border-white/15 bg-[#111827] p-1 shadow-2xl shadow-black/60"
                    >
                      {ALL_COLUMNS.map((col) => (
                        <DropdownMenu.CheckboxItem
                          key={col.key}
                          checked={visibleCols.has(col.key)}
                          onCheckedChange={() => toggleCol(col.key)}
                          onSelect={(e) => e.preventDefault()}
                          className="flex cursor-pointer select-none items-center gap-2 rounded-lg px-3 py-2 text-base text-white/70 outline-none transition-colors hover:bg-white/8 hover:text-white data-highlighted:bg-white/8 data-highlighted:text-white"
                        >
                          <DropdownMenu.ItemIndicator>
                            <Check size={12} className="text-blue-400" />
                          </DropdownMenu.ItemIndicator>
                          <span className={visibleCols.has(col.key) ? '' : 'pl-4'}>{col.label}</span>
                        </DropdownMenu.CheckboxItem>
                      ))}
                    </DropdownMenu.Content>
                  </DropdownMenu.Portal>
                </DropdownMenu.Root>
              )}

              {/* View toggle — grid icon opens size dropdown, list icon is standalone */}
              <div className="flex items-center rounded-xl border border-white/10 bg-white/5 p-0.5">
                {/* Grid with size dropdown */}
                <DropdownMenu.Root>
                  <DropdownMenu.Trigger asChild>
                    <button
                      title="Grid view"
                      className={`flex h-9 w-10 cursor-pointer items-center justify-center rounded-lg transition-colors focus-visible:outline-none ${view === 'grid' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/70'
                        }`}
                    >
                      <LayoutGrid size={14} />
                    </button>
                  </DropdownMenu.Trigger>
                  <DropdownMenu.Portal>
                    <DropdownMenu.Content
                      align="end"
                      sideOffset={8}
                      className="z-50 w-36 overflow-hidden rounded-xl border border-white/15 bg-[#111827] p-1 shadow-2xl shadow-black/60"
                    >
                      <p className="px-3 pb-1.5 pt-2 text-sm font-medium uppercase tracking-widest text-white/40">
                        Grid size
                      </p>
                      {([
                        { size: 'sm' as GridSize, icon: <Table2 size={13} />, label: 'Small' },
                        { size: 'md' as GridSize, icon: <Grid2x2 size={13} />, label: 'Medium' },
                        { size: 'lg' as GridSize, icon: <StretchHorizontal size={13} />, label: 'Large' },
                      ]).map(({ size, icon, label }) => (
                        <DropdownMenu.Item
                          key={size}
                          onSelect={() => { setView('grid'); setGridSize(size) }}
                          className="flex cursor-pointer select-none items-center justify-between gap-2 rounded-lg px-3 py-2 text-base text-white/70 outline-none transition-colors hover:bg-white/8 hover:text-white data-highlighted:bg-white/8 data-highlighted:text-white"
                        >
                          <span className="flex items-center gap-2">{icon}{label}</span>
                          {view === 'grid' && gridSize === size && <Check size={12} className="text-blue-400" />}
                        </DropdownMenu.Item>
                      ))}
                    </DropdownMenu.Content>
                  </DropdownMenu.Portal>
                </DropdownMenu.Root>

                {/* List */}
                <button
                  title="List view"
                  onClick={() => setView('list')}
                  className={`flex h-9 w-10 cursor-pointer items-center justify-center rounded-lg transition-colors ${view === 'list' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/70'
                    }`}
                >
                  <List size={14} />
                </button>
              </div>

              {/* Upload */}
              <button
                onClick={() => { setUploadOpen(true); setUploadMinimized(false) }}
                className="flex h-10 cursor-pointer items-center gap-2 rounded-xl bg-[#3031cb] px-4 text-base font-semibold text-white transition-colors hover:bg-[#2829b0]"
              >
                <CloudUpload size={15} />
                Upload
              </button>
            </div>
          </div>

          {/* Filters panel */}
          {filtersOpen && (
            <div className="mb-4">
              <AssetFilters filters={filters} onApply={handleApplyFilters} />
            </div>
          )}

          {/* Asset view */}
          {view === 'grid' ? (
            <AssetGrid
              assets={assets}
              loading={loading}
              gridSize={gridSize}
              onSelect={handleSelect}
              selectedId={selectedAsset?.aid}
              checkedIds={checkedIds}
              onCheck={handleCheck}
              onMenuRename={handleMenuRename}
              onMenuDelete={handleMenuDelete}
              onMenuDownload={handleMenuDownload}
              onMenuPublish={handleMenuPublish}
              onMenuPublishAsLive={handleMenuPublishAsLive}
            />
          ) : (
            <AssetList
              assets={assets}
              loading={loading}
              visibleCols={visibleCols}
              onSelect={handleSelect}
              selectedId={selectedAsset?.aid}
              checkedIds={checkedIds}
              onCheck={handleCheck}
              onCheckAll={handleCheckAll}
              allChecked={allChecked}
              someChecked={someChecked}
              onMenuRename={handleMenuRename}
              onMenuDelete={handleMenuDelete}
              onMenuDownload={handleMenuDownload}
              onMenuPublish={handleMenuPublish}
              onMenuPublishAsLive={handleMenuPublishAsLive}
            />
          )}

        </div>

        {/* Pagination — always visible */}
        <div className="shrink-0 border-t border-black/8 bg-white px-6 py-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Left — count + per page */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-base text-white/55">Per page</span>
                <DropdownMenu.Root>
                  <DropdownMenu.Trigger asChild>
                    <button className="flex h-10 cursor-pointer items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 text-base text-white/70 transition-colors hover:border-white/20 hover:text-white/90 focus-visible:outline-none">
                      {filters.pgsize}
                      <svg width="10" height="6" viewBox="0 0 10 6" fill="none" className="text-white/30">
                        <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </button>
                  </DropdownMenu.Trigger>
                  <DropdownMenu.Portal>
                    <DropdownMenu.Content
                      side="top"
                      align="start"
                      sideOffset={6}
                      className="z-50 min-w-16 overflow-hidden rounded-xl border border-white/15 bg-[#111827] p-1 shadow-2xl shadow-black/60"
                    >
                      {PAGE_SIZE_OPTIONS.map((size) => (
                        <DropdownMenu.Item
                          key={size}
                          onSelect={() => handlePageSizeChange(size)}
                          className="flex cursor-pointer select-none items-center justify-between gap-2 rounded-lg px-3 py-2 text-base text-white/70 outline-none transition-colors hover:bg-white/8 hover:text-white data-highlighted:bg-white/8 data-highlighted:text-white"
                        >
                          {size}
                          {filters.pgsize === size && <Check size={11} className="text-blue-400" />}
                        </DropdownMenu.Item>
                      ))}
                    </DropdownMenu.Content>
                  </DropdownMenu.Portal>
                </DropdownMenu.Root>
              </div>
              <p className="text-base text-white/60">
                {loading
                  ? 'Loading…'
                  : `Showing page ${filters.pgno} of ${totalPages ?? '…'}`}
              </p>
            </div>

            {/* Right — page numbers */}
            <div className={`flex items-center gap-1 transition-opacity duration-150 ${loading ? 'pointer-events-none opacity-40' : 'opacity-100'}`}>
              {/* Skip to first */}
              <button
                onClick={() => goToPage(1)}
                disabled={filters.pgno <= 1}
                className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg border border-white/10 bg-white/5 text-white/60 transition-colors hover:border-white/20 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
              >
                <ChevronsLeft size={14} />
              </button>

              {/* Prev */}
              <button
                onClick={() => goToPage(filters.pgno - 1)}
                disabled={filters.pgno <= 1}
                className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg border border-white/10 bg-white/5 text-white/60 transition-colors hover:border-white/20 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
              >
                <ChevronLeft size={14} />
              </button>

              {pageNumbers.map((p, i) =>
                p === '...' ? (
                  <span key={`ellipsis-${i}`} className="flex h-10 w-6 items-center justify-center text-base text-white/30">
                    …
                  </span>
                ) : (
                  <button
                    key={p}
                    onClick={() => goToPage(p)}
                    className={`flex h-10 min-w-10 cursor-pointer items-center justify-center rounded-lg border px-2.5 text-base font-medium transition-colors ${p === filters.pgno
                        ? 'border-blue-500/40 bg-blue-500/15 text-blue-400'
                        : 'border-white/10 bg-white/5 text-white/60 hover:border-white/20 hover:text-white'
                      }`}
                  >
                    {p}
                  </button>
                ),
              )}

              {/* Next */}
              <button
                onClick={() => goToPage(filters.pgno + 1)}
                disabled={!hasMore}
                className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg border border-white/10 bg-white/5 text-white/60 transition-colors hover:border-white/20 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
              >
                <ChevronRight size={14} />
              </button>

              {/* Skip to last */}
              <button
                onClick={() => totalPages && goToPage(totalPages)}
                disabled={!hasMore || !totalPages}
                className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg border border-white/10 bg-white/5 text-white/60 transition-colors hover:border-white/20 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
              >
                <ChevronsRight size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Asset preview panel */}
      <AssetPreviewPanel asset={selectedAsset} onClose={handleClosePreview} />

      {/* Bulk delete confirmation */}
      <ConfirmDialog
        open={confirmDeleteOpen}
        onOpenChange={setConfirmDeleteOpen}
        title={`Delete ${checkedIds.size} asset${checkedIds.size !== 1 ? 's' : ''}?`}
        description="This action cannot be undone. The selected asset(s) will be permanently deleted."
        confirmLabel="Delete"
        variant="danger"
        onConfirm={handleDeleteConfirm}
      />

      {/* Single asset delete confirmation */}
      <ConfirmDialog
        open={confirmSingleDeleteOpen}
        onOpenChange={setConfirmSingleDeleteOpen}
        title={`Delete "${assetToDelete?.name}"?`}
        description="This action cannot be undone. The asset will be permanently deleted."
        confirmLabel="Delete"
        variant="danger"
        onConfirm={handleSingleDeleteConfirm}
      />

      {/* Rename dialog */}
      <RadixDialog.Root open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
        <RadixDialog.Portal>
          <RadixDialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
          <RadixDialog.Content
            onInteractOutside={(e) => e.preventDefault()}
            className="fixed left-1/2 top-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-xl border border-black/10 bg-white shadow-2xl duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]"
          >
            <div className="p-6">
              <RadixDialog.Title className="flex items-center gap-2 text-base font-semibold text-white">
                <Pencil size={15} className="text-white/50" />
                Rename Asset
              </RadixDialog.Title>
              <RadixDialog.Description className="mt-1.5 text-sm text-white/50">
                Enter a new display name for this asset.
              </RadixDialog.Description>
              <input
                type="text"
                value={renameDraft}
                onChange={(e) => setRenameDraft(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && renameDraft.trim() && !renaming) handleRenameConfirm() }}
                className="mt-4 h-9 w-full rounded-xl border border-white/10 bg-white/5 px-3 text-sm text-white placeholder-white/30 outline-none transition-colors hover:border-white/20 focus:border-white/30 focus:ring-1 focus:ring-white/20"
                placeholder="Display name"
                autoFocus
              />
              <div className="mt-6 flex items-center justify-end gap-2">
                <RadixDialog.Close asChild>
                  <button
                    type="button"
                    className="cursor-pointer rounded-lg border border-white/10 px-4 py-1.5 text-sm text-white/45 transition-colors hover:bg-white/5"
                  >
                    Cancel
                  </button>
                </RadixDialog.Close>
                <button
                  type="button"
                  onClick={handleRenameConfirm}
                  disabled={!renameDraft.trim() || renaming}
                  className="cursor-pointer rounded-lg bg-[#3031cb] px-4 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-[#2829b0] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {renaming ? 'Renaming…' : 'Rename'}
                </button>
              </div>
            </div>
          </RadixDialog.Content>
        </RadixDialog.Portal>
      </RadixDialog.Root>

      {/* Upload modal */}
      <UploadModal
        open={uploadOpen}
        minimized={uploadMinimized}
        onMinimize={() => setUploadMinimized((v) => !v)}
        onOpenChange={(v) => { setUploadOpen(v); if (!v) setUploadMinimized(false) }}
        onUploadComplete={refetch}
      />

      {/* Media Publish modal */}
      {mediaPublishTarget && (
        <MediaPublishModal
          asset={mediaPublishTarget.asset}
          publishType={mediaPublishTarget.publishType}
          onClose={() => setMediaPublishTarget(null)}
        />
      )}

      {/* Toast */}
      <Toast.Root
        open={toastOpen}
        onOpenChange={setToastOpen}
        duration={3000}
        className={`flex items-start gap-3 rounded-xl border px-4 py-3 shadow-xl shadow-black/40 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-80 data-[state=open]:fade-in-0 data-[state=closed]:slide-out-to-right-full data-[state=open]:slide-in-from-top-full ${
          toastVariant === 'success'
            ? 'border-emerald-500/30 bg-[#0d1a0f]'
            : 'border-red-500/30 bg-[#1a0d0e]'
        }`}
      >
        <div className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full ${toastVariant === 'success' ? 'bg-emerald-500/20' : 'bg-red-500/20'}`}>
          {toastVariant === 'success'
            ? <Check size={10} className="text-emerald-400" />
            : <X size={10} className="text-red-400" />
          }
        </div>
        <div className="flex-1">
          <Toast.Title className="text-sm font-semibold text-white">
            {toastTitle}
          </Toast.Title>
          <Toast.Description className="mt-0.5 text-sm text-white/60">
            {toastMsg}
          </Toast.Description>
        </div>
        {toastVariant === 'error' && (
          <Toast.Action asChild altText="Retry">
            <button
              onClick={refetch}
              className="cursor-pointer text-sm font-semibold text-[#3031cb] transition-opacity hover:opacity-80"
            >
              Retry
            </button>
          </Toast.Action>
        )}
        <Toast.Close asChild>
          <button
            id="assets-toast-btn-dismiss"
            className="cursor-pointer text-white/30 transition-colors hover:text-white/60"
            onClick={() => setToastOpen(false)}
          >
            <X size={13} />
          </button>
        </Toast.Close>
      </Toast.Root>
      <Toast.Viewport className="fixed right-4 top-16 z-50 flex w-full max-w-sm flex-col gap-2" />

      <UpgradeModal
        id="assets-no-subscription-modal"
        open={noSubModalOpen}
        onOpenChange={setNoSubModalOpen}
        featureType="no-subscription"
        customTitle="Subscription Required"
        customSubtitle="You need an active subscription to publish media assets."
      />
    </Toast.Provider>
  )
}
