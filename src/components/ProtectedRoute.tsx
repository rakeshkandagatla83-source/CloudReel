import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { getStorage } from '../lib/storage'
import { SubscriptionProvider } from '../features/subscription/SubscriptionContext'
import { TrialManager } from '../features/subscription/TrialManager'
import { Navbar } from './Navbar'
import { Footer } from './ui/Footer'

const STORAGE_TOKEN = 'pcr_token'

export function ProtectedRoute() {
  const location = useLocation()
  const token = getStorage<string>(STORAGE_TOKEN)

  if (!token) {
    return (
      <Navigate
        to="/login"
        state={{ from: location, authRequired: true }}
        replace
      />
    )
  }

  return (
    <div className="flex h-screen flex-col">
      <Navbar />
      <SubscriptionProvider>
        <TrialManager />
        <main className="flex-1 overflow-hidden bg-primary-bg">
          <Outlet />
        </main>
      </SubscriptionProvider>
      <Footer />
    </div>
  )
}
