/**
 * PainPointsPanel
 * Displays pain points linked to a team, with search-to-link and unlink controls for captains.
 */

import { useState, useEffect } from 'react';
import { invokeEventScopedResolver } from '../../lib/appModeResolverPayload';

/** Section label class - matches TeamDetail's SECTION_LABEL_CLASS. */
const SECTION_LABEL_CLASS = 'pb-2 text-xs font-semibold tracking-wider text-text-secondary uppercase';

const EDITABLE_PHASES = ['signup', 'team_formation'];

function PainPointsPanel({ teamId, eventId, isCaptain, appModeResolverPayload, onPainPointsChange, eventPhase }) {
  const [teamPainPoints, setTeamPainPoints] = useState([]);
  const [allPainPoints, setAllPainPoints] = useState([]);
  const [painPointsLoading, setPainPointsLoading] = useState(false);
  const [painPointSearch, setPainPointSearch] = useState('');
  const [painPointStatus, setPainPointStatus] = useState(null);

  useEffect(() => {
    if (!teamId || !appModeResolverPayload) return;
    let cancelled = false;
    setPainPointsLoading(true);
    (async () => {
      try {
        const { invoke } = await import('@forge/bridge');
        const [teamResult, allResult] = await Promise.all([
          invokeEventScopedResolver(invoke, 'getTeamPainPoints', appModeResolverPayload, { teamId }),
          invokeEventScopedResolver(invoke, 'getPainPoints', appModeResolverPayload, { sortBy: 'reactions', limit: 100 }),
        ]);
        if (!cancelled) {
          const pts = teamResult?.painPoints ?? [];
          setTeamPainPoints(pts);
          setAllPainPoints(allResult?.painPoints ?? []);
          onPainPointsChange?.(pts.length);
        }
      } catch {
        // silent
      } finally {
        if (!cancelled) setPainPointsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [teamId, appModeResolverPayload]);

  const handleLinkPainPoint = async (painPointId) => {
    if (!teamId) return;
    try {
      const { invoke } = await import('@forge/bridge');
      await invokeEventScopedResolver(invoke, 'assignPainPointsToTeam', appModeResolverPayload, {
        teamId,
        eventId: eventId || '',
        painPointIds: [painPointId],
      });
      const pp = allPainPoints.find((p) => p._id === painPointId);
      if (pp) setTeamPainPoints((prev) => { const next = [...prev, pp]; onPainPointsChange?.(next.length); return next; });
      setPainPointStatus({ type: 'success', message: 'Pain point linked.' });
      setTimeout(() => setPainPointStatus(null), 3000);
    } catch {
      setPainPointStatus({ type: 'error', message: 'Failed to link pain point.' });
    }
  };

  const handleUnlinkPainPoint = async (painPointId) => {
    if (!teamId) return;
    try {
      const { invoke } = await import('@forge/bridge');
      await invokeEventScopedResolver(invoke, 'unassignPainPointFromTeam', appModeResolverPayload, {
        teamId,
        painPointId,
      });
      setTeamPainPoints((prev) => { const next = prev.filter((p) => p._id !== painPointId); onPainPointsChange?.(next.length); return next; });
    } catch {
      setPainPointStatus({ type: 'error', message: 'Failed to unlink pain point.' });
    }
  };

  return (
    <section className="px-5 py-4 border-b border-arena-border">
      <h3 className={SECTION_LABEL_CLASS}>Pain Points</h3>
      <p className="text-xs text-text-secondary mb-2">Problems this team is tackling.</p>

      {painPointStatus && (
        <div className={`mb-2 rounded-lg px-3 py-2 text-xs ${painPointStatus.type === 'error' ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400' : 'bg-teal-50 dark:bg-teal-900/20 text-teal-700 dark:text-teal-400'}`}>
          {painPointStatus.message}
        </div>
      )}

      {/* Linked pain point */}
      {teamPainPoints.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {teamPainPoints.map((pp) => (
            <span key={pp._id} className="inline-flex items-center gap-1 rounded-full bg-teal-500/10 border border-teal-500/30 px-2.5 py-0.5 text-xs text-teal-700 dark:text-teal-300">
              🔥 {pp.title}
              {isCaptain && EDITABLE_PHASES.includes(eventPhase) && (
                <button
                  type="button"
                  onClick={() => handleUnlinkPainPoint(pp._id)}
                  className="ml-0.5 text-teal-500 hover:text-teal-700 dark:hover:text-teal-200"
                  aria-label="Remove"
                >
                  ×
                </button>
              )}
            </span>
          ))}
        </div>
      )}

      {/* Search to add - only when no pain point linked yet and phase allows editing */}
      {isCaptain && EDITABLE_PHASES.includes(eventPhase) && teamPainPoints.length === 0 && (
        <div>
          <input
            type="text"
            value={painPointSearch}
            onChange={(e) => setPainPointSearch(e.target.value)}
            placeholder="Search pain points to link…"
            className="w-full rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 px-3 py-1.5 text-sm text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 mb-1"
          />
          {painPointsLoading ? (
            <div className="h-8 animate-pulse rounded bg-gray-100 dark:bg-gray-700" />
          ) : painPointSearch ? (
            <ul className="max-h-36 overflow-y-auto rounded-lg border border-gray-200 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-700">
              {allPainPoints
                .filter((pp) => {
                  const linked = teamPainPoints.some((t) => t._id === pp._id);
                  const q = painPointSearch.toLowerCase();
                  return !linked && (pp.title?.toLowerCase().includes(q) || pp.submitterName?.toLowerCase().includes(q));
                })
                .slice(0, 20)
                .map((pp) => (
                  <li key={pp._id}>
                    <button
                      type="button"
                      onClick={() => { handleLinkPainPoint(pp._id); setPainPointSearch(''); }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm bg-white dark:bg-gray-800 text-text-primary hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
                    >
                      <span className="flex-1 truncate">{pp.title}</span>
                      <span className="text-[10px] text-text-secondary">🔥 {pp.reactionCount}</span>
                    </button>
                  </li>
                ))}
              {allPainPoints.filter((pp) => {
                const linked = teamPainPoints.some((t) => t._id === pp._id);
                const q = painPointSearch.toLowerCase();
                return !linked && (pp.title?.toLowerCase().includes(q) || pp.submitterName?.toLowerCase().includes(q));
              }).length === 0 && (
                <li className="px-3 py-2 text-sm text-text-secondary text-center">No matches</li>
              )}
            </ul>
          ) : null}
        </div>
      )}

      {!painPointsLoading && teamPainPoints.length === 0 && !isCaptain && (
        <p className="text-sm text-text-secondary italic">No pain points linked yet.</p>
      )}
    </section>
  );
}

export default PainPointsPanel;
