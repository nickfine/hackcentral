/**
 * ErrorBoundary Component
 * Catches JavaScript errors anywhere in the child component tree
 */

import { Component } from 'react';
import { AlertCircle, RefreshCw, Home } from 'lucide-react';
import { Card, Button } from '../ui';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    // Log error to console in development
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  render() {
    if (this.state.hasError) {
      const { fallback, onNavigateHome } = this.props;

      // Custom fallback UI
      if (fallback) {
        return fallback;
      }

      // Default error UI
      return (
        <div className="min-h-[400px] flex items-center justify-center p-6">
          <Card padding="lg" className="max-w-md w-full text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-error/10 flex items-center justify-center">
              <AlertCircle className="w-8 h-8 text-error" />
            </div>
            
            <h2 className="text-xl font-bold text-text-primary mb-2">
              Something went wrong
            </h2>
            
            <p className="text-text-secondary mb-6">
              An unexpected error occurred. Please try refreshing the page or go back to the dashboard.
            </p>

            {this.state.error && process.env.NODE_ENV === 'development' && (
              <div className="mb-6 p-4 bg-arena-elevated rounded-lg text-left overflow-x-auto">
                <p className="text-xs font-mono text-error">
                  {this.state.error.toString()}
                </p>
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                variant="secondary"
                onClick={this.handleReset}
                leftIcon={<RefreshCw className="w-4 h-4" />}
              >
                Try Again
              </Button>
              {onNavigateHome && (
                <Button
                  onClick={onNavigateHome}
                  leftIcon={<Home className="w-4 h-4" />}
                >
                  Go to Dashboard
                </Button>
              )}
            </div>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
