/**
 * SectionHeader - Page/section header with title, description, optional action button.
 * Matches design system: text-2xl/3xl font-bold, muted description, optional CTA.
 */

export interface SectionHeaderAction {
  label: string;
  onClick: () => void;
  icon?: React.ReactNode;
  variant?: 'primary' | 'outline' | 'ghost';
  size?: 'sm' | 'md';
}

export interface SectionHeaderProps {
  title: string;
  description?: string;
  /** Optional id for the title heading (e.g. for aria-labelledby) */
  titleId?: string;
  /** Optional badge or count next to title (e.g. count badge) */
  titleSuffix?: React.ReactNode;
  action?: SectionHeaderAction;
  className?: string;
  /** 'page' = larger page title; 'section' = smaller section title; omit = default size */
  variant?: 'page' | 'section';
}

/* Four-tier typography: Tier 1 page title, Tier 2 section/subpage */
const TITLE_CLASSES: Record<string, string> = {
  page: 'text-4xl sm:text-5xl font-black tracking-tight text-gray-900 dark:text-white',
  section: 'text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100',
  default: 'text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100',
};

export function SectionHeader({
  title,
  description,
  titleId,
  titleSuffix,
  action,
  className = '',
  variant,
}: SectionHeaderProps) {
  const sizeClass = action?.size === 'sm' ? 'btn-sm' : 'btn-md';
  const btnClass =
    action?.variant === 'outline'
      ? `btn btn-outline ${sizeClass}`
      : action?.variant === 'ghost'
        ? `btn btn-ghost ${sizeClass}`
        : `btn btn-primary ${sizeClass}`;

  const titleClass = TITLE_CLASSES[variant ?? 'default'];

  return (
    <div className={`flex items-start justify-between gap-4 mb-6 ${className}`}>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h1 id={titleId} className={titleClass}>{title}</h1>
          {titleSuffix != null && titleSuffix}
        </div>
        {description != null && description !== '' && (
          <p className="text-muted-foreground mt-2 text-sm leading-relaxed">
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
