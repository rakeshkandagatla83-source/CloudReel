import * as RadixDialog from '@radix-ui/react-dialog'
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  Eye,
  EyeOff,
  ChevronRight,
  Loader2,
  Cookie,
  ShieldCheck,
  Building2,
  Tv2,
  ArrowLeft,
  CheckCircle,
  Phone,
  Globe,
  Users,
  Monitor,
  Mail,
  Lock,
} from 'lucide-react'
import { isAxiosError } from 'axios'
import { cn } from '../lib/utils'
import { getStorage, setStorage, removeStorage } from '../lib/storage'
import { getCountryPhoneCodes } from '../lib/countryPhoneCodeUtils'
import { loginWithJanya, msalRedirect, isMsalUser, setWorkspace, registerUser, verifyEmail, resendVerificationCode, checkEmail, type EmailCheckResult } from '../lib/authService'
import { Footer } from '../components/ui/Footer'
import { Toaster } from '../components/ui/Toast'
import type { Tenant } from '../types/user'

// ── Constants ─────────────────────────────────────────────────────────────────

const COOKIE_USERNAME = 'pcr_username'
const COOKIE_MAX_AGE = 30 * 24 * 60 * 60 // 30 days in seconds
const STORAGE_CONSENT = 'cookie_consent'
// const TURNSTILE_SITE_KEY = '0x4AAAAAADIYKci3ksbMhjCi'

const COUNTRY_CODES = getCountryPhoneCodes()

type CookieConsent = 'accepted' | 'essential'
type LoginStep = 'credentials' | 'signup' | 'org-channel'
type SignupSubStep = 'form' | 'code' | 'success'
type LoginLocationState = {
  from?: { pathname: string }
  authRequired?: boolean
  msalTenants?: Tenant[]
} | null

// ── Helpers ───────────────────────────────────────────────────────────────────

function getCookie(name: string): string | undefined {
  return document.cookie
    .split('; ')
    .find((row) => row.startsWith(`${name}=`))
    ?.split('=')[1]
}


// ── ImageSelect ───────────────────────────────────────────────────────────────

interface ImageSelectOption {
  value: number
  label: string
  imageUrl: string | null
}

interface ImageSelectProps {
  id: string
  options: ImageSelectOption[]
  value: number | null
  onChange: (value: number) => void
  placeholder: string
  disabled?: boolean
  defaultIcon: ReactNode
}

