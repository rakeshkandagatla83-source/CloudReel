import { lazy, Suspense } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { ProtectedRoute } from './components/ProtectedRoute'
import { AdminRoute } from './components/AdminRoute'
import { getStorage } from './lib/storage'

const LoginPage = lazy(() => import('./pages/LoginPage').then(m => ({ default: m.LoginPage })))
const CallbackPage = lazy(() => import('./pages/CallbackPage').then(m => ({ default: m.CallbackPage })))
const SubscriptionPage = lazy(() => import('./pages/SubscriptionPage').then(m => ({ default: m.SubscriptionPage })))
const SubscriptionV2Page = lazy(() => import('./pages/SubscriptionV2Page').then(m => ({ default: m.SubscriptionV2Page })))
const SubscriptionV2ResultPage = lazy(() => import('./pages/SubscriptionV2ResultPage').then(m => ({ default: m.SubscriptionV2ResultPage })))
const NotFoundPage = lazy(() => import('./pages/NotFoundPage').then(m => ({ default: m.NotFoundPage })))
const AssetsPage = lazy(() => import('./pages/AssetsPage').then(m => ({ default: m.AssetsPage })))
const EventsPage = lazy(() => import('./pages/EventsPage').then(m => ({ default: m.EventsPage })))
const StudioPage = lazy(() => import('./pages/StudioPage').then(m => ({ default: m.StudioPage })))
const PublishPage = lazy(() => import('./pages/PublishPage').then(m => ({ default: m.PublishPage })))
const GfxPage = lazy(() => import('./pages/GfxPage').then(m => ({ default: m.GfxPage })))
const MultiviewerPage = lazy(() => import('./pages/MultiviewerPage').then(m => ({ default: m.MultiviewerPage })))
const LandingPage = lazy(() => import('./pages/LandingPage').then(m => ({ default: m.LandingPage })))
const LayoutBuilderPage = lazy(() => import('./pages/LayoutBuilderPage').then(m => ({ default: m.LayoutBuilderPage })))
const VideoEditorPage = lazy(() => import('./pages/VideoEditorPage').then(m => ({ default: m.VideoEditorPage })))
const SettingsPage = lazy(() => import('./pages/SettingsPage').then(m => ({ default: m.SettingsPage })))
const AdminUsersPage = lazy(() => import('./pages/AdminUsersPage').then(m => ({ default: m.AdminUsersPage })))
const AdminLayout = lazy(() => import('./components/AdminLayout').then(m => ({ default: m.AdminLayout })))
const AdminPlansPage = lazy(() => import('./pages/admin/AdminPlansPage').then(m => ({ default: m.AdminPlansPage })))
const AdminPlanEditPage = lazy(() => import('./pages/admin/AdminPlanEditPage').then(m => ({ default: m.AdminPlanEditPage })))
const AdminGatewaysPage = lazy(() => import('./pages/admin/AdminGatewaysPage').then(m => ({ default: m.AdminGatewaysPage })))
const AdminGatewayPlansPage = lazy(() => import('./pages/admin/AdminGatewayPlansPage').then(m => ({ default: m.AdminGatewayPlansPage })))

function StudioGuard() {
  const { state } = useLocation()
  return state?.fromGoLive ? <StudioPage /> : <Navigate to="/events" replace />
}

function LoginRoute() {
  const { state } = useLocation()
  const isLoggedIn = Boolean(getStorage<string>('pcr_token'))
  return isLoggedIn && !state?.msalTenants ? <Navigate to="/events" replace /> : <LoginPage />
}

export function App() {
  return (
    <Suspense fallback={
      <div id="app-suspense-fallback" className="h-screen w-screen bg-primary-bg flex items-center justify-center">
        <div className="w-6 h-6 rounded-full border-2 border-white/10 border-t-[#3031cb] animate-spin" />
      </div>
    }>
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginRoute />} />
      <Route path="/callback" element={<CallbackPage />} />

      <Route element={<ProtectedRoute />}>
        <Route path="/mam" element={<AssetsPage />} />
        <Route path="/events" element={<EventsPage />} />
        <Route path="/studio" element={<StudioGuard />} />
        <Route path="/subscription" element={<SubscriptionPage />} />
        <Route path="/subscription-v2" element={<SubscriptionV2Page />} />
        <Route path="/subscription-v2/result" element={<SubscriptionV2ResultPage />} />
        <Route path="/publish" element={<PublishPage />} />
        <Route path="/gfx" element={<GfxPage />} />
        <Route path="/multiviewer" element={<MultiviewerPage />} />
        <Route path="/layout-builder" element={<LayoutBuilderPage />} />
        <Route path="/video-editor" element={<VideoEditorPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route
          path="/admin/users"
          element={
            <AdminRoute>
              <AdminUsersPage />
            </AdminRoute>
          }
        />
      </Route>

      <Route
        path="/admin"
        element={
          <AdminRoute>
            <AdminLayout />
          </AdminRoute>
        }
      >
        <Route index element={<Navigate to="/admin/plans" replace />} />
        <Route path="plans" element={<AdminPlansPage />} />
        <Route path="plans/new" element={<AdminPlanEditPage />} />
        <Route path="plans/:id" element={<AdminPlanEditPage />} />
        <Route path="gateways" element={<AdminGatewaysPage />} />
        <Route path="gateways/:code/plans" element={<AdminGatewayPlansPage />} />
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
    </Suspense>
  )
}
