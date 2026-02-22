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
