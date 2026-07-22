import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Hoisted mocks ─────────────────────────────────────────────────────────

const { mockHttpPost, mockHttpGet, mockSessionSet, mockSessionSetChannel, mockSessionClear } = vi.hoisted(() => ({
  mockHttpPost: vi.fn(),
  mockHttpGet: vi.fn(),
  mockSessionSet: vi.fn(),
  mockSessionSetChannel: vi.fn(),
  mockSessionClear: vi.fn(),
}))

const { mockSetStorage, mockGetStorage, mockRemoveStorage } = vi.hoisted(() => ({
  mockSetStorage: vi.fn(),
  mockGetStorage: vi.fn(),
  mockRemoveStorage: vi.fn(),
}))

const { mockSigninRedirect, mockSigninRedirectCallback } = vi.hoisted(() => ({
  mockSigninRedirect: vi.fn(),
  mockSigninRedirectCallback: vi.fn(),
}))

vi.mock('../http', () => ({
  http: { post: mockHttpPost, get: mockHttpGet },
  session: { set: mockSessionSet, setChannel: mockSessionSetChannel, clear: mockSessionClear },
}))

vi.mock('../storage', () => ({
  setStorage: mockSetStorage,
  getStorage: mockGetStorage,
  removeStorage: mockRemoveStorage,
}))

vi.mock('../oidcService', () => ({
  signinRedirect: mockSigninRedirect,
  signinRedirectCallback: mockSigninRedirectCallback,
}))

vi.mock('../apiConfig', () => ({
  apiConfig: { dotnetApiBase: 'https://api.test/' },
}))

// ── Import after mocks ─────────────────────────────────────────────────────

import {
  isMsalUser,
  loginWithJanya,
  msalRedirect,
  handleMsalCallback,
  setWorkspace,
  getChannelData,
  logout,
} from '../authService'
import type { Channel } from '../../types/user'

// ── Tests ─────────────────────────────────────────────────────────────────

beforeEach(() => vi.clearAllMocks())

describe('isMsalUser', () => {
  it('returns true for @yupptv domain', () => {
    expect(isMsalUser('user@yupptv.com')).toBe(true)
  })

  it('returns true when @yupptv appears anywhere in the username', () => {
    expect(isMsalUser('admin@yupptv.co.in')).toBe(true)
  })

  it('is case-insensitive', () => {
    expect(isMsalUser('USER@YUPPTV.COM')).toBe(true)
  })

  it('returns false for non-yupptv domains', () => {
    expect(isMsalUser('user@gmail.com')).toBe(false)
    expect(isMsalUser('user@janya.video')).toBe(false)
  })

  it('returns false for empty string', () => {
    expect(isMsalUser('')).toBe(false)
  })
})

describe('loginWithJanya', () => {
  it('posts credentials and stores session + user on success', async () => {
    const userData = { sessionToken: 'tok-abc', id: 42, name: 'Test User' }
    mockHttpPost.mockResolvedValue({ data: userData })

    const result = await loginWithJanya('test@example.com', 'password123')

    expect(mockHttpPost).toHaveBeenCalledWith(
      expect.any(String),
      'v1/login',
      expect.any(FormData),
      expect.any(Object),
    )
    expect(mockSessionSet).toHaveBeenCalledWith('tok-abc', '42', '', '')
    expect(mockSetStorage).toHaveBeenCalledWith('pcr_user', userData)
    expect(result.data).toEqual(userData)
  })

  it('sends username, password, and authType=JANYA in FormData', async () => {
    mockHttpPost.mockResolvedValue({ data: { sessionToken: 't', id: 1 } })

    await loginWithJanya('someone@test.com', 'secret')

    const formData = mockHttpPost.mock.calls[0][2] as FormData
    expect(formData.get('username')).toBe('someone@test.com')
    expect(formData.get('password')).toBe('secret')
    expect(formData.get('authType')).toBe('JANYA')
  })

  it('propagates errors from http.post', async () => {
    mockHttpPost.mockRejectedValue(new Error('Unauthorized'))
    await expect(loginWithJanya('u', 'p')).rejects.toThrow('Unauthorized')
  })
})

