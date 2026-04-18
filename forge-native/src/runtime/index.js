import Resolver from "@forge/resolver";
import { registerHealthResolvers } from "./resolvers/health.js";
import { registerAuthResolvers } from "./resolvers/auth.js";
import { registerTeamResolvers } from "./resolvers/teams.js";
import { registerInviteResolvers } from "./resolvers/invites.js";
import { registerSubmissionResolvers } from "./resolvers/submissions.js";
import { registerVotingResolvers } from "./resolvers/voting.js";
import { registerJudgingResolvers } from "./resolvers/judging.js";
import { registerEventResolvers } from "./resolvers/events.js";
import { registerBackupResolvers } from "./resolvers/backup.js";
import { registerConfigResolvers } from "./resolvers/config.js";
import { registerBrandingResolvers } from "./resolvers/branding.js";
import { registerNotificationResolvers } from "./resolvers/notifications.js";
import { registerTelemetryResolvers } from "./resolvers/telemetry.js";
import { registerResultsResolvers } from "./resolvers/results.js";
import { registerPainPointResolvers } from "./resolvers/painPoints.js";
import { registerDevResolvers } from "./resolvers/dev.js";

const resolver = new Resolver();

registerHealthResolvers(resolver);
registerAuthResolvers(resolver);
registerTeamResolvers(resolver);
registerInviteResolvers(resolver);
registerSubmissionResolvers(resolver);
registerVotingResolvers(resolver);
registerJudgingResolvers(resolver);
registerEventResolvers(resolver);
registerBackupResolvers(resolver);
registerConfigResolvers(resolver);
registerBrandingResolvers(resolver);
registerNotificationResolvers(resolver);
registerTelemetryResolvers(resolver);
registerResultsResolvers(resolver);
registerPainPointResolvers(resolver);
registerDevResolvers(resolver);

export const handler = resolver.getDefinitions();

// Warmup handler — lives in the same module so importing it loads all resolver
// dependencies (Supabase client, 16 resolver modules). Even if Forge uses separate
// worker pools per function key, module initialization is the expensive part.
export const warmupHandler = async () => {
  return { status: 'warm', timestamp: new Date().toISOString() };
};
