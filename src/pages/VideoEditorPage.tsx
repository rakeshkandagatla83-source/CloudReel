import { useState, useEffect } from 'react'
import { AlertTriangle, X } from 'lucide-react'
import { useVideoEditor } from '../features/videoEditor/useVideoEditor'
import { VideoEditorTopbar } from '../features/videoEditor/VideoEditorTopbar'
import { VideoPreview } from '../features/videoEditor/VideoPreview'
import { RightPanel } from '../features/videoEditor/RightPanel'
import { TransportBar } from '../features/videoEditor/TransportBar'
import { Timeline } from '../features/videoEditor/Timeline'
import { ExportModal } from '../features/videoEditor/ExportModal'
import { MediaPickerModal, type PickerMode } from '../features/videoEditor/MediaPickerModal'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'

export function VideoEditorPage() {
  useEffect(() => { document.title = 'CloudReel - Video Editor' }, [])

  const editor = useVideoEditor()
  const [exportOpen, setExportOpen] = useState(false)
  const [removeVideoConfirm, setRemoveVideoConfirm] = useState(false)
  const [picker, setPicker] = useState<PickerMode | null>(null)

  const handleExportJSON = () => {
    const { videoRef, overlays, audioTracks, markIn, markOut, aspectRatio } = editor
    const vid = videoRef.current
    const proj = {
      exportedAt: new Date().toISOString(),
      video: { duration: vid?.duration ?? 0, width: vid?.videoWidth ?? 0, height: vid?.videoHeight ?? 0 },
      aspectRatio,
      selection: markIn != null && markOut != null ? { markIn, markOut, duration: markOut - markIn } : null,
      overlays,
      audioTracks: audioTracks.map(({ id, name, duration, startTime, volume, muted }) => ({ id, name, duration, startTime, volume, muted })),
    }
    const blob = new Blob([JSON.stringify(proj, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'video_editor_project.json'; a.click()
    URL.revokeObjectURL(url)
  }

  const canExport = editor.markIn != null && editor.markOut != null && editor.videoLoaded

  return (
    <div id="ve-shell" className="flex h-full flex-col overflow-hidden bg-primary-bg">
      <VideoEditorTopbar
        editor={editor}
        onExport={() => { if (canExport) setExportOpen(true) }}
        onExportJSON={handleExportJSON}
        onRemoveVideoRequest={() => setRemoveVideoConfirm(true)}
        onOpenVideoPicker={() => setPicker('video')}
      />

      {/* Video load error banner */}
      {editor.videoLoadError && (
        <div id="ve-load-error-banner" className="flex shrink-0 items-center gap-2 border-b border-red-900/50 bg-red-950/60 px-4 py-2">
          <AlertTriangle size={14} className="shrink-0 text-red-400" />
          <p id="ve-load-error-message" className="flex-1 text-xs text-red-300">{editor.videoLoadError}</p>
          <button
            id="ve-btn-dismiss-load-error"
            onClick={editor.clearVideoLoadError}
            className="flex h-5 w-5 shrink-0 cursor-pointer items-center justify-center rounded text-red-500 hover:bg-red-900/50 hover:text-red-300"
          >
            <X size={12} />
          </button>
        </div>
      )}

      {/* Main area */}
      <div id="ve-main-area" className="flex min-h-0 flex-1 overflow-hidden">
        <VideoPreview editor={editor} />
        <RightPanel
          editor={editor}
          onOpenLogoPicker={() => setPicker('image')}
        />
      </div>

      {/* Transport + Timeline */}
      <TransportBar editor={editor} />
      <Timeline editor={editor} />

      {/* Media picker modal */}
      {picker && (
        <MediaPickerModal
          mode={picker}
          onAsset={(url, name) => {
            if (picker === 'video') editor.loadVideoFromUrl(url)
            else editor.addImageOverlayFromUrl(url, name)
            setPicker(null)
          }}
          onClose={() => setPicker(null)}
        />
      )}

      {/* Export modal */}
      {exportOpen && canExport && (
        <ExportModal
          videoEl={editor.videoRef.current}
          markIn={editor.markIn!}
          markOut={editor.markOut!}
          overlays={editor.overlays}
          imageEls={editor.imageElsRef.current}
          aspectRatio={editor.aspectRatio}
          arCropCenterX={editor.arCropCenterX}
          arCropCenterY={editor.arCropCenterY}
          onClose={() => setExportOpen(false)}
        />
      )}

      {/* Remove video confirm */}
      <ConfirmDialog
        open={removeVideoConfirm}
        onOpenChange={setRemoveVideoConfirm}
        title="Remove Video"
        description="This will clear the video and all timeline marks. Overlays will remain."
        confirmLabel="Remove"
        variant="danger"
        onConfirm={() => { editor.removeVideo(); setRemoveVideoConfirm(false) }}
      />
    </div>
  )
}
