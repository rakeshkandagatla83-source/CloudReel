import { useState, useRef, useCallback, type DragEvent } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import {
  Upload,
  X,
  Film,
  Image as ImageIcon,
  FileText,
  Trash2,
  CloudUpload,
  CheckCircle2,
  AlertCircle,
  RotateCcw,
  Minus,
  ChevronUp,
  ChevronLeft,
  TriangleAlert,
} from 'lucide-react'
import { createClientUpload, type UploadContext } from '../../lib/s3Service'

type AssetType = 'video' | 'graphic'
type FileStatus = 'idle' | 'uploading' | 'done' | 'error'

const ACCEPTED: Record<AssetType, (file: File) => boolean> = {
  video: (f) => f.type === 'video/mp4',
  graphic: (f) =>
    f.type.startsWith('image/') ||
    f.type === 'video/mp4' ||
    f.type === 'video/quicktime',
}

const ACCEPT_ATTR: Record<AssetType, string> = {
  video: 'video/mp4',
  graphic: 'image/png,image/jpeg,image/jpg,.mov,video/mp4',
}

const ACCEPT_HINT: Record<AssetType, string> = {
  video: 'MP4 videos only',
  graphic: 'PNG, JPG images and MP4 / MOV videos',
}

interface QueuedFile {
  id: string
  file: File
  status: FileStatus
  progress: number
  error?: string
}

