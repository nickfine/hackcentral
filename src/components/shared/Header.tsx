/**
 * Header Component
 * Top navigation bar with search, notifications, feedback, and user menu
 */

import { Link, useNavigate } from 'react-router-dom'
import { Search, Bell, Menu, Sparkles, MessageSquare } from 'lucide-react'
import { useState } from 'react'
import toast from 'react-hot-toast'
import { useMutation } from 'convex/react'
import { api } from '../../../convex/_generated/api'
import { UserButton } from '@/components/auth'

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [feedbackModalOpen, setFeedbackModalOpen] = useState(false)
  const navigate = useNavigate()
  const createFeedback = useMutation(api.feedback.create)

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const q = searchQuery.trim()
    if (q) {
      navigate(`/search?q=${encodeURIComponent(q)}`)
    } else {
      navigate('/search')
    }
  }

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

        {/* Global search */}
        <form className="flex-1 max-w-md hidden md:block" onSubmit={handleSearchSubmit} role="search">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="search"
              placeholder="Search Completed Hacks and people..."
              className="input pl-10 h-9 w-full"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Search Completed Hacks and people"
            />
          </div>
        </form>

        {/* Right side actions */}
        <div className="flex items-center gap-2 ml-auto">
          {/* Mobile: link to search page */}
          <Link
            to="/search"
            className="md:hidden p-2 hover:bg-accent rounded-md"
            aria-label="Search"
          >
            <Search className="h-5 w-5" />
          </Link>

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

          {/* User menu */}
          <UserButton />
        </div>
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
              className="input w-full min-h-[100px]"
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
          <MobileNavLink to="/people" onClick={onClose}>
            People
          </MobileNavLink>
          <MobileNavLink to="/library" onClick={onClose}>
            Completed Hacks
          </MobileNavLink>
          <MobileNavLink to="/projects" onClick={onClose}>
            Hacks In Progress
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
