import { useCallback, useState } from 'react'
import { postCheckout } from '../../lib/subscriptionV2Api'

interface UseCheckoutResult {
  isLoading: boolean
  error: string | null
  initiate: (subscriptionPlanId: number, mappingId: number) => Promise<void>
}

export function useCheckout(): UseCheckoutResult {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const initiate = useCallback(async (subscriptionPlanId: number, mappingId: number) => {
    setIsLoading(true)
    setError(null)
    try {
      const returnUrl = `${window.location.origin}/subscription-v2/result`
      const res = await postCheckout({ subscriptionPlanId, mappingId, redirectUrl: returnUrl })

      if (res.code !== 1) throw new Error(res.Message || 'Failed to start checkout')
      if (!res.data) throw new Error('Checkout session missing in response')

      const { redirectUrl } = res.data
      if (!redirectUrl) {
        throw new Error('Gateway did not return a redirect URL')
      }
      window.location.href = redirectUrl
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start checkout')
      setIsLoading(false)
    }
  }, [])

  return { isLoading, error, initiate }
}
