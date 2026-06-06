import type { EventRegistryItem, ArtifactListItem } from '../../types';

interface EventsToolsRowProps {
  events: EventRegistryItem[];
  artifacts: ArtifactListItem[];
  eventsLoading: boolean;
  artifactsLoading: boolean;
  onProposeHackDay: () => void;
  onViewArtifact: (id: string) => void;
  onViewAllEvents: () => void;
}

function formatEventDate(event: EventRegistryItem): string {
  const dateStr = event.hackingStartsAt;
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  } catch {
    return '—';
  }
}

function eventStatusMod(status: string): string {
  const s = status.toLowerCase();
  if (s === 'active' || s === 'running' || s === 'hacking') return 'live';
  if (s === 'published' || s === 'open') return 'open';
  return 'soon';
}

function eventStatusLabel(status: string): string {
  const s = status.toLowerCase();
  if (s === 'active' || s === 'running' || s === 'hacking') return 'Live now';
  if (s === 'published' || s === 'open') return 'Registration open';
  return 'Coming soon';
}

function artifactTypeIcon(type: string): { letter: string; className: string } {
  if (type === 'skill') return { letter: 'S', className: 'hp-tool-icon hp-tool-icon-skill' };
  if (type === 'template' || type === 'code_snippet') return { letter: 'T', className: 'hp-tool-icon hp-tool-icon-app' };
  return { letter: 'P', className: 'hp-tool-icon hp-tool-icon-prompt' };
}

export function EventsToolsRow({
  events,
  artifacts,
  eventsLoading,
  artifactsLoading,
  onProposeHackDay,
  onViewArtifact,
  onViewAllEvents,
}: EventsToolsRowProps): JSX.Element {
  const displayEvents = events.slice(0, 3);
  const displayArtifacts = artifacts.slice(0, 4);

  return (
    <div className="hp-events-tools">
      {/* Events — full-width, prominent */}
      <section className="hp-section" aria-label="Upcoming HackDays" id="hp-events">
        <div className="hp-eyebrow">Upcoming events</div>
        <div className="hp-sec-title">HackDays</div>
        <div className="hp-sec-sub">Register now or propose a challenge for the next one.</div>

        <div className="hp-event-cards">
          {eventsLoading ? (
            Array.from({ length: 2 }, (_, i) => (
              <div key={i} className="hp-skeleton" style={{ height: 100 }} />
            ))
          ) : displayEvents.length === 0 ? (
            <p style={{ padding: '16px 0', fontSize: 13, color: 'var(--text-soft)' }}>
              No upcoming events scheduled yet.
            </p>
          ) : (
            displayEvents.map((ev) => (
              <div key={ev.id} className="hp-event-card">
                <div className="hp-event-card-header">
                  <div className="hp-event-card-name">{ev.eventName}</div>
                  <span className={`hp-status-badge hp-status-${eventStatusMod(ev.lifecycleStatus)}`}>
                    {eventStatusLabel(ev.lifecycleStatus)}
                  </span>
                </div>
                {ev.tagline && <div className="hp-event-card-tagline">{ev.tagline}</div>}
                <div className="hp-event-card-footer">
                  {formatEventDate(ev) !== '—' && (
                    <span className="hp-date-badge">{formatEventDate(ev)}</span>
                  )}
                  {ev.isNavigable && (
                    <button
                      type="button"
                      className="hp-event-card-cta"
                      onClick={onViewAllEvents}
                    >
                      {eventStatusMod(ev.lifecycleStatus) === 'open' ? 'Register' : 'View'} &rsaquo;
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        <button type="button" className="hp-create-btn" onClick={onProposeHackDay}>
          + Propose a new HackDay
        </button>
      </section>

      {/* Tools — compact list, below events */}
      <section className="hp-section" aria-label="Recently added tools and skills" id="hp-tools">
        <div className="hp-eyebrow">Recently added</div>
        <div className="hp-card-title">Tools &amp; skills</div>
        <div className="hp-card-sub">Built by HackDay teams</div>

        <div className="hp-list">
          {artifactsLoading ? (
            Array.from({ length: 3 }, (_, i) => (
              <div key={i} className="hp-skeleton" />
            ))
          ) : displayArtifacts.length === 0 ? (
            <p style={{ padding: '16px 0', textAlign: 'center', fontSize: 13, color: 'var(--text-soft)' }}>
              No tools or skills yet
            </p>
          ) : (
            displayArtifacts.map((art) => {
              const icon = artifactTypeIcon(art.artifactType);
              const isRecent = Date.now() - new Date(art.createdAt).getTime() < 7 * 24 * 60 * 60 * 1000;
              const typeLabel = art.artifactType.charAt(0).toUpperCase() + art.artifactType.slice(1).replace('_', ' ');
              return (
                <button
                  key={art.id}
                  type="button"
                  className="hp-list-item"
                  onClick={() => onViewArtifact(art.id)}
                  style={{ cursor: 'pointer', textAlign: 'left', width: '100%' }}
                >
                  <div className={icon.className}>{icon.letter}</div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div className="hp-item-name" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {art.title}
                    </div>
                    <div className="hp-item-meta">
                      {typeLabel}
                      {art.authorName ? ` · Built by ${art.authorName}` : ''}
                    </div>
                  </div>
                  {isRecent ? <span className="hp-tool-new">New</span> : null}
                </button>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
}
