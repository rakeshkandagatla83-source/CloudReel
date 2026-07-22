import { useState, useEffect, useRef } from 'react'
import { useMultiviewerConfig } from '../features/multiviewer/useMultiviewerConfig'
import { useSources } from '../features/multiviewer/useSources'
import { MonitorBar } from '../features/multiviewer/MonitorBar'
import { MultiviewerToolbar } from '../features/multiviewer/MultiviewerToolbar'
import { MultiviewerGrid } from '../features/multiviewer/MultiviewerGrid'
import { ConfirmDialog } from '../components/ui/ConfirmDialog'
import { getPreviewUrl, getMasterUrl, getStudioChannel } from '../lib/studioConfig'

const MEETING_NOTIFY_WS = 'wss://recording.janya.video'

interface WsPacket {
  EventType?: number
  EventInfo?: { RoomId?: string; UserId?: string }
}

export function MultiviewerPage() {

  useEffect(() => { document.title = 'CloudReel - Multiviewer' }, [])

  const {
    config,
    frames,
    addFrame,
    removeFrame,
    updateFrame,
    clearFrames,
    reorderFrames,
    layout,
    saveLayout,
  } = useMultiviewerConfig()

  const { rtmpSources, webrtcSources, loading: sourcesLoading, refresh: refreshSources } =
    useSources(config)

  const refreshSourcesRef = useRef(refreshSources)
  useEffect(() => { refreshSourcesRef.current = refreshSources }, [refreshSources])

  const [clearConfirmOpen, setClearConfirmOpen] = useState(false)

  const channel = getStudioChannel() ?? ''
  const [previewSrc, setPreviewSrc] = useState(() => getPreviewUrl(channel))
  const [programSrc, setProgramSrc] = useState(() => getMasterUrl(channel))

  useEffect(() => {
    if (!channel) return
    let ws: WebSocket | null = null
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null
    let heartbeatTimer: ReturnType<typeof setInterval> | null = null
    let destroyed = false

    function connect() {
      ws = new WebSocket(MEETING_NOTIFY_WS)

      ws.onopen = () => {
        heartbeatTimer = setInterval(() => {
          if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ type: 'Heartbeat', channel }))
        }, 30_000)
      }

      ws.onmessage = (event: MessageEvent) => {
        try {
          const msg = JSON.parse(event.data as string) as WsPacket
          if (msg.EventInfo?.RoomId !== channel) return
          const refresh = () => refreshSourcesRef.current()
          switch (msg.EventType) {
            case 101: // room created
            case 205: // screen share started
            case 206: // screen share stopped
              setTimeout(refresh, 500); break
            case 102: // room closed
            case 103: // user entered
              setTimeout(refresh, 1000); break
            case 104: // user left
              setTimeout(refresh, 500); break
          }
        } catch { /* ignore malformed packets */ }
      }

      ws.onclose = () => {
        if (heartbeatTimer) { clearInterval(heartbeatTimer); heartbeatTimer = null }
        if (!destroyed) {
          reconnectTimer = setTimeout(connect, 5000)
        }
      }
    }

    connect()

    return () => {
      destroyed = true
      ws?.close()
      if (heartbeatTimer) clearInterval(heartbeatTimer)
      if (reconnectTimer) clearTimeout(reconnectTimer)
    }
  }, [channel])

  return (
    <div className="flex h-full flex-col">
      <MonitorBar previewSrc={previewSrc} programSrc={programSrc} />

      <MultiviewerToolbar
        frameCount={frames.length}
        layout={layout}
        sourcesLoading={sourcesLoading}
        onAddFrame={addFrame}
        onClearAll={() => setClearConfirmOpen(true)}
        onLayoutChange={saveLayout}
        onRefresh={refreshSources}
      />

      <div className="flex-1 overflow-y-auto bg-primary-bg">
        <MultiviewerGrid
          frames={frames}
          layout={layout}
          config={config}
          rtmpSources={rtmpSources}
          webrtcSources={webrtcSources}
          onAddFrame={addFrame}
          onRemoveFrame={removeFrame}
          onUpdateFrame={updateFrame}
          onReorderFrames={reorderFrames}
          onSendToPreview={setPreviewSrc}
          onSendToProgram={setProgramSrc}
        />
      </div>

      <ConfirmDialog
        open={clearConfirmOpen}
        onOpenChange={setClearConfirmOpen}
        title="Clear all frames?"
        description="This will remove all frames from the multiviewer. This action cannot be undone."
        confirmLabel="Clear All"
        variant="danger"
        onConfirm={clearFrames}
      />
    </div>
  )
}
