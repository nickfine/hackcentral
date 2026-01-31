import { ConvexReactClient } from "convex/react";

const convexUrl = import.meta.env.VITE_CONVEX_URL;

if (!convexUrl) {
  throw new Error(
    'Missing VITE_CONVEX_URL environment variable. Run `npx convex dev` to get your deployment URL.'
  );
}

// Create singleton Convex client
export const convex = new ConvexReactClient(convexUrl);

// Helper to check if Convex is properly configured
export const isConvexConfigured = (): boolean => {
  return Boolean(convexUrl);
};

export default convex;
