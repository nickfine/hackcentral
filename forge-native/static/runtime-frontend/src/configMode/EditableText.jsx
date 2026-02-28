import { useEffect, useMemo, useState } from 'react';
import { Check, X } from 'lucide-react';
import { cn } from '../lib/design-system';
import EditableFieldFrame from './EditableFieldFrame';
import { useConfigMode } from './ConfigModeContext';
import { getRegistryField, CONFIG_FIELD_TYPES } from './contentRegistry';

function EditableText({
  contentKey,
  fallback = '',
  as: Tag = 'p',
  className,
  frameClassName,
  multiline,
  rows,
  placeholder,
  displayClassName,
  onRenderValue,
  ...restProps
}) {
  const config = useConfigMode();
  const field = getRegistryField(contentKey);
  const resolvedMultiline = multiline ?? [CONFIG_FIELD_TYPES.TEXTAREA].includes(field?.fieldType);
  const [localValue, setLocalValue] = useState('');

  const value = useMemo(() => {
    const next = config?.getFieldValue?.(contentKey, fallback);
    return typeof next === 'string' ? next : (fallback || '');
  }, [config, contentKey, fallback]);

  const isConfigEnabled = Boolean(config?.isEnabled && config?.canEdit);
  const isEditable = Boolean(isConfigEnabled && config?.isFieldEditable?.(contentKey));
  const isEditing = config?.editingKey === contentKey;

  useEffect(() => {
    if (isEditing) {
      setLocalValue(value || '');
    }
  }, [isEditing, value]);

  const commit = () => {
    config?.setFieldValue?.(contentKey, localValue);
    config?.endEdit?.(contentKey);
  };

  const cancel = () => {
    setLocalValue(value || '');
    config?.endEdit?.(contentKey);
  };

  const renderedValue = onRenderValue ? onRenderValue(value) : value;

  if (!isEditing) {
    return (
      <EditableFieldFrame
        editable={isEditable}
        editing={false}
        label={field?.label}
        onActivate={() => config?.beginEdit?.(contentKey)}
        className={frameClassName}
      >
        <Tag className={cn(displayClassName, className)} {...restProps}>
          {renderedValue || placeholder || ''}
        </Tag>
      </EditableFieldFrame>
    );
  }

  return (
    <EditableFieldFrame
      editable={isEditable}
      editing
      label={field?.label}
      onActivate={() => {}}
      className={cn('p-2', frameClassName)}
    >
      <div className="space-y-2">
        {resolvedMultiline ? (
          <textarea
            autoFocus
            rows={rows || 3}
            value={localValue}
            onChange={(event) => setLocalValue(event.target.value)}
            onKeyDown={(event) => {
              if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
                event.preventDefault();
                commit();
              }
              if (event.key === 'Escape') {
                event.preventDefault();
                cancel();
              }
            }}
            className="w-full rounded-lg border border-teal-500/40 bg-arena-card px-3 py-2 text-sm text-text-primary focus:ring-2 focus:ring-teal-500/40 focus:outline-none"
          />
        ) : (
          <input
            autoFocus
            type="text"
            value={localValue}
            onChange={(event) => setLocalValue(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault();
                commit();
              }
              if (event.key === 'Escape') {
                event.preventDefault();
                cancel();
              }
            }}
            className="w-full rounded-lg border border-teal-500/40 bg-arena-card px-3 py-2 text-sm text-text-primary focus:ring-2 focus:ring-teal-500/40 focus:outline-none"
          />
        )}

        <div className="flex items-center justify-between gap-2">
          <p className="text-xs text-text-muted">
            {field?.maxLength ? `${Math.min(localValue.length, field.maxLength)}/${field.maxLength}` : 'Press Enter to save'}
          </p>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={cancel}
              className="inline-flex items-center gap-1 rounded-md border border-arena-border px-2 py-1 text-xs text-text-secondary hover:bg-arena-elevated"
            >
              <X className="h-3.5 w-3.5" />
              Cancel
            </button>
            <button
              type="button"
              onClick={commit}
              className="inline-flex items-center gap-1 rounded-md border border-teal-500/30 bg-teal-500/10 px-2 py-1 text-xs font-semibold text-teal-500 hover:bg-teal-500/15"
            >
              <Check className="h-3.5 w-3.5" />
              Apply
            </button>
          </div>
        </div>
      </div>
    </EditableFieldFrame>
  );
}

export function EditableTextArea(props) {
  return <EditableText {...props} multiline />;
}

export default EditableText;
