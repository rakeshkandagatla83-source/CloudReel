import { type RefObject, useCallback, useEffect, useMemo, useState } from 'react'
import { Toaster } from '../../components/ui/Toast'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { ChevronLeft, ChevronRight, LayoutGrid, Loader2, MessagesSquare, Paintbrush, RotateCcw, Share2, Rows4, SquarePlay, Users, Settings } from 'lucide-react'
import * as DropdownMenu from '@radix-ui/react-dropdown-menu'
import { cn } from '../../lib/utils'
import { Select, SelectItem } from '../../components/ui/Select'
import { GfxPanel } from './GfxPanel'
import { PublishPanel } from './PublishPanel'
import { SocialPanel } from './SocialPanel'
import { MessageLog } from './MessageLog'
import { MonitorArea } from './MonitorArea'
import { QButtonTable } from './QButtonTable'
import { CompactView } from './CompactView'
import { SourcesSidebar } from './SourcesSidebar'
import { StudioContext, LogContext } from './StudioContext'
import { useStudio, uid } from './useStudio'
import { VideoPlayerPopup } from './VideoPlayerPopup'
import { GuestThumbnailDialog } from './GuestThumbnailDialog'
import type { LogEntry, LogType } from '../../types/studio'

interface StudioPanelProps {
  refreshSourcesRef?: RefObject<(() => void) | null>
  addParticipantRef?: RefObject<((userId: string, joinTimestampMs: number) => void) | null>
  removeParticipantRef?: RefObject<((userId: string) => void) | null>
  initialMeetingUrl?: string
}

