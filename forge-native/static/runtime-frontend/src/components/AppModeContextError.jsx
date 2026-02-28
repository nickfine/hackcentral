import React from 'react';

function AppModeContextError({
  message = 'App context is missing.',
  onRetry,
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-arena-bg px-6 py-10">
      <div className="w-full max-w-2xl rounded-card border border-arena-border bg-arena-card p-8 text-center shadow-[0_24px_60px_rgba(2,6,23,0.18)]">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-text-muted">App View Blocked</p>
        <h1 className="mt-3 text-3xl font-black text-text-primary">Choose a HackDay first</h1>
        <p className="mt-4 text-sm text-text-secondary">{message}</p>
        <p className="mt-3 text-sm text-text-secondary">
          Open a HackDay page in Confluence, then click <strong>Open App View</strong> from the page header.
        </p>

        <div className="mt-8 flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={onRetry}
            className="rounded-lg bg-brand px-4 py-2 text-sm font-bold text-white transition hover:opacity-90"
          >
            Retry
          </button>
        </div>
      </div>
    </div>
  );
}

export default AppModeContextError;
