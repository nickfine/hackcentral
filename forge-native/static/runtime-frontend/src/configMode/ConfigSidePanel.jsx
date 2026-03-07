import { CheckCircle2, Loader2, PanelRightClose, Save, Shield, TriangleAlert, Undo2, Upload, X } from 'lucide-react';
import { Badge, Button } from '../components/ui';
import { cn } from '../lib/design-system';
import { useConfigMode } from './ConfigModeContext';

function ConfigSidePanel({ isMacroHost = false }) {
  const {
    canEdit,
    isEnabled,
    status,
    isDrawerOpen,
    closeDrawer,
    saveDraft,
    requestPublishDraft,
    requestDiscardDraft,
    requestExitConfigMode,
    navigateToAdminPanel,
    isSavingDraft,
    isPublishing,
    hasUnsavedChanges,
    hasDraft,
    saveError,
    publishSuccess,
    publishFooterState,
    isPublishFooterActive,
    publishSummary,
    publishDraft,
    cancelPublishDraftRequest,
  } = useConfigMode();
  const canDiscard = hasDraft || hasUnsavedChanges;
  const canPublish = hasDraft || hasUnsavedChanges;
  const isFooterLocked = isPublishFooterActive;

  if (!canEdit || !isEnabled || !isDrawerOpen) return null;

  const panel = (
    <aside
      className={cn(
        isMacroHost
          ? 'relative ml-auto w-full max-w-[390px]'
          : 'fixed inset-x-2 bottom-2 flex max-h-[72vh] flex-col overflow-hidden sm:inset-x-auto sm:right-4 sm:top-24 sm:bottom-auto sm:w-[380px] sm:max-h-[calc(100vh-8rem)]',
        'flex flex-col overflow-hidden rounded-t-2xl border border-teal-500/25 bg-arena-card shadow-2xl sm:rounded-2xl'
      )}
      style={isMacroHost ? undefined : { zIndex: 'var(--z-config-drawer)' }}
      aria-label="Config actions drawer"
    >
        <header className="flex items-start justify-between gap-3 border-b border-arena-border px-4 py-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-teal-500">Config Mode</p>
            <h3 className="text-base font-bold text-text-primary">Draft Actions</h3>
            <p className="text-xs text-text-muted">
              Edit content inline on the page, then save or publish from here.
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={closeDrawer}
            disabled={isFooterLocked}
            leftIcon={<PanelRightClose className="h-4 w-4" />}
          >
            Close
          </Button>
        </header>

        <div
          className={cn(
            'flex-1 space-y-4 overflow-y-auto px-4 py-4 transition-opacity',
            isFooterLocked && 'pointer-events-none opacity-60'
          )}
        >
          <div className="rounded-xl border border-arena-border bg-arena-elevated px-3 py-2">
            <p className="text-xs font-bold uppercase tracking-wider text-text-muted">Current status</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Badge variant="default">Config Mode On</Badge>
              {status === 'on_unsaved' && <Badge variant="warning">Unsaved changes</Badge>}
              {status === 'on_draft' && <Badge variant="success">Draft saved</Badge>}
              {status === 'on_clean' && <Badge variant="default">Live</Badge>}
              {status === 'conflict' && <Badge variant="error">Draft conflict</Badge>}
              {status === 'saving' && <Badge variant="default">Saving</Badge>}
              {status === 'publishing' && <Badge variant="default">Publishing</Badge>}
            </div>
          </div>

          {publishSuccess && (
            <div className="rounded-xl border border-success/35 bg-success/8 px-3 py-2">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                <div>
                  <p className="text-sm font-semibold text-success">Publish successful</p>
                  <p className="text-xs text-text-secondary">{publishSuccess.message}</p>
                </div>
              </div>
            </div>
          )}

          <div className="rounded-xl border border-arena-border bg-arena-card px-3 py-3">
            <p className="text-sm font-semibold text-text-primary">How this works</p>
            <ul className="mt-2 space-y-1 text-xs text-text-secondary">
              <li>1. Edit highlighted fields directly on the page.</li>
              <li>2. Save Draft to persist work without changing participant view.</li>
              <li>3. Publish when ready to make changes live.</li>
            </ul>
            <p className="mt-3 rounded-lg border border-arena-border bg-arena-elevated px-3 py-2 text-xs text-text-secondary">
              Backup and restore controls now live in the Admin Panel to keep this drawer focused on draft and publish work.
            </p>
            <div className="mt-3 border-t border-arena-border pt-3">
              <Button
                variant="secondary"
                size="sm"
                onClick={navigateToAdminPanel}
                leftIcon={<Shield className="h-4 w-4" />}
                className="w-full justify-center"
              >
                Open Admin Panel
              </Button>
            </div>
          </div>
        </div>

        <footer className="border-t border-arena-border bg-arena-card/95 px-4 py-3">
          <p className="mb-2 text-xs font-bold uppercase tracking-wider text-text-muted">Actions</p>

          {publishFooterState === 'default' ? (
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={saveDraft}
                loading={isSavingDraft}
                disabled={isPublishing}
                leftIcon={<Save className="h-4 w-4" />}
              >
                Save Draft
              </Button>
              <Button
                size="sm"
                onClick={requestPublishDraft}
                loading={isPublishing}
                disabled={isSavingDraft || !canPublish}
                leftIcon={<Upload className="h-4 w-4" />}
              >
                Publish
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={requestDiscardDraft}
                disabled={isSavingDraft || isPublishing || !canDiscard}
                leftIcon={<Undo2 className="h-4 w-4" />}
              >
                Discard
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={requestExitConfigMode}
                disabled={isSavingDraft || isPublishing}
                leftIcon={<X className="h-4 w-4" />}
              >
                Exit
              </Button>
            </div>
          ) : (
            <div className="rounded-xl border border-teal-500/25 bg-arena-elevated px-3 py-3">
              <div className="flex items-start gap-2">
                {publishFooterState === 'error' ? (
                  <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-error" />
                ) : publishFooterState === 'publishing' ? (
                  <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin text-teal-500" />
                ) : (
                  <Upload className="mt-0.5 h-4 w-4 shrink-0 text-teal-500" />
                )}
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-text-primary">
                    {publishFooterState === 'publishing'
                      ? 'Publishing changes'
                      : publishFooterState === 'error'
                        ? 'Publish failed'
                        : 'Ready to publish'}
                  </p>
                  <p className="mt-1 text-xs text-text-secondary">
                    {publishFooterState === 'publishing'
                      ? 'Updating the live participant view now. Keep this drawer open until publishing finishes.'
                      : publishFooterState === 'error'
                        ? `${saveError}. No new changes were published.`
                        : publishSummary.summaryText}
                  </p>
                </div>
              </div>

              {publishFooterState !== 'publishing' && publishSummary.sections.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {publishSummary.sections.map((section) => (
                    <Badge key={section.id} variant="default">
                      {section.label} {section.count}
                    </Badge>
                  ))}
                </div>
              )}

              <div className="mt-3 grid grid-cols-2 gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={cancelPublishDraftRequest}
                  disabled={publishFooterState === 'publishing'}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={publishDraft}
                  loading={publishFooterState === 'publishing'}
                  leftIcon={publishFooterState === 'error' ? <Upload className="h-4 w-4" /> : undefined}
                >
                  {publishFooterState === 'publishing'
                    ? 'Publishing...'
                    : publishFooterState === 'error'
                      ? 'Retry publish'
                      : 'Publish now'}
                </Button>
              </div>
            </div>
          )}
        </footer>
    </aside>
  );

  if (isMacroHost) {
    return panel;
  }

  return (
    <>
      {isFooterLocked ? (
        <div
          className="fixed inset-0 bg-black/25 sm:hidden"
          style={{ zIndex: 'calc(var(--z-config-drawer) - 1)' }}
          aria-hidden="true"
        />
      ) : (
        <button
          type="button"
          className="fixed inset-0 bg-black/25 sm:hidden"
          style={{ zIndex: 'calc(var(--z-config-drawer) - 1)' }}
          onClick={closeDrawer}
          aria-label="Close config actions"
        />
      )}
      {panel}
    </>
  );
}

export default ConfigSidePanel;
