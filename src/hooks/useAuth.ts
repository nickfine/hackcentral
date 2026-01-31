import { useUser, useClerk } from "@clerk/clerk-react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

/**
 * Custom hook for authentication state and user profile
 */
export function useAuth() {
  const { user, isLoaded, isSignedIn } = useUser();
  const { signOut } = useClerk();

  // Get the user's profile from Convex
  const profile = useQuery(api.profiles.getCurrentProfile);
  const upsertProfile = useMutation(api.profiles.upsert);

  return {
    // Clerk user data
    user,
    isLoaded,
    isSignedIn,

    // Convex profile data
    profile,

    // Actions
    signOut,
    upsertProfile,

    // Helpers
    isAuthenticated: isLoaded && isSignedIn,
    needsProfile: isSignedIn && !profile,
  };
}
