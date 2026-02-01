/**
 * Main Layout Component
 * Wraps all pages with header and sidebar navigation
 */

import { Outlet } from 'react-router-dom'
import { Header } from './Header'
import { Sidebar } from './Sidebar'

export function Layout() {
  return (
    <div className="flex min-h-screen min-w-0 w-full flex-col bg-background">
      <Header />
      <div className="min-h-0 flex-1 flex min-w-0 overflow-hidden">
        <Sidebar />
        {/* 8pt spacing: px-6 → md:px-8 → lg:px-10 → xl:px-12; vertical py-8 → lg:py-10/12; only main scrolls so header + sidebar stay fixed */}
        <main className="min-h-0 min-w-0 flex-1 overflow-y-auto overflow-x-hidden px-6 py-8 md:px-8 lg:ml-64 lg:px-10 lg:pt-10 lg:pb-12 xl:px-12 ml-0">
          <div className="mx-auto max-w-7xl min-w-0">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
