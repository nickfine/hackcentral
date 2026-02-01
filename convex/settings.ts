import { query } from "./_generated/server";

declare const process: { env: Record<string, string | undefined> };

/**
 * Public config for A/B testing and feature variants.
 * Reads from Convex environment variables (Dashboard > Settings > Environment Variables).
 * Example: NUDGE_COPY_VARIANT=a or b to switch learning-summary nudge copy.
 */
export const getPublicConfig = query({
  args: {},
  handler: async () => {
    const nudgeCopyVariant = process.env.NUDGE_COPY_VARIANT ?? "a";
    return {
      nudgeCopyVariant: nudgeCopyVariant === "b" ? "b" : "a",
    };
  },
});
