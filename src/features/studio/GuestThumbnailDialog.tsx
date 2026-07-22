import { useState, useEffect, useRef } from 'react'
import { X, Users, Image, RefreshCw, Upload, CheckCircle2, ImageOff } from 'lucide-react'
import { cn } from '../../lib/utils'
import { http } from '../../lib/http'
import { apiConfig } from '../../lib/apiConfig'
import { getStorage } from '../../lib/storage'
import { createClientUpload } from '../../lib/s3Service'
import { Toaster } from '../../components/ui/Toast'
import { useStudioCtx } from './StudioContext'
import { GFX_ASSETS_API, GUEST_PARTICIPANTS_API, GUEST_THUMBNAIL_UPDATE_API, getBgBase, DEFAULT_BG_COVER_URL } from '../../lib/studioConfig'

const DEFAULT_BG_PARTICIPANT_ID = 'Default Background'

function checkImageExists(url: string): Promise<boolean> {
  return new Promise(resolve => {
    const img = new window.Image()
    img.onload = () => resolve(true)
    img.onerror = () => resolve(false)
    img.src = url
  })
}

interface VideoConferenceParticipant {
  userId: string
  cvUUID: string | null
  imagePath: string | null
  meetingJoinedTime?: number
}

interface GuestGraphicAsset {
  name: string
  /** Thumbnail URL for display in the preview column */
  previewUrl: string
  /** Actual asset URL to send in the WS packet and save to DB */
  assetUrl: string
}

interface ParticipantThumbnailState {
  selectedGraphic: string
  localFile: File | null
  previewUrl: string
  /** Last confirmed server-side URL — restored on upload failure */
  savedImageUrl: string
  uploadedUrl: string
  isSaving: boolean
  isRemoving: boolean
}

interface GuestThumbnailDialogProps {
  open: boolean
  onClose: () => void
}

