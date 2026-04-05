/**
 * EventsToolsRow — two-column: upcoming events + recently added tools.
 */

import type { EventRegistryItem, ArtifactListItem } from '../../types';

interface EventsToolsRowProps {
  events: EventRegistryItem[];
  artifacts: ArtifactListItem[];
  eventsLoading: boolean;
  artifactsLoading: boolean;
  onProposeHackDay: () => void;
  onViewArtifact: (id: string) => void;
}

function formatEventDate(event: EventRegistryItem): string {
  const dateStr = event.hackingStartsAt;
  if (!dateStr) return '\u2014';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  } catch {
    return '\u2014';
  }
}

function eventStatusClass(status: string): string {
  const s = status.toLowerCase();
  if (s === 'active' || s === 'running' || s === 'hacking') return 'hp-status-soon';
  if (s === 'published' || s === 'open') return 'hp-status-open';
  return 'hp-status-muted';
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
}: EventsToolsRowProps): JSX.Element {
  const displayEvents = events.slice(0, 3);
  const displayArtifacts = artifacts.slice(0, 4);

  return (
    <div className="hp-two-col" id="hp-events">
      {/* Upcoming Events */}
      <section className="hp-section" aria-label="Upcoming events">
        <div className="hp-eyebrow">Upcoming events</div>
        <div className="hp-card-title">HackDays</div>
        <div className="hp-card-sub">Register or pitch a challenge</div>

        <div className="hp-list">
          {eventsLoading ? (
            <>
              <div className="hp-skeleton" />
              <div className="hp-skeleton" />
              <div className="hp-skeleton" />
            </>
          ) : displayEvents.length === 0 ? (
            <p style={{ padding: '16px 0', textAlign: 'center', fontSize: 13, color: 'var(--text-soft)' }}>
              No upcoming events
            </p>
          ) : (
            displayEvents.map((ev) => (
              <div key={ev.id} className="hp-list-item">
                <div className="hp-date-badge">{formatEventDate(ev)}</div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div className="hp-item-name" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {ev.eventName}
                  </div>
                  {ev.tagline ? (
                    <div className="hp-item-meta">{ev.tagline}</div>
                  ) : null}
                </div>
                <span className={`hp-status-badge ${eventStatusClass(ev.lifecycleStatus)}`}>
                  {ev.lifecycleStatus}
                </span>
              </div>
            ))
          )}
        </div>

        <button type="button" className="hp-create-btn" onClick={onProposeHackDay}>
          + Propose a new HackDay
        </button>
      </section>

      {/* Recently Added Tools & Skills */}
      <section className="hp-section" aria-label="Recently added tools and skills" id="hp-tools">
        <div className="hp-eyebrow">Recently added</div>
        <div className="hp-card-title">Tools &amp; skills</div>
        <div className="hp-card-sub">Built by HackDay teams</div>

        <div className="hp-list">
          {artifactsLoading ? (
            <>
              <div className="hp-skeleton" />
              <div className="hp-skeleton" />
              <div className="hp-skeleton" />
              <div className="hp-skeleton" />
            </>
          ) : displayArtifacts.length === 0 ? (
            <p style={{ padding: '16px 0', textAlign: 'center', fontSize: 13, color: 'var(--text-soft)' }}>
              No tools or skills yet
            </p>
          ) : (
            displayArtifacts.map((art) => {
              const icon = artifactTypeIcon(art.artifactType);
              const isRecent = Date.now() - new Date(art.createdAt).getTime() < 7 * 24 * 60 * 60 * 1000;
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
                      {art.artifactType.charAt(0).toUpperCase() + art.artifactType.slice(1).replace('_', ' ')}
                      {art.description ? ` \u00B7 ${art.description}` : ''}
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
