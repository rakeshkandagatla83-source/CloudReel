import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MonitorArea } from '../MonitorArea'

// ── Context mock ────────────────────────────────────────────────────────────

let ctxValues: {
  previewUrl: string
  masterUrl: string
  mode: string
  publishToMaster: () => void
}

vi.mock('../StudioContext', () => ({ useStudioCtx: () => ctxValues }))

const PREVIEW_URL = 'https://preview.example.com'
const MASTER_URL = 'https://master.example.com'

beforeEach(() => {
  vi.clearAllMocks()
  ctxValues = {
    previewUrl: PREVIEW_URL,
    masterUrl: MASTER_URL,
    mode: 'preview',
    publishToMaster: vi.fn(),
  }
})

// ── Preview mode (default) ─────────────────────────────────────────────────

describe('MonitorArea — preview mode', () => {
  it('renders the Preview label', () => {
    render(<MonitorArea />)
    expect(screen.getByText(/preview/i)).toBeInTheDocument()
  })

  it('renders the Master label', () => {
    render(<MonitorArea />)
    expect(screen.getByText(/on air/i)).toBeInTheDocument()
  })

  it('renders two iframes (preview and master)', () => {
    render(<MonitorArea />)
    const iframes = document.querySelectorAll('iframe')
    expect(iframes).toHaveLength(2)
  })

  it('preview iframe has the previewUrl as src', () => {
    render(<MonitorArea />)
    const iframes = document.querySelectorAll('iframe')
    const srcs = Array.from(iframes).map(f => f.getAttribute('src'))
    expect(srcs).toContain(PREVIEW_URL)
  })

  it('master iframe has the masterUrl as src', () => {
    render(<MonitorArea />)
    const iframes = document.querySelectorAll('iframe')
    const srcs = Array.from(iframes).map(f => f.getAttribute('src'))
    expect(srcs).toContain(MASTER_URL)
  })

  it('renders the Publish button', () => {
    render(<MonitorArea />)
    expect(screen.getByRole('button', { name: /publish/i })).toBeInTheDocument()
  })

  it('calls publishToMaster when the Publish button is clicked', async () => {
    const publishToMaster = vi.fn()
    ctxValues.publishToMaster = publishToMaster
    render(<MonitorArea />)
    await userEvent.click(screen.getByRole('button', { name: /publish/i }))
    expect(publishToMaster).toHaveBeenCalledOnce()
  })
})

// ── Master-only mode ───────────────────────────────────────────────────────

describe('MonitorArea — master mode', () => {
  beforeEach(() => { ctxValues.mode = 'master' })

  it('hides the Preview label in master mode', () => {
    render(<MonitorArea />)
    expect(screen.queryByText(/preview/i)).not.toBeInTheDocument()
  })

  it('hides the Publish button in master mode', () => {
    render(<MonitorArea />)
    expect(screen.queryByRole('button', { name: /publish/i })).not.toBeInTheDocument()
  })

  it('renders only one iframe (master) in master mode', () => {
    render(<MonitorArea />)
    const iframes = document.querySelectorAll('iframe')
    expect(iframes).toHaveLength(1)
  })

  it('master iframe still has masterUrl in master mode', () => {
    render(<MonitorArea />)
    const iframe = document.querySelector('iframe')!
    expect(iframe.getAttribute('src')).toBe(MASTER_URL)
  })

  it('still shows the Master / On Air label', () => {
    render(<MonitorArea />)
    expect(screen.getByText(/on air/i)).toBeInTheDocument()
  })
})
