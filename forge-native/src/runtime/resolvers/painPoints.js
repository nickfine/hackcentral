import { getSupabaseClient } from "../lib/supabase";
import { convexQuery, convexMutation } from "../lib/convex.js";

export function registerPainPointResolvers(resolver) {
resolver.define("getPainPoints", async (req) => {
  const supabase = getSupabaseClient();
  const { sortBy = "reactions", limit = 10, includeTeams = false } = req.payload || {};
  const accountId = req.context?.accountId || null;
  try {
    const args = { sortBy, limit };
    if (accountId) args.reactorId = accountId;
    const painPoints = await convexQuery("painPoints:list", args);
    const list = painPoints ?? [];

    if (!includeTeams || list.length === 0) return { painPoints: list };

    // Batch-fetch all team links for all pain points in one Convex call
    const painPointIds = list.map((pp) => pp._id);
    const teamLinksMap = await convexQuery("painPoints:listForPainPoints", { painPointIds });

    // Collect all unique teamIds and fetch names from Supabase
    const allTeamIds = [...new Set(
      Object.values(teamLinksMap || {}).flat().map((l) => l.teamId)
    )];
    let teamNameMap = {};
    if (allTeamIds.length > 0) {
      try {
        const { data: teamRows } = await supabase
          .from("Team")
          .select("id,name")
          .in("id", allTeamIds);
        if (teamRows) {
          teamRows.forEach((t) => { teamNameMap[t.id] = t.name; });
        }
      } catch {
        // non-fatal
      }
    }

    const enriched = list.map((pp) => ({
      ...pp,
      claimingTeams: (teamLinksMap[pp._id] ?? []).map((l) => ({
        id: l.teamId,
        name: teamNameMap[l.teamId] || l.teamId,
      })),
    }));
    return { painPoints: enriched };
  } catch (err) {
    console.error("getPainPoints error:", err);
    return { painPoints: [] };
  }
});

resolver.define("submitPainPoint", async (req) => {
  const { title, submitterName, description, effortEstimate, impactEstimate } = req.payload || {};
  if (!title?.trim()) throw new Error("Title is required");
  if (!submitterName?.trim()) throw new Error("Name is required");
  const id = await convexMutation("painPoints:submit", {
    title: title.trim(),
    submitterName: submitterName.trim(),
    description: description?.trim() || undefined,
    effortEstimate: effortEstimate || undefined,
    impactEstimate: impactEstimate || undefined,
  });
  return { id };
});

resolver.define("reactToPainPoint", async (req) => {
  const { painPointId } = req.payload || {};
  const accountId = req.context?.accountId || null;
  if (!painPointId) return { ok: false };
  try {
    const args = { painPointId };
    if (accountId) args.reactorId = accountId;
    await convexMutation("painPoints:react", args);
    return { ok: true };
  } catch (err) {
    console.error("reactToPainPoint error:", err);
    return { ok: false };
  }
});

resolver.define("assignPainPointsToTeam", async (req) => {
  const { teamId, eventId = '', painPointIds = [] } = req.payload || {};
  if (!teamId) return { ok: false };
  try {
    await Promise.all(
      painPointIds.map((painPointId) =>
        convexMutation("painPoints:linkToTeam", { teamId, eventId, painPointId })
      )
    );
    return { ok: true };
  } catch (err) {
    console.error("assignPainPointsToTeam error:", err);
    return { ok: false };
  }
});

resolver.define("unassignPainPointFromTeam", async (req) => {
  const { teamId, painPointId } = req.payload || {};
  if (!teamId || !painPointId) return { ok: false };
  try {
    await convexMutation("painPoints:unlinkFromTeam", { teamId, painPointId });
    return { ok: true };
  } catch (err) {
    console.error("unassignPainPointFromTeam error:", err);
    return { ok: false };
  }
});

resolver.define("getTeamPainPoints", async (req) => {
  const { teamId } = req.payload || {};
  if (!teamId) return { painPoints: [] };
  try {
    const painPoints = await convexQuery("painPoints:listForTeam", { teamId });
    return { painPoints: painPoints ?? [] };
  } catch (err) {
    console.error("getTeamPainPoints error:", err);
    return { painPoints: [] };
  }
});


}
