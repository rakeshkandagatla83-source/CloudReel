import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ConfirmDialog } from '../ConfirmDialog'

const defaultProps = {
  open: true,
  onOpenChange: vi.fn(),
  title: 'Are you sure?',
  onConfirm: vi.fn(),
}

beforeEach(() => vi.clearAllMocks())

// ── Rendering ──────────────────────────────────────────────────────────────

describe('ConfirmDialog — rendering', () => {
  it('renders nothing when open=false', () => {
    render(<ConfirmDialog {...defaultProps} open={false} />)
    expect(screen.queryByText('Are you sure?')).not.toBeInTheDocument()
  })

  it('renders the title when open=true', () => {
    render(<ConfirmDialog {...defaultProps} />)
    expect(screen.getByText('Are you sure?')).toBeInTheDocument()
  })

  it('renders the description when provided', () => {
    render(<ConfirmDialog {...defaultProps} description="This action is irreversible." />)
    expect(screen.getByText('This action is irreversible.')).toBeInTheDocument()
  })

  it('does not render a description element when omitted', () => {
    render(<ConfirmDialog {...defaultProps} />)
    // No description text should appear
    expect(screen.queryByText(/irreversible/i)).not.toBeInTheDocument()
  })

  it('renders default "Confirm" and "Cancel" labels', () => {
    render(<ConfirmDialog {...defaultProps} />)
    expect(screen.getByRole('button', { name: 'Confirm' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument()
  })

  it('renders custom confirmLabel and cancelLabel', () => {
    render(<ConfirmDialog {...defaultProps} confirmLabel="Delete" cancelLabel="Go back" />)
    expect(screen.getByRole('button', { name: 'Delete' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Go back' })).toBeInTheDocument()
  })
})

// ── Cancel button ─────────────────────────────────────────────────────────

describe('ConfirmDialog — Cancel button', () => {
  it('calls onOpenChange(false) when Cancel is clicked', async () => {
    const onOpenChange = vi.fn()
    render(<ConfirmDialog {...defaultProps} onOpenChange={onOpenChange} />)
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('does NOT call onConfirm when Cancel is clicked', async () => {
    const onConfirm = vi.fn()
    render(<ConfirmDialog {...defaultProps} onConfirm={onConfirm} />)
    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(onConfirm).not.toHaveBeenCalled()
  })
})

// ── Confirm button ────────────────────────────────────────────────────────

describe('ConfirmDialog — Confirm button', () => {
  it('calls onConfirm when Confirm is clicked', async () => {
    const onConfirm = vi.fn()
    render(<ConfirmDialog {...defaultProps} onConfirm={onConfirm} />)
    await userEvent.click(screen.getByRole('button', { name: 'Confirm' }))
    expect(onConfirm).toHaveBeenCalledOnce()
  })

  it('calls onOpenChange(false) when Confirm is clicked', async () => {
    const onOpenChange = vi.fn()
    render(<ConfirmDialog {...defaultProps} onOpenChange={onOpenChange} />)
    await userEvent.click(screen.getByRole('button', { name: 'Confirm' }))
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })
})

// ── Variants ─────────────────────────────────────────────────────────────

describe('ConfirmDialog — danger variant', () => {
  it('confirm button has red styling for variant="danger"', () => {
    render(<ConfirmDialog {...defaultProps} variant="danger" confirmLabel="Delete" />)
    const btn = screen.getByRole('button', { name: 'Delete' })
    expect(btn.className).toContain('bg-red-600')
    expect(btn.className).not.toContain('bg-[#3031cb]')
  })
})

describe('ConfirmDialog — default variant', () => {
  it('confirm button has brand red styling for variant="default"', () => {
    render(<ConfirmDialog {...defaultProps} variant="default" confirmLabel="Save" />)
    const btn = screen.getByRole('button', { name: 'Save' })
    expect(btn.className).toContain('bg-[#3031cb]')
    expect(btn.className).not.toContain('bg-red-600')
  })

  it('defaults to brand red when variant is omitted', () => {
    render(<ConfirmDialog {...defaultProps} confirmLabel="OK" />)
    const btn = screen.getByRole('button', { name: 'OK' })
    expect(btn.className).toContain('bg-[#3031cb]')
  })
})
