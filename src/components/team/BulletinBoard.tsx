/**
 * Bulletin Board Component
 * Displays help requests in a card grid with filters
 */

import { useState } from 'react';
import { MessageSquare, Plus, Clock, CheckCircle2 } from 'lucide-react';
import { useQuery, useMutation } from 'convex/react';
import toast from 'react-hot-toast';
import { api } from '../../../convex/_generated/api';
import type { Id } from '../../../convex/_generated/dataModel';
import { EmptyState, SkeletonGrid } from '@/components/shared';
import { PostHelpRequestModal } from './PostHelpRequestModal';
import { formatRelativeTime } from '@/lib/utils';
import { getInitials } from '@/lib/utils';

type StatusFilter = 'all' | 'open' | 'resolved';
type CategoryFilter = '' | 'technical' | 'guidance' | 'collaboration' | 'other';

const CATEGORY_LABELS: Record<string, string> = {
  technical: 'Technical Help',
  guidance: 'Guidance & Advice',
  collaboration: 'Collaboration',
  other: 'Other',
};

const CATEGORY_COLORS: Record<string, string> = {
  technical: 'bg-blue-100 text-blue-800 border-blue-200',
  guidance: 'bg-purple-100 text-purple-800 border-purple-200',
  collaboration: 'bg-green-100 text-green-800 border-green-200',
  other: 'bg-gray-100 text-gray-800 border-gray-200',
};

export function BulletinBoard() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('open');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('');
  const [postModalOpen, setPostModalOpen] = useState(false);

  const createHelpRequest = useMutation(api.helpRequests.create);
  const markResolved = useMutation(api.helpRequests.markResolved);

  // Fetch help requests based on status filter
  const helpRequests = useQuery(
    api.helpRequests.list,
    statusFilter === 'all'
      ? { category: categoryFilter || undefined }
      : { status: statusFilter, category: categoryFilter || undefined }
  );

  const handleMarkResolved = async (requestId: Id<'helpRequests'>) => {
    try {
      await markResolved({ requestId });
      toast.success('Marked as resolved');
    } catch (err) {
      console.error('Failed to mark as resolved:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to update status');
    }
  };

  return (
    <div className="space-y-4">
      {/* Post Help Request Modal */}
      {postModalOpen && (
        <PostHelpRequestModal
          onClose={() => setPostModalOpen(false)}
          onCreate={createHelpRequest}
        />
      )}

      {/* Filters and Post Button */}
      <div className="flex gap-4 flex-wrap items-center">
        <select
          className="input w-40"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
        >
          <option value="open">Open</option>
          <option value="resolved">Resolved</option>
          <option value="all">All</option>
        </select>

        <select
          className="input w-48"
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value as CategoryFilter)}
        >
          <option value="">All Categories</option>
          <option value="technical">Technical Help</option>
          <option value="guidance">Guidance & Advice</option>
          <option value="collaboration">Collaboration</option>
          <option value="other">Other</option>
        </select>

        <button
          type="button"
          className="btn btn-primary btn-md ml-auto"
          onClick={() => setPostModalOpen(true)}
        >
          <Plus className="h-4 w-4 mr-2" />
          Post Help Request
        </button>
      </div>

      {/* Help Requests Grid */}
      {helpRequests === undefined ? (
        <SkeletonGrid count={6} columns={3} />
      ) : helpRequests.length === 0 ? (
        <EmptyState
          icon={<MessageSquare />}
          title={statusFilter === 'open' ? 'No open help requests' : 'No help requests found'}
          description={
            statusFilter === 'open'
              ? 'Be the first to post a help request!'
              : 'Try adjusting your filters.'
          }
          action={
            statusFilter === 'open'
              ? {
                  label: 'Post Help Request',
                  onClick: () => setPostModalOpen(true),
                }
              : undefined
          }
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {helpRequests.map((request) => (
            <HelpRequestCard
              key={request._id}
              request={request}
              onMarkResolved={handleMarkResolved}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface HelpRequestCardProps {
  request: {
    _id: Id<'helpRequests'>;
    _creationTime: number;
    title: string;
    description: string;
    category?: 'technical' | 'guidance' | 'collaboration' | 'other';
    status: 'open' | 'resolved';
    resolvedAt?: number;
    authorName: string;
    authorAvatarUrl?: string;
    authorEmail?: string;
  };
  onMarkResolved: (requestId: Id<'helpRequests'>) => void;
}

function HelpRequestCard({ request, onMarkResolved }: HelpRequestCardProps) {
  const isResolved = request.status === 'resolved';

  return (
    <div
      className={`card p-5 transition-all duration-200 ${
        isResolved ? 'opacity-75 bg-muted/30' : 'hover:shadow-md'
      }`}
    >
      <div className="space-y-3">
        {/* Header: Status and Category */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            {isResolved ? (
              <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
            ) : (
              <MessageSquare className="h-4 w-4 text-primary shrink-0" />
            )}
            {request.category && (
              <span
                className={`badge text-xs border ${
                  CATEGORY_COLORS[request.category] ?? 'bg-muted text-muted-foreground border-border'
                }`}
              >
                {CATEGORY_LABELS[request.category] ?? request.category}
              </span>
            )}
          </div>
        </div>

        {/* Title */}
        <h3 className="font-semibold text-base leading-tight line-clamp-2">
          {request.title}
        </h3>

        {/* Description */}
        <p className="text-sm text-muted-foreground line-clamp-3">
          {request.description}
        </p>

        {/* Footer: Author and Time */}
        <div className="flex items-center justify-between pt-2 border-t border-border">
          <div className="flex items-center gap-2 min-w-0">
            {request.authorAvatarUrl ? (
              <img
                src={request.authorAvatarUrl}
                alt={request.authorName}
                className="h-6 w-6 rounded-full shrink-0"
              />
            ) : (
              <div className="h-6 w-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-medium shrink-0">
                {getInitials(request.authorName)}
              </div>
            )}
            <span className="text-xs text-muted-foreground truncate">
              {request.authorName}
            </span>
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
            <Clock className="h-3 w-3" />
            <span>{formatRelativeTime(request._creationTime)}</span>
          </div>
        </div>

        {/* Mark Resolved Button (only for open requests) */}
        {!isResolved && (
          <button
            type="button"
            className="btn btn-outline btn-sm w-full mt-2"
            onClick={() => onMarkResolved(request._id)}
          >
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Mark as Resolved
          </button>
        )}
      </div>
    </div>
  );
}
