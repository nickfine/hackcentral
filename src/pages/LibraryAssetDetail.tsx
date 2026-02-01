/**
 * Dedicated hack (asset) detail page — /library/:assetId
 * Renders full hack details; no modal.
 */

import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import type { Id } from '../../convex/_generated/dataModel';
import { AssetDetailContent } from '@/components/library/AssetDetailContent';

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
      <div className="space-y-6">
        <div className="py-8 text-center">
          <h1 className="text-xl font-semibold mb-2">Loading...</h1>
          <p className="text-muted-foreground">Loading hack details</p>
        </div>
      </div>
    );
  }

  if (asset === null) {
    return (
      <div className="space-y-6">
        <div className="card p-6">
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
    <div className="space-y-6">
      <div className="card p-6">
        <AssetDetailContent
          asset={asset}
          assetId={assetId as Id<'libraryAssets'>}
          onClose={() => navigate('/hacks?tab=completed')}
          onSelectAsset={(id) => navigate(`/library/${id}`)}
          closeLabel="Back to Completed Hacks"
        />
      </div>
    </div>
  );
}