function getFileIcon(type: string) {
  if (type.startsWith('video/')) return <Film size={15} className="text-cyan-400" />
  if (type.startsWith('image/')) return <ImageIcon size={15} className="text-violet-400" />
  return <FileText size={15} className="text-white/40" />
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${(bytes / 1024 ** i).toFixed(1)} ${units[i]}`
}

// ── File row ────────────────────────────────────────────────────────────────

interface FileRowProps {
  qf: QueuedFile
  onCancel: (id: string) => void
  onRetry: (qf: QueuedFile) => void
  onRemove: (id: string) => void
}

function FileRow({ qf, onCancel, onRetry, onRemove }: FileRowProps) {
  return (
    <div className="overflow-hidden rounded-lg border border-white/8 bg-white/4">
      <div className="flex items-center gap-3 px-3 py-2.5">
        <span className="shrink-0">{getFileIcon(qf.file.type)}</span>

        <div className="min-w-0 flex-1">
          <p className="truncate text-[12px] font-medium text-white/80">{qf.file.name}</p>
          <p className="text-[11px] text-white/40">
            {qf.status === 'uploading'
              ? `Uploading… ${qf.progress}%`
              : qf.status === 'error'
                ? `${qf.error ?? 'Upload failed'} · ${formatBytes(qf.file.size)}`
                : formatBytes(qf.file.size)}
          </p>
        </div>

        {qf.status === 'idle' && (
          <button
            onClick={() => onRemove(qf.id)}
            className="shrink-0 cursor-pointer text-white/30 transition-colors hover:text-red-400"
          >
            <Trash2 size={13} />
          </button>
        )}
        {qf.status === 'uploading' && (
          <button
            onClick={() => onCancel(qf.id)}
            title="Cancel upload"
            className="shrink-0 cursor-pointer text-white/30 transition-colors hover:text-red-400"
          >
            <X size={13} />
          </button>
        )}
        {qf.status === 'done' && <CheckCircle2 size={15} className="shrink-0 text-emerald-400" />}
        {qf.status === 'error' && (
          <div className="flex shrink-0 items-center gap-1.5">
            <AlertCircle size={14} className="text-red-400" />
            <button
              onClick={() => onRetry(qf)}
              title="Retry"
              className="cursor-pointer text-white/30 transition-colors hover:text-white/70"
            >
              <RotateCcw size={13} />
            </button>
            <button
              onClick={() => onRemove(qf.id)}
              className="cursor-pointer text-white/30 transition-colors hover:text-red-400"
            >
              <Trash2 size={13} />
            </button>
          </div>
        )}
      </div>

      {qf.status === 'uploading' && (
        <div className="h-0.5 bg-white/8">
          <div
            className="h-full bg-[#3031cb] transition-all duration-300"
            style={{ width: `${qf.progress}%` }}
          />
        </div>
      )}
    </div>
  )
}

// ── Minimized tab ────────────────────────────────────────────────────────────

interface MinimizedTabProps {
  queue: QueuedFile[]
  onRestore: () => void
  onClose: () => void
}

function MinimizedTab({ queue, onRestore, onClose }: MinimizedTabProps) {
  const uploading = queue.filter((f) => f.status === 'uploading')
  const doneCount = queue.filter((f) => f.status === 'done').length
  const errorCount = queue.filter((f) => f.status === 'error').length
  const idleCount = queue.filter((f) => f.status === 'idle').length

  const overallProgress =
    uploading.length > 0
      ? Math.round(uploading.reduce((sum, f) => sum + f.progress, 0) / uploading.length)
      : 0

  const summary = [
    uploading.length > 0 && `${uploading.length} uploading`,
    doneCount > 0 && `${doneCount} done`,
    errorCount > 0 && `${errorCount} failed`,
    idleCount > 0 && `${idleCount} queued`,
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <div className="fixed bottom-4 right-4 z-50 w-72 overflow-hidden rounded-xl border border-white/15 bg-secondary-bg shadow-2xl shadow-black/60">
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#3031cb]/15">
          <CloudUpload size={14} className="text-[#3031cb]" />
        </div>

        <button
          onClick={onRestore}
          className="min-w-0 flex-1 cursor-pointer text-left"
        >
          <p className="text-[12px] font-semibold text-white">Upload Assets</p>
          <p className="truncate text-[11px] text-white/40">
            {summary || 'No files queued'}
          </p>
        </button>

        <div className="flex shrink-0 items-center gap-1">
          <button
            onClick={onRestore}
            title="Restore"
            className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-md text-white/40 transition-colors hover:bg-white/8 hover:text-white/80"
          >
            <ChevronUp size={14} />
          </button>
          <button
            onClick={onClose}
            title="Close"
            className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-md text-white/40 transition-colors hover:bg-white/8 hover:text-red-400"
          >
            <X size={13} />
          </button>
        </div>
      </div>

      {uploading.length > 0 && (
        <div className="h-0.5 bg-white/8">
          <div
            className="h-full bg-[#3031cb] transition-all duration-300"
            style={{ width: `${overallProgress}%` }}
          />
        </div>
      )}
    </div>
  )
}

// ── Type selection step ───────────────────────────────────────────────────────

interface TypeCardProps {
  icon: React.ReactNode
  title: string
  description: string
  onClick: () => void
}

function TypeCard({ icon, title, description, onClick }: TypeCardProps) {
  return (
    <button
      onClick={onClick}
      className="group flex w-full cursor-pointer flex-col items-center gap-3 rounded-xl border border-white/10 bg-white/3 p-6 text-center transition-all hover:border-[#3031cb]/40 hover:bg-[#3031cb]/5"
    >
      <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-white/10 bg-white/5 transition-colors group-hover:border-[#3031cb]/30 group-hover:bg-[#3031cb]/10">
        {icon}
      </div>
      <div>
        <p className="text-sm font-semibold text-white">{title}</p>
        <p className="mt-0.5 text-[11px] text-white/45">{description}</p>
      </div>
    </button>
  )
}

// ── Main component ───────────────────────────────────────────────────────────

interface UploadModalProps {
  open: boolean
  minimized: boolean
  onMinimize: () => void
  onOpenChange: (open: boolean) => void
  onUploadComplete?: () => void
}

export function UploadModal({
  open,
  minimized,
  onMinimize,
  onOpenChange,
  onUploadComplete,
}: UploadModalProps) {
  const [assetType, setAssetType] = useState<AssetType | null>(null)
  const [queue, setQueue] = useState<QueuedFile[]>([])
  const [dragging, setDragging] = useState(false)
  const [rejectedNames, setRejectedNames] = useState<string[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)
  const abortsRef = useRef<Map<string, () => void>>(new Map())

  const isUploading = queue.some((f) => f.status === 'uploading')
  const idleCount = queue.filter((f) => f.status === 'idle').length
  const doneCount = queue.filter((f) => f.status === 'done').length

  const updateFile = useCallback((id: string, patch: Partial<QueuedFile>) => {
    setQueue((prev) => prev.map((f) => (f.id === id ? { ...f, ...patch } : f)))
  }, [])

  const startUpload = useCallback(
    async (qf: QueuedFile) => {
      updateFile(qf.id, { status: 'uploading', progress: 0, error: undefined })

      const context: UploadContext =
        assetType === 'graphic'
          ? 'graphic'
          : 'video'
      const handle = createClientUpload(
        qf.file,
        ({ percentage }) => updateFile(qf.id, { progress: percentage }),
        context,
      )

      abortsRef.current.set(qf.id, handle.abort)

      try {
        await handle.done()
        updateFile(qf.id, { status: 'done', progress: 100 })
        setTimeout(() => onUploadComplete?.(), 3000)
      } catch (err) {
        const isCancelled = err instanceof Error && err.name === 'AbortError'
        updateFile(qf.id, {
          status: 'error',
          error: isCancelled
            ? 'Cancelled'
            : err instanceof Error
              ? err.message
              : 'Upload failed',
        })
      } finally {
        abortsRef.current.delete(qf.id)
      }
    },
    [assetType, updateFile, onUploadComplete],
  )

  const handleUploadAll = useCallback(() => {
    queue.filter((f) => f.status === 'idle').forEach((qf) => startUpload(qf))
  }, [queue, startUpload])

  const handleCancel = useCallback((id: string) => {
    abortsRef.current.get(id)?.()
  }, [])

  const handleRetry = useCallback(
    (qf: QueuedFile) => startUpload({ ...qf, status: 'idle', progress: 0, error: undefined }),
    [startUpload],
  )

  const handleRemove = useCallback((id: string) => {
    abortsRef.current.get(id)?.()
    setQueue((prev) => prev.filter((f) => f.id !== id))
  }, [])

  const handleClearDone = useCallback(() => {
    setQueue((prev) => prev.filter((f) => f.status !== 'done'))
  }, [])

  const addFiles = useCallback(
    (files: FileList | File[]) => {
      if (!assetType) return
      const all = Array.from(files)
      const accepted = all.filter(ACCEPTED[assetType])
      const rejected = all.filter((f) => !ACCEPTED[assetType](f))
      setRejectedNames(rejected.map((f) => f.name))
      if (accepted.length === 0) return
      setQueue((prev) => [
        ...prev,
        ...accepted.map((file) => ({
          id: `${file.name}-${file.size}-${Date.now()}-${Math.random()}`,
          file,
          status: 'idle' as FileStatus,
          progress: 0,
        })),
      ])
    },
    [assetType],
  )

  const handleDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      setDragging(false)
      if (e.dataTransfer.files.length > 0) addFiles(e.dataTransfer.files)
    },
    [addFiles],
  )

  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragging(true)
  }, [])

  const handleDragLeave = useCallback(() => setDragging(false), [])

  const handleBrowse = useCallback(() => fileInputRef.current?.click(), [])

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files?.length) {
        addFiles(e.target.files)
        e.target.value = ''
      }
    },
    [addFiles],
  )

  const handleBack = useCallback(() => {
    abortsRef.current.forEach((abort) => abort())
    abortsRef.current.clear()
    setQueue([])
    setDragging(false)
    setRejectedNames([])
    setAssetType(null)
  }, [])

  const handleClose = useCallback(() => {
    abortsRef.current.forEach((abort) => abort())
    abortsRef.current.clear()
    setQueue([])
    setDragging(false)
    setRejectedNames([])
    setAssetType(null)
    onOpenChange(false)
  }, [onOpenChange])

  if (!open) return null

  if (minimized) {
    return <MinimizedTab queue={queue} onRestore={onMinimize} onClose={handleClose} />
  }

  return (
    <Dialog.Root open onOpenChange={() => {}}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <Dialog.Content
          onInteractOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
          className="fixed left-1/2 top-1/2 z-50 w-full max-w-xl -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-2xl border border-white/15 bg-secondary-bg shadow-2xl shadow-black/60 focus:outline-none data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
            <div className="flex items-center gap-2.5">
              {assetType && (
                <button
                  onClick={handleBack}
                  title="Back"
                  className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg text-white/40 transition-colors hover:bg-white/8 hover:text-white/80"
                >
                  <ChevronLeft size={16} />
                </button>
              )}
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#3031cb]/15">
                <CloudUpload size={16} className="text-[#3031cb]" />
              </div>
              <div>
                <Dialog.Title className="text-sm font-semibold text-white">
                  {assetType ? 'Upload Assets' : 'Add New Asset'}
                </Dialog.Title>
                <Dialog.Description className="text-[11px] text-white/40">
                  {assetType
                    ? assetType === 'video'
                      ? 'Videos — MP4 only'
                      : 'Graphics — images & videos'
                    : 'Select the type of asset to upload'}
                </Dialog.Description>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {assetType && (
                <button
                  onClick={onMinimize}
                  title="Minimize"
                  className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg text-white/40 transition-colors hover:bg-white/8 hover:text-white/80"
                >
                  <Minus size={15} />
                </button>
              )}
              <button
                onClick={handleClose}
                title="Close"
                className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg text-white/40 transition-colors hover:bg-white/8 hover:text-white/80"
              >
                <X size={15} />
              </button>
            </div>
          </div>

          {/* Body */}
          {!assetType ? (
            /* ── Step 1: Type selection ── */
            <div className="p-6">
              <div className="grid grid-cols-2 gap-3">
                <TypeCard
                  icon={<Film size={22} className="text-cyan-400" />}
                  title="Videos"
                  description="Upload MP4 files to the primary video library"
                  onClick={() => setAssetType('video')}
                />
                <TypeCard
                  icon={<ImageIcon size={22} className="text-violet-400" />}
                  title="Graphics"
                  description="Upload images or video graphics (PNG, JPG, MP4, MOV)"
                  onClick={() => setAssetType('graphic')}
                />
              </div>
            </div>
          ) : (
            /* ── Step 2: Drag & drop upload ── */
            <div className="p-6">
              {/* Drop zone */}
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={handleBrowse}
                className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-8 text-center transition-all duration-200 ${
                  dragging
                    ? 'border-[#3031cb]/60 bg-[#3031cb]/8'
                    : 'border-white/15 bg-white/3 hover:border-white/25 hover:bg-white/5'
                }`}
              >
                <div
                  className={`flex h-10 w-10 items-center justify-center rounded-xl border transition-colors ${
                    dragging ? 'border-[#3031cb]/30 bg-[#3031cb]/15' : 'border-white/10 bg-white/5'
                  }`}
                >
                  <Upload size={20} className={dragging ? 'text-[#3031cb]' : 'text-white/40'} />
                </div>
                <div>
                  <p className="text-sm font-medium text-white/80">
                    {dragging ? 'Drop files here' : 'Drag & drop files here'}
                  </p>
                  <p className="mt-0.5 text-xs text-white/40">
                    or{' '}
                    <span className="text-[#3031cb] underline-offset-2 hover:underline">
                      browse from your computer
                    </span>
                  </p>
                </div>
                <p className="text-[11px] text-white/30">{ACCEPT_HINT[assetType]}</p>
              </div>

              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept={ACCEPT_ATTR[assetType]}
                className="hidden"
                onChange={handleFileInput}
              />

              {/* Unsupported file warning */}
              {rejectedNames.length > 0 && (
                <div className="mt-3 flex items-start gap-2.5 rounded-lg border border-amber-500/25 bg-amber-500/8 px-3 py-2.5">
                  <TriangleAlert size={14} className="mt-0.5 shrink-0 text-amber-400" />
                  <div className="min-w-0 flex-1">
                    <p className="text-[12px] font-medium text-amber-300">
                      {rejectedNames.length === 1
                        ? 'File type not supported'
                        : `${rejectedNames.length} files not supported`}
                    </p>
                    <p className="mt-0.5 truncate text-[11px] text-amber-400/70">
                      {rejectedNames.join(', ')}
                    </p>
                    <p className="mt-0.5 text-[11px] text-amber-400/50">
                      {ACCEPT_HINT[assetType]}
                    </p>
                  </div>
                  <button
                    onClick={() => setRejectedNames([])}
                    className="shrink-0 cursor-pointer text-amber-400/50 transition-colors hover:text-amber-300"
                  >
                    <X size={13} />
                  </button>
                </div>
              )}

              {/* File queue */}
              {queue.length > 0 && (
                <div className="mt-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-[11px] font-semibold uppercase tracking-widest text-white/40">
                      Queue ({queue.length})
                    </p>
                    {doneCount > 0 && (
                      <button
                        onClick={handleClearDone}
                        className="cursor-pointer text-[11px] text-white/30 transition-colors hover:text-white/60"
                      >
                        Clear done ({doneCount})
                      </button>
                    )}
                  </div>
                  <div className="max-h-52 space-y-1.5 overflow-y-auto pr-1">
                    {queue.map((qf) => (
                      <FileRow
                        key={qf.id}
                        qf={qf}
                        onCancel={handleCancel}
                        onRetry={handleRetry}
                        onRemove={handleRemove}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Footer */}
              <div className="mt-5 flex items-center justify-end gap-2.5">
                <button
                  onClick={handleClose}
                  className="cursor-pointer rounded-lg border border-white/10 px-4 py-2 text-sm text-white/60 transition-colors hover:border-white/20 hover:text-white/80"
                >
                  {isUploading ? 'Cancel All & Close' : 'Close'}
                </button>
                <button
                  onClick={handleUploadAll}
                  disabled={idleCount === 0}
                  className="flex cursor-pointer items-center gap-2 rounded-lg bg-[#3031cb] px-5 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#2626a8] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <Upload size={14} />
                  {isUploading && idleCount === 0
                    ? 'Uploading…'
                    : `Upload${idleCount > 0 ? ` (${idleCount})` : ''}`}
                </button>
              </div>
            </div>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
