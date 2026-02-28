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
          ? 'ring-2 ring-teal-500/60 bg-teal-500/5'
          : 'hover:bg-teal-500/5 hover:ring-1 hover:ring-teal-500/30',
        className
      )}
    >
      <button
        type="button"
        className="absolute right-1 top-1 z-10 inline-flex items-center gap-1 rounded-md border border-teal-500/30 bg-arena-card/95 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-teal-500 opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100"
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
