import { Link } from 'react-router-dom';
import { useUser } from '@clerk/clerk-react';
/**
 * Profile link for header: avatar + link to /profile.
 * Replaces UserButton dropdown so profile/account lives on the dedicated Profile page.
 */
export function ProfileLink() {
  const { user } = useUser();

  if (!user) return null;

  const imageUrl = user.imageUrl;
  const name = user.fullName ?? user.firstName ?? 'Profile';
  const initials = [user.firstName?.[0], user.lastName?.[0]].filter(Boolean).join('').toUpperCase() || '?';

  return (
    <Link
      to="/profile"
      className="flex items-center gap-2 rounded-full p-0.5 hover:bg-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      aria-label={`Go to profile (${name})`}
    >
      {imageUrl ? (
        <img
          src={imageUrl}
          alt=""
          className="h-10 w-10 rounded-full object-cover"
          width={40}
          height={40}
        />
      ) : (
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-medium text-primary">
          {initials}
        </span>
      )}
    </Link>
  );
}
