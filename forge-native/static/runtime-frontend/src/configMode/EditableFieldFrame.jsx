import { Pencil } from 'lucide-react';
import { cn } from '../lib/design-system';

function EditableFieldFrame({
  editable = false,
  editing = false,
  label,
  onActivate,
  children,
  className,
}) {
  if (!editable) {
    return children;
  }

  return (
    <div
      className={cn(
        'group relative rounded-lg transition-colors',
        editing
          ? 'ring-2 ring-[color-mix(in_srgb,var(--accent)_60%,transparent)] bg-[color-mix(in_srgb,var(--accent)_5%,transparent)]'
          : 'hover:bg-[color-mix(in_srgb,var(--accent)_5%,transparent)] hover:ring-1 hover:ring-[color-mix(in_srgb,var(--accent)_30%,transparent)]',
        className
      )}
    >
      <button
        type="button"
        className="absolute right-1 top-1 z-10 inline-flex items-center gap-1 rounded-md border border-[color-mix(in_srgb,var(--accent)_30%,var(--border-default))] bg-arena-card/95 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--accent)] opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100"
        onClick={onActivate}
        aria-label={label ? `Edit ${label}` : 'Edit content'}
      >
        <Pencil className="h-3 w-3" />
        Edit
      </button>
      <div onDoubleClick={onActivate}>
        {children}
      </div>
    </div>
  );
}

export default EditableFieldFrame;
