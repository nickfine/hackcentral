/**
 * DeleteTeamModal
 * Confirmation modal for deleting a team (type-to-confirm pattern).
 */

import { Button, Input, Alert, Modal } from '../ui';

function DeleteTeamModal({
  isOpen,
  teamName,
  confirmText,
  setConfirmText,
  onConfirm,
  onCancel,
  isDeletingTeam,
  teamActionStatus,
}) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onCancel}
      title="Delete Team"
      size="md"
    >
      <div className="space-y-4">
        <p className="text-sm text-text-primary">
          This will permanently delete{' '}
          <strong className="text-text-primary">{teamName}</strong>
          , including members, pending requests, invites, and linked project data.
        </p>
        <Alert variant="warning">
          This action cannot be undone.
        </Alert>
        <Input
          label={`Type "${teamName}" to confirm`}
          value={confirmText}
          onChange={(event) => setConfirmText(event.target.value)}
          placeholder={teamName}
        />
      </div>
      <Modal.Footer>
        <Button
          variant="secondary"
          className="border border-gray-300 dark:border-gray-600 rounded-lg"
          onClick={onCancel}
          disabled={isDeletingTeam}
        >
          Cancel
        </Button>
        <Button
          variant="danger"
          onClick={onConfirm}
          loading={isDeletingTeam}
          disabled={isDeletingTeam || confirmText !== teamName}
        >
          Delete Team
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

export default DeleteTeamModal;
