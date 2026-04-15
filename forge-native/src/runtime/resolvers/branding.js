import api, { route, storage } from "@forge/api";
import { createHash, randomUUID } from "crypto";
import { getSupabaseClient } from "../lib/supabase";
import {
  EVENT_THEME_PRESETS,
  EVENT_BRANDING_UPLOAD_ALLOWED_TYPES,
  EVENT_BRANDING_UPLOAD_MAX_BYTES,
  EVENT_BRANDING_BANNER_MAX_WIDTH,
  EVENT_BRANDING_BANNER_REQUIRED_HEIGHT,
  EVENT_BRANDING_ICON_REQUIRED_WIDTH,
  EVENT_BRANDING_ICON_REQUIRED_HEIGHT,
  EVENT_BRANDING_NEW_TO_HACKDAY_REQUIRED_WIDTH,
  EVENT_BRANDING_NEW_TO_HACKDAY_REQUIRED_HEIGHT,
  EVENT_BRANDING_UPLOAD_URL_TTL_MS,
  EVENT_BRANDING_IMAGES_BUCKET,
} from "../lib/constants.js";
import {
  getCallerAccountId,
  getConfluencePageId,
  getCurrentEventContext,
  getTemplateSeedByPageId,
  getRuntimeActorPermissionContext,
  resolveRuntimeEventAdminAccess,
  normalizeSeedPayload,
  sanitizeManagedBrandingValue,
  updateEventWithSchemaFallback,
} from "../lib/helpers.js";

export function registerBrandingResolvers(resolver) {
async function resolveEventBrandingAdminContext(req) {
  const accountId = getCallerAccountId(req);
  const supabase = getSupabaseClient();
  const context = await getCurrentEventContext(supabase, req);
  const event = context?.event;
  const pageId = context?.pageId || getConfluencePageId(req);

  if (!event || !pageId) {
    throw new Error("No event context for this page");
  }

  const seed = await getTemplateSeedByPageId(supabase, pageId);
  if (!seed) {
    throw new Error("This event does not support branding updates");
  }

  const actorAccess = await getRuntimeActorPermissionContext(supabase, accountId, {
    logScope: "resolveEventBrandingAdminContext",
  });
  const { isEventAdmin } = await resolveRuntimeEventAdminAccess(supabase, {
    eventId: event.id,
    userRow: actorAccess.userRow,
    seed,
    email: actorAccess.email,
    logScope: "resolveEventBrandingAdminContext",
  });
  if (!isEventAdmin) {
    throw new Error("Only the event creator or co-admins can update branding");
  }

  return {
    accountId,
    supabase,
    event,
    pageId,
    seed,
  };
}

function toPositiveInteger(value, fieldName) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`${fieldName} must be a positive number`);
  }
  return Math.round(parsed);
}

function getBrandingImageExtension(contentType) {
  if (contentType === "image/jpeg") return "jpg";
  if (contentType === "image/png") return "png";
  if (contentType === "image/webp") return "webp";
  return null;
}

/**
 * Update event branding (event admin only — creator or co-admin from HackdayTemplateSeed).
 * Writes to HackdayTemplateSeed.seed_payload.branding and Event.event_branding.
 */
resolver.define("updateEventBranding", async (req) => {
  const payload = req.payload || {};
  const { supabase, event, pageId, seed } = await resolveEventBrandingAdminContext(req);

  const existingPayload = normalizeSeedPayload(seed);
  const existingBranding = sanitizeManagedBrandingValue(existingPayload.branding);
  const updates = {};
  if (payload.accentColor !== undefined) updates.accentColor = String(payload.accentColor).trim() || existingBranding.accentColor;
  if (payload.bannerImageUrl !== undefined) updates.bannerImageUrl = String(payload.bannerImageUrl).trim();
  if (payload.heroIconImageUrl !== undefined) updates.heroIconImageUrl = String(payload.heroIconImageUrl).trim();
  if (payload.newToHackdayImageUrl !== undefined) updates.newToHackdayImageUrl = String(payload.newToHackdayImageUrl).trim();
  if (payload.themePreference !== undefined) updates.themePreference = ["light", "dark", "system"].includes(payload.themePreference) ? payload.themePreference : existingBranding.themePreference;
  if (payload.themePreset !== undefined) {
    const preset = String(payload.themePreset || "").trim();
    if (preset && !EVENT_THEME_PRESETS.has(preset)) {
      throw new Error(`Invalid theme preset: ${preset}`);
    }
    updates.themePreset = preset || "default";
  }
  const mergedBranding = sanitizeManagedBrandingValue({ ...existingBranding, ...updates });

  const newSeedPayload = { ...existingPayload, branding: mergedBranding };
  const nowIso = new Date().toISOString();

  const { error: seedError } = await supabase
    .from("HackdayTemplateSeed")
    .update({ seed_payload: newSeedPayload, updated_at: nowIso })
    .eq("confluence_page_id", pageId);

  if (seedError) throw new Error(`Failed to update seed branding: ${seedError.message}`);

  try {
    await updateEventWithSchemaFallback(supabase, event.id, {
      event_branding: mergedBranding,
      updatedAt: nowIso,
      updated_at: nowIso,
    });
  } catch (eventError) {
    console.warn("Event.event_branding update failed (seed was updated):", eventError.message);
  }

  return { success: true, branding: mergedBranding };
});

