import { ConvexReactClient } from "convex/react";

const convexUrl = import.meta.env.VITE_CONVEX_URL;

if (!convexUrl) {
  console.warn(
    'Missing Convex environment variable. Please set VITE_CONVEX_URL in your .env.local file. Run `npx convex dev` to get your URL.'
  );
}

// Create Convex client
export const convex = new ConvexReactClient(convexUrl || '');

// Helper to check if Convex is properly configured
export const isConvexConfigured = (): boolean => {
  return Boolean(convexUrl);
};

export default convex;
