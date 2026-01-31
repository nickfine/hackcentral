import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Layout } from '@/components/shared/Layout'
import { Dashboard, People, Library, Projects, Profile } from '@/pages'
import '@/styles/globals.css'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="people" element={<People />} />
          <Route path="library" element={<Library />} />
          <Route path="projects" element={<Projects />} />
          <Route path="profile" element={<Profile />} />
          {/* Catch-all route */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
