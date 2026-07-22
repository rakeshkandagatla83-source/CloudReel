import { useState, useRef, useEffect } from 'react'
import {
  ChevronLeft,
  Save,
  Cloud,
  CloudUpload,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Copy,
  Keyboard,
} from 'lucide-react'
import { cn } from '../../lib/utils'
import { BuilderCanvas } from './BuilderCanvas'
import { ToolboxSidebar } from './ToolboxSidebar'
import { SourcePropertiesPanel } from './SourcePropertiesPanel'
import { BackgroundPanel } from './BackgroundPanel'
import { SaveTemplateDialog } from './SaveTemplateDialog'
import { ConfirmDialog } from '../../components/ui/ConfirmDialog'
import { CANVAS_W, CANVAS_H } from './useLayoutBuilder'
import type { UseLayoutBuilderReturn } from './useLayoutBuilder'
import type { Source } from '../../types/layoutBuilder'

type PanelMode = 'none' | 'source' | 'background'

interface LayoutBuilderProps extends UseLayoutBuilderReturn {
  onBack: () => void
  onToast: (msg: string, variant?: 'success' | 'error') => void
}

export function LayoutBuilder({
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
  setBuilderIsBg,
  saveStatus,
  saveMessage,
  addSource,
  deleteSelected,
  selectSource,
  updateSource,
  moveSource,
  resizeTransformSource,
  copySource,
  pasteSource,
  duplicateSource,
  setBg,
  saveLocal,
  saveToDb,
  addToDb,
  deleteLocalTemplate,
  getGroupSuggestions,
  onBack,
  onToast,
}: LayoutBuilderProps) {
  const [panelMode, setPanelMode] = useState<PanelMode>('none')
  const [saveDialogOpen, setSaveDialogOpen] = useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [showGroupSuggestions, setShowGroupSuggestions] = useState(false)
  const [showShortcutsPopover, setShowShortcutsPopover] = useState(false)
  const groupInputRef = useRef<HTMLInputElement>(null)
  const selectedSourceRef = useRef<Source | undefined>(undefined)
  const shortcutsPopoverRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!showShortcutsPopover) return
    const handleClickOutside = (e: MouseEvent) => {
      if (shortcutsPopoverRef.current && !shortcutsPopoverRef.current.contains(e.target as Node)) {
        setShowShortcutsPopover(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showShortcutsPopover])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return

      const isMod = e.ctrlKey || e.metaKey

      if (isMod && e.key === 'c' && selectedId) {
        e.preventDefault()
        copySource(selectedId)
        onToast('Source copied — Ctrl+V to paste')
      } else if (isMod && e.key === 'v') {
        e.preventDefault()
        const newId = pasteSource()
        if (newId) setPanelMode('source')
      } else if (isMod && e.key === 'd' && selectedId) {
        e.preventDefault()
        const newId = duplicateSource(selectedId)
        if (newId) setPanelMode('source')
      } else if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId) {
        e.preventDefault()
        setDeleteConfirmOpen(true)
      } else if (e.key === 'Escape' && selectedId) {
        selectSource(null)
        setPanelMode('none')
      } else if (
        (e.key === 'ArrowLeft' || e.key === 'ArrowRight' || e.key === 'ArrowUp' || e.key === 'ArrowDown') &&
        selectedId
      ) {
        const currentSource = selectedSourceRef.current
        if (!currentSource) return
        e.preventDefault()
        const nudgeStep = e.shiftKey ? 10 : 1
        const deltaX = e.key === 'ArrowLeft' ? -nudgeStep : e.key === 'ArrowRight' ? nudgeStep : 0
        const deltaY = e.key === 'ArrowUp' ? -nudgeStep : e.key === 'ArrowDown' ? nudgeStep : 0
        const clampedX = Math.max(0, Math.min(CANVAS_W - currentSource.w, currentSource.x + deltaX))
        const clampedY = Math.max(0, Math.min(CANVAS_H - currentSource.h, currentSource.y + deltaY))
        moveSource(selectedId, clampedX, clampedY)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [selectedId, copySource, pasteSource, duplicateSource, selectSource, moveSource, onToast])

  const selectedSource: Source | undefined = sources.find((s) => s.id === selectedId)
  selectedSourceRef.current = selectedSource
  const groupSuggestions = getGroupSuggestions()

  const showSaveToDb = !!dbLayoutMeta
  const showAddToDb = !dbLayoutMeta

  const handleSelectSource = (id: string | null) => {
    selectSource(id)
    if (id) setPanelMode('source')
  }

  const handleOpenBackground = () => {
    selectSource(null)
    setPanelMode('background')
  }

  const handleClosePanel = () => {
    setPanelMode('none')
    selectSource(null)
  }

  const handleAddSource = () => {
    const s = addSource()
    selectSource(s.id)
    setPanelMode('source')
  }

  const handleDrop = (x: number, y: number) => {
    const s = addSource(x, y)
    selectSource(s.id)
    setPanelMode('source')
  }

  const handleSaveLocal = (name: string) => {
    if (!builderGroup.trim()) {
      onToast('Group name is required', 'error')
      return
    }
    const ok = saveLocal(name, builderGroup)
    if (ok) onToast(`Saved "${name}"`)
    else onToast('Save failed', 'error')
  }

  const handleSaveToDb = async () => {
    if (!builderGroup.trim() || !builderCaption.trim()) {
      onToast('Group and caption name required', 'error')
      return
    }
    try {
      await saveToDb(builderGroup.trim(), builderCaption.trim())
      if (editingId) deleteLocalTemplate(editingId)
      onToast('Saved to DB')
    } catch {
      onToast(saveMessage || 'DB save failed', 'error')
    }
  }

  const handleAddToDb = async () => {
    if (!builderGroup.trim() || !builderCaption.trim()) {
      onToast('Group and caption name required', 'error')
      return
    }
    try {
      await addToDb(builderGroup.trim(), builderCaption.trim())
      if (editingId) deleteLocalTemplate(editingId)
      onToast('Layout added to DB')
      onBack()
    } catch {
      onToast(saveMessage || 'Add to DB failed', 'error')
    }
  }

  return (
    <div className="flex h-full flex-col bg-primary-bg">
      {/* Top Bar */}
      <div className="shrink-0 flex items-center gap-2 px-4 py-2 border-b border-primary-border bg-surface flex-wrap">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 h-10 px-4 rounded border border-primary-border text-secondary-text text-base cursor-pointer hover:bg-surface-2 hover:text-primary-text transition-colors"
        >
          <ChevronLeft size={16} />
          Dashboard
        </button>

        <span className="text-base font-bold text-primary-text ml-2">
          {editingName || 'New Template'}
        </span>

        {/* Group input */}
        <div className="relative ml-2">
          <div className="flex items-center gap-2">
            <label className="text-sm text-secondary-text whitespace-nowrap">Group</label>
            <input
              ref={groupInputRef}
              type="text"
              value={builderGroup}
              onChange={(e) => setBuilderGroup(e.target.value)}
              onFocus={() => setShowGroupSuggestions(true)}
              onBlur={() => setTimeout(() => setShowGroupSuggestions(false), 150)}
              placeholder="e.g. News"
              autoComplete="off"
              className="w-36 px-3 h-10 rounded bg-surface border border-primary-border text-primary-text text-base outline-none focus:border-[#3031cb]/40"
            />
          </div>
          {showGroupSuggestions && groupSuggestions.length > 0 && (
            <div className="absolute top-full left-0 w-full z-50 mt-1 bg-surface border border-primary-border rounded-lg overflow-hidden shadow-xl max-h-32 overflow-y-auto">
              {groupSuggestions
                .filter((g) => !builderGroup || g.toLowerCase().includes(builderGroup.toLowerCase()))
                .map((g) => (
                  <div
                    key={g}
                    onMouseDown={() => setBuilderGroup(g)}
                    className="px-3 py-2 text-sm text-secondary-text cursor-pointer hover:bg-surface-2 hover:text-primary-text"
                  >
                    {g}
                  </div>
                ))}
            </div>
          )}
        </div>

        {/* Caption input */}
        <div className="flex items-center gap-2">
          <label className="text-sm text-secondary-text whitespace-nowrap">Caption</label>
          <input
            type="text"
            value={builderCaption}
            onChange={(e) => setBuilderCaption(e.target.value)}
            placeholder="e.g. News Split"
            className="w-40 px-3 h-10 rounded bg-surface border border-primary-border text-primary-text text-base outline-none focus:border-[#3031cb]/40"
          />
        </div>

        {/* Keyboard shortcuts reference */}
        <div id="lb-shortcuts-popover-anchor" ref={shortcutsPopoverRef} className="relative">
          <button
            id="lb-btn-shortcuts"
            type="button"
            title="Keyboard shortcuts"
            onClick={() => setShowShortcutsPopover((prev) => !prev)}
            className="flex h-10 w-10 items-center justify-center rounded border border-primary-border text-secondary-text text-base cursor-pointer hover:bg-surface-2 hover:text-primary-text transition-colors"
          >
            <Keyboard size={16} />
          </button>

          {showShortcutsPopover && (
            <div
              id="lb-shortcuts-popover"
              className="absolute top-full left-0 z-50 mt-1.5 w-72 rounded-lg border border-primary-border bg-surface shadow-xl text-sm text-secondary-text p-4 space-y-2.5"
            >
              <p id="lb-shortcuts-popover-title" className="text-sm font-semibold text-primary-text uppercase tracking-wider mb-2.5">
                Source Shortcuts
              </p>
              {[
                { keys: '← ↑ → ↓', label: 'Nudge 1 px' },
                { keys: 'Shift + ← ↑ → ↓', label: 'Nudge 10 px' },
                { keys: 'Ctrl + C', label: 'Copy source' },
                { keys: 'Ctrl + V', label: 'Paste source' },
                { keys: 'Ctrl + D', label: 'Duplicate source' },
                { keys: 'Del / Backspace', label: 'Delete source' },
                { keys: 'Esc', label: 'Deselect' },
              ].map(({ keys, label }) => (
                <div id={`lb-shortcut-row-${label.replace(/\s+/g, '-').toLowerCase()}`} key={keys} className="flex items-center justify-between gap-4">
                  <span id={`lb-shortcut-label-${label.replace(/\s+/g, '-').toLowerCase()}`} className="text-secondary-text">{label}</span>
                  <kbd id={`lb-shortcut-keys-${label.replace(/\s+/g, '-').toLowerCase()}`} className="font-mono text-sm px-2 py-0.5 rounded bg-surface-2 border border-primary-border text-primary-text whitespace-nowrap">
                    {keys}
                  </kbd>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex-1" />

        {/* Source / selection info */}
        {selectedSource ? (
          <span className="text-sm text-secondary-text hidden sm:block">
            {selectedSource.label} &nbsp;·&nbsp; X:{selectedSource.x} Y:{selectedSource.y} W:{selectedSource.w} H:{selectedSource.h}
          </span>
        ) : (
          <span className="text-sm text-secondary-text hidden sm:block">
            {sources.length} source(s) | {CANVAS_W}×{CANVAS_H}
          </span>
        )}

        {/* Duplicate button - visible when a source is selected */}
        {selectedSource && (
          <button
            id="lb-builder-btn-duplicate"
            type="button"
            title="Duplicate source (Ctrl+D)"
            onClick={() => {
              const newId = duplicateSource(selectedSource.id)
              if (newId) setPanelMode('source')
            }}
            className="flex items-center gap-1.5 h-10 px-4 rounded-lg border border-primary-border bg-surface-2 text-secondary-text text-base font-semibold cursor-pointer hover:bg-surface hover:text-primary-text transition-colors"
          >
            <Copy size={15} />
            Duplicate
          </button>
        )}

        {/* Save Local */}
        <button
          type="button"
          onClick={() => setSaveDialogOpen(true)}
          className="flex items-center gap-1.5 h-10 px-4 rounded-lg border border-primary-border bg-surface-2 text-secondary-text text-base font-semibold cursor-pointer hover:bg-surface hover:text-primary-text transition-colors"
        >
          <Save size={15} />
          Save Local
        </button>

        {/* Save to DB (when editing imported layout) */}
        {showSaveToDb && (
          <button
            type="button"
            onClick={handleSaveToDb}
            disabled={saveStatus === 'saving'}
            className={cn(
              'flex items-center gap-1.5 h-10 px-4 rounded-lg text-base font-semibold cursor-pointer transition-colors',
              'bg-emerald-600 hover:bg-emerald-500 text-white',
              'disabled:opacity-50 disabled:cursor-not-allowed',
            )}
          >
            {saveStatus === 'saving' ? (
              <Loader2 size={15} className="animate-spin" />
            ) : (
              <Cloud size={15} />
            )}
            Save to DB
          </button>
        )}

        {/* Add to DB (when creating new) */}
        {showAddToDb && (
          <button
            type="button"
            onClick={handleAddToDb}
            disabled={saveStatus === 'saving'}
            className={cn(
              'flex items-center gap-1.5 h-10 px-4 rounded-lg text-base font-semibold cursor-pointer transition-colors',
              'bg-amber-600 hover:bg-amber-500 text-white',
              'disabled:opacity-50 disabled:cursor-not-allowed',
            )}
          >
            {saveStatus === 'saving' ? (
              <Loader2 size={15} className="animate-spin" />
            ) : (
              <CloudUpload size={15} />
            )}
            Add to DB
          </button>
        )}

        {/* Save status indicator */}
        {saveStatus !== 'idle' && saveStatus !== 'saving' && (
          <span
            className={cn(
              'flex items-center gap-1.5 text-sm px-2.5 py-1 rounded border',
              saveStatus === 'ok' && 'bg-emerald-950/60 text-emerald-400 border-emerald-500/25',
              saveStatus === 'error' && 'bg-red-950/60 text-red-400 border-red-500/25',
            )}
          >
            {saveStatus === 'ok' && <CheckCircle2 size={14} />}
            {saveStatus === 'error' && <AlertCircle size={14} />}
            {saveMessage}
          </span>
        )}
      </div>

      {/* Builder Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Toolbox */}
        <ToolboxSidebar
          sources={sources}
          selectedId={selectedId}
          onAddSource={handleAddSource}
          onOpenBackground={handleOpenBackground}
          onSelectLayer={(id) => {
            selectSource(id)
            setPanelMode('source')
          }}
        />

        {/* Canvas */}
        <BuilderCanvas
          sources={sources}
          bg={bg}
          isBg={builderIsBg}
          selectedId={selectedId}
          onSelect={(id) => {
            if (id === null) {
              handleClosePanel()
            } else {
              handleSelectSource(id)
            }
          }}
          onMove={moveSource}
          onResizeTransform={resizeTransformSource}
          onDrop={handleDrop}
        />

        {/* Right Panel */}
        {panelMode === 'source' && selectedSource && (
          <SourcePropertiesPanel
            key={selectedSource.id}
            source={selectedSource}
            onUpdate={(patch) => updateSource(selectedSource.id, patch)}
            onDelete={() => setDeleteConfirmOpen(true)}
            onClose={handleClosePanel}
          />
        )}

        {panelMode === 'background' && (
          <BackgroundPanel
            bg={bg}
            isBg={builderIsBg}
            onUpdate={setBg}
            onToggleIsBg={setBuilderIsBg}
            onClose={handleClosePanel}
          />
        )}
      </div>

      {/* Save Dialog */}
      <SaveTemplateDialog
        open={saveDialogOpen}
        initialName={editingName}
        onClose={() => setSaveDialogOpen(false)}
        onSave={handleSaveLocal}
      />

      {/* Delete Confirm */}
      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title="Delete Source"
        description={selectedSource ? `Delete "${selectedSource.label}"?` : ''}
        confirmLabel="Delete"
        variant="danger"
        onConfirm={() => {
          deleteSelected()
          setPanelMode('none')
        }}
      />
    </div>
  )
}
