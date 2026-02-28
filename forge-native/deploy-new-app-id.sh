#!/usr/bin/env bash
# Run this AFTER you have run: forge register HackCentral -y
# (and selected your Developer Space when prompted).
# That updates manifest.yml with a new app ID so Confluence gets a fresh CDN bundle.

set -e
cd "$(dirname "$0")"

echo "=== Build Custom UI ==="
npm run custom-ui:build

echo ""
echo "=== Deploy to production ==="
forge deploy -e production --non-interactive

echo ""
echo "=== Install on hackdaytemp ==="
forge install -e production --non-interactive --site hackdaytemp.atlassian.net --product confluence

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
echo "  HACKDAY_TEMPLATE_MACRO_KEY, CONFLUENCE_HDC_PARENT_PAGE_ID, HACKDAY_CREATE_WEB_SECRET,"
echo "  HACKDAY_CREATE_APP_URL"
echo ""
echo "To remove the OLD app from the site, see OLD_APP_ID_FOR_UNINSTALL.txt"
