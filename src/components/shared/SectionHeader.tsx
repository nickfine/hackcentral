/**
 * SectionHeader - Page/section header with title, description, optional action button.
 * Matches design system: text-2xl/3xl font-bold, muted description, optional CTA.
 */

export interface SectionHeaderAction {
  label: string;
  onClick: () => void;
  icon?: React.ReactNode;
  variant?: 'primary' | 'outline' | 'ghost';
}

export interface SectionHeaderProps {
  title: string;
  description?: string;
  action?: SectionHeaderAction;
  className?: string;
}

export function SectionHeader({
  title,
  description,
  action,
  className = '',
}: SectionHeaderProps) {
  const btnClass =
    action?.variant === 'outline'
      ? 'btn btn-outline btn-md'
      : action?.variant === 'ghost'
        ? 'btn btn-ghost btn-md'
        : 'btn btn-primary btn-md';

  return (
    <div className={`flex items-start justify-between gap-4 mb-6 ${className}`}>
      <div className="min-w-0 flex-1">
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">{title}</h1>
        {description != null && description !== '' && (
          <p className="text-muted-foreground mt-2 text-base leading-relaxed">
            {description}
          </p>
        )}
      </div>
      {action != null && (
        <button
          type="button"
          className={`${btnClass} shrink-0 inline-flex items-center gap-2`}
          onClick={action.onClick}
        >
          {action.icon}
          {action.label}
        </button>
      )}
    </div>
  );
}
