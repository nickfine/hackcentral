import { useAuth } from '@/hooks/useAuth';
import { SignInButton, SignUpButton } from './';
import { ProfileSetup } from '@/components/profile/ProfileSetup';

interface AuthGuardProps {
  children: React.ReactNode;
}

/**
 * Protects routes that require authentication
 * Shows sign in/up if not authenticated
 * Shows profile setup if authenticated but no profile
 * Shows children if authenticated and has profile
 */
export function AuthGuard({ children }: AuthGuardProps) {
  const { isLoaded, isAuthenticated, needsProfile } = useAuth();

  // Loading state
  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  // Not authenticated - show sign in/up
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome to HackDay Central
          </h1>
          <p className="text-gray-600 mb-8">
            AI Maturity Accelerator Platform
          </p>
          <div className="flex gap-4 justify-center">
            <SignUpButton />
            <SignInButton />
          </div>
        </div>
      </div>
    );
  }

  // Authenticated but needs profile
  if (needsProfile) {
    return <ProfileSetup />;
  }

  // Authenticated and has profile - show app
  return <>{children}</>;
}
