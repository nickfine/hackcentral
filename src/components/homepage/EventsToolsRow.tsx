/**
 * EventsToolsRow — two-column section.
 * Left: upcoming HackDay events.
 * Right: recently added tools & skills.
 */

import { Link } from 'react-router-dom';
import type { HackDayEventItem } from '../../../convex/hackdays';

type AssetType = 'prompt' | 'skill' | 'app';

interface LibraryAsset {
  _id: string;
  _creationTime: number;
  title: string;
  assetType: AssetType;
  status: string;
  description?: string;
}

interface EventsToolsRowProps {
  events: HackDayEventItem[] | null;
  eventsLoading: boolean;
  assets: LibraryAsset[] | undefined;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  } catch {
    return '—';
  }
}

function statusBadgeClass(status: string): string {
  const s = status.toLowerCase();
  if (s === 'active' || s === 'running') return 'bg-[rgba(221,110,66,0.1)] text-primary-600';
  if (s === 'open' || s === 'ready' || s === 'published') return 'bg-[rgba(47,111,94,0.1)] text-success';
  return 'bg-[rgba(20,33,61,0.08)] text-muted-foreground';
}

function assetTypeIcon(type: AssetType): { letter: string; className: string } {
  if (type === 'app') return { letter: 'A', className: 'bg-[rgba(47,111,94,0.12)] text-success' };
  if (type === 'skill') return { letter: 'S', className: 'bg-[rgba(20,33,61,0.08)] text-foreground' };
  return { letter: 'P', className: 'bg-[rgba(221,110,66,0.12)] text-primary' };
}

export function EventsToolsRow({ events, eventsLoading, assets }: EventsToolsRowProps) {
  const displayEvents = events?.slice(0, 3) ?? [];
  const recentAssets = assets
    ? [...assets].sort((a, b) => b._creationTime - a._creationTime).slice(0, 4)
    : [];

  return (
    <div className="grid grid-cols-1 gap-5 md:grid-cols-2" id="events">
      {/* Upcoming Events */}
      <section
        className="card p-7"
        style={{ boxShadow: 'var(--shadow-section)' }}
        aria-label="Upcoming events"
      >
        <div className="section-label mb-1.5 text-primary">Upcoming events</div>
        <h2 className="font-display text-lg font-semibold text-foreground">HackDays</h2>
        <p className="mb-4 text-[13px] text-muted-foreground">Register or pitch a challenge</p>

        <div className="flex flex-col gap-2">
          {eventsLoading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-14 animate-pulse rounded-[14px] bg-background" />
              ))}
            </div>
          ) : displayEvents.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              No upcoming events
            </p>
          ) : (
            displayEvents.map((ev) => (
              <div
                key={ev.id}
                className="flex items-center gap-2.5 rounded-[14px] border border-border bg-background px-3 py-2.5"
              >
                <div className="shrink-0 whitespace-nowrap rounded-lg bg-[rgba(47,111,94,0.1)] px-2 py-1 text-[11px] font-bold text-success">
                  {formatDate(ev.createdAt)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px] font-semibold text-foreground">
                    {ev.name}
                  </div>
                  {ev.primaryAdminEmail && (
                    <div className="truncate text-[11px] text-muted-foreground">
                      {ev.primaryAdminEmail}
                    </div>
                  )}
                </div>
                <span
                  className={`shrink-0 whitespace-nowrap rounded-full px-2.5 py-0.5 text-[10px] font-bold ${statusBadgeClass(ev.lifecycleStatus)}`}
                >
                  {ev.lifecycleStatus}
                </span>
              </div>
            ))
          )}
        </div>

        <Link
          to="/hackdays"
          className="mt-2.5 flex w-full items-center justify-center rounded-full border-[1.5px] border-dashed border-border py-2.5 text-[13px] font-semibold text-primary transition-colors hover:bg-background"
        >
          + Propose a new HackDay
        </Link>
      </section>

      {/* Recently Added Tools & Skills */}
      <section
        className="card p-7"
        style={{ boxShadow: 'var(--shadow-section)' }}
        aria-label="Recently added tools and skills"
        id="tools"
      >
        <div className="section-label mb-1.5 text-primary">Recently added</div>
        <h2 className="font-display text-lg font-semibold text-foreground">
          Tools &amp; skills
        </h2>
        <p className="mb-4 text-[13px] text-muted-foreground">Built by HackDay teams</p>

        <div className="flex flex-col gap-2">
          {!assets ? (
            <div className="space-y-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-14 animate-pulse rounded-[14px] bg-background" />
              ))}
            </div>
          ) : recentAssets.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">
              No tools or skills yet
            </p>
          ) : (
            recentAssets.map((asset) => {
              const icon = assetTypeIcon(asset.assetType);
              const isRecent =
                Date.now() - asset._creationTime < 7 * 24 * 60 * 60 * 1000;
              return (
                <Link
                  key={asset._id}
                  to={`/hacks?tab=completed`}
                  className="flex items-center gap-2.5 rounded-[14px] border border-border bg-background px-3 py-2.5 transition-colors hover:border-[rgba(20,33,61,0.2)]"
                >
                  <div
                    className={`flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-lg text-xs font-bold ${icon.className}`}
                  >
                    {icon.letter}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13px] font-semibold text-foreground">
                      {asset.title}
                    </div>
                    <div className="truncate text-[11px] text-muted-foreground">
                      {asset.assetType.charAt(0).toUpperCase() + asset.assetType.slice(1)}
                      {asset.description ? ` · ${asset.description}` : ''}
                    </div>
                  </div>
                  {isRecent && (
                    <span className="shrink-0 rounded-full bg-[rgba(221,110,66,0.1)] px-2 py-0.5 text-[10px] font-bold text-primary-600">
                      New
                    </span>
                  )}
                </Link>
              );
            })
          )}
        </div>
      </section>
    </div>
  );
}
