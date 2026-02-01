import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Analytics } from '@vercel/analytics/react'
import { AuthGuard } from '@/components/auth/AuthGuard'
import { Layout } from '@/components/shared/Layout'
import '@/styles/globals.css'

const Dashboard = lazy(() => import('@/pages/Dashboard').then((m) => ({ default: m.default })))
const People = lazy(() => import('@/pages/People').then((m) => ({ default: m.default })))
const Library = lazy(() => import('@/pages/Library').then((m) => ({ default: m.default })))
const Projects = lazy(() => import('@/pages/Projects').then((m) => ({ default: m.default })))
const ProjectDetail = lazy(() => import('@/pages/ProjectDetail').then((m) => ({ default: m.default })))
const Profile = lazy(() => import('@/pages/Profile').then((m) => ({ default: m.default })))
const Search = lazy(() => import('@/pages/Search').then((m) => ({ default: m.default })))
const Onboarding = lazy(() => import('@/pages/Onboarding').then((m) => ({ default: m.default })))
const Guide = lazy(() => import('@/pages/Guide').then((m) => ({ default: m.default })))
const Notifications = lazy(() => import('@/pages/Notifications').then((m) => ({ default: m.default })))

function PageFallback() {
  return (
    <div className="flex items-center justify-center min-h-[200px] text-muted-foreground">
      Loading…
    </div>
  )
}

function App() {
  return (
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
            <Route
              path="library"
              element={
                <Suspense fallback={<PageFallback />}>
                  <Library />
                </Suspense>
              }
            />
            <Route
              path="projects"
              element={
                <Suspense fallback={<PageFallback />}>
                  <Projects />
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
            <Route
              path="profile"
              element={
                <Suspense fallback={<PageFallback />}>
                  <Profile />
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
            {/* Catch-all route */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Route>
        </Routes>
      </AuthGuard>
      <Analytics />
    </BrowserRouter>
  )
}

export default App
