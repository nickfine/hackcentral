/**
 * Header Component
 * Top navigation bar with search, notifications, and user menu
 */

import { Link } from 'react-router-dom'
import { Search, Bell, Menu, Sparkles } from 'lucide-react'
import { useState } from 'react'
import { UserButton } from '@/components/auth'

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-14 items-center px-4 lg:px-6">
        {/* Mobile menu button */}
        <button
          type="button"
          className="lg:hidden mr-2 p-2 hover:bg-accent rounded-md"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Logo */}
        <Link to="/dashboard" className="flex items-center gap-2 mr-6">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary text-primary-foreground">
            <Sparkles className="h-5 w-5" />
          </div>
          <span className="font-semibold text-lg hidden sm:inline-block">
            HackDay Central
          </span>
        </Link>

        {/* Search (coming soon) */}
        <div className="flex-1 max-w-md hidden md:block" title="Coming soon">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search..."
              className="input pl-10 h-9 w-full"
              readOnly
              aria-label="Search (coming soon)"
              title="Coming soon"
            />
          </div>
        </div>

        {/* Right side actions */}
        <div className="flex items-center gap-2 ml-auto">
          {/* Mobile search (coming soon) */}
          <button type="button" className="md:hidden p-2 hover:bg-accent rounded-md" title="Coming soon" aria-label="Search (coming soon)">
            <Search className="h-5 w-5" />
          </button>

          {/* Notifications (coming soon) */}
          <button type="button" className="p-2 hover:bg-accent rounded-md relative" title="Coming soon" aria-label="Notifications (coming soon)">
            <Bell className="h-5 w-5" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-primary rounded-full" aria-hidden />
          </button>

          {/* User menu */}
          <UserButton />
        </div>
      </div>

      {/* Mobile navigation overlay */}
      {mobileMenuOpen && (
        <MobileNav onClose={() => setMobileMenuOpen(false)} />
      )}
    </header>
  )
}

interface MobileNavProps {
  onClose: () => void
}

function MobileNav({ onClose }: MobileNavProps) {
  return (
    <div className="lg:hidden fixed inset-0 z-50 bg-background/80 backdrop-blur-sm">
      <div className="fixed inset-y-0 left-0 w-64 bg-background border-r p-4">
        <div className="flex items-center justify-between mb-6">
          <span className="font-semibold">Menu</span>
          <button
            onClick={onClose}
            className="p-2 hover:bg-accent rounded-md"
          >
            <span className="sr-only">Close</span>
            &times;
          </button>
        </div>
        <nav className="space-y-1">
          <MobileNavLink to="/dashboard" onClick={onClose}>
            Dashboard
          </MobileNavLink>
          <MobileNavLink to="/people" onClick={onClose}>
            People
          </MobileNavLink>
          <MobileNavLink to="/library" onClick={onClose}>
            Library
          </MobileNavLink>
          <MobileNavLink to="/projects" onClick={onClose}>
            Projects
          </MobileNavLink>
          <MobileNavLink to="/profile" onClick={onClose}>
            Profile
          </MobileNavLink>
        </nav>
      </div>
      <div
        className="fixed inset-0 -z-10"
        onClick={onClose}
      />
    </div>
  )
}

interface MobileNavLinkProps {
  to: string
  children: React.ReactNode
  onClick: () => void
}

function MobileNavLink({ to, children, onClick }: MobileNavLinkProps) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className="block px-3 py-2 rounded-md hover:bg-accent transition-colors"
    >
      {children}
    </Link>
  )
}
