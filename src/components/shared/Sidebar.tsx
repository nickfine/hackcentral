/**
 * Sidebar Component
 * Left navigation sidebar with main navigation links
 */

import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  Users,
  Library,
  FolderKanban,
  User,
  Sparkles,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const navItems = [
  {
    to: '/dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
  },
  {
    to: '/people',
    label: 'People',
    icon: Users,
  },
  {
    to: '/library',
    label: 'Library',
    icon: Library,
  },
  {
    to: '/projects',
    label: 'Projects',
    icon: FolderKanban,
  },
  {
    to: '/profile',
    label: 'Profile',
    icon: User,
  },
]

export function Sidebar() {
  return (
    <aside className="hidden lg:flex flex-col fixed inset-y-0 left-0 w-64 border-r bg-background pt-14">
      <div className="flex-1 overflow-y-auto py-4 px-3">
        <nav className="space-y-1">
          {navItems.map((item) => (
            <NavItem key={item.to} {...item} />
          ))}
        </nav>

        {/* AI Arsenal Quick Access */}
        <div className="mt-6 pt-6 border-t">
          <div className="px-3 mb-2">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Quick Access
            </span>
          </div>
          <NavLink
            to="/library?arsenal=true"
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors',
                'hover:bg-accent hover:text-accent-foreground',
                isActive && 'bg-accent text-accent-foreground'
              )
            }
          >
            <Sparkles className="h-4 w-4 text-primary" />
            <span>AI Arsenal</span>
            <span className="badge badge-secondary text-xs ml-auto">
              Curated
            </span>
          </NavLink>
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 border-t">
        <div className="card p-3 bg-primary/5 border-primary/20">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">Get Started</span>
          </div>
          <p className="text-xs text-muted-foreground mb-3">
            Explore the AI Arsenal to find proven prompts and templates.
          </p>
          <NavLink
            to="/library"
            className="btn btn-primary btn-sm w-full"
          >
            Explore Library
          </NavLink>
        </div>
      </div>
    </aside>
  )
}

interface NavItemProps {
  to: string
  label: string
  icon: React.ComponentType<{ className?: string }>
}

function NavItem({ to, label, icon: Icon }: NavItemProps) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
          'hover:bg-accent hover:text-accent-foreground',
          isActive
            ? 'bg-accent text-accent-foreground'
            : 'text-muted-foreground'
        )
      }
    >
      <Icon className="h-4 w-4" />
      <span>{label}</span>
    </NavLink>
  )
}
