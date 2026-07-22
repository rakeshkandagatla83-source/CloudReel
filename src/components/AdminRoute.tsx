import { Navigate } from 'react-router-dom'
import { getStorage } from '../lib/storage'
import type { UserData } from '../types/user'

interface AdminRouteProps {
  children: React.ReactNode
}

export function AdminRoute({ children }: AdminRouteProps) {
  const user = getStorage<UserData>('pcr_user')

  if (!user?.isAdmin) {
    return <Navigate to="/events" replace />
  }

  return children
}
