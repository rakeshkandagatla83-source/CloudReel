import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'

// ── Mocks ─────────────────────────────────────────────────────────────────

const { mockGetStorage } = vi.hoisted(() => ({ mockGetStorage: vi.fn() }))
vi.mock('../../lib/storage', () => ({ getStorage: mockGetStorage }))

vi.mock('../Navbar', () => ({ Navbar: () => <div data-testid="navbar">Navbar</div> }))
vi.mock('../ui/Footer', () => ({ Footer: () => <div data-testid="footer">Footer</div> }))

import { ProtectedRoute } from '../ProtectedRoute'

// ── Helpers ───────────────────────────────────────────────────────────────

function buildRouter(initialPath: string) {
  return createMemoryRouter(
    [
      {
        path: '/protected',
        element: <ProtectedRoute />,
        children: [{ index: true, element: <div data-testid="outlet-content">Protected Content</div> }],
      },
      { path: '/login', element: <div data-testid="login-page">Login</div> },
    ],
    { initialEntries: [initialPath] },
  )
}

beforeEach(() => vi.clearAllMocks())

// ── Tests ─────────────────────────────────────────────────────────────────

describe('ProtectedRoute — unauthenticated (no token)', () => {
  beforeEach(() => mockGetStorage.mockReturnValue(null))

  it('redirects to /login when no token is present', () => {
    render(<RouterProvider router={buildRouter('/protected')} />)
    expect(screen.getByTestId('login-page')).toBeInTheDocument()
  })

  it('does NOT render the protected outlet content', () => {
    render(<RouterProvider router={buildRouter('/protected')} />)
    expect(screen.queryByTestId('outlet-content')).not.toBeInTheDocument()
  })

  it('checks storage for pcr_token', () => {
    render(<RouterProvider router={buildRouter('/protected')} />)
    expect(mockGetStorage).toHaveBeenCalledWith('pcr_token')
  })
})

describe('ProtectedRoute — authenticated (token present)', () => {
  beforeEach(() => mockGetStorage.mockReturnValue('valid-token'))

  it('renders the Navbar', () => {
    render(<RouterProvider router={buildRouter('/protected')} />)
    expect(screen.getByTestId('navbar')).toBeInTheDocument()
  })

  it('renders the Footer', () => {
    render(<RouterProvider router={buildRouter('/protected')} />)
    expect(screen.getByTestId('footer')).toBeInTheDocument()
  })

  it('renders the outlet content (child route)', () => {
    render(<RouterProvider router={buildRouter('/protected')} />)
    expect(screen.getByTestId('outlet-content')).toBeInTheDocument()
  })

  it('does NOT redirect to /login', () => {
    render(<RouterProvider router={buildRouter('/protected')} />)
    expect(screen.queryByTestId('login-page')).not.toBeInTheDocument()
  })
})
