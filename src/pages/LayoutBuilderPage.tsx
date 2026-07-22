import { useState, useCallback, useEffect } from 'react'
import * as Toast from '@radix-ui/react-toast'
import { AlertCircle, CheckCircle2 } from 'lucide-react'
import { X } from 'lucide-react'
import { LayoutDashboard } from '../features/layout-builder/LayoutDashboard'
import { LayoutBuilder } from '../features/layout-builder/LayoutBuilder'
import { useLayoutBuilder } from '../features/layout-builder/useLayoutBuilder'
import { useDbLayouts } from '../features/layout-builder/useDbLayouts'
import type { DbLayout, LocalTemplate } from '../types/layoutBuilder'

type View = 'dashboard' | 'builder'

interface ToastState {
  title: string
  variant: 'success' | 'error'
}

export function LayoutBuilderPage() {
  useEffect(() => {
    document.title = 'CloudReel - Layout Builder'
  }, [])

  const [view, setView] = useState<View>('dashboard')
  const [toastOpen, setToastOpen] = useState(false)
  const [toast, setToast] = useState<ToastState>({ title: '', variant: 'success' })

  const layoutBuilder = useLayoutBuilder()
  const dbLayouts = useDbLayouts()

  const showToast = useCallback((title: string, variant: 'success' | 'error' = 'success') => {
    setToast({ title, variant })
    setToastOpen(true)
  }, [])

  const handleNewTemplate = useCallback(() => {
    layoutBuilder.resetBuilder()
    setView('builder')
  }, [layoutBuilder])

  const handleImport = useCallback(
    (layout: DbLayout) => {
      layoutBuilder.importDbLayout(layout)
      setView('builder')
      showToast(`Imported "${layout.caption}" - ${layout.windowsCount} source(s)`)
    },
    [layoutBuilder, showToast],
  )

  const handleEditLocal = useCallback(
    (tpl: LocalTemplate) => {
      layoutBuilder.openLocalTemplate(tpl)
      setView('builder')
    },
    [layoutBuilder],
  )

  const handleDeleteLocal = useCallback(
    (id: string) => {
      layoutBuilder.deleteLocalTemplate(id)
      showToast('Template deleted')
    },
    [layoutBuilder, showToast],
  )

  const handleBack = useCallback(() => {
    setView('dashboard')
    dbLayouts.fetch()
  }, [dbLayouts])

  return (
    <Toast.Provider swipeDirection="right">
      <div className="flex h-full flex-col">
        {view === 'dashboard' && (
          <LayoutDashboard
            dbLayouts={dbLayouts}
            localTemplates={layoutBuilder.getLocalTemplates()}
            onNewTemplate={handleNewTemplate}
            onImport={handleImport}
            onEditLocal={handleEditLocal}
            onDeleteLocal={handleDeleteLocal}
            onToast={showToast}
          />
        )}

        {view === 'builder' && (
          <LayoutBuilder
            {...layoutBuilder}
            onBack={handleBack}
            onToast={showToast}
          />
        )}
      </div>

      {/* Toast */}
      <Toast.Root
        open={toastOpen}
        onOpenChange={setToastOpen}
        duration={3000}
        className={`flex items-start gap-3 rounded-xl border px-4 py-3.5 shadow-xl
          data-[state=open]:animate-in data-[state=closed]:animate-out
          data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0
          data-[state=open]:slide-in-from-bottom-4 data-[state=closed]:slide-out-to-right-4
          duration-200
          ${toast.variant === 'error' ? 'bg-[#1a0a0b] border-red-500/20' : 'bg-[#0a1a0f] border-emerald-500/20'}`}
      >
        {toast.variant === 'error' ? (
          <AlertCircle size={16} className="mt-0.5 shrink-0 text-red-400" />
        ) : (
          <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-400" />
        )}
        <div className="flex-1 min-w-0">
          <Toast.Title className="text-sm font-semibold text-white">{toast.title}</Toast.Title>
        </div>
        <Toast.Close className="mt-0.5 text-white/25 hover:text-white/60 transition-colors cursor-pointer">
          <X size={14} />
        </Toast.Close>
      </Toast.Root>

      <Toast.Viewport className="fixed bottom-6 right-6 z-100 flex flex-col gap-2 w-80 outline-none" />
    </Toast.Provider>
  )
}
