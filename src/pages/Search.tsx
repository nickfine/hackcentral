/**
 * Search Page - Global search across Library and People
 * Reads q from URL; shows combined results from assets and profiles.
 */

import { useSearchParams, Link } from 'react-router-dom';
import { Search as SearchIcon, BookOpen, Users } from 'lucide-react';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import { getInitials } from '../lib/utils';

const ASSET_TYPE_LABELS: Record<string, string> = {
  prompt: 'Prompt',
  template: 'Template',
  agent_blueprint: 'Agent Blueprint',
  guardrail: 'Guardrail',
  evaluation_rubric: 'Evaluation Rubric',
  structured_output: 'Structured Output',
};

function matchAsset(query: string, asset: { title: string; description?: string; assetType: string; metadata?: unknown }): boolean {
  if (!query.trim()) return true;
  const q = query.toLowerCase().trim();
  const titleMatch = asset.title.toLowerCase().includes(q);
  const descMatch = asset.description?.toLowerCase().includes(q);
  const typeMatch = asset.assetType.replace('_', ' ').toLowerCase().includes(q);
  const meta = asset.metadata as { intendedUser?: string; context?: string; limitations?: string; riskNotes?: string } | undefined;
  const metaParts = meta
    ? [meta.intendedUser, meta.context, meta.limitations, meta.riskNotes].filter((x): x is string => typeof x === 'string')
    : [];
  const metaText = metaParts.join(' ').toLowerCase();
  const metaMatch = metaText.length > 0 && metaText.includes(q);
  return titleMatch || descMatch || typeMatch || metaMatch;
}

function matchProfile(query: string, profile: { fullName?: string; email: string }): boolean {
  if (!query.trim()) return true;
  const q = query.toLowerCase().trim();
  const nameMatch = profile.fullName?.toLowerCase().includes(q);
  const emailMatch = profile.email.toLowerCase().includes(q);
  return !!nameMatch || emailMatch;
}

export default function Search() {
  const [searchParams] = useSearchParams();
  const q = searchParams.get('q') ?? '';

  const allAssets = useQuery(api.libraryAssets.listWithReuseCounts, {});
  const profiles = useQuery(api.profiles.list);

  const filteredAssets = allAssets === undefined ? [] : allAssets.filter((a) => matchAsset(q, a));
  const filteredProfiles = profiles === undefined ? [] : profiles.filter((p) => matchProfile(q, p));

  const limit = 10;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Search</h1>
        <p className="text-muted-foreground mt-1">
          {q ? `Results for "${q}"` : 'Enter a search term above to find library assets and people.'}
        </p>
      </div>

      {!q && (
        <div className="card p-8 text-center text-muted-foreground">
          <SearchIcon className="h-12 w-12 mx-auto mb-3 opacity-50" />
          <p>Use the search bar in the header to search across Library and People.</p>
        </div>
      )}

      {q && (
        <>
          {/* Library results */}
          <section>
            <h2 className="text-lg font-semibold flex items-center gap-2 mb-3">
              <BookOpen className="h-5 w-5 text-muted-foreground" />
              Library ({filteredAssets.length})
            </h2>
            {allAssets === undefined ? (
              <div className="card p-4 text-muted-foreground">Loading…</div>
            ) : filteredAssets.length === 0 ? (
              <p className="text-muted-foreground text-sm">No library assets match.</p>
            ) : (
              <ul className="space-y-2">
                {filteredAssets.slice(0, limit).map((asset) => (
                  <li key={asset._id}>
                    <Link
                      to={`/library?q=${encodeURIComponent(q)}`}
                      className="block card p-3 hover:bg-accent/50 transition-colors rounded-lg"
                    >
                      <span className="font-medium">{asset.title}</span>
                      <span className="text-muted-foreground text-sm ml-2">
                        {ASSET_TYPE_LABELS[asset.assetType] ?? asset.assetType}
                      </span>
                      {asset.description && (
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-1">{asset.description}</p>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            {filteredAssets.length > limit && (
              <Link to={`/library?q=${encodeURIComponent(q)}`} className="btn btn-ghost btn-sm mt-2">
                View all {filteredAssets.length} assets →
              </Link>
            )}
          </section>

          {/* People results */}
          <section>
            <h2 className="text-lg font-semibold flex items-center gap-2 mb-3">
              <Users className="h-5 w-5 text-muted-foreground" />
              People ({filteredProfiles.length})
            </h2>
            {profiles === undefined ? (
              <div className="card p-4 text-muted-foreground">Loading…</div>
            ) : filteredProfiles.length === 0 ? (
              <p className="text-muted-foreground text-sm">No people match.</p>
            ) : (
              <ul className="space-y-2">
                {filteredProfiles.slice(0, limit).map((profile) => (
                  <li key={profile._id}>
                    <Link
                      to={`/people?q=${encodeURIComponent(q)}`}
                      className="flex items-center gap-3 card p-3 hover:bg-accent/50 transition-colors rounded-lg"
                    >
                      <div
                        className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium text-primary"
                        aria-hidden
                      >
                        {getInitials(profile.fullName, profile.email)}
                      </div>
                      <div>
                        <span className="font-medium">{profile.fullName ?? 'No name'}</span>
                        <span className="text-muted-foreground text-sm block">{profile.email}</span>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            {filteredProfiles.length > limit && (
              <Link to={`/people?q=${encodeURIComponent(q)}`} className="btn btn-ghost btn-sm mt-2">
                View all {filteredProfiles.length} people →
              </Link>
            )}
          </section>
        </>
      )}
    </div>
  );
}
