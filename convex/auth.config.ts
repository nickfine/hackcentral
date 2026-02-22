/**
 * Convex Auth Configuration for Clerk.
 *
 * The domain must match the Clerk instance used by
 * VITE_CLERK_PUBLISHABLE_KEY in .env.local.
 *
 * Convex evaluates this file at deploy time — process.env is unavailable here,
 * so the domain is necessarily hardcoded. Update it if you switch Clerk instances.
 */
export default {
  providers: [
    {
      domain: "https://balanced-hound-26.clerk.accounts.dev",
      applicationID: "convex",
    },
  ],
};
