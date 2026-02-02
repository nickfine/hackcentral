/**
 * CopyFeedbackToast — "Did this work for you? [ThumbsUp] [ThumbsDown]"
 * Shown after user copies a prompt. Used inside react-hot-toast custom toast.
 */

import { ThumbsUp, ThumbsDown } from "lucide-react";

export interface CopyFeedbackToastProps {
  onThumbsUp: () => void;
  onThumbsDown: () => void;
  isSubmitting?: boolean;
}

export function CopyFeedbackToast({
  onThumbsUp,
  onThumbsDown,
  isSubmitting = false,
}: CopyFeedbackToastProps) {
  return (
    <div
      className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-3 shadow-lg"
      role="region"
      aria-label="Feedback on copied prompt"
    >
      <span className="text-sm text-foreground">Did this work for you?</span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onThumbsUp}
          disabled={isSubmitting}
          className="inline-flex items-center justify-center rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-50"
          aria-label="Yes, it worked"
        >
          <ThumbsUp className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={onThumbsDown}
          disabled={isSubmitting}
          className="inline-flex items-center justify-center rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-50"
          aria-label="No, it didn't work"
        >
          <ThumbsDown className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
