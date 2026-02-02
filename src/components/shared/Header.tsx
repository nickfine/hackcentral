/**
 * Header Component
 * Top navigation bar with centralised search, notifications, feedback, and user menu.
 * On small viewports the search is an icon that expands to show the search input.
 */

import { Link, useNavigate } from 'react-router-dom'
import { Search, Bell, Menu, Sparkles, MessageSquare, X } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import toast from 'react-hot-toast'
import { useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { ProfileLink } from '@/components/auth'

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [feedbackModalOpen, setFeedbackModalOpen] = useState(false)
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false)
  const mobileSearchInputRef = useRef<HTMLInputElement>(null)
  const navigate = useNavigate()
  const createFeedback = useMutation(api.feedback.create)

  useEffect(() => {
    if (mobileSearchOpen) {
      mobileSearchInputRef.current?.focus()
    }
  }, [mobileSearchOpen])

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const q = searchQuery.trim()
    if (q) {
      navigate(`/search?q=${encodeURIComponent(q)}`)
    } else {
      navigate('/search')
    }
    setMobileSearchOpen(false)
  }

  const openMobileSearch = () => setMobileSearchOpen(true)
  const closeMobileSearch = () => setMobileSearchOpen(false)

  return (
    <header className="fixed top-0 left-0 right-0 z-50 h-14 shrink-0 w-full bg-background">
      <div className="flex h-14 items-center px-4 lg:px-6 gap-3">
        {/* Mobile menu button - hidden when search expanded */}
        <button
          type="button"
          className={`lg:hidden shrink-0 p-2 hover:bg-accent rounded-md ${mobileSearchOpen ? 'invisible' : ''}`}
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
          aria-hidden={mobileSearchOpen}
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Logo - hidden when mobile search expanded */}
        {!mobileSearchOpen && (
          <Link to="/dashboard" className="flex items-center gap-2 shrink-0">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary text-primary-foreground">
              <Sparkles className="h-5 w-5" />
            </div>
            <span className="font-semibold text-lg hidden sm:inline-block">
              HackDay Central
            </span>
          </Link>
        )}

        {/* Centralised search (desktop): centered in the middle region */}
        <form
          className={`flex-1 min-w-0 flex justify-center ${mobileSearchOpen ? 'block' : 'hidden md:flex'}`}
          onSubmit={handleSearchSubmit}
          role="search"
        >
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <input
              ref={mobileSearchInputRef}
              type="search"
              placeholder="Search Completed Hacks and people..."
              className="input pl-10 pr-10 h-9 w-full"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Escape' && closeMobileSearch()}
              aria-label="Search Completed Hacks and people"
            />
            {mobileSearchOpen && (
              <button
                type="button"
                onClick={closeMobileSearch}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 hover:bg-accent rounded-md"
                aria-label="Close search"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </form>

        {/* Right side actions - hidden when mobile search expanded */}
        {!mobileSearchOpen && (
          <div className="flex items-center gap-2 ml-auto shrink-0">
            {/* Mobile: search icon that expands to search bar */}
            <button
              type="button"
              className="md:hidden p-2 hover:bg-accent rounded-md"
              onClick={openMobileSearch}
              aria-label="Open search"
            >
              <Search className="h-5 w-5" />
            </button>

            {/* Notifications */}
            <Link
              to="/notifications"
              className="p-2 hover:bg-accent rounded-md relative"
              aria-label="Notifications"
            >
              <Bell className="h-5 w-5" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-primary rounded-full" aria-hidden />
            </Link>

            {/* Feedback */}
            <button
              type="button"
              onClick={() => setFeedbackModalOpen(true)}
              className="p-2 hover:bg-accent rounded-md"
              aria-label="Send feedback"
            >
              <MessageSquare className="h-5 w-5" />
            </button>

            {/* Profile: links to dedicated Profile page (no dropdown) */}
            <ProfileLink />
          </div>
        )}
      </div>

      {/* Mobile navigation overlay */}
      {mobileMenuOpen && (
        <MobileNav
          onClose={() => setMobileMenuOpen(false)}
          onOpenFeedback={() => {
            setMobileMenuOpen(false)
            setFeedbackModalOpen(true)
          }}
        />
      )}

      {/* Feedback modal */}
      {feedbackModalOpen && (
        <FeedbackModal
          onClose={() => setFeedbackModalOpen(false)}
          onSubmit={async (message, category) => {
            await createFeedback({ message, category })
            toast.success('Thanks, your feedback was sent.')
            setFeedbackModalOpen(false)
          }}
        />
      )}
    </header>
  )
}

interface FeedbackModalProps {
  onClose: () => void
  onSubmit: (message: string, category?: string) => Promise<void>
}

function FeedbackModal({ onClose, onSubmit }: FeedbackModalProps) {
  const [message, setMessage] = useState('')
  const [category, setCategory] = useState<string>('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!message.trim() || isSubmitting) return
    setIsSubmitting(true)
    try {
      await onSubmit(message.trim(), category || undefined)
    } catch (err) {
      console.error('Failed to send feedback:', err)
      const message = err instanceof Error ? err.message : 'Failed to send feedback. Please try again.'
      toast.error(message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="feedback-title"
    >
      <div className="card p-6 w-full max-w-md shadow-lg" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 id="feedback-title" className="text-lg font-semibold">
            Send feedback
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 hover:bg-accent rounded-md"
            aria-label="Close"
          >
            &times;
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="feedback-message" className="block text-sm font-medium mb-1">
              Message <span className="text-destructive">*</span>
            </label>
            <textarea
              id="feedback-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="textarea w-full min-h-[100px]"
              placeholder="Share your feedback, report a bug, or suggest an idea..."
              required
              rows={4}
            />
          </div>
          <div>
            <label htmlFor="feedback-category" className="block text-sm font-medium mb-1">
              Category (optional)
            </label>
            <select
              id="feedback-category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="input w-full"
            >
              <option value="">—</option>
              <option value="bug">Bug</option>
              <option value="idea">Idea</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div className="flex gap-2 justify-end">
            <button type="button" className="btn btn-outline" onClick={onClose}>
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSubmitting || !message.trim()}
            >
              {isSubmitting ? 'Sending…' : 'Send feedback'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

interface MobileNavProps {
  onClose: () => void
  onOpenFeedback: () => void
}

function MobileNav({ onClose, onOpenFeedback }: MobileNavProps) {
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
          <MobileNavLink to="/hacks" onClick={onClose}>
            Hacks
          </MobileNavLink>
          <MobileNavLink to="/people" onClick={onClose}>
            People
          </MobileNavLink>
          <MobileNavLink to="/team-pulse" onClick={onClose}>
            Team pulse
          </MobileNavLink>
          <MobileNavLink to="/profile" onClick={onClose}>
            Profile
          </MobileNavLink>
          <button
            type="button"
            onClick={onOpenFeedback}
            className="block w-full text-left px-3 py-2 rounded-md hover:bg-accent transition-colors"
          >
            Send feedback
          </button>
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
