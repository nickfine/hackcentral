/**
 * MessagingPanel
 * Admin panel tab for participant messaging (Message of the Day).
 */

import { Card, Button, Badge, Input, TextArea, Select, Alert } from '../ui';
import { VStack } from '../layout';

/** Doc: standard card - white/gray-800, gray border, rounded-xl, shadow-sm light only */
const ADMIN_CARD_CLASS =
  'bg-[var(--surface-card)] border border-[var(--border-default)] rounded-xl shadow-[var(--shadow-card)]';

/** Doc: section labels (inside cards), doc §4 */
const ADMIN_SECTION_LABEL =
  'text-xs font-semibold tracking-wider text-[var(--text-muted)] uppercase pb-2';

/** Doc: primary button - teal only, rounded-lg */
const ADMIN_PRIMARY_BUTTON = 'admin-brand-button !rounded-lg';

const MESSAGE_PRIORITY_OPTIONS = [
  { value: 'info', label: 'Info' },
  { value: 'warning', label: 'Warning' },
  { value: 'urgent', label: 'Urgent' },
];

function MessagingPanel({
  motdMessage,
  setMotdMessage,
  settingsError,
  messagingStatus,
  isSavingMotd,
  isLoadingSettings,
  onSave,
}) {
  return (
    <Card padding="md" className={ADMIN_CARD_CLASS}>
      <Card.Title className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Participant Messaging</Card.Title>
      <p className="text-sm sm:text-base leading-relaxed text-gray-700 dark:text-gray-300 mb-5">
        Publish an admin message to show in a dedicated dashboard pod for all participants.
      </p>

      {settingsError && (
        <Alert variant="warning" className="mb-4">
          {settingsError}
        </Alert>
      )}

      {messagingStatus && (
        <Alert variant={messagingStatus.type} className="mb-4">
          {messagingStatus.message}
        </Alert>
      )}

      <VStack gap="5">
        <Input
          label="Message Title"
          value={motdMessage.title}
          onChange={(e) => setMotdMessage((prev) => ({ ...prev, title: e.target.value }))}
          placeholder="Optional short title..."
          helperText="Shown as the heading in the participant message panel."
          disabled={isSavingMotd || isLoadingSettings}
        />

        <Select
          label="Priority"
          value={motdMessage.priority}
          onChange={(value) => setMotdMessage((prev) => ({ ...prev, priority: value || 'info' }))}
          options={MESSAGE_PRIORITY_OPTIONS}
          disabled={isSavingMotd || isLoadingSettings}
        />

        <TextArea
          label="Message of the Day"
          value={motdMessage.message}
          onChange={(e) => setMotdMessage((prev) => ({ ...prev, message: e.target.value }))}
          placeholder="Share updates, reminders, or announcements for all participants..."
          helperText="This appears in a dashboard message pod only when a message is set."
          rows={4}
          disabled={isSavingMotd || isLoadingSettings}
        />

        <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
          <span>Leave blank and save to hide the message pod.</span>
          <span className={motdMessage.message.length > 500 ? 'text-error font-semibold' : ''}>
            {motdMessage.message.length}/500
          </span>
        </div>

        {motdMessage.message.trim() && (
          <div className="p-5 rounded-xl border border-[color-mix(in_srgb,var(--accent)_30%,transparent)] bg-[color-mix(in_srgb,var(--accent)_10%,transparent)]">
            <div className="flex items-center justify-between mb-2">
              <p className={ADMIN_SECTION_LABEL}>
                Preview
              </p>
              <Badge
                variant={
                  motdMessage.priority === 'urgent'
                    ? 'error'
                    : motdMessage.priority === 'warning'
                      ? 'warning'
                      : 'default'
                }
              >
                {(motdMessage.priority || 'info').toUpperCase()}
              </Badge>
            </div>
            {(motdMessage.title || '').trim() && (
              <p className="text-sm font-bold text-gray-900 dark:text-white mb-1">{motdMessage.title.trim()}</p>
            )}
            <p className="text-sm text-gray-900 dark:text-white whitespace-pre-wrap">{motdMessage.message.trim()}</p>
            {(motdMessage.updatedAt || motdMessage.updatedBy) && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                Last update: {motdMessage.updatedBy || 'Admin'}
                {motdMessage.updatedAt ? ` • ${new Date(motdMessage.updatedAt).toLocaleString()}` : ''}
              </p>
            )}
          </div>
        )}

        <Button
          className={`mt-2 ${ADMIN_PRIMARY_BUTTON}`}
          onClick={onSave}
          loading={isSavingMotd}
          disabled={isLoadingSettings || motdMessage.message.length > 500 || motdMessage.title.length > 80}
        >
          {isSavingMotd ? 'Saving...' : 'Save Message'}
        </Button>
      </VStack>
    </Card>
  );
}

export default MessagingPanel;
