import type { AuthType, Channel, UserResponse, UserData } from '../types/user'
import { apiConfig } from './apiConfig'
import { http, session } from './http'
import { signinRedirect, signinRedirectCallback } from './oidcService'
import { getStorage, removeStorage, setStorage } from './storage'

// ── Storage keys ──────────────────────────────────────────────────────────────

const STORAGE_USER = 'pcr_user'
const STORAGE_TENANT_ID = 'pcr_tenant_id'
const STORAGE_CHANNEL = 'pcr_channel'
const MSAL_FROM_KEY = 'pcr_msal_from'

// ── Internal helpers ──────────────────────────────────────────────────────────

async function callJanyaLogin(
  username: string,
  password: string | null,
  authType: AuthType,
): Promise<UserResponse> {
  const formData = new FormData()
  formData.append('username', username)
  if (password !== null) formData.append('password', password)
  formData.append('authType', authType)

  const data = await http.post<UserResponse>(apiConfig.dotnetApiBase, 'v1/login', formData, {
    headers: { 'Content-Type': undefined },
  })

  session.set(data.data.sessionToken, String(data.data.id), '','')
  setStorage(STORAGE_USER, data.data)

  return data
}

// ── Public API ────────────────────────────────────────────────────────────────

/** Returns true when the username belongs to a domain that must use MSAL. */
export function isMsalUser(username: string): boolean {
  return username.toLowerCase().includes('@yupptv')
}

/**
 * JANYA flow — Step 1.
 * Authenticates with username + password. Stores session token on success.
 * Returns the full API response (contains tenants list).
 */
export async function loginWithJanya(
  username: string,
  password: string,
): Promise<UserResponse> {
  return callJanyaLogin(username, password, 'JANYA')
}

/**
 * MSAL flow — Step 1.
 * Stores the post-auth destination path and redirects to the OIDC provider.
 * The page will navigate away — nothing after this line runs on success.
 */
export async function msalRedirect(fromPath?: string): Promise<void> {
  if (fromPath) setStorage(MSAL_FROM_KEY, fromPath, 'session')
  await signinRedirect()
}

/**
 * MSAL flow — Step 2 (runs on /callback).
 * Completes the OIDC redirect, validates the token with the backend,
 * then calls the Janya login API with authType MSAL.
 * Returns the full user response and the original destination path.
 */
export async function handleMsalCallback(): Promise<{
  response: UserResponse
  fromPath: string | null
}> {
  const oidcUser = await signinRedirectCallback()

  await http.get<void>(
    apiConfig.dotnetApiBase,
    'v1/login/validate/token',
    { headers: { Authorization: `Bearer ${oidcUser.id_token}` } },
  )

  const email =
    oidcUser.profile.email ??
    (oidcUser.profile.preferred_username as string | undefined) ??
    ''

  const response = await callJanyaLogin(email, null, 'MSAL')

  const fromPath = getStorage<string>(MSAL_FROM_KEY, 'session')
  removeStorage(MSAL_FROM_KEY, 'session')

  return { response, fromPath }
}

/**
 * Step 2 for both flows.
 * Persists the selected workspace context (tenant + channel) to storage.
 * Must be called before navigating to the protected area.
 */
export function setWorkspace(tenantId: number, channel: Channel): void {
  session.setChannel(String(channel.id), channel.channelName)
  setStorage(STORAGE_TENANT_ID, tenantId)
  setStorage(STORAGE_CHANNEL, channel)
}

export function getChannelData(): Channel | null {
  return getStorage<Channel>(STORAGE_CHANNEL)
}

/** Clears all session and user data. */
export function logout(): void {
  session.clear()
  removeStorage(STORAGE_USER)
  removeStorage(STORAGE_TENANT_ID)
  removeStorage(STORAGE_CHANNEL)
}

/** Verifies a Cloudflare Turnstile token with the backend with a 3-second timeout. */
export async function verifyCaptchaToken(token: string): Promise<void> {
  const CAPTCHA_TIMEOUT_MS = 3000
  const timeoutPromise = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('Verification timeout')), CAPTCHA_TIMEOUT_MS)
  )
  await Promise.race([
    http.post<void>(apiConfig.dotnetApiBase, 'v1/login/verify-captcha', { token }),
    timeoutPromise,
  ])
}

interface SignupPayload {
  email: string
  firstName: string
  lastName: string
  channelName: string
  phoneNumber: string
  passwordHash: string
  countryCode: string
}

/** Creates a new user account and triggers email verification. */
export async function registerUser(payload: SignupPayload): Promise<void> {
  await http.post<void>(apiConfig.dotnetApiBase, 'v1/producer/signup', payload)
}

/** Verifies the user's email with a 6-digit code sent to their inbox. */
export async function verifyEmail(email: string, code: string): Promise<void> {
  await http.post<void>(apiConfig.dotnetApiBase, 'v1/producer/verify-email', { email, code })
}

/** Resends the verification code to an email address for an existing unverified account. */
export async function resendVerificationCode(email: string): Promise<void> {
  await http.post<void>(apiConfig.dotnetApiBase, 'v1/producer/resend-verification', { email })
}

export interface EmailCheckResult {
  exists: boolean
  emailVerified?: boolean
  signupStatus?: 'pending' | 'approved' | 'rejected'
}

interface CheckEmailApiResponse {
  code: number
  Message: string
  id: number
  data: EmailCheckResult
}

/** Checks if an email already exists in the signup database and returns its status. */
export async function checkEmail(email: string): Promise<EmailCheckResult> {
  const res = await http.post<CheckEmailApiResponse>(apiConfig.dotnetApiBase, 'v1/producer/check-email', { email })
  return res.data
}

/** Claims the PCR subscription trial for the authenticated user. */
export async function claimPcrTrial(): Promise<void> {
  await http.patch<void>(apiConfig.dotnetApiBase, 'v1/recurly/claim-pcr-trial')
  const user = getStorage<UserData>(STORAGE_USER)
  if (user) {
    setStorage(STORAGE_USER, { ...user, hasClaimedPcrTrial: true })
  }
}
