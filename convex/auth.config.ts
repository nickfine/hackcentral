// Convex Auth Configuration for Clerk
// This tells Convex to accept JWTs from Clerk

export default {
  providers: [
    {
      domain: "https://balanced-hound-26.clerk.accounts.dev",
      applicationID: "convex",
    },
  ],
};
