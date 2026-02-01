/**
 * Profile Account Page
 * Dedicated page for Clerk account management (replaces UserButton dropdown).
 * Renders Clerk's UserProfile so users manage account, security, etc. here.
 */

import { Link } from 'react-router-dom';
import { UserProfile } from '@clerk/clerk-react';
import { ArrowLeft } from 'lucide-react';
import { SectionHeader } from '@/components/shared';

export default function ProfileAccount() {
  return (
    <div className="min-w-0 space-y-6">
      <div className="flex items-center gap-4">
        <Link
          to="/profile"
          className="btn btn-ghost btn-sm inline-flex items-center gap-2 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Profile
        </Link>
      </div>
      <SectionHeader
        title="Account"
        description="Manage your account, security, and preferences."
      />
      <div className="flex justify-center min-h-[400px]">
        <UserProfile
          routing="path"
          path="/profile/account"
          appearance={{
            elements: {
              rootBox: 'w-full max-w-4xl',
              card: 'shadow-none border border-border rounded-lg',
            },
          }}
        />
      </div>
    </div>
  );
}
