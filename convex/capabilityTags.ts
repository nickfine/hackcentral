import { query } from "./_generated/server";

/**
 * Get all capability tags, ordered by category and display order
 */
export const list = query({
  args: {},
  handler: async (ctx) => {
    const tags = await ctx.db.query("capabilityTags").collect();

    // Sort by category and display order
    return tags.sort((a, b) => {
      if (a.category !== b.category) {
        return (a.category || "").localeCompare(b.category || "");
      }
      return a.displayOrder - b.displayOrder;
    });
  },
});

/**
 * Get capability tags by category
 */
export const getByCategory = query({
  args: {},
  handler: async (ctx) => {
    const tags = await ctx.db.query("capabilityTags").collect();

    // Group by category
    const grouped = tags.reduce((acc, tag) => {
      const category = tag.category || "other";
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(tag);
      return acc;
    }, {} as Record<string, typeof tags>);

    // Sort each category by display order
    Object.keys(grouped).forEach(category => {
      grouped[category].sort((a, b) => a.displayOrder - b.displayOrder);
    });

    return grouped;
  },
});
