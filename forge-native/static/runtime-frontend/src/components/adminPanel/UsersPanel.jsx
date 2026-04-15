/**
 * UsersPanel
 * Admin panel tab for user management: search, role change, and delete user.
 */

import { useState } from 'react';
import { Users, Trash2 } from 'lucide-react';
import { cn } from '../../lib/design-system';
import { Card, Badge, Button, Input, Select, SearchInput, Alert, Modal } from '../ui';
import { EmptyState } from '../ui/ErrorState';

/** Doc: standard card — white/gray-800, gray border, rounded-xl, shadow-sm light only */
const ADMIN_CARD_CLASS =
  'bg-[var(--surface-card)] border border-[var(--border-default)] rounded-xl shadow-[var(--shadow-card)]';

/** Doc: section labels (inside cards), doc §4 */
const ADMIN_SECTION_LABEL =
  'text-xs font-semibold tracking-wider text-[var(--text-muted)] uppercase pb-2';

/** Doc: primary accent teal only; no green/amber/red as decoration (roles are not status). */
const ROLE_CONFIG = {
  participant: { label: 'Participant' },
  ambassador: { label: 'Ambassador' },
  judge: { label: 'Judge' },
  admin: { label: 'Admin' },
};

function UsersPanel({ allUsers = [], onUpdateUserRole, onRefreshUsers, forgeHost }) {
  const [userSearch, setUserSearch] = useState('');
  const [showDeleteUserModal, setShowDeleteUserModal] = useState(false);
  const [userToDelete, setUserToDelete] = useState(null);
  const [deleteUserConfirmText, setDeleteUserConfirmText] = useState('');
  const [isDeletingUser, setIsDeletingUser] = useState(false);
  const [deleteUserStatus, setDeleteUserStatus] = useState(null);

  const filteredUsers = userSearch
    ? allUsers.filter((u) => {
        const search = userSearch.toLowerCase();
        return (
          u.name?.toLowerCase().includes(search) ||
          u.email?.toLowerCase().includes(search) ||
          u.role?.toLowerCase().includes(search)
        );
      })
    : allUsers;

  const handleDeleteUser = async () => {
    if (!userToDelete) return;

    if (deleteUserConfirmText !== 'DELETE') {
      setDeleteUserStatus({ type: 'error', message: 'Type DELETE exactly to confirm this action.' });
      return;
    }

    setDeleteUserStatus(null);
    setIsDeletingUser(true);

    try {
      if (forgeHost) {
        const { invoke } = await import('@forge/bridge');
        await invoke('adminDeleteRegistration', { userId: userToDelete.id });
      }

      setDeleteUserStatus({ type: 'success', message: `User "${userToDelete.name}" has been deleted successfully.` });
      setShowDeleteUserModal(false);
      setUserToDelete(null);
      setDeleteUserConfirmText('');

      await onRefreshUsers?.();
    } catch (err) {
      setDeleteUserStatus({ type: 'error', message: err?.message || 'Failed to delete user registration.' });
    } finally {
      setIsDeletingUser(false);
    }
  };

  return (
    <>
      <Card padding="md" className={ADMIN_CARD_CLASS}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4">
          <div>
            <Card.Title className="text-lg font-semibold text-gray-900 dark:text-white mb-1">User Management</Card.Title>
            <p className="text-sm sm:text-base leading-relaxed text-gray-700 dark:text-gray-300">
              Search by name, email, or role, then update user permissions.
            </p>
          </div>
          <SearchInput
            value={userSearch}
            onChange={(e) => setUserSearch(e.target.value)}
            onClear={() => setUserSearch('')}
            placeholder="Search users..."
            className="w-full sm:w-72"
          />
        </div>

        {filteredUsers.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className={cn('text-left py-3 px-4', ADMIN_SECTION_LABEL)}>Name</th>
                  <th className={cn('text-left py-3 px-4', ADMIN_SECTION_LABEL)}>Email</th>
                  <th className={cn('text-left py-3 px-4', ADMIN_SECTION_LABEL)}>Role</th>
                  <th className={cn('text-right py-3 px-4', ADMIN_SECTION_LABEL)}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.slice(0, 20).map((u) => (
                  <tr key={u.id} className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:bg-gray-800/50">
                    <td className="py-4 px-4 text-base font-semibold text-gray-900 dark:text-white">{u.name}</td>
                    <td className="py-4 px-4 text-sm sm:text-base text-gray-700 dark:text-gray-300">{u.email}</td>
                    <td className="py-4 px-4">
                      <Badge variant="default" size="sm" className="capitalize">
                        {u.role}
                      </Badge>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center justify-end gap-2">
                        <Select
                          value={u.role}
                          onChange={(newRole) => onUpdateUserRole?.(u.id, newRole)}
                          options={Object.entries(ROLE_CONFIG).map(([key, config]) => ({
                            value: key,
                            label: config.label,
                          }))}
                          size="sm"
                          className="w-32"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setUserToDelete(u);
                            setShowDeleteUserModal(true);
                            setDeleteUserConfirmText('');
                            setDeleteUserStatus(null);
                          }}
                          className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                          aria-label="Delete user"
                          title="Delete user registration"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredUsers.length > 20 && (
              <p className="text-sm sm:text-base text-gray-500 dark:text-gray-400 text-center py-4">
                Showing 20 of {filteredUsers.length} users. Use search to filter.
              </p>
            )}
          </div>
        ) : (
          <EmptyState
            icon={Users}
            title="No Users Found"
            message={userSearch ? 'Try a different search term' : 'No users registered yet'}
            compact
          />
        )}
      </Card>

      {/* Delete User Confirmation Modal */}
      <Modal
        isOpen={showDeleteUserModal}
        onClose={() => {
          setShowDeleteUserModal(false);
          setUserToDelete(null);
          setDeleteUserConfirmText('');
          setDeleteUserStatus(null);
        }}
        title="Delete User Registration"
        size="md"
      >
        <div className="space-y-4">
          {deleteUserStatus && (
            <Alert variant={deleteUserStatus.type === 'error' ? 'error' : 'success'}>
              {deleteUserStatus.message}
            </Alert>
          )}

          <p className="text-sm text-text-primary">
            This will permanently delete the registration for{' '}
            <strong className="text-text-primary">{userToDelete?.name}</strong>
            {' '}({userToDelete?.email}) and remove them from:
          </p>

          <ul className="text-sm text-text-primary list-disc list-inside space-y-1 ml-2">
            <li>All team memberships and pending join requests</li>
            <li>All notifications</li>
            <li>Team captain roles (if applicable)</li>
            <li>Judge scores and votes (if applicable)</li>
          </ul>

          <Alert variant="error">
            This action cannot be undone. The user will need to re-register to participate.
          </Alert>

          <Input
            label='Type "DELETE" to confirm'
            value={deleteUserConfirmText}
            onChange={(e) => setDeleteUserConfirmText(e.target.value)}
            placeholder="DELETE"
          />
        </div>

        <Modal.Footer>
          <Button
            variant="secondary"
            className="border border-[var(--border-default)] rounded-lg"
            onClick={() => {
              setShowDeleteUserModal(false);
              setUserToDelete(null);
              setDeleteUserConfirmText('');
              setDeleteUserStatus(null);
            }}
            disabled={isDeletingUser}
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={handleDeleteUser}
            loading={isDeletingUser}
            disabled={isDeletingUser || deleteUserConfirmText !== 'DELETE'}
          >
            Delete User
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}

export default UsersPanel;
