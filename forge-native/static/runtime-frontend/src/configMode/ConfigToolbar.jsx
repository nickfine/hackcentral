import { CircleDot, Loader2, PanelRightClose, PanelRightOpen, Settings2, TriangleAlert } from 'lucide-react';
import { Badge, Button } from '../components/ui';
import { cn } from '../lib/design-system';
import { useConfigMode } from './ConfigModeContext';

const STATUS_META = {
  off: { label: 'Off', variant: 'default' },
  on_clean: { label: 'Live', variant: 'default' },
  on_unsaved: { label: 'Unsaved', variant: 'warning' },
  on_draft: { label: 'Draft saved', variant: 'success' },
  conflict: { label: 'Draft conflict', variant: 'error' },
  saving: { label: 'Saving', variant: 'default' },
  publishing: { label: 'Publishing', variant: 'default' },
};

function ConfigToolbar({ isMacroHost = false }) {
  const {
    canEdit,
    isEnabled,
    isLoading,
    isDrawerOpen,
    status,
    saveError,
    toggleConfigMode,
    toggleDrawer,
  } = useConfigMode();

  if (!canEdit) return null;

  const statusMeta = STATUS_META[status] || STATUS_META.off;
  const isBusy = status === 'saving' || status === 'publishing';

  const dockBody = (
    <div
      className={cn(
        isMacroHost ? 'w-full flex justify-center sm:justify-end' : 'fixed left-1/2 -translate-x-1/2'
      )}
      style={isMacroHost ? undefined : { bottom: 'max(0.85rem, env(safe-area-inset-bottom))', zIndex: 'var(--z-config-dock)' }}
    >
      <div
        className={cn(
          'flex items-center gap-2 rounded-full border px-2 py-2 shadow-xl backdrop-blur',
          'bg-arena-card/95',
          isEnabled
            ? 'border-teal-500/45 ring-1 ring-teal-500/20'
            : 'border-arena-border'
        )}
      >
        <Button
          size="sm"
          variant={isEnabled ? 'secondary' : 'primary'}
          className={cn(
            'rounded-full',
            isEnabled && 'border border-teal-500/45 bg-teal-500/12 text-teal-500'
          )}
          onClick={toggleConfigMode}
          loading={isLoading}
          leftIcon={<Settings2 className="h-4 w-4" />}
        >
          {isEnabled ? 'Config Mode: On' : 'Config Mode: Off'}
        </Button>

        {isEnabled && (
          <>
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleDrawer}
              leftIcon={isDrawerOpen ? <PanelRightClose className="h-4 w-4" /> : <PanelRightOpen className="h-4 w-4" />}
            >
              {isDrawerOpen ? 'Hide Actions' : 'Show Actions'}
            </Button>
            <Badge variant={statusMeta.variant}>{statusMeta.label}</Badge>
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-teal-500/90">
              {isBusy ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <CircleDot className="h-3.5 w-3.5 animate-pulse" />
              )}
              Live
            </span>
          </>
        )}

        {saveError && (
          <span className="hidden max-w-[260px] items-center gap-1 truncate text-xs text-error sm:inline-flex">
            <TriangleAlert className="h-3.5 w-3.5 shrink-0" />
            {saveError}
          </span>
        )}
      </div>
    </div>
  );

  return dockBody;
}

export default ConfigToolbar;
