import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Button, Modal } from '../components/ui';
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
      closeOnBackdrop={!confirmBusy}
      closeOnEscape={!confirmBusy}
      showCloseButton={!confirmBusy}
    >
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
