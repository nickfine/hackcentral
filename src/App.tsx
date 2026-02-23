import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useSearchParams } from 'react-router-dom'
import { I18nProvider } from 'react-aria-components'
import { AuthGuard } from '@/components/auth/AuthGuard'
import { Layout } from '@/components/shared/Layout'
import '@/styles/globals.css'

const Dashboard = lazy(() => import('@/pages/Dashboard').then((m) => ({ default: m.default })))
const People = lazy(() => import('@/pages/People').then((m) => ({ default: m.default })))
const ProjectDetail = lazy(() => import('@/pages/ProjectDetail').then((m) => ({ default: m.default })))
const Profile = lazy(() => import('@/pages/Profile').then((m) => ({ default: m.default })))
const ProfileAccount = lazy(() => import('@/pages/ProfileAccount').then((m) => ({ default: m.default })))
const Search = lazy(() => import('@/pages/Search').then((m) => ({ default: m.default })))
const Onboarding = lazy(() => import('@/pages/Onboarding').then((m) => ({ default: m.default })))
const Guide = lazy(() => import('@/pages/Guide').then((m) => ({ default: m.default })))
const Notifications = lazy(() => import('@/pages/Notifications').then((m) => ({ default: m.default })))
const TeamPulse = lazy(() => import('@/pages/TeamPulse').then((m) => ({ default: m.default })))
const LibraryAssetDetail = lazy(() => import('@/pages/LibraryAssetDetail').then((m) => ({ default: m.default })))
const Hacks = lazy(() => import('@/pages/Hacks').then((m) => ({ default: m.default })))
const HackDays = lazy(() => import('@/pages/HackDays').then((m) => ({ default: m.default })))
const CreateHackDay = lazy(() => import('@/pages/CreateHackDay').then((m) => ({ default: m.default })))

/**
 * Redirect component that preserves query params and adds tab param.
 * Used to redirect /library → /hacks?tab=completed and /projects → /hacks?tab=in_progress.
 */
function RedirectToHacks({ tab }: { tab: 'completed' | 'in_progress' }) {
  const [searchParams] = useSearchParams();
  const newParams = new URLSearchParams(searchParams);
  newParams.set('tab', tab);
  return <Navigate to={`/hacks?${newParams.toString()}`} replace />;
}

function PageFallback() {
  return (
    <div className="flex items-center justify-center min-h-[200px] text-muted-foreground">
      Loading…
    </div>
  )
}

function App() {
  return (
    <I18nProvider locale={typeof navigator !== 'undefined' ? navigator.language : 'en-US'}>
      <BrowserRouter>
        <AuthGuard>
          <Routes>
            <Route path="/" element={<Layout />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route
              path="dashboard"
              element={
                <Suspense fallback={<PageFallback />}>
                  <Dashboard />
                </Suspense>
              }
            />
            <Route
              path="people"
              element={
                <Suspense fallback={<PageFallback />}>
                  <People />
                </Suspense>
              }
            />
            {/* Unified Hacks page */}
            <Route
              path="hacks"
              element={
                <Suspense fallback={<PageFallback />}>
                  <Hacks />
                </Suspense>
              }
            />
            {/* Detail routes (unchanged) */}
            <Route
              path="library/:assetId"
              element={
                <Suspense fallback={<PageFallback />}>
                  <LibraryAssetDetail />
                </Suspense>
              }
            />
            <Route
              path="projects/:projectId"
              element={
                <Suspense fallback={<PageFallback />}>
                  <ProjectDetail />
                </Suspense>
              }
            />
            {/* Redirects from old URLs to unified Hacks page */}
            <Route
              path="library"
              element={<RedirectToHacks tab="completed" />}
            />
            <Route
              path="projects"
              element={<RedirectToHacks tab="in_progress" />}
            />
            <Route
              path="profile"
              element={
                <Suspense fallback={<PageFallback />}>
                  <Profile />
                </Suspense>
              }
            />
            <Route
              path="profile/account/*"
              element={
                <Suspense fallback={<PageFallback />}>
                  <ProfileAccount />
                </Suspense>
              }
            />
            <Route
              path="search"
              element={
                <Suspense fallback={<PageFallback />}>
                  <Search />
                </Suspense>
              }
            />
            <Route
              path="onboarding"
              element={
                <Suspense fallback={<PageFallback />}>
                  <Onboarding />
                </Suspense>
              }
            />
            <Route
              path="guide"
              element={
                <Suspense fallback={<PageFallback />}>
                  <Guide />
                </Suspense>
              }
            />
            <Route
              path="notifications"
              element={
                <Suspense fallback={<PageFallback />}>
                  <Notifications />
                </Suspense>
              }
            />
            <Route
              path="team-pulse"
              element={
                <Suspense fallback={<PageFallback />}>
                  <TeamPulse />
                </Suspense>
              }
            />
            <Route
              path="hackdays"
              element={
                <Suspense fallback={<PageFallback />}>
                  <HackDays />
                </Suspense>
              }
            />
            <Route
              path="hackdays/create"
              element={
                <Suspense fallback={<PageFallback />}>
                  <CreateHackDay />
                </Suspense>
              }
            />
            {/* Catch-all route */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Route>
          </Routes>
        </AuthGuard>
      </BrowserRouter>
    </I18nProvider>
  )
}

export default App
