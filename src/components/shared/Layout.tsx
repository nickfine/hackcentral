/**
 * Main Layout Component
 * Wraps all pages with header and sidebar navigation
 */

import { Outlet } from 'react-router-dom'
import { Header } from './Header'
import { Sidebar } from './Sidebar'

export function Layout() {
  return (
    <div className="min-h-screen min-w-0 w-full overflow-x-hidden bg-background">
      <Header />
      <div className="flex min-w-0">
        <Sidebar />
        <main className="min-w-0 flex-1 overflow-x-hidden p-4 sm:p-6 lg:ml-64 lg:p-8 ml-0">
          <div className="mx-auto max-w-7xl min-w-0">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
