/**
 * Post Help Request Modal
 * Form for creating a new help request on the bulletin board
 */

import { useState } from 'react';
import toast from 'react-hot-toast';
import { ModalWrapper } from '@/components/shared';

interface PostHelpRequestModalProps {
  onClose: () => void;
  onCreate: (args: {
    title: string;
    description: string;
    category?: 'technical' | 'guidance' | 'collaboration' | 'other';
  }) => Promise<any>;
}

const CATEGORIES = [
  { value: 'technical', label: 'Technical Help' },
  { value: 'guidance', label: 'Guidance & Advice' },
  { value: 'collaboration', label: 'Looking for Collaborators' },
  { value: 'other', label: 'Other' },
] as const;

export function PostHelpRequestModal({ onClose, onCreate }: PostHelpRequestModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<'technical' | 'guidance' | 'collaboration' | 'other' | ''>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      toast.error('Title is required');
      return;
    }

    if (!description.trim()) {
      toast.error('Description is required');
      return;
    }

    setIsSubmitting(true);
    try {
      await onCreate({
        title: title.trim(),
        description: description.trim(),
        category: category || undefined,
      });
      toast.success('Help request posted!');
      onClose();
    } catch (err) {
      console.error('Failed to post help request:', err);
      toast.error(err instanceof Error ? err.message : 'Failed to post help request');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ModalWrapper
      isOpen
      onClose={onClose}
      title="Post Help Request"
      titleId="post-help-request-title"
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="help-title" className="block text-sm font-medium mb-1">
            Title <span className="text-destructive">*</span>
          </label>
          <input
            id="help-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="input w-full"
            placeholder="e.g. Need help with prompt engineering for code reviews"
            required
            maxLength={200}
          />
          <p className="text-xs text-muted-foreground mt-1">
            {title.length}/200 characters
          </p>
        </div>

        <div>
          <label htmlFor="help-description" className="block text-sm font-medium mb-1">
            Description <span className="text-destructive">*</span>
          </label>
          <textarea
            id="help-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="textarea w-full min-h-[120px]"
            placeholder="Describe what you need help with..."
            required
            rows={5}
            maxLength={1000}
          />
          <p className="text-xs text-muted-foreground mt-1">
            {description.length}/1000 characters
          </p>
        </div>

        <div>
          <label htmlFor="help-category" className="block text-sm font-medium mb-1">
            Category (optional)
          </label>
          <select
            id="help-category"
            value={category}
            onChange={(e) => setCategory(e.target.value as typeof category)}
            className="input w-full"
          >
            <option value="">Select a category</option>
            {CATEGORIES.map((cat) => (
              <option key={cat.value} value={cat.value}>
                {cat.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex gap-2 pt-2">
          <button
            type="button"
            className="btn btn-outline"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Posting...' : 'Post Request'}
          </button>
        </div>
      </form>
    </ModalWrapper>
  );
}
