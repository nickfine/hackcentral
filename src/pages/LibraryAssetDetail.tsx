/**
 * Dedicated hack (asset) detail page — /library/:assetId
 * Renders full hack details; no modal.
 */

import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import { AssetDetailContent } from '@/components/library/AssetDetailContent';
import { SkeletonCard } from '@/components/shared';

export default function LibraryAssetDetail() {
  const { assetId } = useParams<{ assetId: string }>();
  const navigate = useNavigate();

  const asset = useQuery(
    api.libraryAssets.getById,
    assetId ? { assetId: assetId as Id<'libraryAssets'> } : 'skip'
  );

  if (!assetId) {
    navigate('/hacks?tab=completed', { replace: true });
    return null;
  }

  if (asset === undefined) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8 min-w-0 space-y-6">
        <SkeletonCard variant="wide" />
      </div>
    );
  }

  if (asset === null) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="rounded-xl border border-border bg-card shadow-sm p-8 text-center">
          <h1 className="text-xl font-semibold mb-2">Hack not found</h1>
          <p className="text-muted-foreground mb-4">
            This hack may be private or no longer available.
          </p>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => navigate('/hacks?tab=completed')}
          >
            Back to Completed Hacks
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8 min-w-0 space-y-6">
      <AssetDetailContent
        asset={asset}
        assetId={assetId as Id<'libraryAssets'>}
        onClose={() => navigate('/hacks?tab=completed')}
        onSelectAsset={(id) => navigate(`/library/${id}`)}
        closeLabel="Back to Completed Hacks"
      />
    </div>
  );
}
