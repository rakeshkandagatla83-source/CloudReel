import { useRef, useState } from 'react'
import { OverlayList } from './OverlayList'
import { OverlayProperties } from './OverlayProperties'
import { AudioProperties } from './AudioProperties'
import type { VideoEditorHook } from './useVideoEditor'

interface Props {
  editor: VideoEditorHook
  onOpenLogoPicker: () => void
}

type Tab = 'overlays' | 'properties'

export function RightPanel({ editor, onOpenLogoPicker }: Props) {
  const [tab, setTab] = useState<Tab>('overlays')
  const audioInputRef = useRef<HTMLInputElement>(null)

  const {
    overlays,
    audioTracks,
    selectedOverlayId,
    selectedAudioId,
    videoDuration,
    selectOverlay,
    removeOverlay,
    moveOverlayUp,
    moveOverlayDown,
    removeAudioTrack,
    addTextOverlay,
    addAudioTrack,
    updateOverlayPartial,
    updateAudioTrack,
    audioElsRef,
  } = editor

  const selectedOverlay = overlays.find(o => o.id === selectedOverlayId)
  const selectedAudio = audioTracks.find(t => t.id === selectedAudioId)

  const handleSelectOverlay = (id: number) => {
    selectOverlay(id)
    setTab('properties')
  }

  return (
    <div id="ve-right-panel" className="flex w-56 shrink-0 flex-col overflow-hidden border-l border-[#1e2d40] bg-[#0d1625]">
      {/* Tabs */}
      <div id="ve-tabs" className="flex shrink-0 border-b border-[#1e2d40]">
        {(['overlays', 'properties'] as Tab[]).map(t => (
          <button
            key={t}
            id={`ve-tab-${t}`}
            onClick={() => setTab(t)}
            className={`flex-1 cursor-pointer py-2 text-xs font-semibold capitalize transition-colors ${
              tab === t
                ? 'border-b-2 border-blue-500 text-blue-400'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === 'overlays' && (
        <OverlayList
          overlays={overlays}
          selectedId={selectedOverlayId}
          onSelect={handleSelectOverlay}
          onRemove={removeOverlay}
          onMoveUp={moveOverlayUp}
          onMoveDown={moveOverlayDown}
          onAddLogo={onOpenLogoPicker}
          onAddText={() => { addTextOverlay(); setTab('properties') }}
          onAddAudio={() => audioInputRef.current?.click()}
        />
      )}

      {tab === 'properties' && (
        <>
          {selectedOverlay ? (
            <OverlayProperties
              overlay={selectedOverlay}
              duration={videoDuration}
              onChange={patch => updateOverlayPartial(selectedOverlay.id, patch)}
              onRemove={() => { removeOverlay(selectedOverlay.id); setTab('overlays') }}
            />
          ) : selectedAudio ? (
            <AudioProperties
              track={selectedAudio}
              duration={videoDuration}
              audioEl={audioElsRef.current.get(selectedAudio.id)}
              onChange={patch => {
                Object.entries(patch).forEach(([k, v]) => {
                  updateAudioTrack(selectedAudio.id, k as keyof typeof selectedAudio, v as never)
                })
              }}
              onRemove={() => { removeAudioTrack(selectedAudio.id); setTab('overlays') }}
            />
          ) : (
            <p className="flex-1 py-10 text-center text-xs text-slate-600">
              Select an overlay to edit its properties
            </p>
          )}
        </>
      )}

      {/* Hidden audio input */}
      <input
        id="ve-audio-input"
        ref={audioInputRef}
        type="file"
        accept="audio/*"
        multiple
        className="hidden"
        onChange={e => {
          Array.from(e.target.files ?? []).forEach(f => addAudioTrack(f))
          setTab('properties')
          e.target.value = ''
        }}
      />
    </div>
  )
}