describe('msalRedirect', () => {
  it('stores fromPath in session storage then triggers OIDC redirect', async () => {
    mockSigninRedirect.mockResolvedValue(undefined)

    await msalRedirect('/studio')

    expect(mockSetStorage).toHaveBeenCalledWith('pcr_msal_from', '/studio', 'session')
    expect(mockSigninRedirect).toHaveBeenCalledOnce()
  })

  it('skips setStorage when no fromPath is provided', async () => {
    mockSigninRedirect.mockResolvedValue(undefined)

    await msalRedirect()

    expect(mockSetStorage).not.toHaveBeenCalled()
    expect(mockSigninRedirect).toHaveBeenCalledOnce()
  })
})

describe('handleMsalCallback', () => {
  const oidcUser = {
    id_token: 'id-tok-xyz',
    profile: { email: 'user@yupptv.com' },
  }
  const userData = { sessionToken: 'sess', id: 7 }

  beforeEach(() => {
    mockSigninRedirectCallback.mockResolvedValue(oidcUser)
    mockHttpGet.mockResolvedValue(undefined)
    mockHttpPost.mockResolvedValue({ data: userData })
    mockGetStorage.mockReturnValue('/events')
  })

  it('validates the OIDC token with the backend', async () => {
    await handleMsalCallback()

    expect(mockHttpGet).toHaveBeenCalledWith(
      expect.any(String),
      'v1/login/validate/token',
      { headers: { Authorization: 'Bearer id-tok-xyz' } },
    )
  })

  it('calls Janya login with the OIDC email and authType=MSAL', async () => {
    await handleMsalCallback()

    const formData = mockHttpPost.mock.calls[0][2] as FormData
    expect(formData.get('username')).toBe('user@yupptv.com')
    expect(formData.get('authType')).toBe('MSAL')
    expect(formData.get('password')).toBeNull()
  })

  it('falls back to preferred_username when email is absent', async () => {
    mockSigninRedirectCallback.mockResolvedValue({
      id_token: 'tok',
      profile: { preferred_username: 'pref@yupptv.com' },
    })

    await handleMsalCallback()

    const formData = mockHttpPost.mock.calls[0][2] as FormData
    expect(formData.get('username')).toBe('pref@yupptv.com')
  })

  it('returns the user response and the stored fromPath', async () => {
    const result = await handleMsalCallback()

    expect(result.fromPath).toBe('/events')
    expect(result.response.data).toEqual(userData)
  })

  it('clears the fromPath from session storage after reading it', async () => {
    await handleMsalCallback()

    expect(mockRemoveStorage).toHaveBeenCalledWith('pcr_msal_from', 'session')
  })

  it('returns null fromPath when nothing is stored', async () => {
    mockGetStorage.mockReturnValue(null)

    const result = await handleMsalCallback()

    expect(result.fromPath).toBeNull()
  })
})

describe('setWorkspace', () => {
  const channel = {
    id: 5,
    channelName: 'my-channel',
    displayName: 'My Channel',
    logoUrl: '',
    thumbnailUrl: '',
    status: true,
    cid: '5',
  } as unknown as Channel

  it('stores channel in session and persists tenant + channel to storage', () => {
    setWorkspace(10, channel)

    expect(mockSessionSetChannel).toHaveBeenCalledWith('5', 'my-channel')
    expect(mockSetStorage).toHaveBeenCalledWith('pcr_tenant_id', 10)
    expect(mockSetStorage).toHaveBeenCalledWith('pcr_channel', channel)
  })
})

describe('getChannelData', () => {
  it('retrieves the channel from storage', () => {
    const channel = { id: 1, channelName: 'test' }
    mockGetStorage.mockReturnValue(channel)

    expect(getChannelData()).toEqual(channel)
    expect(mockGetStorage).toHaveBeenCalledWith('pcr_channel')
  })

  it('returns null when channel is not stored', () => {
    mockGetStorage.mockReturnValue(null)
    expect(getChannelData()).toBeNull()
  })
})

describe('logout', () => {
  it('clears session and removes all user-related storage keys', () => {
    logout()

    expect(mockSessionClear).toHaveBeenCalledOnce()
    expect(mockRemoveStorage).toHaveBeenCalledWith('pcr_user')
    expect(mockRemoveStorage).toHaveBeenCalledWith('pcr_tenant_id')
    expect(mockRemoveStorage).toHaveBeenCalledWith('pcr_channel')
  })
})
