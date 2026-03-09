import { useEffect, useState } from 'react';
import { Loader2, PanelRightClose, Save, Shield, TriangleAlert, Undo2, Upload, X } from 'lucide-react';
import { Badge, Button } from '../components/ui';
import { cn } from '../lib/design-system';
import { useConfigMode } from './ConfigModeContext';

function ConfigSidePanel({ isMacroHost = false }) {
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [desktopAnchorStyle, setDesktopAnchorStyle] = useState(null);
  const {
    canEdit,
    isEnabled,
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
    publishFooterState,
    isPublishFooterActive,
    publishSummary,
    publishDraft,
    cancelPublishDraftRequest,
  } = useConfigMode();
  const canDiscard = hasDraft || hasUnsavedChanges;
  const canPublish = hasDraft || hasUnsavedChanges;
  const isFooterLocked = isPublishFooterActive;
  const desktopPanelWidth = 380;
  const desktopPanelGap = 10;

  useEffect(() => {
    if (isMacroHost || typeof window === 'undefined') {
      setDesktopAnchorStyle(null);
      return undefined;
    }

    const syncDesktopAnchor = () => {
      if (window.innerWidth < 640) {
        setDesktopAnchorStyle(null);
        return;
      }

      const trigger = document.querySelector('[data-config-actions-trigger="true"]');
      if (!trigger) {
        setDesktopAnchorStyle(null);
        return;
      }

      const rect = trigger.getBoundingClientRect();
      const maxLeft = window.innerWidth - desktopPanelWidth - 16;
      const centeredLeft = rect.left + (rect.width / 2) - (desktopPanelWidth / 2);
      const clampedLeft = Math.min(Math.max(16, centeredLeft), Math.max(16, maxLeft));

      setDesktopAnchorStyle({
        left: `${clampedLeft}px`,
        right: 'auto',
        top: `${rect.bottom + desktopPanelGap}px`,
        bottom: 'auto',
      });
    };

    syncDesktopAnchor();
    window.addEventListener('resize', syncDesktopAnchor);
    window.addEventListener('scroll', syncDesktopAnchor, true);

    return () => {
      window.removeEventListener('resize', syncDesktopAnchor);
      window.removeEventListener('scroll', syncDesktopAnchor, true);
    };
  }, [isDrawerOpen, isMacroHost]);

  useEffect(() => {
    if (!isDrawerOpen) {
      setIsHelpOpen(false);
    }
  }, [isDrawerOpen]);

  if (!canEdit || !isEnabled || !isDrawerOpen) return null;

  const panel = (
    <aside
      className={cn(
        isMacroHost
          ? 'relative ml-auto w-full max-w-[390px]'
          : 'fixed inset-x-2 bottom-2 flex max-h-[72vh] flex-col overflow-hidden sm:inset-x-auto sm:w-[380px] sm:max-h-[calc(100vh-8rem)]',
        'flex flex-col overflow-hidden rounded-t-2xl border border-[color-mix(in_srgb,var(--accent)_25%,var(--border-default))] bg-arena-card shadow-2xl sm:rounded-2xl'
      )}
      style={isMacroHost ? undefined : { zIndex: 'var(--z-config-drawer)', ...desktopAnchorStyle }}
      aria-label="Config actions drawer"
    >
        <header className="flex flex-col gap-3 border-b border-arena-border px-4 py-3">
          <div className="flex flex-wrap justify-end gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={navigateToAdminPanel}
              disabled={isFooterLocked}
              leftIcon={<Shield className="h-4 w-4" />}
            >
              Open Admin Panel
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={closeDrawer}
              disabled={isFooterLocked}
              leftIcon={<PanelRightClose className="h-4 w-4" />}
            >
              Close
            </Button>
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-wider text-[var(--accent)]">Config Mode</p>
            <h3 className="text-base font-bold text-text-primary">Draft Actions</h3>
            <p className="text-xs text-text-muted">
              Edit content inline on the page, then save or publish from here.
            </p>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto">
          <footer className="border-t border-arena-border bg-arena-card/95 px-4 py-3">
            {publishFooterState === 'default' ? (
              <div className="space-y-3">
                <div className="rounded-xl border border-arena-border bg-arena-card">
                  <button
                    type="button"
                    className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left"
                    onClick={() => setIsHelpOpen((open) => !open)}
                    aria-expanded={isHelpOpen}
                    aria-controls="config-how-this-works"
                  >
                    <span className="text-sm font-semibold text-text-primary">How this works</span>
                    <span className="text-xs text-text-muted">{isHelpOpen ? 'Hide' : 'Show'}</span>
                  </button>
                  {isHelpOpen && (
                    <div id="config-how-this-works" className="border-t border-arena-border px-3 py-3">
                      <ul className="space-y-1 text-xs text-text-secondary">
                        <li>1. Edit highlighted fields directly on the page.</li>
                        <li>2. Save Draft to persist work without changing participant view.</li>
                        <li>3. Publish when ready to make changes live.</li>
                      </ul>
                    </div>
                  )}
                </div>

                <div role="group" aria-label="Primary draft actions" className="space-y-2">
                  <Button
                    size="sm"
                    fullWidth
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
                    fullWidth
                    onClick={saveDraft}
                    loading={isSavingDraft}
                    disabled={isPublishing}
                    leftIcon={<Save className="h-4 w-4" />}
                  >
                    Save Draft
                  </Button>
                </div>

                <div
                  role="group"
                  aria-label="Escape draft actions"
                  className="grid grid-cols-2 gap-2 border-t border-arena-border pt-2"
                >
                  <Button
                    variant="secondary"
                    size="sm"
                    fullWidth
                    onClick={requestDiscardDraft}
                    disabled={isSavingDraft || isPublishing || !canDiscard}
                    leftIcon={<Undo2 className="h-4 w-4" />}
                  >
                    Discard
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    fullWidth
                    onClick={requestExitConfigMode}
                    disabled={isSavingDraft || isPublishing}
                    leftIcon={<X className="h-4 w-4" />}
                  >
                    Exit
                  </Button>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-[color-mix(in_srgb,var(--accent)_25%,var(--border-default))] bg-arena-elevated px-3 py-3">
                <div className="flex items-start gap-2">
                  {publishFooterState === 'error' ? (
                    <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-error" />
                  ) : publishFooterState === 'publishing' ? (
                    <Loader2 className="mt-0.5 h-4 w-4 shrink-0 animate-spin text-[var(--accent)]" />
                  ) : (
                    <Upload className="mt-0.5 h-4 w-4 shrink-0 text-[var(--accent)]" />
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
        </div>
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
