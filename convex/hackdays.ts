/**
 * HackDays — list HackDay instances (from Supabase Event table) and parent page URL.
 * Used by the HackCentral web app "HackDays" page. Phase 1: hub view + deep-link to create.
 *
 * Requires Convex environment variables:
 * - SUPABASE_URL — Supabase project URL (e.g. https://xxx.supabase.co)
 * - SUPABASE_SERVICE_ROLE_KEY — Service role key (read access to Event + HackdayTemplateSeed)
 * - CONFLUENCE_HDC_PARENT_PAGE_URL — Full URL to the HDC Confluence parent page (for "Create HackDay" button)
 */

declare const process: { env?: Record<string, string | undefined> };

import { v } from "convex/values";
import { action } from "./_generated/server";

const EVENT_SELECT =
  "id,name,lifecycle_status,confluence_page_id,confluence_page_url,created_by_user_id";
const SEED_SELECT = "confluence_page_id,primary_admin_email,created_at";

export type HackDayEventItem = {
  id: string;
  name: string;
  lifecycleStatus: string;
  confluencePageId: string | null;
  confluencePageUrl: string | null;
  primaryAdminEmail: string | null;
  createdAt: string | null;
};

async function supabaseGet<T>(
  url: string,
  key: string,
  path: string,
  params: Record<string, string>
): Promise<T[]> {
  const qs = new URLSearchParams(params).toString();
  const fullUrl = `${url}/rest/v1${path}${qs ? `?${qs}` : ""}`;
  const schema = process.env?.SUPABASE_SCHEMA || "public";
  const res = await fetch(fullUrl, {
    method: "GET",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      Accept: "application/json",
      "Content-Type": "application/json",
      "Content-Profile": schema,
      "Accept-Profile": schema,
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Supabase request failed: ${res.status} ${text}`);
  }
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

/**
 * List all HackDay template events (runtime_type = 'hackday_template').
 * Enriches with primary_admin_email and created_at from HackdayTemplateSeed when available.
 */
export const listHackDayEvents = action({
  args: {},
  handler: async (): Promise<HackDayEventItem[]> => {
    const url = process.env?.SUPABASE_URL?.replace(/\/$/, "");
    const key = process.env?.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      console.warn(
        "[hackdays] SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set; returning empty list"
      );
      return [];
    }

    type EventRow = {
      id: string;
      name: string;
      lifecycle_status: string;
      confluence_page_id: string | null;
      confluence_page_url: string | null;
      created_by_user_id: string | null;
    };
    type SeedRow = {
      confluence_page_id: string;
      primary_admin_email: string;
      created_at: string | null;
    };

    const events = await supabaseGet<EventRow>(
      url,
      key,
      "/Event",
      {
        select: EVENT_SELECT,
        "runtime_type": "eq.hackday_template",
        order: "name.asc",
      }
    );

    if (events.length === 0) return [];

    const pageIds = events
      .map((e) => e.confluence_page_id)
      .filter((id): id is string => typeof id === "string" && id.length > 0);
    let seeds: SeedRow[] = [];
    if (pageIds.length > 0) {
      seeds = await supabaseGet<SeedRow>(url, key, "/HackdayTemplateSeed", {
        select: SEED_SELECT,
        confluence_page_id: `in.(${pageIds.join(",")})`,
      });
    }

    const seedByPageId = new Map<string | null, SeedRow>();
    for (const s of seeds) {
      seedByPageId.set(s.confluence_page_id, s);
    }

    return events.map((e) => {
      const seed = e.confluence_page_id
        ? seedByPageId.get(e.confluence_page_id)
        : undefined;
      return {
        id: e.id,
        name: e.name,
        lifecycleStatus: e.lifecycle_status ?? "draft",
        confluencePageId: e.confluence_page_id ?? null,
        confluencePageUrl: e.confluence_page_url ?? null,
        primaryAdminEmail: seed?.primary_admin_email ?? null,
        createdAt: seed?.created_at ?? null,
      };
    });
  },
});

/**
 * Return the Confluence HDC parent page URL for the "Create HackDay" button.
 * Set CONFLUENCE_HDC_PARENT_PAGE_URL in Convex dashboard (e.g. https://hackdaytemp.atlassian.net/wiki/...).
 */
export const getConfluenceParentPageUrl = action({
  args: {},
  handler: async (): Promise<string> => {
    return process.env?.CONFLUENCE_HDC_PARENT_PAGE_URL ?? "";
  },
});

/** Wizard payload for Phase 3 in-app creation. Matches HDC macro wizard shape. */
export type CreateHackDayWizardPayload = {
  basicInfo: {
    eventName: string;
    eventIcon?: string;
    eventTagline?: string;
    primaryAdminEmail?: string;
    coAdminEmails?: string[];
  };
  schedule: {
    timezone?: string;
    registrationOpensAt?: string;
    registrationClosesAt?: string;
    teamFormationStartsAt?: string;
    teamFormationEndsAt?: string;
    hackingStartsAt?: string;
    submissionDeadlineAt?: string;
    votingStartsAt?: string;
    votingEndsAt?: string;
    resultsAnnounceAt?: string;
  };
  rules?: {
    allowCrossTeamMentoring?: boolean;
    minTeamSize?: number;
    maxTeamSize?: number;
    requireDemoLink?: boolean;
    judgingModel?: "panel" | "popular_vote" | "hybrid";
    submissionRequirements?: string[];
    categories?: string[];
    prizesText?: string;
  };
  branding?: {
    bannerMessage?: string;
    accentColor?: string;
    bannerImageUrl?: string;
    themePreference?: "system" | "light" | "dark";
  };
  launchMode?: "draft" | "go_live";
};

export type CreateHackDayFromWebResult = {
  eventId: string;
  childPageId: string;
  childPageUrl: string;
  templateProvisionStatus: string | null;
};

/**
 * Create a HackDay instance from the web app (Phase 3). Calls the Forge web trigger
 * with the wizard payload and the current user's email as creator.
 * Requires: FORGE_HACKDAY_CREATE_WEB_TRIGGER_URL, HACKDAY_CREATE_WEB_SECRET in Convex env.
 */
const createHackDayPayloadValidator = v.object({
  basicInfo: v.object({
    eventName: v.string(),
    eventIcon: v.optional(v.string()),
    eventTagline: v.optional(v.string()),
    primaryAdminEmail: v.optional(v.string()),
    coAdminEmails: v.optional(v.array(v.string())),
  }),
  schedule: v.object({
    timezone: v.optional(v.string()),
    registrationOpensAt: v.optional(v.string()),
    registrationClosesAt: v.optional(v.string()),
    teamFormationStartsAt: v.optional(v.string()),
    teamFormationEndsAt: v.optional(v.string()),
    hackingStartsAt: v.optional(v.string()),
    submissionDeadlineAt: v.optional(v.string()),
    votingStartsAt: v.optional(v.string()),
    votingEndsAt: v.optional(v.string()),
    resultsAnnounceAt: v.optional(v.string()),
  }),
  rules: v.optional(
    v.object({
      allowCrossTeamMentoring: v.optional(v.boolean()),
      minTeamSize: v.optional(v.number()),
      maxTeamSize: v.optional(v.number()),
      requireDemoLink: v.optional(v.boolean()),
      judgingModel: v.optional(v.union(v.literal("panel"), v.literal("popular_vote"), v.literal("hybrid"))),
      submissionRequirements: v.optional(v.array(v.string())),
      categories: v.optional(v.array(v.string())),
      prizesText: v.optional(v.string()),
    })
  ),
  branding: v.optional(
    v.object({
      bannerMessage: v.optional(v.string()),
      accentColor: v.optional(v.string()),
      bannerImageUrl: v.optional(v.string()),
      themePreference: v.optional(v.union(v.literal("system"), v.literal("light"), v.literal("dark"))),
    })
  ),
  launchMode: v.optional(v.union(v.literal("draft"), v.literal("go_live"))),
});

export const createHackDayFromWeb = action({
  args: { payload: createHackDayPayloadValidator },
  handler: async (ctx, args): Promise<CreateHackDayFromWebResult> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("You must be signed in to create a HackDay.");
    }
    const email = identity.email?.trim?.();
    if (!email) {
      throw new Error("Your account must have an email to create a HackDay.");
    }

    const triggerUrl = process.env?.FORGE_HACKDAY_CREATE_WEB_TRIGGER_URL?.replace(/\/$/, "");
    const secret = process.env?.HACKDAY_CREATE_WEB_SECRET?.trim();
    if (!triggerUrl || !secret) {
      throw new Error(
        "Server configuration error: FORGE_HACKDAY_CREATE_WEB_TRIGGER_URL and HACKDAY_CREATE_WEB_SECRET must be set."
      );
    }

    const creationRequestId = crypto.randomUUID();
    const body = {
      ...args.payload,
      creatorEmail: email,
      creationRequestId,
      parentPageId: process.env?.CONFLUENCE_HDC_PARENT_PAGE_ID ?? undefined,
    };

    const res = await fetch(triggerUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-HackDay-Create-Secret": secret,
      },
      body: JSON.stringify(body),
    });

    const text = await res.text();
    if (!res.ok) {
      let errMessage: string;
      try {
        const json = JSON.parse(text) as { error?: string };
        errMessage = json.error ?? text;
      } catch {
        errMessage = text || `HTTP ${res.status}`;
      }
      throw new Error(errMessage);
    }

    let data: CreateHackDayFromWebResult;
    try {
      data = JSON.parse(text) as CreateHackDayFromWebResult;
    } catch {
      throw new Error("Invalid response from creation service.");
    }
    if (!data.eventId || !data.childPageUrl) {
      throw new Error("Creation service did not return event ID or child page URL.");
    }
    return data;
  },
});