export function GuestThumbnailDialog({ open, onClose }: GuestThumbnailDialogProps) {
  const { channel, cid, webrtcSources, sendWs, setParticipantImageMap } = useStudioCtx()

  const [participants, setParticipants] = useState<VideoConferenceParticipant[]>([])
  const [thumbnailStates, setThumbnailStates] = useState<ParticipantThumbnailState[]>([])
  const [graphicAssets, setGraphicAssets] = useState<GuestGraphicAsset[]>([])
  const [isLoadingData, setIsLoadingData] = useState(false)
  const [refreshCount, setRefreshCount] = useState(0)
  const [errorToastOpen, setErrorToastOpen] = useState(false)
  const [errorToastMessage, setErrorToastMessage] = useState('')
  const [selectedParticipantIndex, setSelectedParticipantIndex] = useState(0)
  const [brokenAssetIndices, setBrokenAssetIndices] = useState<Set<number>>(new Set())
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    if (!open) {
      setParticipants([])
      setThumbnailStates([])
      setGraphicAssets([])
      return
    }

    let cancelled = false
    setIsLoadingData(true)

    const token = getStorage<string>('pcr_token') ?? ''
    const activeParticipantIds = new Set(webrtcSources.map(s => s.id.toLowerCase()))

    async function loadParticipantsAndAssets() {
      try {
        const [participantsRes, assetsRes] = await Promise.all([
          http.get<{ code: number; data?: VideoConferenceParticipant[] }>(
            apiConfig.dotnetApiBase,
            `${GUEST_PARTICIPANTS_API}?chid=${channel}`,
          ),
          http.post<{ assets?: Array<{ name: string; type: string; mode: string; previewurl: string; s3path?: string }> }>(
            apiConfig.scalaApiBase,
            GFX_ASSETS_API,
            new URLSearchParams({ cid, status: 'A', pgno: '0', pgsize: '0', category: 'S' }).toString(),
            { headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'x-auth-token': token, 'x-channel-id': cid } },
          ),
        ])

        if (cancelled) return

        // Filter out robo users and keep only participants with an active WebRTC stream
        const validParticipants = (participantsRes.data ?? []).filter(
          p => !p.userId.startsWith('robo-') && activeParticipantIds.has(p.userId.toLowerCase()),
        )

        // Deduplicate — keep the entry with the latest meetingJoinedTime per userId
        const latestByUserId = new Map<string, VideoConferenceParticipant>()
        validParticipants.forEach(p => {
          const key = p.userId.toLowerCase()
          const existing = latestByUserId.get(key)
          if (!existing || (p.meetingJoinedTime ?? 0) > (existing.meetingJoinedTime ?? 0)) {
            latestByUserId.set(key, p)
          }
        })

        // Default Background row is always present at the top.
        // Check if a static cover image already exists at the fixed CloudFront path.
        const staticCoverUrl = DEFAULT_BG_COVER_URL(channel)
        const cacheBustedCoverUrl = `${staticCoverUrl}?t=${Date.now()}`
        const defaultBgImageExists = await checkImageExists(cacheBustedCoverUrl)
        const defaultBgParticipant: VideoConferenceParticipant = {
          userId: DEFAULT_BG_PARTICIPANT_ID,
          cvUUID: null,
          imagePath: defaultBgImageExists ? cacheBustedCoverUrl : null,
        }
        const allParticipants = [defaultBgParticipant, ...Array.from(latestByUserId.values())]

        const imageAssets = (assetsRes.assets ?? [])
          .filter(a => a.mode === '' && a.type === 'image' && (a.previewurl || a.s3path))
          .map(a => ({
            name: a.name,
            previewUrl: a.previewurl || a.s3path || '',
            assetUrl: a.s3path || `${getBgBase()}${a.name}`,
          }))

        setParticipants(allParticipants)
        setThumbnailStates(allParticipants.map(p => {
          const serverImageUrl = p.imagePath && p.imagePath !== 'null' ? p.imagePath : ''
          const matchedAsset = serverImageUrl
            ? imageAssets.find(a => a.assetUrl === serverImageUrl || a.previewUrl === serverImageUrl)
            : undefined
          return {
            selectedGraphic: matchedAsset?.name ?? '',
            localFile: null,
            previewUrl: serverImageUrl,
            savedImageUrl: serverImageUrl,
            uploadedUrl: matchedAsset ? serverImageUrl : '',
            isSaving: false,
            isRemoving: false,
          }
        }))

        setGraphicAssets(imageAssets)
        setBrokenAssetIndices(new Set())
      } finally {
        if (!cancelled) setIsLoadingData(false)
      }
    }

    void loadParticipantsAndAssets()
    return () => { cancelled = true }
  }, [open, channel, cid, webrtcSources, refreshCount])

  function patchThumbnailState(index: number, patch: Partial<ParticipantThumbnailState>) {
    setThumbnailStates(prev => prev.map((s, i) => i === index ? { ...s, ...patch } : s))
  }

  function handleGraphicSelected(index: number, graphicName: string) {
    if (!graphicName) {
      patchThumbnailState(index, { selectedGraphic: '', previewUrl: '', uploadedUrl: '' })
      return
    }
    const asset = graphicAssets.find(a => a.name === graphicName)
    if (!asset) return
    patchThumbnailState(index, {
      selectedGraphic: graphicName,
      localFile: null,
      previewUrl: asset.previewUrl,
      uploadedUrl: asset.assetUrl,
    })
  }

  function handleLocalFileSelected(index: number, file: File) {
    patchThumbnailState(index, { selectedGraphic: '', uploadedUrl: '' })
    const reader = new FileReader()
    reader.onload = e => {
      patchThumbnailState(index, { localFile: file, previewUrl: (e.target?.result as string) ?? '' })
    }
    reader.readAsDataURL(file)
  }

  async function saveThumbnail(participant: VideoConferenceParticipant, index: number) {
    const state = thumbnailStates[index]
    if (!state) return
    patchThumbnailState(index, { isSaving: true })
    try {
      const isDefaultBg = participant.userId === DEFAULT_BG_PARTICIPANT_ID
      let finalUrl = state.uploadedUrl
      let wasDefaultBgUpload = false

      if (state.localFile) {
        // Default Background → bgCover/bgvideoimg.png (fixed filename, ProducerParticipantCover AssetType)
        // Regular guests     → producer/{channel}/{file.name}  (original filename, ProducerGuestCover AssetType)
        const originalFile = state.localFile
        const uploadFile = isDefaultBg
          ? new File([originalFile], 'bgvideoimg.png', { type: originalFile.type })
          : originalFile
        const uploadContext = isDefaultBg ? 'defaultBgCover' : 'guestCover'
        const uploadHandle = createClientUpload(uploadFile, undefined, uploadContext)
        finalUrl = await uploadHandle.done()
        patchThumbnailState(index, { uploadedUrl: finalUrl, previewUrl: finalUrl, localFile: null })
        if (isDefaultBg) wasDefaultBgUpload = true
      } else if (isDefaultBg && state.uploadedUrl) {
        // Asset library selection for Default Background — copy the chosen asset into the
        // fixed bgvideoimg.png location so the static S3 path stays the single source of truth.
        const response = await fetch(state.uploadedUrl)
        const blob = await response.blob()
        const reuploadedFile = new File([blob], 'bgvideoimg.png', { type: blob.type || 'image/png' })
        const uploadHandle = createClientUpload(reuploadedFile, undefined, 'defaultBgCover')
        finalUrl = await uploadHandle.done()
        patchThumbnailState(index, { uploadedUrl: finalUrl, previewUrl: finalUrl })
        wasDefaultBgUpload = true
      }
      if (!finalUrl) return

      // Default Background — S3 is the source of truth, no DB update needed.
      // Cache-bust the static URL so the browser re-fetches the updated image,
      // and broadcast it via WS so other clients refresh immediately.
      if (wasDefaultBgUpload) {
        const cacheBustedUrl = `${finalUrl}?t=${Date.now()}`
        patchThumbnailState(index, { selectedGraphic: '', savedImageUrl: cacheBustedUrl, previewUrl: cacheBustedUrl })
        sendWs({ type: 'EXTERNAL_BG_IMAGE', userId: participant.userId, url: cacheBustedUrl, fit: 'cover', methodType: 'preview', channel })
        return
      }

      const queryParams = new URLSearchParams({
        chid: channel,
        uuid: participant.cvUUID ?? 'null',
        usertype: 'participant',
        imagepath: finalUrl,
      })
      await http.put<{ code?: number }>(
        apiConfig.dotnetApiBase,
        `${GUEST_THUMBNAIL_UPDATE_API}?${queryParams.toString()}`,
        {},
      )
      // Mark this URL as the confirmed server-side image
      const cacheBustedUrl = `${finalUrl}?t=${Date.now()}`
      patchThumbnailState(index, { savedImageUrl: cacheBustedUrl, previewUrl: cacheBustedUrl })
      // Keep the studio image map in sync so fireRow/sendPreload use the latest URL without re-fetching
      setParticipantImageMap(prev => ({ ...prev, [participant.userId.toLowerCase()]: cacheBustedUrl }))
      // Notify other clients to update the background image for this participant (cache-busted so CDN doesn't serve stale content)
      sendWs({ type: 'EXTERNAL_BG_IMAGE', userId: participant.userId, url: cacheBustedUrl, fit: 'cover', methodType: 'preview', channel })
    } catch {
      // Restore to the last confirmed server-side image so the preview and
      // Remove button revert to the actual saved state
      patchThumbnailState(index, {
        selectedGraphic: '',
        localFile: null,
        uploadedUrl: '',
        previewUrl: thumbnailStates[index]?.savedImageUrl ?? '',
      })
      setErrorToastMessage('Upload failed. Please try again.')
      setErrorToastOpen(true)
    } finally {
      patchThumbnailState(index, { isSaving: false })
    }
  }

  async function removeThumbnail(participant: VideoConferenceParticipant, index: number) {
    patchThumbnailState(index, { isRemoving: true })
    try {
      const queryParams = new URLSearchParams({
        chid: channel,
        uuid: participant.cvUUID ?? 'null',
        usertype: 'participant',
        imagepath: 'null',
      })
      const result = await http.put<{ code?: number }>(
        apiConfig.dotnetApiBase,
        `${GUEST_THUMBNAIL_UPDATE_API}?${queryParams.toString()}`,
        {},
      )
      if (result.code !== 1) {
        setErrorToastMessage('Remove failed. Please try again.')
        setErrorToastOpen(true)
        return
      }
      patchThumbnailState(index, { selectedGraphic: '', localFile: null, previewUrl: '', savedImageUrl: '', uploadedUrl: '' })
      if (participant.userId !== DEFAULT_BG_PARTICIPANT_ID) {
        setParticipantImageMap(prev => {
          const updated = { ...prev }
          delete updated[participant.userId.toLowerCase()]
          return updated
        })
      }
    } finally {
      patchThumbnailState(index, { isRemoving: false })
    }
  }

  if (!open) return null

  const selectedParticipant = participants[selectedParticipantIndex] ?? null
  const selectedState = thumbnailStates[selectedParticipantIndex] ?? null
  const isSelectedDefaultBg = selectedParticipant?.userId === DEFAULT_BG_PARTICIPANT_ID
  const selectedSlug = selectedParticipant?.userId.replace(/\s+/g, '-').toLowerCase() ?? ''
  const canSave = Boolean(selectedState?.selectedGraphic) || Boolean(selectedState?.localFile)
  const hasSavedThumbnail = Boolean(selectedState?.savedImageUrl)

  return (
    <>
    <Toaster
      id="guest-thumbnail-error-toast"
      open={errorToastOpen}
      onOpenChange={setErrorToastOpen}
      title="Action failed"
      description={errorToastMessage}
      variant="error"
    />
    <div id="guest-thumbnail-overlay" className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div id="guest-thumbnail-dialog" className="flex flex-col bg-surface border border-primary-border rounded-2xl shadow-2xl w-[90vw] max-w-5xl h-[80vh] overflow-hidden">

        {/* Header */}
        <div id="guest-thumbnail-header" className="shrink-0 flex items-center justify-between px-5 py-3.5 border-b border-primary-border bg-surface-2">
          <div id="guest-thumbnail-header-left" className="flex items-center gap-2.5">
            <div id="guest-thumbnail-header-icon" className="w-7 h-7 rounded-lg bg-surface border border-primary-border flex items-center justify-center">
              <Users size={13} className="text-secondary-text" />
            </div>
            <div id="guest-thumbnail-header-text">
              <h2 id="guest-thumbnail-title" className="text-sm font-semibold text-primary-text leading-none">Guest Thumbnails</h2>
              {!isLoadingData && participants.length > 0 && (
                <p id="guest-thumbnail-subtitle" className="text-[10px] text-secondary-text mt-0.5">{participants.length} participant{participants.length !== 1 ? 's' : ''}</p>
              )}
            </div>
          </div>
          <div id="guest-thumbnail-header-actions" className="flex items-center gap-1">
            <button
              id="guest-thumbnail-btn-refresh"
              type="button"
              onClick={() => setRefreshCount(c => c + 1)}
              disabled={isLoadingData}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-secondary-text hover:text-primary-text hover:bg-surface-2 transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
              title="Refresh"
            >
              <RefreshCw size={13} className={isLoadingData ? 'animate-spin' : ''} />
            </button>
            <button
              id="guest-thumbnail-btn-close"
              type="button"
              onClick={onClose}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-secondary-text hover:text-primary-text hover:bg-surface-2 transition-colors cursor-pointer"
            >
              <X size={14} />
            </button>
          </div>
        </div>

        {/* Body — two panel layout */}
        <div id="guest-thumbnail-body" className="flex flex-1 overflow-hidden">

          {/* Left panel — participant list */}
          <div id="guest-thumbnail-participant-panel" className="w-56 shrink-0 border-r border-primary-border flex flex-col bg-surface">
            <div id="guest-thumbnail-participant-panel-label" className="px-4 py-2.5 border-b border-primary-border">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-secondary-text">Participants</span>
            </div>

            {isLoadingData ? (
              <div id="guest-thumbnail-list-loading" className="flex-1 flex items-center justify-center gap-2">
                <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-secondary-text border-t-primary-text" />
                <span className="text-xs text-secondary-text">Loading…</span>
              </div>
            ) : participants.length === 0 ? (
              <div id="guest-thumbnail-list-empty" className="flex-1 flex flex-col items-center justify-center gap-2 px-4">
                <Users size={20} className="text-secondary-text/50" />
                <span className="text-xs text-secondary-text text-center">No active participants</span>
              </div>
            ) : (
              <div id="guest-thumbnail-list" className="flex-1 overflow-y-auto">
                {participants.map((participant, index) => {
                  const state = thumbnailStates[index]
                  const isDefaultBg = participant.userId === DEFAULT_BG_PARTICIPANT_ID
                  const isSelected = selectedParticipantIndex === index
                  const hasThumbnail = Boolean(state?.savedImageUrl)
                  const itemSlug = participant.userId.replace(/\s+/g, '-').toLowerCase()

                  return (
                    <button
                      key={participant.userId}
                      id={`guest-thumbnail-participant-item-${itemSlug}`}
                      type="button"
                      onClick={() => setSelectedParticipantIndex(index)}
                      className={cn(
                        'w-full flex items-center gap-3 px-3 py-2.5 border-b border-primary-border transition-all duration-150 cursor-pointer text-left group',
                        isSelected ? 'bg-active-accent/5 border-l-2 border-l-active-accent' : 'hover:bg-surface-2 border-l-2 border-l-transparent',
                      )}
                    >
                      <div id={`guest-thumbnail-participant-avatar-${itemSlug}`} className="w-8 h-8 shrink-0 rounded-lg overflow-hidden border border-primary-border bg-surface-2 flex items-center justify-center">
                        {hasThumbnail ? (
                          <img
                            src={state!.savedImageUrl}
                            alt={participant.userId}
                            className="w-full h-full object-cover"
                            onError={e => { e.currentTarget.style.visibility = 'hidden' }}
                          />
                        ) : (
                          <Image size={12} className="text-secondary-text" />
                        )}
                      </div>
                      <div id={`guest-thumbnail-participant-info-${itemSlug}`} className="flex-1 min-w-0">
                        <p className={cn('text-xs truncate leading-tight', isSelected ? 'text-primary-text font-semibold' : 'text-secondary-text group-hover:text-primary-text')}>
                          {participant.userId}
                        </p>
                        {isDefaultBg && (
                          <span className="text-[9px] text-amber-600 font-medium">Default BG</span>
                        )}
                        {hasThumbnail && !isDefaultBg && (
                          <span className="text-[9px] text-emerald-600">Has thumbnail</span>
                        )}
                      </div>
                      {hasThumbnail && (
                        <CheckCircle2 size={11} className="shrink-0 text-emerald-500" />
                      )}
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* Right panel — editor */}
          <div id="guest-thumbnail-editor-panel" className="flex-1 flex flex-col overflow-hidden bg-surface">
            {!selectedParticipant || !selectedState ? (
              <div id="guest-thumbnail-editor-empty" className="flex-1 flex flex-col items-center justify-center gap-3 text-center px-8">
                <div className="w-12 h-12 rounded-2xl bg-surface-2 border border-primary-border flex items-center justify-center">
                  <Image size={20} className="text-secondary-text" />
                </div>
                <p className="text-xs text-secondary-text">Select a participant to manage their thumbnail</p>
              </div>
            ) : (
              <>
                {/* Participant info bar + actions */}
                <div id={`guest-thumbnail-editor-topbar-${selectedSlug}`} className="shrink-0 flex items-center gap-4 px-5 py-3.5 border-b border-primary-border bg-surface-2">

                  {/* Current thumbnail preview */}
                  <div id={`guest-thumbnail-current-preview-${selectedSlug}`} className="w-16 h-16 shrink-0 rounded-xl border border-primary-border bg-surface overflow-hidden flex items-center justify-center">
                    {selectedState.previewUrl ? (
                      <img
                        id={`guest-thumbnail-current-img-${selectedSlug}`}
                        src={selectedState.previewUrl}
                        alt="Current thumbnail"
                        className="w-full h-full object-cover"
                        onError={() => patchThumbnailState(selectedParticipantIndex, { previewUrl: '' })}
                      />
                    ) : (
                      <Image size={18} className="text-secondary-text" />
                    )}
                  </div>

                  {/* Name + selection info */}
                  <div id={`guest-thumbnail-editor-info-${selectedSlug}`} className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-primary-text truncate">{selectedParticipant.userId}</p>
                      {isSelectedDefaultBg && (
                        <span id="guest-thumbnail-default-badge" className="shrink-0 text-[9px] font-semibold px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-700 border border-amber-200">
                          DEFAULT BG
                        </span>
                      )}
                    </div>
                    {selectedState.selectedGraphic && (
                      <p className="text-xs text-secondary-text mt-0.5 truncate">
                        Selected: <span className="text-primary-text">{selectedState.selectedGraphic}</span>
                      </p>
                    )}
                    {selectedState.localFile && (
                      <p className="text-xs text-secondary-text mt-0.5 truncate">
                        File: <span className="text-primary-text">{selectedState.localFile.name}</span>
                      </p>
                    )}
                    {!selectedState.selectedGraphic && !selectedState.localFile && hasSavedThumbnail && (
                      <p className="text-xs text-emerald-600 mt-0.5">Thumbnail saved</p>
                    )}
                    {!selectedState.selectedGraphic && !selectedState.localFile && !hasSavedThumbnail && (
                      <p className="text-xs text-secondary-text mt-0.5">No thumbnail set</p>
                    )}
                  </div>

                  {/* Action buttons */}
                  <div id={`guest-thumbnail-editor-actions-${selectedSlug}`} className="flex items-center gap-2 shrink-0">
                    {hasSavedThumbnail && (
                      <button
                        id={`guest-thumbnail-btn-remove-${selectedSlug}`}
                        type="button"
                        onClick={() => void removeThumbnail(selectedParticipant, selectedParticipantIndex)}
                        disabled={selectedState.isRemoving}
                        className="text-xs px-3 py-1.5 rounded-lg border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        {selectedState.isRemoving ? 'Removing…' : 'Remove'}
                      </button>
                    )}
                    {canSave && (
                      <button
                        id={`guest-thumbnail-btn-save-${selectedSlug}`}
                        type="button"
                        onClick={() => void saveThumbnail(selectedParticipant, selectedParticipantIndex)}
                        disabled={selectedState.isSaving}
                        className="text-xs px-4 py-1.5 rounded-lg bg-active-accent text-white hover:bg-active-accent/90 font-medium transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {selectedState.isSaving ? 'Saving…' : 'Save'}
                      </button>
                    )}
                  </div>
                </div>

                {/* Editor content — scrollable */}
                <div id={`guest-thumbnail-editor-content-${selectedSlug}`} className="flex-1 overflow-y-auto p-5 flex flex-col gap-6">

                  {/* Upload file section */}
                  <div id={`guest-thumbnail-upload-section-${selectedSlug}`}>
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-secondary-text mb-3">Upload File</p>
                    <div
                      id={`guest-thumbnail-drop-zone-${selectedSlug}`}
                      className={cn(
                        'flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed py-6 transition-colors',
                        selectedState.localFile
                          ? 'border-emerald-500 bg-emerald-50'
                          : 'border-primary-border bg-surface-2 hover:border-active-accent/50 hover:bg-surface-2',
                      )}
                    >
                      {selectedState.localFile ? (
                        <>
                          <CheckCircle2 size={18} className="text-emerald-500" />
                          <p id={`guest-thumbnail-file-name-${selectedSlug}`} className="text-xs text-emerald-700 font-medium truncate max-w-48">{selectedState.localFile.name}</p>
                          <button
                            id={`guest-thumbnail-btn-clear-file-${selectedSlug}`}
                            type="button"
                            onClick={() => patchThumbnailState(selectedParticipantIndex, { localFile: null, previewUrl: selectedState.savedImageUrl, uploadedUrl: '' })}
                            className="text-[10px] text-secondary-text hover:text-primary-text transition-colors cursor-pointer mt-1"
                          >
                            Clear file
                          </button>
                        </>
                      ) : (
                        <>
                          <Upload size={16} className="text-secondary-text" />
                          <p className="text-xs text-secondary-text">Drop an image or</p>
                          <button
                            id={`guest-thumbnail-btn-browse-${selectedSlug}`}
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={Boolean(selectedState.selectedGraphic)}
                            className="text-xs px-3 py-1 rounded-lg border border-primary-border bg-surface text-primary-text hover:bg-surface-2 transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                          >
                            Browse
                          </button>
                        </>
                      )}
                      <input
                        ref={el => {
                          fileInputRef.current = el
                          return () => { fileInputRef.current = null }
                        }}
                        id={`guest-thumbnail-file-input-${selectedSlug}`}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={e => {
                          const file = e.target.files?.[0]
                          if (file) handleLocalFileSelected(selectedParticipantIndex, file)
                        }}
                      />
                    </div>
                  </div>

                  {/* Graphic library */}
                  <div id={`guest-thumbnail-library-section-${selectedSlug}`}>
                      <div id={`guest-thumbnail-library-header-${selectedSlug}`} className="flex items-center justify-between mb-3">
                        <p className="text-[10px] font-semibold uppercase tracking-widest text-secondary-text">
                          Graphic Library
                          {graphicAssets.length > 0 && (
                            <span className="ml-1.5 text-secondary-text/70 normal-case tracking-normal font-normal">({graphicAssets.length})</span>
                          )}
                        </p>
                        {selectedState.selectedGraphic && (
                          <button
                            id={`guest-thumbnail-btn-clear-graphic-${selectedSlug}`}
                            type="button"
                            onClick={() => handleGraphicSelected(selectedParticipantIndex, '')}
                            className="text-[10px] text-secondary-text hover:text-primary-text transition-colors cursor-pointer"
                          >
                            Clear selection
                          </button>
                        )}
                      </div>

                      {graphicAssets.length === 0 ? (
                        <div id={`guest-thumbnail-library-empty-${selectedSlug}`} className="flex flex-col items-center justify-center gap-2 h-24 rounded-xl border border-primary-border bg-surface-2">
                          <Image size={16} className="text-secondary-text" />
                          <span className="text-xs text-secondary-text">No graphic assets available</span>
                        </div>
                      ) : (
                        <div id={`guest-thumbnail-library-grid-${selectedSlug}`} className="grid grid-cols-5 gap-2">
                          {graphicAssets.map((asset, assetIndex) => {
                            const isAssetSelected = selectedState.selectedGraphic === asset.name
                            return (
                              <button
                                key={`${asset.name}-${assetIndex}`}
                                id={`guest-thumbnail-library-asset-${assetIndex}`}
                                type="button"
                                title={asset.name}
                                disabled={Boolean(selectedState.localFile)}
                                onClick={() => handleGraphicSelected(selectedParticipantIndex, isAssetSelected ? '' : asset.name)}
                                className={cn(
                                  'group relative flex flex-col items-center gap-1.5 p-1.5 rounded-xl border transition-all duration-150 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed',
                                  isAssetSelected
                                    ? 'border-active-accent bg-active-accent/5 ring-1 ring-active-accent/25 shadow-sm shadow-active-accent/10'
                                    : 'border-primary-border bg-surface hover:bg-surface-2',
                                )}
                              >
                                {isAssetSelected && (
                                  <div id={`guest-thumbnail-asset-selected-indicator-${assetIndex}`} className="absolute top-1 right-1 w-3.5 h-3.5 rounded-full bg-active-accent flex items-center justify-center">
                                    <CheckCircle2 size={9} className="text-white" />
                                  </div>
                                )}
                                {brokenAssetIndices.has(assetIndex) ? (
                                  <div id={`guest-thumbnail-asset-broken-${assetIndex}`} className="w-full aspect-video rounded-lg bg-surface-2 border border-primary-border flex flex-col items-center justify-center gap-1">
                                    <ImageOff size={12} className="text-secondary-text" />
                                  </div>
                                ) : (
                                  <img
                                    src={asset.previewUrl}
                                    alt={asset.name}
                                    className="w-full aspect-video object-cover rounded-lg"
                                    onError={() => setBrokenAssetIndices(prev => new Set(prev).add(assetIndex))}
                                  />
                                )}
                                <span className="text-[9px] text-secondary-text group-hover:text-primary-text truncate w-full text-center leading-tight transition-colors">{asset.name}</span>
                              </button>
                            )
                          })}
                        </div>
                      )}
                    </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
    </>
  )
}
