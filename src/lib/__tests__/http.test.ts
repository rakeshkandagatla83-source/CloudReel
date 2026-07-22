import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest'

// ── Hoisted mocks ─────────────────────────────────────────────────────────────

const {
  capturedInterceptors,
  mockAxiosGet,
  mockAxiosPost,
  mockAxiosPut,
  mockAxiosDelete,
  mockGetStorage,
  mockSetStorage,
  mockRemoveStorage,
} = vi.hoisted(() => {
  const capturedInterceptors: {
    requestFulfill?: (config: { url?: string; headers: Record<string, unknown> }) => {
      url?: string
      headers: Record<string, unknown>
    }
    responseFulfill?: (response: { data: unknown }) => { data: unknown }
    responseReject?: (error: unknown) => Promise<never>
  } = {}

  return {
    capturedInterceptors,
    mockAxiosGet: vi.fn(),
    mockAxiosPost: vi.fn(),
    mockAxiosPut: vi.fn(),
    mockAxiosDelete: vi.fn(),
    mockGetStorage: vi.fn(),
    mockSetStorage: vi.fn(),
    mockRemoveStorage: vi.fn(),
  }
})

vi.mock('axios', () => ({
  default: {
    create: vi.fn(() => ({
      interceptors: {
        request: {
          use: vi.fn((onFulfilled: (config: { url?: string; headers: Record<string, unknown> }) => unknown) => {
            capturedInterceptors.requestFulfill =
              onFulfilled as typeof capturedInterceptors.requestFulfill
          }),
        },
        response: {
          use: vi.fn(
            (
              onFulfilled: (r: { data: unknown }) => { data: unknown },
              onRejected: (e: unknown) => Promise<never>,
            ) => {
              capturedInterceptors.responseFulfill = onFulfilled
              capturedInterceptors.responseReject = onRejected
            },
          ),
        },
      },
      get: mockAxiosGet,
      post: mockAxiosPost,
      put: mockAxiosPut,
      delete: mockAxiosDelete,
    })),
  },
}))

vi.mock('../storage', () => ({
  getStorage: mockGetStorage,
  setStorage: mockSetStorage,
  removeStorage: mockRemoveStorage,
}))

vi.mock('../apiConfig', () => ({
  apiConfig: { dotnetApiBase: 'https://api.test/' },
}))

// ── Import after mocks ─────────────────────────────────────────────────────────

import { http, session } from '../http'

// ── Window location mock ──────────────────────────────────────────────────────

const mockLocation = { href: '' }
beforeAll(() => {
  Object.defineProperty(globalThis, 'location', {
    value: mockLocation,
    configurable: true,
    writable: true,
  })
})

beforeEach(() => {
  vi.clearAllMocks()
  mockLocation.href = ''
})

// ── Helpers ───────────────────────────────────────────────────────────────────

function makeRequestConfig(url: string) {
  return { url, headers: {} as Record<string, unknown> }
}

// ── Request interceptor ───────────────────────────────────────────────────────

describe('request interceptor', () => {
  it('injects Authorization header with Bearer token for relative URLs', () => {
    mockGetStorage.mockImplementation((key: string) => (key === 'pcr_token' ? 'tok-abc' : null))
    const result = capturedInterceptors.requestFulfill!(makeRequestConfig('v1/items'))
    expect(result.headers['Authorization']).toBe('Bearer tok-abc')
  })

  it('injects userId header when userId exists', () => {
    mockGetStorage.mockImplementation((key: string) => (key === 'pcr_user_id' ? 'uid-42' : null))
    const result = capturedInterceptors.requestFulfill!(makeRequestConfig('v1/items'))
    expect(result.headers['userId']).toBe('uid-42')
  })

  it('injects Channel-Id header when channelId exists', () => {
    mockGetStorage.mockImplementation((key: string) => (key === 'pcr_channel_id' ? 'ch-7' : null))
    const result = capturedInterceptors.requestFulfill!(makeRequestConfig('v1/items'))
    expect(result.headers['Channel-Id']).toBe('ch-7')
  })

  it('injects all three auth headers for dotnet API base URL', () => {
    mockGetStorage.mockImplementation((key: string) => {
      if (key === 'pcr_token') return 'tok'
      if (key === 'pcr_user_id') return 'uid'
      if (key === 'pcr_channel_id') return 'cid'
      return null
    })
    const result = capturedInterceptors.requestFulfill!(makeRequestConfig('https://api.test/v1/data'))
    expect(result.headers['Authorization']).toBe('Bearer tok')
    expect(result.headers['userId']).toBe('uid')
    expect(result.headers['Channel-Id']).toBe('cid')
  })

  it('skips auth headers for external non-dotnet URLs', () => {
    mockGetStorage.mockReturnValue('some-value')
    const result = capturedInterceptors.requestFulfill!(makeRequestConfig('https://external.com/api'))
    expect(result.headers['Authorization']).toBeUndefined()
    expect(result.headers['userId']).toBeUndefined()
    expect(result.headers['Channel-Id']).toBeUndefined()
  })

  it('does not set Authorization when token is null', () => {
    mockGetStorage.mockReturnValue(null)
    const result = capturedInterceptors.requestFulfill!(makeRequestConfig('v1/items'))
    expect(result.headers['Authorization']).toBeUndefined()
  })

  it('does not set userId or Channel-Id when they are null', () => {
    mockGetStorage.mockReturnValue(null)
    const result = capturedInterceptors.requestFulfill!(makeRequestConfig('v1/items'))
    expect(result.headers['userId']).toBeUndefined()
    expect(result.headers['Channel-Id']).toBeUndefined()
  })

  it('returns the same config object (mutates in place)', () => {
    mockGetStorage.mockReturnValue(null)
    const config = makeRequestConfig('v1/items')
    const result = capturedInterceptors.requestFulfill!(config)
    expect(result).toBe(config)
  })
})

