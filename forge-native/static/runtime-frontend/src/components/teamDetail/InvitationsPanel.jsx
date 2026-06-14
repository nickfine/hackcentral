/**
 * InvitationsPanel
 * Captain-only panel: invite free agents + track sent invite status with resend.
 */

import { useState, useEffect, useCallback } from 'react';
import { invokeEventScopedResolver } from '../../lib/appModeResolverPayload';
import { EDITABLE_PHASES } from '../../data/constants';
import Avatar from '../ui/Avatar';
import Modal from '../ui/Modal';
import Button from '../ui/Button';

const STATUS_PILL = {
  PENDING: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
  ACCEPTED: 'bg-[var(--accent-subtle)] text-[var(--accent)]',
  DECLINED: 'bg-gray-100 dark:bg-gray-700 text-gray-500',
  EXPIRED: 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400',
};

function formatTimeAgo(dateStr) {
  if (!dateStr) return '';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

function InvitationsPanel({
  teamId,
  teamName,
  isCaptain,
  freeAgents = [],
  appModeResolverPayload,
  eventPhase,
  onNavigate,
}) {
  const [sentInvites, setSentInvites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [inviteAgent, setInviteAgent] = useState(null);
  const [inviteMessage, setInviteMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [resendingId, setResendingId] = useState(null);
  const [status, setStatus] = useState(null);

  const canInvite = EDITABLE_PHASES.includes(eventPhase);

  const refreshInvites = useCallback(async () => {
    if (!isCaptain || !teamId || !appModeResolverPayload) return;
    try {
      const { invoke } = await import('@forge/bridge');
      const result = await invokeEventScopedResolver(invoke, 'getSentInvites', appModeResolverPayload, { teamId });
      setSentInvites(result?.invites || []);
    } catch {
      // silent
    }
  }, [isCaptain, teamId, appModeResolverPayload]);

  useEffect(() => {
    if (!isCaptain || !teamId || !appModeResolverPayload) {
      setLoading(false);
      return undefined;
    }
    let cancelled = false;
    (async () => {
      try {
        const { invoke } = await import('@forge/bridge');
        const result = await invokeEventScopedResolver(invoke, 'getSentInvites', appModeResolverPayload, { teamId });
        if (!cancelled) setSentInvites(result?.invites || []);
      } catch {
        // silent
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [isCaptain, teamId, appModeResolverPayload]);

  if (!isCaptain) return null;

  const pendingOrAcceptedIds = new Set(
    sentInvites
      .filter((inv) => inv.status === 'PENDING' || inv.status === 'ACCEPTED')
      .map((inv) => inv.userId)
  );
  const invitableAgents = freeAgents.filter((a) => !pendingOrAcceptedIds.has(a.id));
  const visibleAgents = invitableAgents.slice(0, 5);
  const hasSentInvites = sentInvites.length > 0;

  if (!loading && !canInvite && !hasSentInvites) return null;

  const handleSendInvite = async () => {
    if (!inviteAgent) return;
    setBusy(true);
    try {
      const { invoke } = await import('@forge/bridge');
      await invokeEventScopedResolver(invoke, 'sendInvite', appModeResolverPayload, {
        teamId,
        userId: inviteAgent.id,
        message: inviteMessage.trim() || null,
      });
      setStatus({ type: 'success', message: `Invite sent to ${inviteAgent.name}` });
      setInviteAgent(null);
      setInviteMessage('');
      await refreshInvites();
    } catch (e) {
      setStatus({ type: 'error', message: e.message || 'Failed to send invite' });
    } finally {
      setBusy(false);
    }
  };

  const handleResend = async (inviteId) => {
    setResendingId(inviteId);
    try {
      const { invoke } = await import('@forge/bridge');
      await invokeEventScopedResolver(invoke, 'resendInvite', appModeResolverPayload, { inviteId });
      await refreshInvites();
      setStatus({ type: 'success', message: 'Invite resent — expires in 7 days' });
    } catch (e) {
      setStatus({ type: 'error', message: e.message || 'Failed to resend invite' });
    } finally {
      setResendingId(null);
    }
  };

  return (
    <>
      <div className="mt-4 pt-4 border-t border-arena-border">
        <p className="text-xs font-semibold tracking-wider text-text-secondary uppercase pb-2">
          Invitations
        </p>

        {status && (
          <div
            className={`mb-3 flex items-start justify-between gap-2 rounded-lg px-3 py-2 text-xs ${
              status.type === 'error'
                ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400'
                : 'bg-[var(--accent-subtle)] text-[var(--accent)]'
            }`}
          >
            <span>{status.message}</span>
            <button
              type="button"
              onClick={() => setStatus(null)}
              className="opacity-60 hover:opacity-100 flex-shrink-0"
              aria-label="Dismiss"
            >
              ×
            </button>
          </div>
        )}

        {/* Invite a teammate — shown when phase allows */}
        {canInvite && (
          <div className="mb-4">
            <p className="text-xs text-text-secondary mb-2">Free agents looking for a team</p>
            {loading ? (
              <div className="space-y-2">
                {[1, 2].map((i) => (
                  <div key={i} className="h-10 animate-pulse rounded-lg bg-arena-elevated" />
                ))}
              </div>
            ) : visibleAgents.length > 0 ? (
              <div className="space-y-2">
                {visibleAgents.map((agent) => (
                  <div
                    key={agent.id}
                    className="flex items-center gap-2 rounded-lg border border-arena-border bg-arena-elevated/40 px-3 py-2"
                  >
                    <Avatar user={agent} size="sm" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-text-primary truncate">{agent.name}</p>
                      {agent.skills?.length > 0 && (
                        <p className="text-xs text-text-secondary truncate">
                          {agent.skills.slice(0, 2).join(', ')}
                        </p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => { setInviteAgent(agent); setInviteMessage(''); }}
                      className="flex-shrink-0 text-xs font-semibold px-2.5 py-1 rounded-md bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white transition-colors"
                    >
                      Invite
                    </button>
                  </div>
                ))}
                {invitableAgents.length > 5 && (
                  <button
                    type="button"
                    onClick={() => onNavigate?.('marketplace', { tab: 'agents' })}
                    className="text-xs text-[var(--accent)] hover:underline mt-1"
                  >
                    View all {invitableAgents.length} free agents →
                  </button>
                )}
              </div>
            ) : (
              <p className="text-xs text-text-secondary italic">
                {freeAgents.length === 0 ? 'No free agents available' : 'All free agents already invited'}
              </p>
            )}
          </div>
        )}

        {/* Sent invites tracker */}
        {hasSentInvites && (
          <div>
            <p className="text-xs font-medium text-text-secondary mb-2">Sent invites</p>
            <div className="space-y-2">
              {sentInvites.map((invite) => (
                <div
                  key={invite.id}
                  className="flex items-center gap-2 rounded-lg border border-arena-border px-3 py-2"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text-primary truncate">{invite.userName}</p>
                    <p className="text-xs text-text-secondary">{formatTimeAgo(invite.createdAt)}</p>
                  </div>
                  <span
                    className={`flex-shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full ${STATUS_PILL[invite.status] || STATUS_PILL.PENDING}`}
                  >
                    {invite.status}
                  </span>
                  {invite.status === 'EXPIRED' && (
                    <button
                      type="button"
                      onClick={() => handleResend(invite.id)}
                      disabled={resendingId === invite.id}
                      className="flex-shrink-0 text-xs font-semibold px-2 py-0.5 rounded-md border border-arena-border text-text-secondary hover:text-text-primary transition-colors disabled:opacity-50"
                    >
                      {resendingId === invite.id ? '…' : 'Resend'}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Send Invite Modal */}
      <Modal
        isOpen={!!inviteAgent}
        onClose={() => { setInviteAgent(null); setInviteMessage(''); }}
        title={`Invite ${inviteAgent?.name || ''}`}
        description={`Send a personal invite to join ${teamName || 'your team'}`}
        size="sm"
      >
        <div className="space-y-4">
          <textarea
            value={inviteMessage}
            onChange={(e) => setInviteMessage(e.target.value)}
            placeholder="Tell them why you'd love them on the team (optional)…"
            className="w-full p-3 border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 text-text-primary placeholder:text-gray-500 dark:placeholder:text-gray-400 rounded-lg resize-none focus-ring-control transition-all"
            rows={3}
          />
        </div>
        <Modal.Footer>
          <Button
            variant="secondary"
            className="border border-gray-300 dark:border-gray-600 rounded-lg"
            onClick={() => { setInviteAgent(null); setInviteMessage(''); }}
          >
            Cancel
          </Button>
          <Button
            className="bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white rounded-lg"
            onClick={handleSendInvite}
            loading={busy}
          >
            Send Invite
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}

export default InvitationsPanel;
