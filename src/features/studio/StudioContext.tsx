import { createContext, use } from 'react'
import type { StudioContextValue } from './useStudio'
import type { LogEntry } from '../../types/studio'

export const StudioContext = createContext<StudioContextValue | null>(null)

export function useStudioCtx(): StudioContextValue {
  const ctx = use(StudioContext)
  if (!ctx) throw new Error('useStudioCtx must be used within StudioPanel')
  return ctx
}

export interface LogContextValue {
  logEntries: LogEntry[]
  logOpen: boolean
  setLogOpen: (v: boolean) => void
}

export const LogContext = createContext<LogContextValue | null>(null)

export function useLogCtx(): LogContextValue {
  const ctx = use(LogContext)
  if (!ctx) throw new Error('useLogCtx must be used within StudioPanel')
  return ctx
}