function ImageSelect({
  id,
  options,
  value,
  onChange,
  placeholder,
  disabled = false,
  defaultIcon,
}: ImageSelectProps) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const selectedOption = useMemo(
    () => options.find((o) => o.value === value) ?? null,
    [options, value],
  )

  useEffect(() => {
    if (!open) return
    function handleMouseDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', handleMouseDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleMouseDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        id={id}
        disabled={disabled}
        onClick={() => setOpen((prev) => !prev)}
        className={cn(
          'w-full flex items-center gap-3 bg-surface border rounded-lg px-3.5 py-2.5 text-sm text-left transition-all duration-200 shadow-sm',
          disabled
            ? 'border-primary-border opacity-50 cursor-not-allowed'
            : 'border-primary-border hover:border-secondary-text/30 cursor-pointer',
          !disabled && open && 'border-active-accent ring-1 ring-active-accent/15',
        )}
      >
        <span className="shrink-0 w-8 h-8 rounded-md flex items-center justify-center bg-surface-2 overflow-hidden border border-primary-border/50">
          {selectedOption?.imageUrl ? (
            <img src={selectedOption.imageUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            defaultIcon
          )}
        </span>
        <span className={cn('flex-1 truncate', selectedOption ? 'text-primary-text' : 'text-muted-text')}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronRight
          size={14}
          className={cn(
            'shrink-0 text-muted-text transition-transform duration-200',
            open && 'rotate-90',
          )}
        />
      </button>

      {open && !disabled && (
        <div className="absolute z-20 w-full mt-1.5 bg-surface border border-primary-border rounded-lg shadow-xl overflow-hidden">
          <div className="max-h-56 overflow-y-auto p-1">
            {options.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onChange(opt.value)
                  setOpen(false)
                }}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2 text-sm text-left transition-colors cursor-pointer rounded-md',
                  opt.value === value
                    ? 'bg-active-accent/10 text-active-accent font-medium'
                    : 'text-primary-text hover:bg-surface-2',
                )}
              >
                <span className="shrink-0 w-8 h-8 rounded-md flex items-center justify-center bg-surface-2 overflow-hidden border border-primary-border/50">
                  {opt.imageUrl ? (
                    <img src={opt.imageUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    defaultIcon
                  )}
                </span>
                <span className="flex-1 truncate">{opt.label}</span>
                {opt.value === value && <Check size={16} className="text-active-accent shrink-0 ml-2" />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── ReadonlyField ─────────────────────────────────────────────────────────────

interface ReadonlyFieldProps {
  label: string
  imageUrl: string | null
  defaultIcon: ReactNode
}

function ReadonlyField({ label, imageUrl, defaultIcon }: ReadonlyFieldProps) {
  return (
    <div className="w-full flex items-center gap-3 bg-surface border border-primary-border rounded-lg px-3.5 py-2.5 text-sm text-primary-text shadow-sm">
      <span className="shrink-0 w-8 h-8 rounded-md flex items-center justify-center bg-surface-2 overflow-hidden border border-primary-border/50">
        {imageUrl ? (
          <img src={imageUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          defaultIcon
        )}
      </span>
      <span className="flex-1 truncate text-white">{label}</span>
    </div>
  )
}

// ── Component ─────────────────────────────────────────────────────────────────

export function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const locationState = location.state as LoginLocationState
  const from = locationState?.from?.pathname ?? '/mam'

  const [step, setStep] = useState<LoginStep>(() => {
    const clearedMsal = getStorage<boolean>('pcr_msal_cleared', 'session')
    if (clearedMsal || !locationState?.msalTenants) {
      return 'credentials'
    }
    return 'org-channel'
  })
  const [tenants, setTenants] = useState<Tenant[]>(locationState?.msalTenants ?? [])
  const [selectedTenantId, setSelectedTenantId] = useState<number | null>(null)
  const [selectedChannelId, setSelectedChannelId] = useState<number | null>(null)

  const [showPassword, setShowPassword] = useState(false)
  const [authToastOpen, setAuthToastOpen] = useState(locationState?.authRequired ?? false)
  const [sessionExpiredToastOpen, setSessionExpiredToastOpen] = useState(() => {
    const expired = getStorage<string>('pcr_session_expired', 'session') === 'true'
    if (expired) removeStorage('pcr_session_expired', 'session')
    return expired
  })
  const [authError, setAuthError] = useState<string | null>(null)
  const [authErrorOpen, setAuthErrorOpen] = useState(false)
  const [username, setUsername] = useState('')
  const [usernameTouched, setUsernameTouched] = useState(false)
  const [password, setPassword] = useState('')
  const [passwordTouched, setPasswordTouched] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [cookieConsent, setCookieConsent] = useState<CookieConsent | null>(null)
  const [consentOpen, setConsentOpen] = useState(false)
  const cookieUsernameRestoredRef = useRef(false)

  const [signupSubStep, setSignupSubStep] = useState<SignupSubStep>('form')
  const [signupFirstName, setSignupFirstName] = useState('')
  const [signupFirstNameTouched, setSignupFirstNameTouched] = useState(false)
  const [signupLastName, setSignupLastName] = useState('')
  const [signupLastNameTouched, setSignupLastNameTouched] = useState(false)
  const [signupChannelName, setSignupChannelName] = useState('')
  const [signupChannelNameTouched, setSignupChannelNameTouched] = useState(false)
  const [signupChannelNameEdited, setSignupChannelNameEdited] = useState(false)
  const [signupEmail, setSignupEmail] = useState('')
  const [signupEmailTouched, setSignupEmailTouched] = useState(false)
  const [signupPassword, setSignupPassword] = useState('')
  const [signupPasswordTouched, setSignupPasswordTouched] = useState(false)
  const [signupConfirmPassword, setSignupConfirmPassword] = useState('')
  const [signupConfirmPasswordTouched, setSignupConfirmPasswordTouched] = useState(false)
  const [showSignupPassword, setShowSignupPassword] = useState(false)
  const [showSignupConfirmPassword, setShowSignupConfirmPassword] = useState(false)
  const [signupCountryCode, setSignupCountryCode] = useState('91')
  const [signupPhone, setSignupPhone] = useState('')
  const [signupPhoneTouched, setSignupPhoneTouched] = useState(false)
  const [isSignupSubmitting, setIsSignupSubmitting] = useState(false)
  const [signupVerifyCode, setSignupVerifyCode] = useState('')
  const [signupVerifyCodeTouched, setSignupVerifyCodeTouched] = useState(false)
  const [isVerifySubmitting, setIsVerifySubmitting] = useState(false)
  const [isVerifyExisting, setIsVerifyExisting] = useState(false)
  const [isResendingCode, setIsResendingCode] = useState(false)
  const [isCodeSent, setIsCodeSent] = useState(false)
  const [signupEmailCheckResult, setSignupEmailCheckResult] = useState<EmailCheckResult | null>(null)
  const [isSignupEmailChecking, setIsSignupEmailChecking] = useState(false)
  const [signupApprovalStatus, setSignupApprovalStatus] = useState<'approved' | 'pending' | 'rejected' | null>(null)

  // Turnstile (disabled — CAPTCHA bypassed)
  const [isCaptchaVerified, setIsCaptchaVerified] = useState(true)
  const [pendingAction, setPendingAction] = useState<'login' | 'msal' | 'signup' | null>(null)
  const signupChannelSuffixRef = useRef(Math.floor(Math.random() * 900 + 100).toString())

  const usernameError = useMemo(() => {
    if (!username) return 'Username is required'
    if (username.length < 3) return 'Must be at least 3 characters'
    if (username.length > 254) return 'Must be 254 characters or fewer'
    if (/\s/.test(username)) return 'Must not contain spaces'
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(username)
    const isUsername = /^[a-zA-Z0-9_-]+$/.test(username)
    if (!isEmail && !isUsername) return 'Enter a valid username or email address'
    return null
  }, [username])

  const passwordError = useMemo(
    () => (!password.trim() ? 'Password is required' : null),
    [password],
  )

  const isFormValid = useMemo(
    () => usernameError === null && passwordError === null,
    [usernameError, passwordError],
  )

  const selectedTenant = useMemo(
    () => tenants.find((t) => t.tid === selectedTenantId) ?? null,
    [tenants, selectedTenantId],
  )

  const availableChannels = useMemo(
    () => selectedTenant?.channels ?? [],
    [selectedTenant],
  )

  const isOrgChannelValid = useMemo(
    () => selectedTenantId !== null && selectedChannelId !== null,
    [selectedTenantId, selectedChannelId],
  )

  const tenantOptions = useMemo(
    () => tenants.map((t) => ({ value: t.tid, label: t.tName, imageUrl: t.tLogoUrl })),
    [tenants],
  )

  const channelOptions = useMemo(
    () =>
      availableChannels.map((c) => ({
        value: c.id,
        label: c.channelName,
        imageUrl: c.icon || null,
      })),
    [availableChannels],
  )

  const signupFirstNameError = useMemo(() => {
    if (!signupFirstName.trim()) return 'First name is required'
    if (signupFirstName.trim().length < 2) return 'Must be at least 2 characters'
    if (signupFirstName.trim().length > 50) return 'Must not exceed 50 characters'
    if (!/^[a-zA-Z\s'-]+$/.test(signupFirstName.trim())) return 'Only letters, spaces, hyphens, and apostrophes allowed'
    return null
  }, [signupFirstName])

  const signupLastNameError = useMemo(() => {
    if (signupLastName.trim()) {
      if (signupLastName.trim().length < 2) return 'Must be at least 2 characters'
      if (signupLastName.trim().length > 50) return 'Must not exceed 50 characters'
      if (!/^[a-zA-Z\s'-]+$/.test(signupLastName.trim())) return 'Only letters, spaces, hyphens, and apostrophes allowed'
    }
    return null
  }, [signupLastName])

  const signupCountryCodeError = useMemo(() => {
    if (!signupCountryCode) return 'Country code is required'
    return null
  }, [signupCountryCode])

  const signupEmailError = useMemo(() => {
    if (!signupEmail) return 'Email is required'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(signupEmail)) return 'Enter a valid email address'
    return null
  }, [signupEmail])

  const signupPasswordError = useMemo(() => {
    if (!signupPassword) return 'Password is required'
    if (signupPassword.length < 8) return 'Must be at least 8 characters'
    return null
  }, [signupPassword])

  const signupConfirmPasswordError = useMemo(() => {
    if (!signupConfirmPassword) return 'Please confirm your password'
    if (signupConfirmPassword !== signupPassword) return 'Passwords do not match'
    return null
  }, [signupConfirmPassword, signupPassword])

  const signupPhoneError = useMemo(() => {
    if (!signupPhone) return 'Phone number is required'
    const digits = signupPhone.replace(/\D/g, '')
    if (digits.length < 7 || digits.length > 15) return 'Enter a valid phone number'
    return null
  }, [signupPhone])

  const signupChannelNameError = useMemo(() => {
    if (!signupChannelName.trim()) return 'Channel name is required'
    if (signupChannelName.trim().length < 3) return 'Must be at least 3 characters'
    return null
  }, [signupChannelName])

  const isSignupFormValid = useMemo(
    () =>
      signupFirstNameError === null &&
      signupLastNameError === null &&
      signupCountryCodeError === null &&
      signupEmailError === null &&
      signupEmailCheckResult?.exists !== true &&
      signupPasswordError === null &&
      signupConfirmPasswordError === null &&
      signupPhoneError === null &&
      signupChannelNameError === null,
    [
      signupFirstNameError,
      signupLastNameError,
      signupCountryCodeError,
      signupEmailError,
      signupEmailCheckResult,
      signupPasswordError,
      signupConfirmPasswordError,
      signupPhoneError,
      signupChannelNameError,
    ],
  )

  // Set page title
  useEffect(() => {
    document.title = 'CloudReel - Login'
  }, [])


  // Check consent on mount; open dialog if first visit
  useEffect(() => {
    const stored = getStorage<CookieConsent>(STORAGE_CONSENT)
    if (!stored) {
      setConsentOpen(true)
    } else {
      setCookieConsent(stored)
    }
  }, [])

  // Restore remembered username only when cookies are accepted — runs once only
  useEffect(() => {
    if (cookieConsent !== 'accepted') return
    if (cookieUsernameRestoredRef.current) return
    cookieUsernameRestoredRef.current = true
    const saved = getCookie(COOKIE_USERNAME)
    if (saved) {
      setUsername(decodeURIComponent(saved))
      setRememberMe(true)
    }
  }, [cookieConsent])

  // Auto-generate channel name from first + last name
  useEffect(() => {
    if (signupChannelNameEdited) return
    const first = signupFirstName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/, '')
    const last = signupLastName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/, '')
    const parts = [first, last].filter(Boolean)
    setSignupChannelName(parts.length ? `${parts.join('_')}_${signupChannelSuffixRef.current}` : '')
  }, [signupFirstName, signupLastName, signupChannelNameEdited])

  const handleConsent = useCallback((choice: CookieConsent) => {
    setStorage(STORAGE_CONSENT, choice)
    setCookieConsent(choice)
    setConsentOpen(false)
  }, [])

  const handleUsernameBlur = useCallback(() => setUsernameTouched(true), [])
  const handlePasswordBlur = useCallback(() => setPasswordTouched(true), [])
  const handleSignupChannelNameBlur = useCallback(() => setSignupChannelNameTouched(true), [])

  const handleTogglePassword = useCallback(() => {
    setShowPassword((prev) => !prev)
  }, [])

  const performLogin = useCallback(async () => {
    if (cookieConsent === 'accepted') {
      if (rememberMe) {
        document.cookie = `${COOKIE_USERNAME}=${encodeURIComponent(username)}; max-age=${COOKIE_MAX_AGE}; path=/; SameSite=Strict`
      } else {
        document.cookie = `${COOKIE_USERNAME}=; max-age=0; path=/`
      }
    }
    if (isMsalUser(username)) {
      await msalRedirect(from)
      return
    }
    setIsSubmitting(true)
    try {
      const res = await loginWithJanya(username, password)
      setTenants(res.data.tenants)
      setStep('org-channel')
    } catch (err) {
      const msg = isAxiosError(err)
        ? ((err.response?.data?.Message as string | undefined) ??
          'Authentication failed. Please check your credentials.')
        : 'An unexpected error occurred. Please try again.'
      setAuthError(msg)
      setAuthErrorOpen(true)
    } finally {
      setIsSubmitting(false)
    }
  }, [cookieConsent, from, password, rememberMe, username])

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      await performLogin()
    },
    [performLogin],
  )

  const handleTenantChange = useCallback((tid: number) => {
    setSelectedTenantId(tid)
    setSelectedChannelId(null)
  }, [])

  const handleChannelChange = useCallback((cid: number) => {
    setSelectedChannelId(cid)
  }, [])

  const performMsalSignIn = useCallback(async () => {
    removeStorage('pcr_msal_cleared', 'session')
    try {
      await msalRedirect(from)
    } catch {
      setAuthError('Failed to initiate Microsoft sign in. Please try again.')
      setAuthErrorOpen(true)
    }
  }, [from])

  const handleMsalSignIn = useCallback(async () => {
    await performMsalSignIn()
  }, [performMsalSignIn])


  const handleContinue = useCallback(() => {
    if (selectedTenantId === null || selectedChannelId === null) return
    const channel = availableChannels.find(c => c.id === selectedChannelId)
    if (!channel) return
    setWorkspace(selectedTenantId, channel)
    navigate(from, { replace: true })
  }, [from, navigate, selectedChannelId, selectedTenantId, availableChannels])

  // Auto-select when only one option exists
  useEffect(() => {
    if (tenants.length === 1) setSelectedTenantId(tenants[0].tid)
  }, [tenants])

  useEffect(() => {
    if (availableChannels.length === 1) setSelectedChannelId(availableChannels[0].id)
  }, [availableChannels])

  const handleBack = useCallback(() => {
    setStorage('pcr_msal_cleared', true, 'session')
    setStep('credentials')
    setTenants([])
    setSelectedTenantId(null)
    setSelectedChannelId(null)
    setIsCaptchaVerified(false)
    setPendingAction(null)
  }, [])

  const handleToggleSignupPassword = useCallback(() => setShowSignupPassword((p) => !p), [])
  const handleToggleSignupConfirmPassword = useCallback(
    () => setShowSignupConfirmPassword((p) => !p),
    [],
  )

  const handleSignupBack = useCallback(() => {
    setStep('credentials')
    setSignupSubStep('form')
    setIsVerifyExisting(false)
    setIsResendingCode(false)
    setIsCodeSent(false)
    setIsCaptchaVerified(false)
    setPendingAction(null)
    setSignupApprovalStatus(null)
    setSignupCountryCode('1')
    setSignupFirstNameTouched(false)
    setSignupLastNameTouched(false)
    setSignupPhoneTouched(false)
  }, [])

  const performSignup = useCallback(async () => {
    setIsSignupSubmitting(true)
    try {
      await registerUser({
        email: signupEmail,
        firstName: signupFirstName,
        lastName: signupLastName,
        channelName: signupChannelName,
        phoneNumber: signupPhone,
        passwordHash: signupPassword,
        countryCode: signupCountryCode,
      })
      setSignupSubStep('code')
    } catch (err) {
      const msg = isAxiosError(err)
        ? ((err.response?.data?.Message as string | undefined) ?? 'Signup failed. Please try again.')
        : 'An unexpected error occurred. Please try again.'
      setAuthError(msg)
      setAuthErrorOpen(true)
    } finally {
      setIsSignupSubmitting(false)
    }
  }, [signupEmail, signupFirstName, signupLastName, signupChannelName, signupPhone, signupPassword])

  const handleSignupSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    await performSignup()
  }, [performSignup])

  const handleVerifySubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault()
    setIsVerifySubmitting(true)
    try {
      await verifyEmail(signupEmail, signupVerifyCode)
      // Check approval status after verification
      const status = await checkEmail(signupEmail)
      setSignupApprovalStatus(status.signupStatus as 'approved' | 'pending' | 'rejected' || 'pending')
      setSignupSubStep('success')
    } catch (err) {
      const msg = isAxiosError(err)
        ? ((err.response?.data?.Message as string | undefined) ?? 'Invalid code. Please try again.')
        : 'An unexpected error occurred. Please try again.'
      setAuthError(msg)
      setAuthErrorOpen(true)
    } finally {
      setIsVerifySubmitting(false)
    }
  }, [signupEmail, signupVerifyCode])

  const handleVerifyExistingClick = useCallback(() => {
    setIsVerifyExisting(true)
    setSignupEmail('')
    setSignupEmailTouched(false)
    setSignupVerifyCode('')
    setSignupVerifyCodeTouched(false)
    setIsCodeSent(false)
    setSignupSubStep('code')
    setSignupApprovalStatus(null)
  }, [])

  const handleSendVerificationCode = useCallback(async () => {
    setIsResendingCode(true)
    try {
      await resendVerificationCode(signupEmail)
      setIsCodeSent(true)
    } catch (err) {
      const msg = isAxiosError(err)
        ? ((err.response?.data?.Message as string | undefined) ?? 'Failed to send code. Please try again.')
        : 'An unexpected error occurred. Please try again.'
      setAuthError(msg)
      setAuthErrorOpen(true)
    } finally {
      setIsResendingCode(false)
    }
  }, [signupEmail])

  const handleSignupEmailBlur = useCallback(async () => {
    setSignupEmailTouched(true)
    if (!signupEmail || signupEmailError) return
    setIsSignupEmailChecking(true)
    try {
      const result = await checkEmail(signupEmail)
      setSignupEmailCheckResult(result)
    } catch {
      // silent fail — don't block signup on network error
    } finally {
      setIsSignupEmailChecking(false)
    }
  }, [signupEmail, signupEmailError])

  // Execute pending action after CAPTCHA verification
  useEffect(() => {
    if (!isCaptchaVerified || !pendingAction) return
    const executePendingAction = async () => {
      switch (pendingAction) {
        case 'login':
          await performLogin()
          break
        case 'msal':
          await performMsalSignIn()
          break
        case 'signup':
          await performSignup()
          break
      }
      setPendingAction(null)
    }
    executePendingAction()
  }, [isCaptchaVerified, pendingAction, performLogin, performMsalSignIn, performSignup])

  return (
    <>
      {/* ── Cookie consent dialog ──────────────────────────────────── */}
      <RadixDialog.Root open={consentOpen}>
        <RadixDialog.Portal>
          <RadixDialog.Overlay className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm data-[state=open]:animate-in data-[state=open]:fade-in-0" />
          <RadixDialog.Content
            onInteractOutside={(e) => e.preventDefault()}
            onEscapeKeyDown={(e) => e.preventDefault()}
            className={cn(
              'fixed left-1/2 top-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2',
              'bg-secondary-bg border border-white/8 rounded-xl shadow-2xl p-6',
              'data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95',
              'data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]',
              'duration-200',
            )}
          >
            {/* Icon */}
            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-white/4 border border-white/7">
              <Cookie size={18} className="text-white/50" />
            </div>

            <RadixDialog.Title className="text-base font-semibold text-white">
              This site uses cookies
            </RadixDialog.Title>
            <RadixDialog.Description className="mt-1.5 text-sm text-white/40 leading-relaxed">
              We use cookies to keep you signed in and improve your experience.
            </RadixDialog.Description>

            {/* Cookie details */}
            <div className="mt-4 space-y-2.5">
              <div className="flex items-start gap-3 rounded-lg bg-white/3 border border-white/6 px-3.5 py-3">
                <ShieldCheck size={14} className="mt-0.5 shrink-0 text-emerald-400/70" />
                <div>
                  <p className="text-[12px] font-medium text-white/70">Essential</p>
                  <p className="text-[11px] text-white/35 mt-0.5">
                    Required for the app to function. Always active.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-lg bg-white/3 border border-white/6 px-3.5 py-3">
                <Cookie size={14} className="mt-0.5 shrink-0 text-cyan-400/60" />
                <div>
                  <p className="text-[12px] font-medium text-white/70">Preference</p>
                  <p className="text-[11px] text-white/35 mt-0.5">
                    Remembers your username for faster sign-in.
                  </p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="mt-5 flex flex-col gap-2">
              <button
                onClick={() => handleConsent('accepted')}
                className="w-full rounded-lg bg-[#3031cb] hover:bg-[#2626a8] py-2.5 text-sm font-semibold text-white transition-colors cursor-pointer"
              >
                Accept All
              </button>
              <button
                onClick={() => handleConsent('essential')}
                className="w-full rounded-lg bg-white/4 hover:bg-white/7 border border-white/8 py-2.5 text-sm text-white/55 hover:text-white/80 transition-colors cursor-pointer"
              >
                Essential Only
              </button>
            </div>
          </RadixDialog.Content>
        </RadixDialog.Portal>
      </RadixDialog.Root>

      {/* ── Page ──────────────────────────────────────────────────── */}
      <div className="w-full h-[100dvh] flex flex-col relative bg-primary-bg overflow-hidden">
        {/* Cinematic full-bleed background */}
        <div className="absolute inset-0 z-0 pointer-events-none bg-primary-bg">
          {/* Subtle magenta radial glow on the left/center */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ background: 'radial-gradient(ellipse 70% 50% at 30% 40%, rgba(211,0,234,0.06) 0%, transparent 60%)' }}
          />
          
          {/* Subtle blue radial glow on the right/bottom */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ background: 'radial-gradient(ellipse 60% 60% at 80% 80%, rgba(48,49,203,0.06) 0%, transparent 60%)' }}
          />
          
          {/* Subtle grid texture */}
          <div
            className="absolute inset-0 pointer-events-none opacity-[0.04]"
            style={{
              backgroundImage: 'linear-gradient(#000 1px, transparent 1px), linear-gradient(90deg, #000 1px, transparent 1px)',
              backgroundSize: '52px 52px',
            }}
          />
        </div>

        {/* Two-column exact full-bleed split layout container */}
        <div className="relative z-10 w-full flex-1 flex flex-col lg:flex-row">
          
          {/* Left: Value Prop (50vw) */}
          <div className="hidden lg:flex w-full lg:w-1/2 items-center justify-center px-6 lg:px-12 py-12">
            <div className="flex flex-col w-full max-w-[550px]">
            {/* Logo */}
            <div className="flex items-center gap-3 mb-10">
              <img src="/CloudReel.png" alt="CloudReel" className="h-8 w-auto" />
            </div>

            {/* Live badge */}
            <div className="mb-5 inline-flex w-fit items-center gap-2 rounded-full border border-active-accent/20 bg-active-accent/5 px-3 py-1 shadow-sm">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-active-accent" />
              <span className="text-[10.5px] font-semibold tracking-wider text-active-accent">LIVE BROADCASTING</span>
            </div>

            {/* Headline */}
            <h1 className="mb-3.5 text-[2.4rem] font-bold leading-[1.15] tracking-tight text-primary-text drop-shadow-sm">
              Studio-grade production,<br />
              <span className="text-secondary-text">live from the cloud.</span>
            </h1>

            {/* Sub text */}
            <p className="mb-9 max-w-sm text-[0.95rem] leading-relaxed text-secondary-text">
              Launch 24×7 linear channels, invite guests from anywhere, and broadcast in HD across every platform — no heavy infrastructure needed.
            </p>

            {/* Feature cards (upgraded to glassmorphism) */}
            <div className="flex flex-col gap-3">
              {[
                {
                  icon: <Globe size={16} className="text-[#d300ea]" />,
                  title: 'Broadcast in HD to Multiple Destinations',
                  desc: 'RTMP, RTP, HLS, SRT, ZIXI & RTSP — stream to social, OTT, and TV platforms simultaneously.',
                },
                {
                  icon: <Users size={16} className="text-[#d300ea]" />,
                  title: 'Invite Up to 6 Remote Guests',
                  desc: 'Multi-camera inputs via RTMP, WebRTC, NDI & HLS. Control audio & video per guest.',
                },
                {
                  icon: <Monitor size={16} className="text-[#d300ea]" />,
                  title: 'Switch, Preview & Publish Live Feeds',
                  desc: 'Run real-time polls, insert graphic overlays, and publish to Facebook & YouTube in one click.',
                },
              ].map((f) => (
                <div
                  key={f.title}
                  className="flex items-start gap-4 rounded-xl border border-primary-border bg-white shadow-sm px-4 py-4 transition-all hover:bg-secondary-bg hover:shadow"
                >
                  <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-secondary-bg border border-primary-border">
                    {f.icon}
                  </div>
                  <div>
                    <p className="text-[0.85rem] font-semibold text-primary-text">{f.title}</p>
                    <p className="mt-1 text-[0.75rem] leading-relaxed text-secondary-text">{f.desc}</p>
                  </div>
                </div>
              ))}
              </div>
            </div>
          </div>

          {/* Right: The Form Card (50vw) */}
          <div className="flex w-full lg:w-1/2 items-center justify-center px-6 lg:px-12 py-12">
            <div className="w-full max-w-md shrink-0 relative">
            <div className="relative backdrop-blur-2xl bg-white border border-black/10 rounded-2xl shadow-[0_32px_80px_rgba(0,0,0,0.15)] overflow-hidden">
              {/* Shine effect across the top edge */}
              <div className="absolute top-0 inset-x-0 h-px bg-linear-to-r from-transparent via-[#d300ea]/30 to-[#3031cb]/20" />
              
              <div className="px-8 py-10 sm:px-10 sm:py-12 flex flex-col">
                {step === 'signup' && (
                  <button
                    type="button"
                    onClick={handleSignupBack}
                    className="sticky top-0 -mx-8 px-8 sm:-mx-10 sm:px-10 -my-10 sm:-my-12 pt-10 sm:pt-12 pb-6 mb-6 flex items-center gap-1.5 text-[12px] font-mono text-white/35 hover:text-white/60 transition-colors cursor-pointer backdrop-blur-xl bg-surface/90 border-b border-white/5 z-20"
                  >
                    <ArrowLeft size={13} />
                    Back to sign in
                  </button>
                )}

              {step === 'credentials' ? (
                <>
                  {/* Header */}
                  <div className="mb-10">
                    <h1 className="text-[1.55rem] font-bold text-black/90 tracking-tight">
                      Sign in to your workspace
                    </h1>
                    <p className="mt-1.5 text-[0.85rem] text-black/45">
                      Access your live production studio
                    </p>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-5" noValidate>

                    {/* Username */}
                    <div>
                      <label
                        htmlFor="username"
                        className="block text-sm font-mono font-medium text-black/50 uppercase tracking-[0.13em] mb-2"
                      >
                        Username
                      </label>
                      <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/35 pointer-events-none">
                          <Mail size={16} />
                        </span>
                        <input
                          id="username"
                          type="text"
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          onBlur={handleUsernameBlur}
                          placeholder="Enter your username"
                          autoComplete="username"
                          required
                          className={cn(
                            'w-full bg-black/4 border hover:border-black/14 focus:bg-black/5 focus:ring-1 rounded-lg pl-10 pr-4 py-3 text-base text-black/88 placeholder-black/25 outline-none transition-all duration-200',
                            usernameTouched && usernameError
                              ? 'border-red-500/50 focus:border-red-500/70 focus:ring-red-500/15'
                              : 'border-black/10 focus:border-[#3031cb]/50 focus:ring-[#3031cb]/15',
                          )}
                        />
                      </div>
                      {usernameTouched && usernameError && (
                        <p className="mt-1.5 text-sm text-red-400/90 font-mono">{usernameError}</p>
                      )}
                    </div>

                    {/* Password */}
                    <div>
                      <label
                        htmlFor="password"
                        className="block text-sm font-mono font-medium text-black/50 uppercase tracking-[0.13em] mb-2"
                      >
                        Password
                      </label>
                      <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/35 pointer-events-none">
                          <Lock size={16} />
                        </span>
                        <input
                          id="password"
                          type={showPassword ? 'text' : 'password'}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          onBlur={handlePasswordBlur}
                          placeholder="Enter your password"
                          autoComplete="current-password"
                          required
                          className={cn(
                            'w-full bg-black/4 border hover:border-black/14 focus:bg-black/5 focus:ring-1 rounded-lg pl-10 pr-11 py-3 text-base text-black/88 placeholder-black/25 outline-none transition-all duration-200',
                            passwordTouched && passwordError
                              ? 'border-red-500/50 focus:border-red-500/70 focus:ring-red-500/15'
                              : 'border-black/10 focus:border-[#3031cb]/50 focus:ring-[#3031cb]/15',
                          )}
                        />
                        <button
                          type="button"
                          onClick={handleTogglePassword}
                          aria-label={showPassword ? 'Hide password' : 'Show password'}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/35 hover:text-white/60 transition-colors cursor-pointer"
                        >
                          {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                      {passwordTouched && passwordError && (
                        <p className="mt-1.5 text-sm text-red-400/90 font-mono">{passwordError}</p>
                      )}
                    </div>

                    {/* Remember me + Forgot password */}
                    <div className="flex items-center justify-between -mt-1">
                      {/* Remember me — only shown when preference cookies accepted */}
                      {cookieConsent === 'accepted' ? (
                        <label className="flex items-center gap-2 cursor-pointer select-none group">
                          <input
                            type="checkbox"
                            checked={rememberMe}
                            onChange={(e) => setRememberMe(e.target.checked)}
                            className="w-4 h-4 rounded-sm border-black/20 bg-black/5 accent-[#3031cb] cursor-pointer"
                          />
                          <span className="text-sm font-mono text-black/55 group-hover:text-black/75 transition-colors">
                            Remember me
                          </span>
                        </label>
                      ) : (
                        <span />
                      )}
                      <button
                        type="button"
                        className="text-sm font-mono text-[#3031cb]/80 hover:text-[#3031cb] transition-colors cursor-pointer"
                      >
                        Forgot password?
                      </button>
                    </div>


                    <button
                      type="submit"
                      disabled={isSubmitting || !isFormValid}
                      className={cn(
                        'w-full flex items-center justify-center gap-2 bg-gradient-to-r from-[#d300ea] to-[#3031cb] text-white font-semibold text-base rounded-lg py-3 transition-all duration-200 group cursor-pointer',
                        isSubmitting || !isFormValid
                          ? 'opacity-40 cursor-not-allowed'
                          : 'hover:bg-[#2626a8] active:scale-[0.99]',
                      )}
                    >
                      {isSubmitting ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        <>
                          Sign in
                          <ChevronRight
                            size={16}
                            className="transition-transform duration-150 group-hover:translate-x-0.5"
                          />
                        </>
                      )}
                    </button>
                  </form>

                  {/* Divider */}
                  <div className="flex items-center gap-3 my-6">
                    <div className="flex-1 h-px bg-white/6" />
                    <span className="text-[11px] text-black/30 font-mono select-none">OR</span>
                    <div className="flex-1 h-px bg-black/8" />
                  </div>

                  {/* Microsoft SSO */}
                  <button
                    type="button"
                    onClick={handleMsalSignIn}
                    className="w-full flex items-center justify-center gap-3 border text-sm rounded-lg py-2.75 transition-all duration-200 active:scale-[0.99] bg-white border-black/10 hover:border-black/20 text-black/60 hover:text-black/90 cursor-pointer"
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 21 21"
                      xmlns="http://www.w3.org/2000/svg"
                      aria-hidden="true"
                    >
                      <rect x="1" y="1" width="9" height="9" fill="#F25022" />
                      <rect x="11" y="1" width="9" height="9" fill="#7FBA00" />
                      <rect x="1" y="11" width="9" height="9" fill="#00A4EF" />
                      <rect x="11" y="11" width="9" height="9" fill="#FFB900" />
                    </svg>
                    Sign in with Microsoft
                  </button>

                  {/* Sign up CTA */}
                  <p className="mt-6 text-center text-[12px] font-mono text-white/25">
                    Don&apos;t have an account?{' '}
                    <button
                      type="button"
                      onClick={() => setStep('signup')}
                      className="text-cyan-400/60 hover:text-cyan-400 transition-colors cursor-pointer"
                    >
                      Create one
                    </button>
                  </p>
                </>
              ) : step === 'signup' ? (
                <>
                  {signupSubStep === 'success' ? (
                    /* ── Success state ── */
                    <div className="flex flex-col items-center text-center py-4">
                      {signupApprovalStatus === 'approved' ? (
                        <>
                          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 border border-emerald-500/20 mb-5">
                            <CheckCircle size={22} className="text-emerald-400" />
                          </div>
                          <h1 className="text-[1.6rem] font-semibold text-white tracking-tight">
                            Account created
                          </h1>
                          <p className="mt-2 text-sm text-white/40 leading-relaxed max-w-xs">
                            Your account has been created successfully. Sign in to get started.
                          </p>
                          <button
                            id="signup-btn-signin"
                            type="button"
                            onClick={handleSignupBack}
                            className="mt-8 w-full flex items-center justify-center gap-2 bg-gradient-to-r from-[#d300ea] to-[#3031cb] hover:opacity-90 text-white font-semibold text-sm rounded-lg py-2.75 transition-all duration-200 group cursor-pointer active:scale-[0.99]"
                          >
                            Sign in
                            <ChevronRight
                              size={14}
                              className="transition-transform duration-150 group-hover:translate-x-0.5"
                            />
                          </button>
                        </>
                      ) : signupApprovalStatus === 'pending' ? (
                        <>
                          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/10 border border-amber-500/20 mb-5">
                            <Mail size={22} className="text-amber-400" />
                          </div>
                          <h1 className="text-[1.6rem] font-semibold text-white tracking-tight">
                            Pending approval
                          </h1>
                          <p className="mt-2 text-sm text-white/40 leading-relaxed max-w-xs">
                            Your account has been created and your email has been verified. Our team is reviewing your application and will contact you soon.
                          </p>
                        </>
                      ) : signupApprovalStatus === 'rejected' ? (
                        <>
                          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10 border border-red-500/20 mb-5">
                            <Mail size={22} className="text-red-400" />
                          </div>
                          <h1 className="text-[1.6rem] font-semibold text-white tracking-tight">
                            Application rejected
                          </h1>
                          <p className="mt-2 text-sm text-white/40 leading-relaxed max-w-xs">
                            Unfortunately, your application could not be approved at this time. Please contact support for more information.
                          </p>
                          <button
                            id="signup-btn-back-signin"
                            type="button"
                            onClick={handleSignupBack}
                            className="mt-8 w-full flex items-center justify-center gap-2 bg-white/10 hover:bg-white/15 text-white font-semibold text-sm rounded-lg py-2.75 transition-all duration-200 group cursor-pointer active:scale-[0.99]"
                          >
                            <ArrowLeft size={14} />
                            Back to sign in
                          </button>
                        </>
                      ) : (
                        <>
                          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 border border-emerald-500/20 mb-5">
                            <CheckCircle size={22} className="text-emerald-400" />
                          </div>
                          <h1 className="text-[1.6rem] font-semibold text-white tracking-tight">
                            Account created
                          </h1>
                          <p className="mt-2 text-sm text-white/40 leading-relaxed max-w-xs">
                            Your account has been created successfully. Sign in to get started.
                          </p>
                          <button
                            id="signup-btn-signin"
                            type="button"
                            onClick={handleSignupBack}
                            className="mt-8 w-full flex items-center justify-center gap-2 bg-[#3031cb] hover:bg-[#2626a8] text-white font-semibold text-sm rounded-lg py-2.75 transition-all duration-200 group cursor-pointer active:scale-[0.99]"
                          >
                            Sign in
                            <ChevronRight
                              size={14}
                              className="transition-transform duration-150 group-hover:translate-x-0.5"
                            />
                          </button>
                        </>
                      )}
                    </div>
                  ) : signupSubStep === 'code' ? (
                    /* ── Email verification ── */
                    <>
                      <div className="mb-8">
                        <div className="mb-8">
                          <img src="/CloudReel-white.png" alt="CloudReel" className="h-8 w-auto" />
                        </div>
                        <h1 className="text-[1.6rem] font-semibold text-white tracking-tight">
                          {isVerifyExisting ? 'Verify your email' : 'Check your email'}
                        </h1>
                        <p className="mt-1.5 text-sm text-white/35">
                          {isVerifyExisting
                            ? 'Enter your email and request a code'
                            : <>Enter the 6-digit code sent to <strong className="text-white/65">{signupEmail}</strong></>}
                        </p>
                      </div>

                      <form onSubmit={handleVerifySubmit} className="space-y-4" noValidate>
                        {isVerifyExisting && (
                          <>
                            {/* Email input */}
                            <div>
                              <label
                                htmlFor="verify-existing-email"
                                className="block text-sm font-mono font-medium text-white/55 uppercase tracking-[0.13em] mb-2"
                              >
                                Email
                              </label>
                              <div className="relative">
                                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/35 pointer-events-none">
                                  <Mail size={16} />
                                </span>
                                <input
                                  id="verify-existing-email"
                                  type="email"
                                  value={signupEmail}
                                  onChange={(e) => {
                                    setSignupEmail(e.target.value)
                                    setIsCodeSent(false)
                                  }}
                                  onBlur={() => setSignupEmailTouched(true)}
                                  placeholder="you@example.com"
                                  autoComplete="email"
                                  required
                                  className={cn(
                                    'w-full bg-white/3 border hover:border-white/12 focus:bg-white/5 focus:ring-1 rounded-lg pl-10 pr-4 py-3 text-base text-white placeholder-white/20 outline-none transition-all duration-200',
                                    signupEmailTouched && signupEmailError
                                      ? 'border-red-500/50 focus:border-red-500/70 focus:ring-red-500/15'
                                      : 'border-white/8 focus:border-cyan-400/50 focus:ring-cyan-400/15',
                                  )}
                                />
                              </div>
                              {signupEmailTouched && signupEmailError && (
                                <p className="mt-1.5 text-sm text-red-400/90 font-mono">
                                  {signupEmailError}
                                </p>
                              )}
                            </div>

                            {/* Send Code button */}
                            <button
                              id="verify-existing-btn-send-code"
                              type="button"
                              disabled={signupEmailError !== null || isResendingCode}
                              onClick={handleSendVerificationCode}
                              className={cn(
                                'w-full flex items-center justify-center gap-2 bg-[#3031cb] text-white font-semibold text-base rounded-lg py-3 transition-all duration-200 group cursor-pointer',
                                signupEmailError !== null || isResendingCode
                                  ? 'opacity-40 cursor-not-allowed'
                                  : 'hover:bg-[#2626a8] active:scale-[0.99]',
                              )}
                            >
                              {isResendingCode ? (
                                <Loader2 size={16} className="animate-spin" />
                              ) : (
                                <>
                                  Send Code
                                  <ChevronRight
                                    size={16}
                                    className="transition-transform duration-150 group-hover:translate-x-0.5"
                                  />
                                </>
                              )}
                            </button>

                            {/* Confirmation */}
                            {isCodeSent && (
                              <p
                                id="verify-existing-code-sent-msg"
                                className="text-sm text-emerald-400/80 font-mono text-center"
                              >
                                Code sent to {signupEmail}
                              </p>
                            )}
                          </>
                        )}

                        <div>
                          <label
                            htmlFor="signup-verify-code"
                            className="block text-sm font-mono font-medium text-white/55 uppercase tracking-[0.13em] mb-2"
                          >
                            Verification Code
                          </label>
                          <input
                            id="signup-verify-code"
                            type="text"
                            inputMode="numeric"
                            maxLength={6}
                            value={signupVerifyCode}
                            onChange={(e) => setSignupVerifyCode(e.target.value.replace(/\D/g, ''))}
                            onBlur={() => setSignupVerifyCodeTouched(true)}
                            placeholder="000000"
                            required
                            className={cn(
                              'w-full bg-white/3 border hover:border-white/12 focus:bg-white/5 focus:ring-1 rounded-lg px-3.5 py-3 text-white placeholder-white/20 outline-none transition-all duration-200 text-center tracking-widest text-lg font-mono',
                              signupVerifyCodeTouched && signupVerifyCode.length !== 6
                                ? 'border-red-500/50 focus:border-red-500/70 focus:ring-red-500/15'
                                : 'border-white/8 focus:border-cyan-400/50 focus:ring-cyan-400/15',
                            )}
                          />
                          {signupVerifyCodeTouched && signupVerifyCode.length !== 6 && (
                            <p className="mt-1.5 text-sm text-red-400/90 font-mono">
                              Enter a 6-digit code
                            </p>
                          )}
                        </div>

                        <button
                          type="submit"
                          disabled={signupVerifyCode.length !== 6 || isVerifySubmitting}
                          className={cn(
                            'w-full flex items-center justify-center gap-2 bg-[#3031cb] text-white font-semibold text-base rounded-lg py-3 transition-all duration-200 group cursor-pointer',
                            signupVerifyCode.length !== 6 || isVerifySubmitting
                              ? 'opacity-40 cursor-not-allowed'
                              : 'hover:bg-[#2626a8] active:scale-[0.99]',
                          )}
                        >
                          {isVerifySubmitting ? (
                            <Loader2 size={16} className="animate-spin" />
                          ) : (
                            <>
                              Verify email
                              <ChevronRight
                                size={16}
                                className="transition-transform duration-150 group-hover:translate-x-0.5"
                              />
                            </>
                          )}
                        </button>
                      </form>

                      <button
                        type="button"
                        onClick={() => {
                          setSignupSubStep('form')
                          setIsVerifyExisting(false)
                          setIsCodeSent(false)
                        }}
                        className="mt-4 w-full text-center text-sm font-mono text-white/35 hover:text-white/60 transition-colors cursor-pointer"
                      >
                        Back to form
                      </button>
                    </>
                  ) : (
                    /* ── Signup form ── */
                    <>
                      <div className="mb-8">
                        <div className="mb-8">
                          <img src="/CloudReel-white.png" alt="CloudReel" className="h-8 w-auto" />
                        </div>
                        <h1 className="text-[1.6rem] font-semibold text-white tracking-tight">
                          Create account
                        </h1>
                        <p className="mt-1.5 text-sm text-white/35">
                          Join Janya Cloud Producer
                        </p>
                        <p className="mt-3 text-[12px] font-mono text-white/25">
                          Already signed up?{' '}
                          <button
                            id="signup-btn-verify-existing"
                            type="button"
                            onClick={handleVerifyExistingClick}
                            className="text-cyan-400/60 hover:text-cyan-400 transition-colors cursor-pointer"
                          >
                            Verify your email
                          </button>
                        </p>
                      </div>

                      <form onSubmit={handleSignupSubmit} className="space-y-4" noValidate>

                        {/* First Name + Last Name */}
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label
                              htmlFor="signup-firstname"
                              className="block text-sm font-mono font-medium text-white/55 uppercase tracking-[0.13em] mb-2"
                            >
                              First Name <span className="text-red-500">*</span>
                            </label>
                            <input
                              id="signup-firstname"
                              type="text"
                              value={signupFirstName}
                              onChange={(e) => setSignupFirstName(e.target.value)}
                              onBlur={() => setSignupFirstNameTouched(true)}
                              placeholder="First"
                              autoComplete="given-name"
                              required
                              className={cn(
                                'w-full bg-white/3 border hover:border-white/12 focus:bg-white/5 focus:ring-1 rounded-lg px-3.5 py-3 text-base text-white placeholder-white/20 outline-none transition-all duration-200',
                                signupFirstNameTouched && signupFirstNameError
                                  ? 'border-red-500/50 focus:border-red-500/70 focus:ring-red-500/15'
                                  : 'border-white/8 focus:border-cyan-400/50 focus:ring-cyan-400/15',
                              )}
                            />
                            {signupFirstNameTouched && signupFirstNameError && (
                              <p className="mt-1.5 text-sm text-red-400/90 font-mono">
                                {signupFirstNameError}
                              </p>
                            )}
                          </div>
                          <div>
                            <label
                              htmlFor="signup-lastname"
                              className="block text-sm font-mono font-medium text-white/55 uppercase tracking-[0.13em] mb-2"
                            >
                              Last Name
                            </label>
                            <input
                              id="signup-lastname"
                              type="text"
                              value={signupLastName}
                              onChange={(e) => setSignupLastName(e.target.value)}
                              onBlur={() => setSignupLastNameTouched(true)}
                              placeholder="Last (Optional)"
                              autoComplete="family-name"
                              className={cn(
                                'w-full bg-white/3 border hover:border-white/12 focus:bg-white/5 focus:ring-1 rounded-lg px-3.5 py-3 text-base text-white placeholder-white/20 outline-none transition-all duration-200',
                                signupLastNameTouched && signupLastNameError
                                  ? 'border-red-500/50 focus:border-red-500/70 focus:ring-red-500/15'
                                  : 'border-white/8 focus:border-cyan-400/50 focus:ring-cyan-400/15',
                              )}
                            />
                            {signupLastNameTouched && signupLastNameError && (
                              <p className="mt-1.5 text-sm text-red-400/90 font-mono">
                                {signupLastNameError}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Email */}
                        <div>
                          <label
                            htmlFor="signup-email"
                            className="block text-sm font-mono font-medium text-white/55 uppercase tracking-[0.13em] mb-2"
                          >
                            Email <span className="text-red-500">*</span>
                          </label>
                          <div className="relative">
                            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/35 pointer-events-none">
                              <Mail size={16} />
                            </span>
                            <input
                              id="signup-email"
                              type="email"
                              value={signupEmail}
                              onChange={(e) => {
                                setSignupEmail(e.target.value)
                                setSignupEmailCheckResult(null)
                              }}
                              onBlur={handleSignupEmailBlur}
                              placeholder="you@example.com"
                              autoComplete="email"
                              required
                              className={cn(
                                'w-full bg-white/3 border hover:border-white/12 focus:bg-white/5 focus:ring-1 rounded-lg pl-10 pr-4 py-3 text-base text-white placeholder-white/20 outline-none transition-all duration-200',
                                signupEmailTouched && signupEmailError
                                  ? 'border-red-500/50 focus:border-red-500/70 focus:ring-red-500/15'
                                  : 'border-white/8 focus:border-cyan-400/50 focus:ring-cyan-400/15',
                              )}
                            />
                          </div>
                          {signupEmailTouched && signupEmailError && (
                            <p className="mt-1.5 text-sm text-red-400/90 font-mono">
                              {signupEmailError}
                            </p>
                          )}

                          {/* Email check status */}
                          {isSignupEmailChecking && (
                            <p id="signup-email-checking-msg" className="mt-1.5 flex items-center gap-1.5 text-sm text-white/35 font-mono">
                              <Loader2 size={13} className="animate-spin" /> Checking...
                            </p>
                          )}

                          {!isSignupEmailChecking && signupEmailCheckResult?.exists && (() => {
                            const { emailVerified, signupStatus } = signupEmailCheckResult

                            // Not verified — show verify link
                            if (!emailVerified) {
                              return (
                                <p id="signup-email-status-unverified" className="mt-1.5 text-sm text-amber-400/80 font-mono">
                                  Email registered but not verified.{' '}
                                  <button
                                    id="signup-email-btn-verify-now"
                                    type="button"
                                    onClick={() => {
                                      setSignupEmail(signupEmail)
                                      handleVerifyExistingClick()
                                    }}
                                    className="underline text-cyan-400/70 hover:text-cyan-400 cursor-pointer"
                                  >
                                    Verify here
                                  </button>
                                </p>
                              )
                            }

                            // Verified — show status-specific message
                            const statusMessages: Record<string, string> = {
                              pending: 'Email already registered. Awaiting admin approval.',
                              approved: 'Email already registered. Please sign in.',
                              rejected: 'Email already registered. Your application was rejected.',
                            }
                            return (
                              <p id="signup-email-status-exists" className="mt-1.5 text-sm text-red-400/90 font-mono">
                                {statusMessages[signupStatus ?? 'pending'] ?? 'Email already registered.'}
                              </p>
                            )
                          })()}
                        </div>

                        {/* Phone */}
                        <div>
                          <label
                            htmlFor="signup-country-code"
                            className="block text-sm font-mono font-medium text-white/55 uppercase tracking-[0.13em] mb-2"
                          >
                            Phone Number <span className="text-red-500">*</span>
                          </label>
                          <div className="flex gap-2 items-stretch">
                            {/* Country Code Dropdown */}
                            <div className="relative">
                              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-white/35 text-base pointer-events-none">
                                +
                              </span>
                              <select
                                id="signup-country-code"
                                value={signupCountryCode}
                                onChange={(e) => setSignupCountryCode(e.target.value)}
                                onBlur={() => setSignupPhoneTouched(true)}
                                required
                                className={cn(
                                  'w-24 bg-white/3 border hover:border-white/12 focus:bg-white/5 focus:ring-1 rounded-lg pl-7 pr-2 py-3 text-base text-white outline-none transition-all duration-200 cursor-pointer appearance-none',
                                  signupPhoneTouched && signupCountryCodeError
                                    ? 'border-red-500/50 focus:border-red-500/70 focus:ring-red-500/15'
                                    : 'border-white/8 focus:border-cyan-400/50 focus:ring-cyan-400/15',
                                )}
                              >
                                {COUNTRY_CODES.map((item) => (
                                  <option key={item.countryCode} value={item.mobileCode} className="bg-slate-900">
                                    {item.mobileCode}
                                  </option>
                                ))}
                              </select>
                            </div>

                            {/* Phone Input */}
                            <div className="relative flex-1">
                              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/35 pointer-events-none">
                                <Phone size={16} />
                              </span>
                              <input
                                id="signup-phone"
                                type="tel"
                                value={signupPhone}
                                onChange={(e) => setSignupPhone(e.target.value)}
                                onBlur={() => setSignupPhoneTouched(true)}
                                placeholder="234 567 8900"
                                autoComplete="tel"
                                required
                                className={cn(
                                  'w-full bg-white/3 border hover:border-white/12 focus:bg-white/5 focus:ring-1 rounded-lg pl-10 pr-4 py-3 text-base text-white placeholder-white/20 outline-none transition-all duration-200',
                                  signupPhoneTouched && signupPhoneError
                                    ? 'border-red-500/50 focus:border-red-500/70 focus:ring-red-500/15'
                                    : 'border-white/8 focus:border-cyan-400/50 focus:ring-cyan-400/15',
                                )}
                              />
                            </div>
                          </div>
                          {signupPhoneTouched && (signupCountryCodeError || signupPhoneError) && (
                            <p className="mt-1.5 text-sm text-red-400/90 font-mono">
                              {signupCountryCodeError || signupPhoneError}
                            </p>
                          )}
                        </div>

                        {/* Channel Name */}
                        <div>
                          <label
                            htmlFor="signup-channel-name"
                            className="block text-sm font-mono font-medium text-white/55 uppercase tracking-[0.13em] mb-2"
                          >
                            Channel Name <span className="text-red-500">*</span>
                          </label>
                          <input
                            id="signup-channel-name"
                            type="text"
                            value={signupChannelName}
                            onChange={(e) => {
                              setSignupChannelName(e.target.value)
                              setSignupChannelNameEdited(true)
                            }}
                            onBlur={handleSignupChannelNameBlur}
                            placeholder="my_channel_123"
                            autoComplete="off"
                            required
                            className={cn(
                              'w-full bg-white/3 border hover:border-white/12 focus:bg-white/5 focus:ring-1 rounded-lg px-3.5 py-3 text-base text-white placeholder-white/20 outline-none transition-all duration-200',
                              signupChannelNameTouched && signupChannelNameError
                                ? 'border-red-500/50 focus:border-red-500/70 focus:ring-red-500/15'
                                : 'border-white/8 focus:border-cyan-400/50 focus:ring-cyan-400/15',
                            )}
                          />
                          {signupChannelNameTouched && signupChannelNameError && (
                            <p className="mt-1.5 text-sm text-red-400/90 font-mono">
                              {signupChannelNameError}
                            </p>
                          )}
                        </div>

                        {/* Password */}
                        <div>
                          <label
                            htmlFor="signup-password"
                            className="block text-sm font-mono font-medium text-white/55 uppercase tracking-[0.13em] mb-2"
                          >
                            Password <span className="text-red-500">*</span>
                          </label>
                          <div className="relative">
                            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/35 pointer-events-none">
                              <Lock size={16} />
                            </span>
                            <input
                              id="signup-password"
                              type={showSignupPassword ? 'text' : 'password'}
                              value={signupPassword}
                              onChange={(e) => setSignupPassword(e.target.value)}
                              onBlur={() => setSignupPasswordTouched(true)}
                              placeholder="Min. 8 characters"
                              autoComplete="new-password"
                              required
                              className={cn(
                                'w-full bg-white/3 border hover:border-white/12 focus:bg-white/5 focus:ring-1 rounded-lg pl-10 pr-11 py-3 text-base text-white placeholder-white/20 outline-none transition-all duration-200',
                                signupPasswordTouched && signupPasswordError
                                  ? 'border-red-500/50 focus:border-red-500/70 focus:ring-red-500/15'
                                  : 'border-white/8 focus:border-cyan-400/50 focus:ring-cyan-400/15',
                              )}
                            />
                            <button
                              type="button"
                              onClick={handleToggleSignupPassword}
                              aria-label={showSignupPassword ? 'Hide password' : 'Show password'}
                              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/35 hover:text-white/60 transition-colors cursor-pointer"
                            >
                              {showSignupPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                          </div>
                          {signupPasswordTouched && signupPasswordError && (
                            <p className="mt-1.5 text-sm text-red-400/90 font-mono">
                              {signupPasswordError}
                            </p>
                          )}
                        </div>

                        {/* Confirm Password */}
                        <div>
                          <label
                            htmlFor="signup-confirm-password"
                            className="block text-sm font-mono font-medium text-white/55 uppercase tracking-[0.13em] mb-2"
                          >
                            Confirm Password <span className="text-red-500">*</span>
                          </label>
                          <div className="relative">
                            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/35 pointer-events-none">
                              <Lock size={16} />
                            </span>
                            <input
                              id="signup-confirm-password"
                              type={showSignupConfirmPassword ? 'text' : 'password'}
                              value={signupConfirmPassword}
                              onChange={(e) => setSignupConfirmPassword(e.target.value)}
                              onBlur={() => setSignupConfirmPasswordTouched(true)}
                              placeholder="Re-enter password"
                              autoComplete="new-password"
                              required
                              className={cn(
                                'w-full bg-white/3 border hover:border-white/12 focus:bg-white/5 focus:ring-1 rounded-lg pl-10 pr-11 py-3 text-base text-white placeholder-white/20 outline-none transition-all duration-200',
                                signupConfirmPasswordTouched && signupConfirmPasswordError
                                  ? 'border-red-500/50 focus:border-red-500/70 focus:ring-red-500/15'
                                  : 'border-white/8 focus:border-cyan-400/50 focus:ring-cyan-400/15',
                              )}
                            />
                            <button
                              type="button"
                              onClick={handleToggleSignupConfirmPassword}
                              aria-label={showSignupConfirmPassword ? 'Hide password' : 'Show password'}
                              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/35 hover:text-white/60 transition-colors cursor-pointer"
                            >
                              {showSignupConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                          </div>
                          {signupConfirmPasswordTouched && signupConfirmPasswordError && (
                            <p className="mt-1.5 text-sm text-red-400/90 font-mono">
                              {signupConfirmPasswordError}
                            </p>
                          )}
                        </div>


                        <button
                          type="submit"
                          disabled={!isSignupFormValid || isSignupSubmitting}
                          className={cn(
                            'w-full flex items-center justify-center gap-2 bg-[#3031cb] text-white font-semibold text-base rounded-lg py-3 transition-all duration-200 group cursor-pointer',
                            !isSignupFormValid || isSignupSubmitting
                              ? 'opacity-40 cursor-not-allowed'
                              : 'hover:bg-[#2626a8] active:scale-[0.99]',
                          )}
                        >
                          {isSignupSubmitting ? (
                            <Loader2 size={16} className="animate-spin" />
                          ) : (
                            <>
                              Create account
                              <ChevronRight
                                size={16}
                                className="transition-transform duration-150 group-hover:translate-x-0.5"
                              />
                            </>
                          )}
                        </button>
                      </form>
                    </>
                  )}
                </>
              ) : (
                <>
                  {/* Back */}
                  <button
                    type="button"
                    onClick={handleBack}
                    className="flex items-center gap-1.5 text-[12px] font-mono text-white/35 hover:text-white/60 transition-colors cursor-pointer mb-8"
                  >
                    <ArrowLeft size={13} />
                    Back
                  </button>

                  {/* Heading */}
                  <div className="mb-8">
                    <h1 className="text-[1.6rem] font-semibold text-primary-text tracking-tight">
                      Select workspace
                    </h1>
                    <p className="mt-1.5 text-sm text-secondary-text">
                      Choose the organization and channel to continue.
                    </p>
                  </div>

                  {/* Selects */}
                  <div className="space-y-5">
                    <div>
                      <label
                        htmlFor="org-select"
                        className="block text-sm font-mono font-semibold text-secondary-text uppercase tracking-[0.13em] mb-2"
                      >
                        Organization
                      </label>
                      {tenants.length === 1 ? (
                        <ReadonlyField
                          label={tenants[0].tName}
                          imageUrl={tenants[0].tLogoUrl}
                          defaultIcon={<Building2 size={18} className="text-secondary-text" />}
                        />
                      ) : (
                        <ImageSelect
                          id="org-select"
                          options={tenantOptions}
                          value={selectedTenantId}
                          onChange={handleTenantChange}
                          placeholder="Select an organization"
                          defaultIcon={<Building2 size={18} className="text-secondary-text" />}
                        />
                      )}
                    </div>

                    <div>
                      <label
                        htmlFor="channel-select"
                        className="block text-sm font-mono font-semibold text-secondary-text uppercase tracking-[0.13em] mb-2"
                      >
                        Channel
                      </label>
                      {availableChannels.length === 1 ? (
                        <ReadonlyField
                          label={availableChannels[0].channelName}
                          imageUrl={availableChannels[0].icon || null}
                          defaultIcon={<Tv2 size={18} className="text-secondary-text" />}
                        />
                      ) : (
                        <ImageSelect
                          id="channel-select"
                          options={channelOptions}
                          value={selectedChannelId}
                          onChange={handleChannelChange}
                          placeholder="Select a channel"
                          disabled={selectedTenantId === null}
                          defaultIcon={<Tv2 size={18} className="text-secondary-text" />}
                        />
                      )}
                    </div>

                    {/* Continue */}
                    <button
                      type="button"
                      onClick={handleContinue}
                      disabled={!isOrgChannelValid}
                      className={cn(
                        'w-full flex items-center justify-center gap-2 bg-[#3031cb] text-white font-semibold text-base rounded-lg py-3 transition-all duration-200 group cursor-pointer',
                        !isOrgChannelValid
                          ? 'opacity-40 cursor-not-allowed'
                          : 'hover:bg-[#2626a8] active:scale-[0.99]',
                      )}
                    >
                      Continue
                      <ChevronRight
                        size={16}
                        className="transition-transform duration-150 group-hover:translate-x-0.5"
                      />
                    </button>
                  </div>
                </>
              )}

              </div>
            </div>
          </div>
          </div>

        </div>
        <Footer />
      </div>

      <Toaster
        open={authToastOpen}
        onOpenChange={setAuthToastOpen}
        title="Authentication required"
        description="Please sign in to access this page."
        variant="error"
      />

      <Toaster
        open={sessionExpiredToastOpen}
        onOpenChange={setSessionExpiredToastOpen}
        title="Session expired"
        description="You have been signed out. Please sign in again to continue."
        variant="error"
      />

      <Toaster
        open={authErrorOpen}
        onOpenChange={setAuthErrorOpen}
        title="Sign in failed"
        description={authError ?? undefined}
        variant="error"
      />
    </>
  )
}
