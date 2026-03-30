#!/usr/bin/env bash
# Run this AFTER you have run: forge register "<tenant app name>" -y
# in a tenant-specific checkout. That updates manifest.yml with a new app ID.
# Do not run this in the canonical hackdaytemp checkout if you want to preserve
# the existing production app ID.

set -e
cd "$(dirname "$0")"

SITE="${SITE:-tag-hackday.atlassian.net}"
ENVIRONMENT="${ENVIRONMENT:-production}"
PRODUCT="${PRODUCT:-confluence}"
FORGE="../scripts/with-node22.sh forge"
NPM="../scripts/with-node22.sh npm"

echo "=== Build Custom UI ==="
$NPM run custom-ui:build

echo ""
echo "=== Deploy to ${ENVIRONMENT} ==="
$FORGE deploy -e "$ENVIRONMENT" --non-interactive

echo ""
echo "=== Install on ${SITE} ==="
$FORGE install -e "$ENVIRONMENT" --upgrade --non-interactive --site "$SITE" --product "$PRODUCT"

echo ""
echo "Done. Open HackCentral in Confluence (Your apps) — you should see the new UI."
echo ""
echo "IMPORTANT: The new app has no environment variables yet. Set them in the Forge dashboard"
echo "or run forge variables set ... for each variable. Required variables:"
echo "  SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_SCHEMA, FORGE_DATA_BACKEND,"
echo "  CONVEX_URL, CONVEX_FORGE_QUERY, CONVEX_FORGE_CREATE_HACK, CONVEX_FORGE_CREATE_PROJECT,"
echo "  CONVEX_FORGE_UPDATE_MENTOR, FORGE_APP_ID (use the NEW app ID from manifest),"
echo "  FORGE_MACRO_KEY, HDC_RUNTIME_OWNER, HDC_RUNTIME_APP_ID, HDC_RUNTIME_ENVIRONMENT_ID,"
echo "  HDC_RUNTIME_MACRO_KEY, HACKDAY_TEMPLATE_APP_ID, HACKDAY_TEMPLATE_ENVIRONMENT_ID,"
echo "  HACKDAY_TEMPLATE_MACRO_KEY, CONFLUENCE_HDC_PARENT_PAGE_ID, CONFLUENCE_HDC_PARENT_PAGE_URL,"
echo "  HACKDAY_CREATE_WEB_SECRET, HACKDAY_CREATE_APP_URL, FORGE_SITE_URL"
echo ""
echo "Use ./set-tenant-forge-vars.sh in this directory to set the full tenant contract."