export function StudioPanel({ refreshSourcesRef, addParticipantRef, removeParticipantRef, initialMeetingUrl }: StudioPanelProps) {
  // ── Log state lives here so log updates never re-render context consumers ──
  const [logEntries, setLogEntries] = useState<LogEntry[]>([])
  const [logOpen, setLogOpen] = useState(false)
  const [isGuestThumbnailOpen, setIsGuestThumbnailOpen] = useState(false)
  const [isResetStreamConfirmOpen, setIsResetStreamConfirmOpen] = useState(false)
  const [isResetLayoutConfirmOpen, setIsResetLayoutConfirmOpen] = useState(false)
  const addLog = useCallback((msg: string, type: LogType = 'info') => {
    const t = new Date().toLocaleTimeString()
    setLogEntries(prev => [...prev.slice(-199), { id: uid(), msg: type === 'divider' ? msg : `[${t}] ${msg}`, type, time: t }])
  }, [])

  const studio = useStudio(addLog, initialMeetingUrl)

  const [isTablet, setIsTablet] = useState(() => typeof window !== 'undefined' ? window.innerWidth < 1280 : false)
  useEffect(() => {
    if (typeof window === 'undefined') return
    const handleResize = () => setIsTablet(window.innerWidth < 1280)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    if (!refreshSourcesRef) return
    refreshSourcesRef.current = studio.fetchParticipants
    return () => { refreshSourcesRef.current = null }
  }, [refreshSourcesRef, studio.fetchParticipants])

  useEffect(() => {
    if (!addParticipantRef) return
    addParticipantRef.current = studio.addParticipant
    return () => { addParticipantRef.current = null }
  }, [addParticipantRef, studio.addParticipant])

  useEffect(() => {
    if (!removeParticipantRef) return
    removeParticipantRef.current = studio.removeParticipant
    return () => { removeParticipantRef.current = null }
  }, [removeParticipantRef, studio.removeParticipant])

useEffect(() => { studio.fetchGraphics() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Stable context value — only re-creates when real studio state changes, not on log updates
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const ctxValue = useMemo(() => studio, [
    studio.wsStatus, studio.participants, studio.webrtcSources, studio.rtmpSources,
    studio.videoAssets, studio.layoutData, studio.groupLayouts, studio.groups,
    studio.selectedGroup, studio.mode, studio.rows, studio.activeRowIdx, studio.lastFiredInfo,
    studio.gfxData, studio.gfxTemplateName, studio.gfxBusy, studio.gfxBandContent, studio.gfxAlignmentCache,
    studio.currentTab, studio.currentRightTab, studio.leftSidebarOpen, studio.rightSidebarOpen, studio.studioLayout,
    studio.destinations, studio.videoPopup, studio.isRecording, studio.isRecordingBusy,
    studio.meetingUrl,
    studio.sbStatus, studio.layoutStatus, studio.participantStatus, studio.gfxStatus,
    studio.previewUserIds,
    studio.sourceLocations,
    studio.virtualSources,
    studio.compactPoolSelectedValues,
  ])

  const logCtxValue = useMemo(() => ({ logEntries, logOpen, setLogOpen }), [logEntries, logOpen])

  const {
    wsStatus, toggleConnect, mode, setMode, selectedGroup, setSelectedGroup, groups,
    fetchLayouts, resetStream, isResetBusy, resetLayout,
    leftSidebarOpen, setLeftSidebarOpen, rightSidebarOpen, setRightSidebarOpen,
    currentRightTab, setCurrentRightTab, videoPopup, closeVideoPopup,
    studioToast, setStudioToast, studioToastNonce, rows,
    isRestricted, isAccessRequestPending, isClaimingChannel, activeChannelUser, pendingAccessRequest, requestAccess, acceptAccessRequest, denyAccessRequest, forceAccess,
    studioLayout, setStudioLayout,
  } = studio  // read directly from studio (not ctxValue) so StudioPanel itself always has latest

  const [pendingGroup, setPendingGroup] = useState<string | null>(null)

  function handleGroupChange(newGroup: string) {
    const hasRowData = rows.some(r => r.captionId || r.sources.length > 0)
    if (hasRowData && newGroup !== selectedGroup) {
      setPendingGroup(newGroup)
    } else {
      setSelectedGroup(newGroup)
    }
  }

  const wsDot = wsStatus === 'connected' ? 'bg-emerald-400 shadow-[0_0_5px_rgba(52,211,153,0.7)]'
    : wsStatus === 'reconnecting' ? 'bg-amber-400 animate-pulse'
      : 'bg-white/20'

  const wsTextCls = wsStatus === 'connected' ? 'text-emerald-400' : wsStatus === 'reconnecting' ? 'text-amber-400' : 'text-white/60'
  const wsText = wsStatus === 'connected' ? 'Connected' : wsStatus === 'reconnecting' ? 'Reconnecting...' : 'Not connected'

  const tbBtn = 'flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs xl:px-2.5 xl:py-1 xl:text-[10px] font-medium cursor-pointer transition-all border min-h-10 xl:min-h-0'
  const selCls = ''

  return (
    <StudioContext value={ctxValue}>
    <LogContext value={logCtxValue}>
      <div className="flex h-full overflow-hidden bg-primary-bg relative">
        {/* Backdrop for sidebars in tablet/mobile mode */}
        {isTablet && (leftSidebarOpen || rightSidebarOpen) && (
          <div
            id="studio-sidebar-backdrop"
            onClick={() => {
              setLeftSidebarOpen(false)
              setRightSidebarOpen(false)
            }}
            className="fixed inset-0 z-35 bg-black/60 backdrop-blur-xs transition-opacity duration-300 animate-in fade-in-0"
          />
        )}

        {/* Restriction overlay — blocks all interactions when not in control */}
        {isRestricted && (
          <div id="studio-restriction-overlay" className="absolute inset-0 z-40 bg-black/40 pointer-events-auto" />
        )}

        {/* Restriction banner */}
        {isRestricted && (
          <div id="studio-restriction-banner" className="absolute top-9 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-950/95 border border-amber-400/40 shadow-lg pointer-events-none whitespace-nowrap">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse shrink-0" />
            <span className="text-[11px] font-medium text-amber-300">
              Not in control
              {activeChannelUser && ` · ${activeChannelUser.userName || activeChannelUser.userId} is active`}
            </span>
          </div>
        )}

        {/* Left sidebar toggle — on narrow viewports opening this panel closes the right one */}
        <button
          id="studio-sidebar-toggle-left"
          type="button"
          onClick={() => {
            setLeftSidebarOpen(prev => {
              const isOpening = !prev
              if (isOpening && window.innerWidth < 1280) setRightSidebarOpen(false)
              return isOpening
            })
          }}
          className="fixed top-1/2 -translate-y-1/2 z-50 flex flex-col items-center gap-1 py-2.5 px-1.5 bg-primary-bg border border-white/10 border-l-0 rounded-r-lg cursor-pointer text-white/60 hover:text-white transition-colors"
          style={{ left: leftSidebarOpen ? 244 : 0, transition: 'left 0.25s' }}
        >
          {leftSidebarOpen ? <ChevronLeft size={12} /> : <ChevronRight size={12} />}
          <span className="text-[8px] font-semibold uppercase tracking-wider" style={{ writingMode: 'vertical-rl' }}>
            {leftSidebarOpen ? 'Hide' : 'Sources'}
          </span>
        </button>

        {/* Right sidebar toggle — on narrow viewports opening this panel closes the left one */}
        <button
          id="studio-sidebar-toggle-right"
          type="button"
          onClick={() => {
            setRightSidebarOpen(prev => {
              const isOpening = !prev
              if (isOpening && window.innerWidth < 1280) setLeftSidebarOpen(false)
              return isOpening
            })
          }}
          className="fixed top-1/2 -translate-y-1/2 z-50 flex flex-col items-center gap-1 py-2.5 px-1.5 bg-primary-bg border border-white/10 border-r-0 rounded-l-lg cursor-pointer text-white/60 hover:text-white transition-colors"
          style={{ right: rightSidebarOpen ? 260 : 0, transition: 'right 0.25s' }}
        >
          <span className="text-[8px] font-semibold uppercase tracking-wider" style={{ writingMode: 'vertical-rl' }}>
            {rightSidebarOpen ? 'Hide' : 'GFX'}
          </span>
          {rightSidebarOpen ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
        </button>

        {/* LEFT SIDEBAR */}
        <div
          className={cn(
            "bg-primary-bg border-r border-white/6 overflow-hidden transition-all duration-300",
            isTablet
              ? "fixed inset-y-0 left-0 z-40 w-[244px]"
              : "shrink-0"
          )}
          style={!isTablet ? {
            width: leftSidebarOpen ? 244 : 0,
            minWidth: leftSidebarOpen ? 244 : 0,
          } : {
            transform: leftSidebarOpen ? 'translateX(0)' : 'translateX(-244px)'
          }}
        >
          <SourcesSidebar />
        </div>

        {/* MAIN */}
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          {/* Top bar */}
          <div className="shrink-0 flex items-center gap-2 px-3 py-2 border-b border-white/6 bg-primary-bg flex-wrap min-h-12 md:min-h-14">
            <div className={cn('w-2 h-2 rounded-full shrink-0', wsDot)} />
            <span className={cn('text-[11px] hidden md:inline', wsTextCls)}>{wsText}</span>

            <div className="w-px h-4 bg-white/8 hidden md:block" />

            <label className="text-xs xl:text-[10px] text-white/65 font-medium">Group:</label>
            <Select value={selectedGroup} onValueChange={handleGroupChange} className={selCls}>
              <SelectItem value="">-- Select Group --</SelectItem>
              {groups.map(g => <SelectItem key={g} value={g}>{g}</SelectItem>)}
            </Select>

            <label className="text-xs xl:text-[10px] text-white/65 font-medium">Mode:</label>
            <Select value={mode} onValueChange={v => setMode(v as 'preview' | 'master')} className={selCls}>
              <SelectItem value="preview">Preview</SelectItem>
              <SelectItem value="master">Master</SelectItem>
            </Select>

            <div className="w-px h-4 bg-white/8" />

            {/* Desktop-only action buttons */}
            <div className="hidden xl:flex items-center gap-2">
              <button
                id="studio-btn-connect"
                type="button"
                onClick={toggleConnect}
                className={cn(tbBtn, wsStatus === 'connected'
                  ? 'border-emerald-400/20 bg-emerald-950/30 text-emerald-400 hover:bg-emerald-950/50'
                  : 'border-[#3031cb]/30 bg-[#3031cb]/8 text-[#3031cb] hover:bg-[#3031cb]/15')}
              >
                {wsStatus === 'connected' ? 'Disconnect' : 'Connect'}
              </button>

              <div className="w-px h-4 bg-white/8" />

              <button id="studio-btn-layouts" type="button" onClick={fetchLayouts} className={cn(tbBtn, 'border-white/8 bg-white/3 text-white/70 hover:text-white hover:bg-white/7')}>
                <LayoutGrid size={10} /> Layouts
              </button>

              <button
                id="studio-btn-toggle-layout"
                type="button"
                onClick={() => setStudioLayout(studioLayout === 'studio' ? 'compact' : 'studio')}
                className={cn(tbBtn, 'border-white/8 bg-white/3 text-white/70 hover:text-white hover:bg-white/7')}
                title={studioLayout === 'studio' ? 'Switch to Compact view' : 'Switch to Studio view'}
              >
                {studioLayout === 'studio' ? <Rows4 size={10} /> : <SquarePlay size={10} />}
                {studioLayout === 'studio' ? 'Compact' : 'Studio'}
              </button>
            </div>
            
            <div className="flex-1" />

            {/* Desktop-only right-aligned actions */}
            <div className="hidden xl:flex items-center gap-2 ml-auto">
              <button
                id="studio-btn-guest-thumbnails"
                type="button"
                onClick={() => setIsGuestThumbnailOpen(true)}
                className={cn(tbBtn, 'border-white/8 bg-white/3 text-white/70 hover:text-white hover:bg-white/7')}
                title="Guest Thumbnails"
              >
                <Users size={10} /> Guest Thumbnails
              </button>
              {activeChannelUser && (<>
                <button
                  id="studio-btn-request-access"
                  type="button"
                  disabled={isAccessRequestPending || isClaimingChannel}
                  onClick={requestAccess}
                  className={cn(tbBtn, 'relative z-50 border-white/12 bg-white/4 text-white/75 hover:bg-white/8 hover:text-white disabled:opacity-60 disabled:cursor-not-allowed')}
                  title={isClaimingChannel ? 'Waiting to claim channel…' : `Request access from: ${activeChannelUser.userName || activeChannelUser.userId}`}
                >
                  {isClaimingChannel
                    ? <><Loader2 size={10} className="animate-spin" /> Claiming…</>
                    : isAccessRequestPending
                      ? <><Loader2 size={10} className="animate-spin" /> Requesting…</>
                      : 'Request Access'}
                </button>
                <button
                  id="studio-btn-force-access"
                  type="button"
                  disabled={isClaimingChannel}
                  onClick={forceAccess}
                  className={cn(tbBtn, 'relative z-50 border-[#3031cb]/40 bg-[#3031cb]/10 text-[#3031cb] hover:bg-[#3031cb]/20 disabled:opacity-60 disabled:cursor-not-allowed')}
                  title={isClaimingChannel ? 'Waiting to claim channel…' : `Force access from: ${activeChannelUser.userName || activeChannelUser.userId}`}
                >
                  Force Access
                </button>
              </>)}
              <button
                id="studio-btn-reset-stream"
                type="button"
                onClick={() => setIsResetStreamConfirmOpen(true)}
                disabled={isResetBusy}
                className={cn(tbBtn, 'border-amber-400/20 bg-amber-950/30 text-amber-400 hover:bg-amber-950/50 disabled:opacity-50 disabled:cursor-not-allowed')}
              >
                <RotateCcw size={10} className={isResetBusy ? 'animate-spin' : ''} /> Reset Stream
              </button>
              <button
                id="studio-btn-reset-layout"
                type="button"
                onClick={() => setIsResetLayoutConfirmOpen(true)}
                className={cn(tbBtn, 'border-rose-400/20 bg-rose-950/30 text-rose-400 hover:bg-rose-950/50 cursor-pointer')}
              >
                <LayoutGrid size={10} /> Reset Layout
              </button>
            </div>

            {/* Tablet/Mobile Dropdown Actions Menu */}
            <div className="xl:hidden">
              <DropdownMenu.Root>
                <DropdownMenu.Trigger asChild>
                  <button
                    id="studio-btn-actions"
                    type="button"
                    className={cn(tbBtn, 'border-white/12 bg-white/4 text-white/80 hover:bg-white/8 px-4 py-2 text-xs flex items-center gap-1.5 cursor-pointer rounded-lg')}
                  >
                    <Settings size={12} /> Actions
                  </button>
                </DropdownMenu.Trigger>
                <DropdownMenu.Portal>
                  <DropdownMenu.Content
                    align="end"
                    sideOffset={6}
                    className="z-50 min-w-48 overflow-hidden rounded-xl border border-white/10 bg-secondary-bg p-1.5 shadow-2xl shadow-black/80"
                  >
                    <DropdownMenu.Item
                      onSelect={toggleConnect}
                      className="flex items-center gap-2 px-3 py-2.5 text-xs rounded-lg cursor-pointer outline-none select-none text-white/80 hover:bg-white/5 hover:text-white"
                    >
                      <SquarePlay size={12} />
                      {wsStatus === 'connected' ? 'Disconnect' : 'Connect'}
                    </DropdownMenu.Item>

                    <DropdownMenu.Item
                      onSelect={fetchLayouts}
                      className="flex items-center gap-2 px-3 py-2.5 text-xs rounded-lg cursor-pointer outline-none select-none text-white/80 hover:bg-white/5 hover:text-white"
                    >
                      <LayoutGrid size={12} />
                      Layouts
                    </DropdownMenu.Item>

                    <DropdownMenu.Item
                      onSelect={() => setStudioLayout(studioLayout === 'studio' ? 'compact' : 'studio')}
                      className="flex items-center gap-2 px-3 py-2.5 text-xs rounded-lg cursor-pointer outline-none select-none text-white/80 hover:bg-white/5 hover:text-white"
                    >
                      {studioLayout === 'studio' ? <Rows4 size={12} /> : <SquarePlay size={12} />}
                      {studioLayout === 'studio' ? 'Compact' : 'Studio'}
                    </DropdownMenu.Item>

                    <DropdownMenu.Item
                      onSelect={() => setIsGuestThumbnailOpen(true)}
                      className="flex items-center gap-2 px-3 py-2.5 text-xs rounded-lg cursor-pointer outline-none select-none text-white/80 hover:bg-white/5 hover:text-white"
                    >
                      <Users size={12} />
                      Guest Thumbnails
                    </DropdownMenu.Item>

                    <div className="h-px bg-white/8 my-1" />

                    {activeChannelUser && (
                      <>
                        <DropdownMenu.Item
                          disabled={isAccessRequestPending || isClaimingChannel}
                          onSelect={requestAccess}
                          className="flex items-center gap-2 px-3 py-2.5 text-xs rounded-lg cursor-pointer outline-none select-none text-white/80 hover:bg-white/5 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                          <Loader2 size={12} className={isAccessRequestPending ? 'animate-spin' : ''} />
                          {isClaimingChannel ? 'Claiming Channel…' : isAccessRequestPending ? 'Requesting…' : 'Request Access'}
                        </DropdownMenu.Item>
                        <DropdownMenu.Item
                          disabled={isClaimingChannel}
                          onSelect={forceAccess}
                          className="flex items-center gap-2 px-3 py-2.5 text-xs rounded-lg cursor-pointer outline-none select-none text-[#3031cb] hover:bg-[#3031cb]/10 disabled:opacity-40 disabled:cursor-not-allowed font-medium"
                        >
                          <RotateCcw size={12} />
                          Force Access
                        </DropdownMenu.Item>
                        <div className="h-px bg-white/8 my-1" />
                      </>
                    )}

                    <DropdownMenu.Item
                      onSelect={() => setIsResetStreamConfirmOpen(true)}
                      disabled={isResetBusy}
                      className="flex items-center gap-2 px-3 py-2.5 text-xs rounded-lg cursor-pointer outline-none select-none text-amber-400 hover:bg-amber-400/10 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <RotateCcw size={12} className={isResetBusy ? 'animate-spin' : ''} />
                      Reset Stream
                    </DropdownMenu.Item>

                    <DropdownMenu.Item
                      onSelect={() => setIsResetLayoutConfirmOpen(true)}
                      className="flex items-center gap-2 px-3 py-2.5 text-xs rounded-lg cursor-pointer outline-none select-none text-rose-400 hover:bg-rose-400/10"
                    >
                      <LayoutGrid size={12} />
                      Reset Layout
                    </DropdownMenu.Item>
                  </DropdownMenu.Content>
                </DropdownMenu.Portal>
              </DropdownMenu.Root>
            </div>
          </div>

          {/* Center area — studio or compact view */}
          {studioLayout === 'compact' ? (
            <CompactView />
          ) : (
            <>
              {/* Monitor — fixed height, no scroll */}
              <div className="shrink-0 px-3 pt-2.5">
                <MonitorArea />
              </div>

              {/* Q rows — own scroll area */}
              <div className="flex-1 min-h-0 overflow-hidden px-3 pb-2.5">
                <QButtonTable />
              </div>
            </>
          )}

          <MessageLog />
        </div>

        {/* RIGHT SIDEBAR */}
        <div
          className={cn(
            "bg-primary-bg border-l border-white/6 flex flex-col overflow-hidden transition-all duration-300",
            isTablet
              ? "fixed inset-y-0 right-0 z-40 w-[260px]"
              : "shrink-0"
          )}
          style={!isTablet ? {
            width: rightSidebarOpen ? 260 : 0,
            minWidth: rightSidebarOpen ? 260 : 0,
          } : {
            transform: rightSidebarOpen ? 'translateX(0)' : 'translateX(260px)'
          }}
        >
          {/* Tabs */}
          <div className="shrink-0 flex border-b border-white/6">
            <button
              id="studio-tab-btn-graphics"
              type="button"
              onClick={() => setCurrentRightTab('graphics')}
              className={cn('flex-1 flex items-center justify-center gap-1 py-2 text-[10px] font-semibold cursor-pointer border-b-2 transition-colors',
                currentRightTab === 'graphics' ? 'text-white border-[#3031cb]' : 'text-white/55 border-transparent hover:text-white')}
            >
              <Paintbrush size={10} /> Graphics
            </button>
            <button
              id="studio-tab-btn-publish"
              type="button"
              onClick={() => setCurrentRightTab('publish')}
              className={cn('flex-1 flex items-center justify-center gap-1 py-2 text-[10px] font-semibold cursor-pointer border-b-2 transition-colors whitespace-nowrap',
                currentRightTab === 'publish' ? 'text-[#3031cb] border-[#3031cb]' : 'text-white/55 border-transparent hover:text-white')}
            >
              <Share2 size={10} /> Publish
            </button>
            <button
              id="studio-tab-btn-social"
              type="button"
              onClick={() => setCurrentRightTab('social')}
              className={cn('flex-1 flex items-center justify-center gap-1 py-2 text-[10px] font-semibold cursor-pointer border-b-2 transition-colors whitespace-nowrap',
                currentRightTab === 'social' ? 'text-[#3031cb] border-[#3031cb]' : 'text-white/55 border-transparent hover:text-white')}
            >
              <MessagesSquare size={10} /> Social
            </button>
          </div>

          {/* Tab content */}
          <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
            {currentRightTab === 'graphics' ? <GfxPanel /> : currentRightTab === 'publish' ? <PublishPanel /> : <SocialPanel />}
          </div>
        </div>
      </div>

      {/* Video player popup */}
      {videoPopup && <VideoPlayerPopup state={videoPopup} onClose={closeVideoPopup} />}

      {/* Guest Thumbnails dialog */}
      <GuestThumbnailDialog
        open={isGuestThumbnailOpen}
        onClose={() => setIsGuestThumbnailOpen(false)}
      />

      <ConfirmDialog
        open={pendingGroup !== null}
        onOpenChange={open => { if (!open) setPendingGroup(null) }}
        title="Change Group?"
        description="Changing the group will clear all Q-row configurations. This cannot be undone. Continue?"
        confirmLabel="Change Group"
        variant="danger"
        onConfirm={() => { if (pendingGroup !== null) { setSelectedGroup(pendingGroup); setPendingGroup(null) } }}
      />
      <ConfirmDialog
        open={isResetStreamConfirmOpen}
        onOpenChange={setIsResetStreamConfirmOpen}
        title="Reset Stream?"
        description="This will reset the live stream. The broadcast may be interrupted. Are you sure?"
        confirmLabel="Reset"
        variant="danger"
        onConfirm={resetStream}
      />
      <ConfirmDialog
        open={isResetLayoutConfirmOpen}
        onOpenChange={setIsResetLayoutConfirmOpen}
        title="Reset Layout?"
        description="This will reset the current layout. Any unsaved changes will be lost."
        confirmLabel="Reset"
        variant="danger"
        onConfirm={resetLayout}
      />

      <ConfirmDialog
        open={pendingAccessRequest !== null}
        onOpenChange={open => { if (!open) denyAccessRequest() }}
        title="Access Request"
        description={`${pendingAccessRequest?.userName || pendingAccessRequest?.userId || 'Someone'} is requesting access to this session. Do you want to hand over control?`}
        confirmLabel="Accept"
        onConfirm={acceptAccessRequest}
      />

      {/* Studio-level toasts (e.g. source slot limit reached) */}
      <Toaster
        key={studioToastNonce}
        open={studioToast.open}
        onOpenChange={open => setStudioToast(prev => ({ ...prev, open }))}
        title={studioToast.title}
        description={studioToast.description}
        variant={studioToast.variant}
      />
    </LogContext>
    </StudioContext>
  )
}
