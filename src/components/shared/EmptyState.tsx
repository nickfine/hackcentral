/**
 * Shared empty-state component for consistent layout and tone.
 * Used on Projects, Library, People and similar list/grid views.
 */

import { Link } from 'react-router-dom'

export interface EmptyStateAction {
  label: string
  /** Optional icon (e.g. Plus) to show before label */
  icon?: React.ReactNode
  /** Use for navigation; renders a Link */
  to?: string
  /** Use for button action; renders a button */
  onClick?: () => void
}

export interface EmptyStateProps {
  icon: React.ReactNode
  title: string
  description?: React.ReactNode
  action?: EmptyStateAction
  /** 'default' = p-12, 'compact' = p-8 */
  variant?: 'default' | 'compact'
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  variant = 'default',
}: EmptyStateProps) {
  const paddingClass = variant === 'compact' ? 'p-8' : 'p-12'
  const iconMarginClass = variant === 'compact' ? 'mb-3' : 'mb-4'

  return (
    <div className={`card rounded-xl border border-border ${paddingClass} text-center`}>
      <div className={`text-muted-foreground mx-auto ${iconMarginClass} [&>svg]:h-12 [&>svg]:w-12`}>
        {icon}
      </div>
      <h3 className="text-xl font-semibold mb-2">{title}</h3>
      {description != null && (
        <p className="text-muted-foreground mb-6 max-w-md mx-auto leading-relaxed">
          {description}
        </p>
      )}
      {action && (
        <div className={description != null ? '' : 'mt-4'}>
          {action.to != null ? (
            <Link to={action.to} className="btn btn-primary inline-flex items-center gap-2">
              {action.icon}
              {action.label}
            </Link>
          ) : (
            <button
              type="button"
              className="btn btn-primary inline-flex items-center gap-2"
              onClick={action.onClick}
            >
              {action.icon}
              {action.label}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