// ── Response interceptor — success ────────────────────────────────────────────

describe('response interceptor — success', () => {
  it('calls handleUnauthorized when summary.id === 3', () => {
    capturedInterceptors.responseFulfill!({ data: { summary: { id: 3 } } })
    expect(mockRemoveStorage).toHaveBeenCalledWith('pcr_token')
    expect(mockRemoveStorage).toHaveBeenCalledWith('pcr_user_id')
    expect(mockRemoveStorage).toHaveBeenCalledWith('pcr_channel_id')
    expect(mockRemoveStorage).toHaveBeenCalledWith('pcr_channel_name')
    expect(mockSetStorage).toHaveBeenCalledWith('pcr_session_expired', 'true', 'session')
    expect(mockLocation.href).toBe('/login')
  })

  it('returns response unchanged when summary.id is not 3', () => {
    const response = { data: { summary: { id: 1 } } }
    const result = capturedInterceptors.responseFulfill!(response)
    expect(result).toBe(response)
    expect(mockRemoveStorage).not.toHaveBeenCalled()
    expect(mockLocation.href).toBe('')
  })

  it('returns response unchanged when response has no summary', () => {
    const response = { data: { items: [] } }
    const result = capturedInterceptors.responseFulfill!(response)
    expect(result).toBe(response)
    expect(mockRemoveStorage).not.toHaveBeenCalled()
  })

  it('returns response unchanged when data is null', () => {
    const response = { data: null }
    const result = capturedInterceptors.responseFulfill!(response)
    expect(result).toBe(response)
    expect(mockRemoveStorage).not.toHaveBeenCalled()
  })
})

// ── Response interceptor — error ──────────────────────────────────────────────

describe('response interceptor — error', () => {
  it('calls handleUnauthorized and rejects on 401', async () => {
    const error = { response: { status: 401 } }
    await expect(capturedInterceptors.responseReject!(error)).rejects.toBe(error)
    expect(mockRemoveStorage).toHaveBeenCalledWith('pcr_token')
    expect(mockSetStorage).toHaveBeenCalledWith('pcr_session_expired', 'true', 'session')
    expect(mockLocation.href).toBe('/login')
  })

  it('calls handleUnauthorized and rejects on 500 with expired session message', async () => {
    const error = {
      response: {
        status: 500,
        data: { message: 'Invalid or expired session token for this user' },
      },
    }
    await expect(capturedInterceptors.responseReject!(error)).rejects.toBe(error)
    expect(mockRemoveStorage).toHaveBeenCalledWith('pcr_token')
    expect(mockSetStorage).toHaveBeenCalledWith('pcr_session_expired', 'true', 'session')
    expect(mockLocation.href).toBe('/login')
  })

  it('does not call handleUnauthorized for generic 500 errors', async () => {
    const error = { response: { status: 500, data: { message: 'Internal server error' } } }
    await expect(capturedInterceptors.responseReject!(error)).rejects.toBe(error)
    expect(mockRemoveStorage).not.toHaveBeenCalled()
    expect(mockLocation.href).toBe('')
  })

  it('does not call handleUnauthorized for 404 errors', async () => {
    const error = { response: { status: 404 } }
    await expect(capturedInterceptors.responseReject!(error)).rejects.toBe(error)
    expect(mockRemoveStorage).not.toHaveBeenCalled()
  })

  it('rejects with the original error for non-auth errors', async () => {
    const error = { response: { status: 422, data: { message: 'Validation failed' } } }
    await expect(capturedInterceptors.responseReject!(error)).rejects.toBe(error)
  })
})

// ── handleUnauthorized (tested through response interceptor) ──────────────────

describe('handleUnauthorized', () => {
  it('removes all 4 storage keys', () => {
    capturedInterceptors.responseReject!({ response: { status: 401 } }).catch(() => {})
    expect(mockRemoveStorage).toHaveBeenCalledWith('pcr_token')
    expect(mockRemoveStorage).toHaveBeenCalledWith('pcr_user_id')
    expect(mockRemoveStorage).toHaveBeenCalledWith('pcr_channel_id')
    expect(mockRemoveStorage).toHaveBeenCalledWith('pcr_channel_name')
    expect(mockRemoveStorage).toHaveBeenCalledTimes(4)
  })

  it('sets pcr_session_expired to "true" in sessionStorage', () => {
    capturedInterceptors.responseReject!({ response: { status: 401 } }).catch(() => {})
    expect(mockSetStorage).toHaveBeenCalledWith('pcr_session_expired', 'true', 'session')
    expect(mockSetStorage).toHaveBeenCalledTimes(1)
  })

  it('redirects to /login', () => {
    capturedInterceptors.responseReject!({ response: { status: 401 } }).catch(() => {})
    expect(mockLocation.href).toBe('/login')
  })
})

