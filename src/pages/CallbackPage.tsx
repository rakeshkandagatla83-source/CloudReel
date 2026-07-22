import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Loader2, AlertCircle } from 'lucide-react'
import { isAxiosError } from 'axios'
import { handleMsalCallback } from '../lib/authService'

export function CallbackPage() {
  const navigate = useNavigate()
  const hasProcessed = useRef(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Guard against React StrictMode double-invocation in development
    if (hasProcessed.current) return
    hasProcessed.current = true

    handleMsalCallback()
      .then(({ response, fromPath }) => {
        navigate('/login', {
          state: {
            msalTenants: response.data.tenants,
            from: fromPath ? { pathname: fromPath } : undefined,
          },
          replace: true,
        })
      })
      .catch((err: unknown) => {
        const msg = isAxiosError(err)
          ? (err.response?.data?.Message as string | undefined) ??
            'Authentication failed. Please try again.'
          : 'Sign in failed. Please return to the login page and try again.'
        setError(msg)
      })
  }, [navigate])

  if (error) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-6">
        <div className="w-full max-w-sm text-center">
          <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10 border border-red-500/20">
            <AlertCircle size={20} className="text-red-500" />
          </div>
          <h1 className="text-lg font-semibold text-black/90">Sign in failed</h1>
          <p className="mt-2 text-sm text-black/50 leading-relaxed">{error}</p>
          <button
            type="button"
            onClick={() => navigate('/login', { replace: true })}
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-[#3031cb] hover:bg-[#2829b0] px-5 py-2.5 text-sm font-semibold text-white transition-colors cursor-pointer"
          >
            Back to login
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <Loader2 size={28} className="animate-spin text-black/25" />
        <p className="text-sm text-black/40 font-mono">Completing sign in…</p>
      </div>
    </div>
  )
}
