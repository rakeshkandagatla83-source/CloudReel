import { useState, useEffect, useCallback } from 'react'
import { X, Save } from 'lucide-react'
import { cn } from '../../lib/utils'
import { http } from '../../lib/http'
import { apiConfig } from '../../lib/apiConfig'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'

type MatrixType = 'video' | 'audio'
type MatrixState = Record<string, Record<string, boolean>>

interface MatrixApiGetResponse {
  code: number
  data?: Array<{ jsonvalue: string }>
}

interface MatrixModalProps {
  isOpen: boolean
  onClose: () => void
  channelId: string
  hostUserId: string
  participants: string[]
  sendCellChange: (sourceUser: string, targetUser: string, enabled: boolean, matrixType: MatrixType) => void
  sendMatrixChange: (controller: MatrixType, userIds: string[]) => void
}

function formatParticipantName(userId: string): string {
  return userId
    .replace(/[_-]/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

function buildMatrixFromApiData(data: Array<Record<string, unknown>>): MatrixState {
  const state: MatrixState = {}
  data.forEach((entry) => {
    const rowUser = entry['user'] as string
    state[rowUser] = {}
    Object.keys(entry).forEach((colUser) => {
      if (colUser !== 'user') state[rowUser][colUser] = Boolean(entry[colUser])
    })
  })
  return state
}

function buildFullMatrixApiData(matrix: MatrixState, participants: string[]): Array<Record<string, unknown>> {
  return participants.map((rowUser) => {
    const row: Record<string, unknown> = { user: rowUser }
    participants.forEach((colUser) => {
      if (colUser !== rowUser) row[colUser] = matrix[rowUser]?.[colUser] ?? true
    })
    return row
  })
}

function getChangedUsers(oldMatrix: MatrixState, newMatrix: MatrixState, participants: string[]): string[] {
  const changed = new Set<string>()
  participants.forEach((rowUser) => {
    const oldRow = oldMatrix[rowUser] ?? {}
    const newRow = newMatrix[rowUser] ?? {}
    participants.forEach((colUser) => {
      if (colUser === rowUser) return
      const oldValue = oldRow[colUser] ?? true
      const newValue = newRow[colUser] ?? true
      if (oldValue !== newValue) changed.add(rowUser)
    })
  })
  return Array.from(changed)
}

async function fetchMatrixFromApi(
  channelId: string,
  _hostUserId: string,
  matrixType: MatrixType,
): Promise<{ data: Array<Record<string, unknown>>; hasExisting: boolean }> {
  try {
    const res = await http.get<MatrixApiGetResponse>(
      apiConfig.dotnetApiBase,
      `v1/Producer/audio-video-info/${channelId}?contollerType=${matrixType}`,//userId=${hostUserId}&
    )
    if (res.data && res.data.length > 0) {
      const parsed = JSON.parse(res.data[0].jsonvalue) as Array<Record<string, unknown>>
      return { data: parsed, hasExisting: true }
    }
    return { data: [], hasExisting: false }
  } catch {
    return { data: [], hasExisting: false }
  }
}

export function MatrixModal({
  isOpen, onClose, channelId, hostUserId, participants,
  sendCellChange, sendMatrixChange,
}: MatrixModalProps) {
  const [activeMatrixType, setActiveMatrixType] = useState<MatrixType>('video')
  const [videoMatrix, setVideoMatrix] = useState<MatrixState>({})
  const [audioMatrix, setAudioMatrix] = useState<MatrixState>({})
  const [initialVideoMatrix, setInitialVideoMatrix] = useState<MatrixState>({})
  const [initialAudioMatrix, setInitialAudioMatrix] = useState<MatrixState>({})
  const [hasExistingVideo, setHasExistingVideo] = useState(false)
  const [hasExistingAudio, setHasExistingAudio] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isSaveConfirmOpen, setIsSaveConfirmOpen] = useState(false)

  const loadMatrixData = useCallback(async () => {
    if (!channelId || !hostUserId) return
    setIsLoading(true)
    const [videoResult, audioResult] = await Promise.all([
      fetchMatrixFromApi(channelId, hostUserId, 'video'),
      fetchMatrixFromApi(channelId, hostUserId, 'audio'),
    ])
    const videoState = buildMatrixFromApiData(videoResult.data)
    const audioState = buildMatrixFromApiData(audioResult.data)

    // Normalize: any cell where video is off must also have audio off (fix stale API data)
    const normalizedAudioState: MatrixState = {}
    participants.forEach((rowUser) => {
      normalizedAudioState[rowUser] = {}
      participants.forEach((colUser) => {
        if (colUser === rowUser) return
        const isVideoOn = videoState[rowUser]?.[colUser] ?? true
        const isAudioOn = audioState[rowUser]?.[colUser] ?? true
        normalizedAudioState[rowUser][colUser] = isVideoOn ? isAudioOn : false
      })
    })

    setVideoMatrix(videoState)
    setAudioMatrix(normalizedAudioState)
    setInitialVideoMatrix(videoState)
    setInitialAudioMatrix(normalizedAudioState)
    setHasExistingVideo(videoResult.hasExisting)
    setHasExistingAudio(audioResult.hasExisting)
    setIsLoading(false)
  }, [channelId, hostUserId, participants])

  useEffect(() => {
    if (isOpen) void loadMatrixData()
  }, [isOpen, loadMatrixData])

  function getCellValue(matrix: MatrixState, rowUser: string, colUser: string): boolean {
    return matrix[rowUser]?.[colUser] ?? true
  }

  function handleCellToggle(rowUser: string, colUser: string, enabled: boolean) {
    if (activeMatrixType === 'video') {
      setVideoMatrix(prev => ({
        ...prev,
        [rowUser]: { ...(prev[rowUser] ?? {}), [colUser]: enabled },
      }))
      sendCellChange(colUser, rowUser, enabled, 'video')
      // Cascade: video off → audio off; video on → audio on
      setAudioMatrix(prev => ({
        ...prev,
        [rowUser]: { ...(prev[rowUser] ?? {}), [colUser]: enabled },
      }))
      sendCellChange(colUser, rowUser, enabled, 'audio')
    } else {
      setAudioMatrix(prev => ({
        ...prev,
        [rowUser]: { ...(prev[rowUser] ?? {}), [colUser]: enabled },
      }))
      // sourceUser = col (whose stream), targetUser = row (the listener)
      sendCellChange(colUser, rowUser, enabled, 'audio')
    }
  }

  async function handleSave() {
    setIsSaving(true)
    const videoApiData = buildFullMatrixApiData(videoMatrix, participants)
    const audioApiData = buildFullMatrixApiData(audioMatrix, participants)
    const changedVideoUsers = getChangedUsers(initialVideoMatrix, videoMatrix, participants)
    const changedAudioUsers = getChangedUsers(initialAudioMatrix, audioMatrix, participants)

    await Promise.all([
      hasExistingVideo
        ? http.put(apiConfig.dotnetApiBase, `v1/Producer/upd-av/${channelId}/video`, videoApiData)
        : http.post(apiConfig.dotnetApiBase, `v1/Producer/audio-video?channelId=${channelId}&userId=${hostUserId}&type=video`, videoApiData),
      hasExistingAudio
        ? http.put(apiConfig.dotnetApiBase, `v1/Producer/upd-av/${channelId}/audio`, audioApiData)
        : http.post(apiConfig.dotnetApiBase, `v1/Producer/audio-video?channelId=${channelId}&userId=${hostUserId}&type=audio`, audioApiData),
    ]).catch(() => { })

    if (changedVideoUsers.length > 0) sendMatrixChange('video', changedVideoUsers)
    if (changedAudioUsers.length > 0) sendMatrixChange('audio', changedAudioUsers)
    setHasExistingVideo(true)
    setHasExistingAudio(true)
    setInitialVideoMatrix(videoMatrix)
    setInitialAudioMatrix(audioMatrix)
    setIsSaving(false)
    setIsSaveConfirmOpen(false)
  }

  if (!isOpen) return null

  const activeMatrix = activeMatrixType === 'video' ? videoMatrix : audioMatrix

  return (
    <>
      <div id="studio-matrix-modal-overlay" className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs">
        <div id="studio-matrix-modal" className="bg-[#0c1220] border border-white/10 rounded-2xl shadow-2xl flex flex-col w-160 max-h-[80vh] overflow-hidden">

          {/* Header */}
          <div id="studio-matrix-modal-header" className="shrink-0 flex items-center justify-between px-5 py-4 border-b border-white/8">
            <div>
              <h2 id="studio-matrix-modal-title" className="text-base font-semibold text-white">Audio / Video Matrix</h2>
              <p id="studio-matrix-modal-subtitle" className="text-xs text-white/65 mt-0.5">
                Control which participants can see and hear each other.
              </p>
            </div>
            <button
              id="studio-matrix-modal-btn-close"
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-white/65 hover:text-white hover:bg-white/8 cursor-pointer transition-colors"
            >
              <X size={15} />
            </button>
          </div>

          {/* Type tabs */}
          <div id="studio-matrix-modal-tabs" className="shrink-0 flex border-b border-white/8">
            {(['video', 'audio'] as MatrixType[]).map((matrixType) => (
              <button
                key={matrixType}
                id={`studio-matrix-modal-tab-${matrixType}`}
                type="button"
                onClick={() => setActiveMatrixType(matrixType)}
                className={cn(
                  'flex-1 py-2.5 text-sm font-semibold cursor-pointer border-b-2 transition-colors capitalize',
                  activeMatrixType === matrixType
                    ? 'text-white border-[#3031cb]'
                    : 'text-white/60 border-transparent hover:text-white',
                )}
              >
                {matrixType === 'video' ? 'Video' : 'Audio'}
              </button>
            ))}
          </div>

          {/* Matrix grid */}
          <div id="studio-matrix-modal-grid-container" className="flex-1 min-h-0 overflow-auto p-4">
            {isLoading ? (
              <div id="studio-matrix-modal-loading" className="flex items-center justify-center h-32">
                <div className="w-5 h-5 rounded-full border-2 border-white/20 border-t-white animate-spin" />
              </div>
            ) : participants.length === 0 ? (
              <p id="studio-matrix-modal-empty" className="text-sm text-white/65 text-center py-8">
                No participants in the meeting yet.
              </p>
            ) : (
              <div id="studio-matrix-modal-grid">
                <table className="border-collapse text-sm">
                  <thead>
                    <tr>
                      <th
                        id="studio-matrix-modal-th-corner"
                        className="text-left text-white/55 font-semibold pb-3 pr-6 whitespace-nowrap min-w-28"
                      >
                        Listener / Source
                      </th>
                      {participants.map((colUser) => (
                        <th
                          key={colUser}
                          id={`studio-matrix-modal-th-col-${colUser}`}
                          className="text-center text-white/80 font-semibold pb-3 px-3 min-w-20"
                        >
                          <div className="truncate max-w-20" title={colUser}>{formatParticipantName(colUser)}</div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {participants.map((rowUser) => (
                      <tr key={rowUser} id={`studio-matrix-modal-row-${rowUser}`} className="border-t border-white/8">
                        <td
                          id={`studio-matrix-modal-row-label-${rowUser}`}
                          className="text-white/80 font-semibold pr-6 py-3 whitespace-nowrap"
                        >
                          <div className="truncate max-w-28" title={rowUser}>{formatParticipantName(rowUser)}</div>
                        </td>
                        {participants.map((colUser) => {
                          const isSelfCell = rowUser === colUser
                          const isVideoOn = isSelfCell || getCellValue(videoMatrix, rowUser, colUser)
                          const isAudioDisabledByVideo = activeMatrixType === 'audio' && !isVideoOn
                          const isDisabled = isSelfCell || isAudioDisabledByVideo
                          const isChecked = isSelfCell || (isAudioDisabledByVideo ? false : getCellValue(activeMatrix, rowUser, colUser))
                          return (
                            <td
                              key={colUser}
                              id={`studio-matrix-modal-cell-${rowUser}-${colUser}`}
                              className="text-center py-3 px-3"
                            >
                              <input
                                id={`studio-matrix-modal-checkbox-${rowUser}-${colUser}`}
                                type="checkbox"
                                checked={isChecked}
                                disabled={isDisabled}
                                onChange={(e) => {
                                  if (!isDisabled) handleCellToggle(rowUser, colUser, e.target.checked)
                                }}
                                className="w-4 h-4 accent-blue-500 cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
                              />
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>


          {/* Footer */}
          <div id="studio-matrix-modal-footer" className="shrink-0 flex items-center justify-between px-5 py-3 border-t border-white/8">
            <p id="studio-matrix-modal-footer-hint" className="text-xs text-white/60">
              Changes are sent instantly. Save persists to the server.
            </p>
            <div id="studio-matrix-modal-footer-actions" className="flex gap-2">
              <button
                id="studio-matrix-modal-btn-cancel"
                type="button"
                onClick={onClose}
                className="px-3 py-1.5 rounded-lg border border-white/10 bg-white/4 text-white/80 text-xs font-semibold cursor-pointer hover:bg-white/8 hover:text-white transition-colors"
              >
                Close
              </button>
              <button
                id="studio-matrix-modal-btn-save"
                type="button"
                onClick={() => setIsSaveConfirmOpen(true)}
                disabled={isSaving || isLoading || participants.length === 0}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#3031cb] hover:bg-[#2829b0] disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-semibold cursor-pointer transition-colors"
              >
                <Save size={12} />
                {isSaving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={isSaveConfirmOpen}
        onOpenChange={setIsSaveConfirmOpen}
        title="Save Matrix Settings?"
        description="This will persist the audio/video visibility configuration to the server and notify all affected participants."
        confirmLabel="Save"
        onConfirm={handleSave}
      />
    </>
  )
}
