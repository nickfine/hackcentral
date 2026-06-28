/**
 * Archive — browse past HackDay events, their teams, submissions and pain points.
 */

import { useState, useEffect, useCallback } from 'react';
import { Calendar, Users, FileText, Flame, Trophy, ChevronLeft, ExternalLink } from 'lucide-react';
import { invokeEventScopedResolver } from '../lib/appModeResolverPayload';
import { Card, Badge, Alert } from './ui';
import { BackButton } from './shared';
import { VStack, HStack } from './layout';
import { cn } from '../lib/design-system';

// ============================================================================
// Helpers
// ============================================================================

function formatDateRange(startDate, endDate) {
  if (!startDate) return null;
  const fmt = (d) =>
    new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  return endDate ? `${fmt(startDate)} – ${fmt(endDate)}` : fmt(startDate);
}

// ============================================================================
// Award badge
// ============================================================================

const AWARD_LABELS = {
  winner: 'Grand Prize',
  runnerUp: 'Runner Up',
  thirdPlace: 'Third Place',
  peoplesChoice: "People's Choice",
};

function AwardBadge({ category }) {
  const label = AWARD_LABELS[category];
  if (!label) return null;
  const colours = {
    winner: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/40 dark:text-yellow-300',
    runnerUp: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
    thirdPlace: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
    peoplesChoice: 'bg-pink-100 text-pink-800 dark:bg-pink-900/40 dark:text-pink-300',
  };
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold', colours[category])}>
      {label}
    </span>
  );
}

// ============================================================================
// Team card (archive view — read-only)
// ============================================================================