// ── http.get ──────────────────────────────────────────────────────────────────

describe('http.get', () => {
  it('concatenates prefix and url, returns response.data', async () => {
    mockAxiosGet.mockResolvedValue({ data: { result: 'ok' } })
    const result = await http.get<{ result: string }>('https://api.test/', 'v1/items')
    expect(mockAxiosGet).toHaveBeenCalledWith('https://api.test/v1/items', undefined)
    expect(result).toEqual({ result: 'ok' })
  })

  it('forwards optional config to the axios call', async () => {
    mockAxiosGet.mockResolvedValue({ data: [] })
    const config = { params: { page: 2 } }
    await http.get('https://api.test/', 'v1/items', config)
    expect(mockAxiosGet).toHaveBeenCalledWith('https://api.test/v1/items', config)
  })

  it('propagates errors from axios', async () => {
    mockAxiosGet.mockRejectedValue(new Error('Network error'))
    await expect(http.get('https://api.test/', 'v1/items')).rejects.toThrow('Network error')
  })
})

// ── http.post ─────────────────────────────────────────────────────────────────

describe('http.post', () => {
  it('sends data and returns response.data', async () => {
    mockAxiosPost.mockResolvedValue({ data: { id: 1 } })
    const payload = { name: 'New Item' }
    const result = await http.post<{ id: number }>('https://api.test/', 'v1/items', payload)
    expect(mockAxiosPost).toHaveBeenCalledWith('https://api.test/v1/items', payload, undefined)
    expect(result).toEqual({ id: 1 })
  })

  it('forwards optional config', async () => {
    mockAxiosPost.mockResolvedValue({ data: {} })
    const config = { headers: { 'X-Custom': 'value' } }
    await http.post('https://api.test/', 'v1/items', {}, config)
    expect(mockAxiosPost).toHaveBeenCalledWith('https://api.test/v1/items', {}, config)
  })
})

// ── http.put ──────────────────────────────────────────────────────────────────

describe('http.put', () => {
  it('sends data and returns response.data', async () => {
    mockAxiosPut.mockResolvedValue({ data: { updated: true } })
    const result = await http.put<{ updated: boolean }>('https://api.test/', 'v1/items/1', { name: 'Updated' })
    expect(mockAxiosPut).toHaveBeenCalledWith('https://api.test/v1/items/1', { name: 'Updated' }, undefined)
    expect(result).toEqual({ updated: true })
  })
})

// ── http.delete ───────────────────────────────────────────────────────────────

describe('http.delete', () => {
  it('calls delete and returns response.data', async () => {
    mockAxiosDelete.mockResolvedValue({ data: { deleted: true } })
    const result = await http.delete<{ deleted: boolean }>('https://api.test/', 'v1/items/1')
    expect(mockAxiosDelete).toHaveBeenCalledWith('https://api.test/v1/items/1', undefined)
    expect(result).toEqual({ deleted: true })
  })
})

// ── session.set ───────────────────────────────────────────────────────────────

describe('session.set', () => {
  it('stores all 4 session keys in localStorage', () => {
    session.set('tok-123', 'uid-456', 'cid-789', 'my-channel')
    expect(mockSetStorage).toHaveBeenCalledWith('pcr_token', 'tok-123')
    expect(mockSetStorage).toHaveBeenCalledWith('pcr_user_id', 'uid-456')
    expect(mockSetStorage).toHaveBeenCalledWith('pcr_channel_id', 'cid-789')
    expect(mockSetStorage).toHaveBeenCalledWith('pcr_channel_name', 'my-channel')
    expect(mockSetStorage).toHaveBeenCalledTimes(4)
  })
})

// ── session.setChannel ────────────────────────────────────────────────────────

describe('session.setChannel', () => {
  it('stores channelId and channelName', () => {
    session.setChannel('cid-99', 'new-channel')
    expect(mockSetStorage).toHaveBeenCalledWith('pcr_channel_id', 'cid-99')
    expect(mockSetStorage).toHaveBeenCalledWith('pcr_channel_name', 'new-channel')
    expect(mockSetStorage).toHaveBeenCalledTimes(2)
  })
})

// ── session.clear ─────────────────────────────────────────────────────────────

describe('session.clear', () => {
  it('removes all 4 session keys', () => {
    session.clear()
    expect(mockRemoveStorage).toHaveBeenCalledWith('pcr_token')
    expect(mockRemoveStorage).toHaveBeenCalledWith('pcr_user_id')
    expect(mockRemoveStorage).toHaveBeenCalledWith('pcr_channel_id')
    expect(mockRemoveStorage).toHaveBeenCalledWith('pcr_channel_name')
    expect(mockRemoveStorage).toHaveBeenCalledTimes(4)
  })
})
