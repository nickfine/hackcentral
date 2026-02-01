/**
 * One-off migration: map library asset types and project hack types to
 * prompt | skill | app. Run once from Convex dashboard or by invoking
 * migrateToPromptSkillApp() after deploying the new schema.
 *
 * Library: template, guardrail, evaluation_rubric, structured_output → skill;
 *          agent_blueprint → app; prompt → prompt.
 * Projects: extension, agent_flow → app; template, playbook → skill;
 *           prompt, app, skill → unchanged.
 */

import { mutation } from "./_generated/server";

const LIBRARY_MAP: Record<string, "prompt" | "skill" | "app"> = {
  prompt: "prompt",
  template: "skill",
  agent_blueprint: "app",
  guardrail: "skill",
  evaluation_rubric: "skill",
  structured_output: "skill",
};

const PROJECT_MAP: Record<string, "prompt" | "skill" | "app"> = {
  prompt: "prompt",
  app: "app",
  extension: "app",
  skill: "skill",
  template: "skill",
  agent_flow: "app",
  playbook: "skill",
};

export const migrateToPromptSkillApp = mutation({
  args: {},
  handler: async (ctx) => {
    let libraryPatched = 0;
    let projectsPatched = 0;

    const assets = await ctx.db.query("libraryAssets").collect();
    for (const asset of assets) {
      const current = asset.assetType as string;
      const next = LIBRARY_MAP[current];
      if (next && next !== current) {
        await ctx.db.patch(asset._id, { assetType: next });
        libraryPatched += 1;
      }
    }

    const projects = await ctx.db.query("projects").collect();
    for (const project of projects) {
      const current = project.hackType;
      if (current == null) continue;
      const next = PROJECT_MAP[current as string];
      if (next && next !== current) {
        await ctx.db.patch(project._id, { hackType: next });
        projectsPatched += 1;
      }
    }

    return { libraryPatched, projectsPatched };
  },
});
