import { CheckCircle2, CircleDot, Loader2, PanelRightClose, PanelRightOpen, Settings2, TriangleAlert } from 'lucide-react';
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
    isPublishFooterActive,
    status,
    saveError,
    publishSuccess,
    toggleConfigMode,
    toggleDrawer,
  } = useConfigMode();

  if (!canEdit) return null;

  const statusMeta = STATUS_META[status] || STATUS_META.off;
  const isBusy = status === 'saving' || status === 'publishing';
  const activeMessage = publishSuccess?.message || saveError || null;
  const isSuccessMessage = Boolean(publishSuccess?.message);

  const dockBody = (
    <div
      className={cn(
        isMacroHost ? 'w-full flex justify-center sm:justify-end' : 'fixed left-1/2 -translate-x-1/2'
      )}
      style={isMacroHost ? undefined : { bottom: 'max(0.85rem, env(safe-area-inset-bottom))', zIndex: 'var(--z-config-dock)' }}
    >
      <div className="flex max-w-[min(92vw,44rem)] flex-col items-stretch gap-2">
        <div
          className={cn(
            'flex flex-wrap items-center gap-2 rounded-full border px-2 py-2 shadow-xl backdrop-blur',
            'bg-arena-card/95',
            isEnabled
              ? 'border-[color-mix(in_srgb,var(--accent)_45%,var(--border-default))] ring-1 ring-[color-mix(in_srgb,var(--accent)_20%,transparent)]'
              : 'border-arena-border'
          )}
        >
          <Button
            size="sm"
            variant={isEnabled ? 'secondary' : 'primary'}
            className={cn(
              'rounded-full',
              isEnabled &&
                'border border-[color-mix(in_srgb,var(--accent)_45%,var(--border-default))] bg-[color-mix(in_srgb,var(--accent)_12%,transparent)] text-[var(--accent)]'
            )}
            onClick={toggleConfigMode}
            disabled={isPublishFooterActive}
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
                disabled={isPublishFooterActive}
                leftIcon={isDrawerOpen ? <PanelRightClose className="h-4 w-4" /> : <PanelRightOpen className="h-4 w-4" />}
              >
                {isDrawerOpen ? 'Hide Actions' : 'Show Actions'}
              </Button>
              <Badge variant={statusMeta.variant}>{statusMeta.label}</Badge>
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-[color-mix(in_srgb,var(--accent)_90%,transparent)]">
                {isBusy ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <CircleDot className="h-3.5 w-3.5 animate-pulse" />
                )}
                Live
              </span>
            </>
          )}
        </div>

        {activeMessage && (
          <div
            className={cn(
              'flex max-w-[320px] items-start gap-2 self-start rounded-2xl border px-3 py-2 text-xs font-semibold shadow-lg',
              isSuccessMessage
                ? 'border-success/35 bg-success/10 text-success'
                : 'border-error/35 bg-error/10 text-error',
              !isMacroHost && 'sm:self-center'
            )}
          >
            {isSuccessMessage ? (
              <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            ) : (
              <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            )}
            <span className="leading-snug">{activeMessage}</span>
          </div>
        )}
      </div>
    </div>
  );

  return dockBody;
}

export default ConfigToolbar;