resolver.define("createEventBrandingImageUploadUrl", async (req) => {
  const payload = req?.payload || {};
  const { supabase, event } = await resolveEventBrandingAdminContext(req);

  const assetKind = String(payload.assetKind || "").trim().toLowerCase();
  const fileName = String(payload.fileName || "").trim().slice(0, 200);
  const contentType = String(payload.contentType || "").trim().toLowerCase();
  const fileSizeBytes = toPositiveInteger(payload.fileSizeBytes, "fileSizeBytes");
  const imageWidth = toPositiveInteger(payload.imageWidth, "imageWidth");
  const imageHeight = toPositiveInteger(payload.imageHeight, "imageHeight");

  if (!fileName) {
    throw new Error("fileName is required");
  }
  if (!["banner", "icon", "new-to-hackday"].includes(assetKind)) {
    throw new Error("assetKind is required and must be banner, icon, or new-to-hackday.");
  }
  if (!EVENT_BRANDING_UPLOAD_ALLOWED_TYPES.has(contentType)) {
    throw new Error("Unsupported contentType. Use image/jpeg, image/png, or image/webp.");
  }
  if (fileSizeBytes > EVENT_BRANDING_UPLOAD_MAX_BYTES) {
    throw new Error("Image file too large. Max size is 2 MB.");
  }
  if (assetKind === "banner") {
    if (imageWidth > EVENT_BRANDING_BANNER_MAX_WIDTH) {
      throw new Error(`Banner image width too large. Maximum is ${EVENT_BRANDING_BANNER_MAX_WIDTH}px.`);
    }
    if (imageHeight !== EVENT_BRANDING_BANNER_REQUIRED_HEIGHT) {
      throw new Error(`Banner image height must be exactly ${EVENT_BRANDING_BANNER_REQUIRED_HEIGHT}px.`);
    }
  }
  if (assetKind === "icon") {
    if (imageWidth !== EVENT_BRANDING_ICON_REQUIRED_WIDTH) {
      throw new Error(`Hero icon width must be exactly ${EVENT_BRANDING_ICON_REQUIRED_WIDTH}px.`);
    }
    if (imageHeight !== EVENT_BRANDING_ICON_REQUIRED_HEIGHT) {
      throw new Error(`Hero icon height must be exactly ${EVENT_BRANDING_ICON_REQUIRED_HEIGHT}px.`);
    }
  }
  if (assetKind === "new-to-hackday") {
    if (imageWidth !== EVENT_BRANDING_NEW_TO_HACKDAY_REQUIRED_WIDTH) {
      throw new Error(`New To HackDay image width must be exactly ${EVENT_BRANDING_NEW_TO_HACKDAY_REQUIRED_WIDTH}px.`);
    }
    if (imageHeight !== EVENT_BRANDING_NEW_TO_HACKDAY_REQUIRED_HEIGHT) {
      throw new Error(`New To HackDay image height must be exactly ${EVENT_BRANDING_NEW_TO_HACKDAY_REQUIRED_HEIGHT}px.`);
    }
  }

  const extension = getBrandingImageExtension(contentType);
  if (!extension) {
    throw new Error("Unable to determine image extension.");
  }

  const stamp = new Date().toISOString().replace(/[^0-9]/g, "").slice(0, 14);
  const objectPath = `events/${event.id}/branding/${assetKind}-${stamp}-${randomUUID()}.${extension}`;
  const bucket = EVENT_BRANDING_IMAGES_BUCKET;

  const { data: signedUploadData, error: signedUploadError } = await supabase.storage
    .from(bucket)
    .createSignedUploadUrl(objectPath);

  if (signedUploadError) {
    throw new Error(`Failed to generate signed upload URL: ${signedUploadError.message}`);
  }

  const signedUploadUrl = signedUploadData?.signedUrl;
  if (!signedUploadUrl) {
    throw new Error("Signed upload URL is missing in storage response.");
  }

  const publicUrlResult = supabase.storage.from(bucket).getPublicUrl(objectPath);
  const publicUrl = publicUrlResult?.data?.publicUrl || null;
  if (!publicUrl) {
    throw new Error("Failed to generate public URL for uploaded image.");
  }

  return {
    bucket,
    objectPath,
    signedUploadUrl,
    publicUrl,
    expiresAt: new Date(Date.now() + EVENT_BRANDING_UPLOAD_URL_TTL_MS).toISOString(),
  };
});


}
