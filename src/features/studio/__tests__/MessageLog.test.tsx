import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MessageLog } from '../MessageLog'
import type { LogEntry } from '../../../types/studio'

// ── Context mock ───────────────────────────────────────────────────────────

let ctxValues: {
  logEntries: LogEntry[]
  logOpen: boolean
  setLogOpen: (v: boolean) => void
}

vi.mock('../StudioContext', () => ({ useLogCtx: () => ctxValues }))

const makeEntry = (id: string, msg: string, type: LogEntry['type'] = 'info'): LogEntry => ({
  id, msg, type, time: '12:00:00',
})

beforeEach(() => {
  vi.clearAllMocks()
  ctxValues = {
    logEntries: [],
    logOpen: false,
    setLogOpen: vi.fn(),
  }
})

// ── Header ─────────────────────────────────────────────────────────────────

describe('MessageLog — header', () => {
  it('shows "Message Log" label', () => {
    render(<MessageLog />)
    expect(screen.getByText(/message log/i)).toBeInTheDocument()
  })

  it('shows the entry count in parentheses', () => {
    ctxValues.logEntries = [makeEntry('1', 'hello'), makeEntry('2', 'world')]
    render(<MessageLog />)
    expect(screen.getByText('(2)')).toBeInTheDocument()
  })

  it('shows (0) when log is empty', () => {
    render(<MessageLog />)
    expect(screen.getByText('(0)')).toBeInTheDocument()
  })

  it('calls setLogOpen(!logOpen) when the header is clicked', async () => {
    const setLogOpen = vi.fn()
    ctxValues.setLogOpen = setLogOpen
    ctxValues.logOpen = false
    render(<MessageLog />)
    await userEvent.click(screen.getByRole('button'))
    expect(setLogOpen).toHaveBeenCalledWith(true)
  })

  it('calls setLogOpen(false) when clicking again while open', async () => {
    const setLogOpen = vi.fn()
    ctxValues.setLogOpen = setLogOpen
    ctxValues.logOpen = true
    render(<MessageLog />)
    await userEvent.click(screen.getByRole('button'))
    expect(setLogOpen).toHaveBeenCalledWith(false)
  })
})

// ── Closed state ───────────────────────────────────────────────────────────

describe('MessageLog — closed state', () => {
  it('does not render log entries when closed', () => {
    ctxValues.logEntries = [makeEntry('1', 'Hidden message')]
    ctxValues.logOpen = false
    render(<MessageLog />)
    expect(screen.queryByText('Hidden message')).not.toBeInTheDocument()
  })
})

// ── Open state ─────────────────────────────────────────────────────────────

describe('MessageLog — open state', () => {
  beforeEach(() => { ctxValues.logOpen = true })

  it('shows "No messages yet." when empty and open', () => {
    render(<MessageLog />)
    expect(screen.getByText(/no messages yet/i)).toBeInTheDocument()
  })

  it('renders all log entries when open', () => {
    ctxValues.logEntries = [
      makeEntry('1', '[10:00:00] Connected'),
      makeEntry('2', '[10:01:00] Q1 fired'),
    ]
    render(<MessageLog />)
    expect(screen.getByText('[10:00:00] Connected')).toBeInTheDocument()
    expect(screen.getByText('[10:01:00] Q1 fired')).toBeInTheDocument()
  })

  it('applies emerald styling to "sent" type entries', () => {
    ctxValues.logEntries = [makeEntry('1', 'sent msg', 'sent')]
    render(<MessageLog />)
    const entry = screen.getByText('sent msg').closest('div')!
    expect(entry.className).toContain('emerald')
  })

  it('applies red styling to "err" type entries', () => {
    ctxValues.logEntries = [makeEntry('1', 'error msg', 'err')]
    render(<MessageLog />)
    const entry = screen.getByText('error msg').closest('div')!
    expect(entry.className).toContain('red')
  })

  it('applies amber styling to "warn" type entries', () => {
    ctxValues.logEntries = [makeEntry('1', 'warning msg', 'warn')]
    render(<MessageLog />)
    const entry = screen.getByText('warning msg').closest('div')!
    expect(entry.className).toContain('amber')
  })

  it('applies master/red styling to "master" type entries', () => {
    ctxValues.logEntries = [makeEntry('1', 'master msg', 'master')]
    render(<MessageLog />)
    const entry = screen.getByText('master msg').closest('div')!
    expect(entry.className).toContain('e40b18')
  })

  it('applies italic styling to "divider" type entries', () => {
    ctxValues.logEntries = [makeEntry('1', '=== divider ===', 'divider')]
    render(<MessageLog />)
    const entry = screen.getByText('=== divider ===').closest('div')!
    expect(entry.className).toContain('italic')
  })
})
