import React, { type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Catches React render errors so we show a friendly message instead of
 * the generic Forge "An error has occurred in loading this app."
 */
export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    if (typeof console !== 'undefined' && console.error) {
      console.error('[HackCentral] ErrorBoundary caught:', error, errorInfo);
    }
  }

  render(): ReactNode {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <main className="state-shell">
          <section className="state-card state-error">
            <h2>Something went wrong</h2>
            <p>{this.state.error.message}</p>
            <p className="text-muted" style={{ fontSize: 'var(--tier4-size)' }}>
              Check the browser console for details, or try refreshing the page.
            </p>
          </section>
        </main>
      );
    }
    return this.props.children;
  }
}