function ArchiveTeamCard({ team, awardCategories = [] }) {
  const submitted = team.submission?.status === 'submitted';
  return (
    <div className="rounded-xl border border-arena-border bg-arena-card p-4 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-bold text-text-primary truncate">{team.name}</p>
          {submitted && team.submission?.projectName && (
            <p className="text-sm text-text-secondary truncate">{team.submission.projectName}</p>
          )}
        </div>
        <div className="flex flex-wrap gap-1 shrink-0">
          {awardCategories.map((cat) => <AwardBadge key={cat} category={cat} />)}
        </div>
      </div>

      {submitted && team.submission?.description && (
        <p className="text-sm text-text-secondary line-clamp-3">{team.submission.description}</p>
      )}

      {team.members?.length > 0 && (
        <p className="text-xs text-text-muted">
          {team.members.map((m) => m.name).join(', ')}
        </p>
      )}

      {team.painPoints?.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {team.painPoints.map((pp) => (
            <span
              key={pp._id || pp.id}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-300 text-xs"
            >
              <Flame className="w-3 h-3" />
              {pp.title}
            </span>
          ))}
        </div>
      )}

      {submitted && (team.submission?.repoUrl || team.submission?.liveDemoUrl || team.submission?.demoVideoUrl) && (
        <div className="flex flex-wrap gap-3 pt-1">
          {team.submission.repoUrl && (
            <a href={team.submission.repoUrl} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-brand hover:underline">
              <ExternalLink className="w-3 h-3" /> Repo
            </a>
          )}
          {team.submission.liveDemoUrl && (
            <a href={team.submission.liveDemoUrl} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-brand hover:underline">
              <ExternalLink className="w-3 h-3" /> Live Demo
            </a>
          )}
          {team.submission.demoVideoUrl && (
            <a href={team.submission.demoVideoUrl} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-brand hover:underline">
              <ExternalLink className="w-3 h-3" /> Video
            </a>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Event detail view
// ============================================================================

function EventDetail({ eventId, appModeResolverPayload, onBack }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [event, setEvent] = useState(null);
  const [teams, setTeams] = useState([]);
  const [painPoints, setPainPoints] = useState([]);
  const [activeTab, setActiveTab] = useState('submissions');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const { invoke } = await import('@forge/bridge');
        const result = await invokeEventScopedResolver(
          invoke, 'getArchivedEvent', appModeResolverPayload, { eventId }
        );
        if (cancelled) return;
        if (!result?.event) {
          setError('Event not found or not yet in results phase.');
          return;
        }
        setEvent(result.event);
        setTeams(result.teams || []);
        setPainPoints(result.painPoints || []);
      } catch (err) {
        if (!cancelled) setError(err?.message || 'Failed to load event.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [eventId, appModeResolverPayload]);

  if (loading) {
    return (
      <div className="p-6 text-center text-text-secondary text-sm">Loading event...</div>
    );
  }

  if (error || !event) {
    return (
      <div className="p-6">
        <BackButton onClick={onBack} label="All HackDays" />
        <Alert variant="error" className="mt-4">{error || 'Event not found.'}</Alert>
      </div>
    );
  }

  const awards = event.awards || {};
  // Build a map of teamId → award categories for quick lookup
  const awardsByTeam = {};
  const assign = (cat, id) => {
    if (!id) return;
    if (!awardsByTeam[id]) awardsByTeam[id] = [];
    awardsByTeam[id].push(cat);
  };
  assign('winner', awards.winner);
  assign('runnerUp', awards.runnerUp);
  assign('peoplesChoice', awards.peoplesChoice);
  (Array.isArray(awards.thirdPlace) ? awards.thirdPlace : awards.thirdPlace ? [awards.thirdPlace] : [])
    .forEach((id) => assign('thirdPlace', id));

  const submittedTeams = teams.filter((t) => t.submission?.status === 'submitted');
  const hasAwards = awards.winner || awards.runnerUp || awards.peoplesChoice ||
    (Array.isArray(awards.thirdPlace) ? awards.thirdPlace.length > 0 : !!awards.thirdPlace);

  const TABS = [
    { id: 'submissions', label: 'Submissions', count: submittedTeams.length, icon: FileText },
    { id: 'teams', label: 'All Teams', count: teams.length, icon: Users },
    ...(painPoints.length > 0 ? [{ id: 'painpoints', label: 'Pain Points', count: painPoints.length, icon: Flame }] : []),
  ];

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto">
      <BackButton onClick={onBack} label="All HackDays" />

      {/* Event header */}
      <div className="mt-4 mb-6">
        <h1 className="text-2xl font-black text-text-primary">{event.name}</h1>
        {event.startDate && (
          <p className="text-sm text-text-muted mt-1">
            {formatDateRange(event.startDate, event.endDate)}
          </p>
        )}
      </div>

      {/* Winners strip */}
      {hasAwards && (
        <div className="mb-6 rounded-xl border border-arena-border bg-arena-card p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-text-muted mb-3">Winners</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { cat: 'winner', id: awards.winner },
              { cat: 'runnerUp', id: awards.runnerUp },
              ...(Array.isArray(awards.thirdPlace) ? awards.thirdPlace : awards.thirdPlace ? [awards.thirdPlace] : [])
                .map((id) => ({ cat: 'thirdPlace', id })),
              { cat: 'peoplesChoice', id: awards.peoplesChoice },
            ]
              .filter((w) => w.id)
              .map(({ cat, id }, i) => {
                const team = teams.find((t) => t.id === id);
                return (
                  <div key={`${cat}-${i}`} className="rounded-lg bg-arena-elevated p-3">
                    <AwardBadge category={cat} />
                    <p className="mt-1.5 font-semibold text-text-primary text-sm">
                      {team?.name || id}
                    </p>
                    {team?.submission?.projectName && team.submission.projectName !== team.name && (
                      <p className="text-xs text-text-muted truncate">{team.submission.projectName}</p>
                    )}
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* Tab bar */}
      <div className="flex gap-2 mb-4 border-b border-arena-border">
        {TABS.map(({ id, label, count }) => (
          <button
            key={id}
            type="button"
            onClick={() => setActiveTab(id)}
            className={cn(
              'pb-2 px-1 text-sm font-semibold border-b-2 transition-colors',
              activeTab === id
                ? 'border-brand text-brand'
                : 'border-transparent text-text-secondary hover:text-text-primary'
            )}
          >
            {label}
            {count > 0 && (
              <span className="ml-1.5 text-xs font-normal text-text-muted">({count})</span>
            )}
          </button>
        ))}
      </div>

      {/* Submissions tab */}
      {activeTab === 'submissions' && (
        submittedTeams.length === 0 ? (
          <p className="text-sm text-text-secondary py-8 text-center">No submissions for this event.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {submittedTeams.map((team) => (
              <ArchiveTeamCard key={team.id} team={team} awardCategories={awardsByTeam[team.id] || []} />
            ))}
          </div>
        )
      )}

      {/* All teams tab */}
      {activeTab === 'teams' && (
        teams.length === 0 ? (
          <p className="text-sm text-text-secondary py-8 text-center">No teams for this event.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {teams.map((team) => (
              <ArchiveTeamCard key={team.id} team={team} awardCategories={awardsByTeam[team.id] || []} />
            ))}
          </div>
        )
      )}

      {/* Pain points tab */}
      {activeTab === 'painpoints' && (
        painPoints.length === 0 ? (
          <p className="text-sm text-text-secondary py-8 text-center">No pain points recorded for this event.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {painPoints.map((pp) => (
              <div key={pp._id || pp.id} className="rounded-xl border border-arena-border bg-arena-card p-4">
                <p className="font-semibold text-text-primary mb-1">{pp.title}</p>
                {pp.description && (
                  <p className="text-sm text-text-secondary line-clamp-4">{pp.description}</p>
                )}
                {(pp.effortEstimate || pp.impactEstimate) && (
                  <div className="flex gap-2 mt-2">
                    {pp.effortEstimate && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-arena-elevated text-text-muted">
                        Effort: {pp.effortEstimate}
                      </span>
                    )}
                    {pp.impactEstimate && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-arena-elevated text-text-muted">
                        Impact: {pp.impactEstimate}
                      </span>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )
      )}
    </div>
  );
}

// ============================================================================
// Event list (top level)
// ============================================================================

function EventListCard({ event, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left rounded-xl border border-arena-border bg-arena-card p-5 hover:border-brand/40 hover:shadow-md transition-all group"
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <p className="font-black text-text-primary text-lg group-hover:text-brand transition-colors">
            {event.name}
          </p>
          {event.startDate && (
            <p className="text-sm text-text-muted mt-0.5">
              {formatDateRange(event.startDate, event.endDate)}
            </p>
          )}
        </div>
        {event.winnerName && (
          <div className="shrink-0 text-right">
            <p className="text-xs text-text-muted mb-0.5">Grand Prize</p>
            <p className="text-sm font-semibold text-text-primary">{event.winnerName}</p>
          </div>
        )}
      </div>
      <div className="flex gap-4 text-sm text-text-secondary">
        <span className="flex items-center gap-1">
          <Users className="w-3.5 h-3.5" />
          {event.teamCount} {event.teamCount === 1 ? 'team' : 'teams'}
        </span>
        <span className="flex items-center gap-1">
          <FileText className="w-3.5 h-3.5" />
          {event.submissionCount} {event.submissionCount === 1 ? 'submission' : 'submissions'}
        </span>
      </div>
    </button>
  );
}

// ============================================================================
// Archive root
// ============================================================================

export default function Archive({ appModeResolverPayload, onNavigate }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [events, setEvents] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { invoke } = await import('@forge/bridge');
        const result = await invokeEventScopedResolver(
          invoke, 'getArchivedEvents', appModeResolverPayload, {}
        );
        if (!cancelled) setEvents(result?.events || []);
      } catch (err) {
        if (!cancelled) setError(err?.message || 'Failed to load archive.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [appModeResolverPayload]);

  if (selectedEventId) {
    return (
      <EventDetail
        eventId={selectedEventId}
        appModeResolverPayload={appModeResolverPayload}
        onBack={() => setSelectedEventId(null)}
      />
    );
  }

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto">
      <BackButton onClick={() => onNavigate('dashboard')} label="Dashboard" />

      <div className="mt-4 mb-6">
        <h1 className="text-2xl font-black text-text-primary">Past HackDays</h1>
        <p className="text-sm text-text-secondary mt-1">
          Browse every completed HackDay — teams, submissions and pain points, preserved.
        </p>
      </div>

      {loading && (
        <p className="text-sm text-text-secondary">Loading archive...</p>
      )}

      {error && (
        <Alert variant="error">{error}</Alert>
      )}

      {!loading && !error && events.length === 0 && (
        <div className="py-16 text-center">
          <Trophy className="w-10 h-10 mx-auto mb-3 text-text-muted" />
          <p className="text-text-secondary text-sm">No completed HackDays yet. Check back once the Results phase is published.</p>
        </div>
      )}

      {!loading && events.length > 0 && (
        <div className="flex flex-col gap-3">
          {events.map((event) => (
            <EventListCard
              key={event.id}
              event={event}
              onClick={() => setSelectedEventId(event.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
