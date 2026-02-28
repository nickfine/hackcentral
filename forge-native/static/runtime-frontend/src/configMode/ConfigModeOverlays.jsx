import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Badge, Button, Modal } from '../components/ui';
import { useConfigMode } from './ConfigModeContext';
import ConfigSidePanel from './ConfigSidePanel';

function ConfigModeOverlays() {
  const [portalTarget, setPortalTarget] = useState(null);
  const {
    canEdit,
    confirmDialog,
    confirmDialogAction,
    closeConfirmDialog,
    isSavingDraft,
    isPublishing,
  } = useConfigMode();

  useEffect(() => {
    if (typeof document !== 'undefined') {
      setPortalTarget(document.body);
    }
  }, []);

  if (!canEdit) return null;

  const confirmBusy = isSavingDraft || isPublishing;
  const confirmModal = (
    <Modal
      isOpen={Boolean(confirmDialog.isOpen)}
      onClose={closeConfirmDialog}
      title={confirmDialog.title}
      description={confirmDialog.description}
      size="md"
    >
      {confirmDialog.type === 'publish' && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Badge variant="default">Change Summary</Badge>
            <span className="text-xs text-text-secondary">
              {confirmDialog.totalFields} field{confirmDialog.totalFields === 1 ? '' : 's'} ready to publish
            </span>
          </div>
          {confirmDialog.sections.length > 0 ? (
            <ul className="space-y-2">
              {confirmDialog.sections.map((section) => (
                <li key={section.id} className="flex items-center justify-between rounded-lg border border-arena-border bg-arena-elevated px-3 py-2">
                  <span className="text-sm font-semibold text-text-primary">{section.label}</span>
                  <Badge variant="default">{section.count}</Badge>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-text-secondary">No changes were detected in the current draft.</p>
          )}
        </div>
      )}

      <Modal.Footer>
        <Button
          variant="secondary"
          onClick={closeConfirmDialog}
          disabled={confirmBusy}
        >
          Cancel
        </Button>
        <Button
          variant={confirmDialog.confirmVariant || 'primary'}
          onClick={confirmDialogAction}
          loading={confirmBusy}
        >
          {confirmDialog.confirmLabel || 'Confirm'}
        </Button>
      </Modal.Footer>
    </Modal>
  );

  if (!portalTarget) return null;

  return createPortal(
    <>
      <ConfigSidePanel />
      {confirmModal}
    </>,
    portalTarget
  );
}

export default ConfigModeOverlays;
