import { internalMutation } from "./_generated/server";

/**
 * Seed initial capability tags
 * Run this once after setting up the database
 */
export const seedCapabilityTags = internalMutation({
  args: {},
  handler: async (ctx) => {
    // Check if tags already exist
    const existing = await ctx.db.query("capabilityTags").first();
    if (existing) {
      console.log("Capability tags already seeded");
      return { message: "Tags already exist" };
    }

    const tags = [
      // AI Experience Tags
      {
        code: "ai_early_adopter",
        displayLabel: "AI Early Adopter",
        category: "experience",
        displayOrder: 1,
      },
      {
        code: "ai_power_user",
        displayLabel: "AI Power User",
        category: "experience",
        displayOrder: 2,
      },
      {
        code: "ai_experimenter",
        displayLabel: "AI Experimenter",
        category: "experience",
        displayOrder: 3,
      },
      {
        code: "ai_skeptic",
        displayLabel: "AI Skeptic",
        category: "experience",
        displayOrder: 4,
      },

      // AI Tool Proficiency
      {
        code: "copilot_expert",
        displayLabel: "GitHub Copilot Expert",
        category: "tools",
        displayOrder: 10,
      },
      {
        code: "chatgpt_user",
        displayLabel: "ChatGPT User",
        category: "tools",
        displayOrder: 11,
      },
      {
        code: "claude_user",
        displayLabel: "Claude User",
        category: "tools",
        displayOrder: 12,
      },
      {
        code: "midjourney_user",
        displayLabel: "Midjourney User",
        category: "tools",
        displayOrder: 13,
      },

      // Domain Expertise
      {
        code: "prompt_engineering",
        displayLabel: "Prompt Engineering",
        category: "skills",
        displayOrder: 20,
      },
      {
        code: "agent_building",
        displayLabel: "Agent Building",
        category: "skills",
        displayOrder: 21,
      },
      {
        code: "ai_safety",
        displayLabel: "AI Safety & Ethics",
        category: "skills",
        displayOrder: 22,
      },
      {
        code: "ai_workflow_design",
        displayLabel: "AI Workflow Design",
        category: "skills",
        displayOrder: 23,
      },

      // Help & Mentorship
      {
        code: "happy_to_mentor",
        displayLabel: "Happy to Mentor",
        category: "mentorship",
        displayOrder: 30,
      },
      {
        code: "seeking_mentor",
        displayLabel: "Seeking Mentor",
        category: "mentorship",
        displayOrder: 31,
      },
      {
        code: "ai_champion",
        displayLabel: "AI Champion",
        category: "mentorship",
        displayOrder: 32,
      },
    ];

    // Insert all tags
    for (const tag of tags) {
      await ctx.db.insert("capabilityTags", tag);
    }

    return { message: "Seeded capability tags successfully", count: tags.length };
  },
});
