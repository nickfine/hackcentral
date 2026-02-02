/**
 * Main Layout Component
 * Wraps all pages with header and sidebar navigation
 */

import { Outlet } from 'react-router-dom'
import { Header } from './Header'
import { Sidebar } from './Sidebar'

export function Layout() {
  return (
    <div className="flex h-screen min-h-0 min-w-0 w-full flex-col overflow-hidden bg-background">
      <Header />
      <div className="min-h-0 flex-1 flex min-w-0 overflow-hidden">
        <Sidebar />
        {/* main extends to top so its bg flows under header; pt-14 reserves space for fixed header */}
        <main className="min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden bg-background px-6 pt-14 pb-8 md:px-8 lg:ml-64 lg:px-10 lg:pb-12 xl:px-12 ml-0">
          <div className="mx-auto max-w-7xl min-w-0">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
