#!/usr/bin/env bash
# Set Forge production env vars for Create HackDay links (no MCP exists for this).
# Run from forge-native/ with Forge CLI installed and logged in.
#
# Usage:
#   export HACKDAY_CREATE_APP_URL='https://your-hackcentral-app.example.com'
#   export CONFLUENCE_HDC_PARENT_PAGE_URL='https://hackdaytemp.atlassian.net/wiki/...?pageId=123'
#   ./set-forge-create-urls.sh
#
# Or inline:
#   HACKDAY_CREATE_APP_URL='https://...' CONFLUENCE_HDC_PARENT_PAGE_URL='https://...' ./set-forge-create-urls.sh

set -e
ENV_FLAG='-e production'

if [[ -z "$HACKDAY_CREATE_APP_URL" && -z "$CONFLUENCE_HDC_PARENT_PAGE_URL" ]]; then
  echo "Set at least one of: HACKDAY_CREATE_APP_URL, CONFLUENCE_HDC_PARENT_PAGE_URL"
  echo "Example: HACKDAY_CREATE_APP_URL='https://hackdaytemp.atlassian.net/wiki/apps/...' ./set-forge-create-urls.sh"
  exit 1
fi

if [[ -n "$HACKDAY_CREATE_APP_URL" ]]; then
  forge variables set $ENV_FLAG HACKDAY_CREATE_APP_URL "$HACKDAY_CREATE_APP_URL"
  echo "Set HACKDAY_CREATE_APP_URL"
fi

if [[ -n "$CONFLUENCE_HDC_PARENT_PAGE_URL" ]]; then
  forge variables set $ENV_FLAG CONFLUENCE_HDC_PARENT_PAGE_URL "$CONFLUENCE_HDC_PARENT_PAGE_URL"
  echo "Set CONFLUENCE_HDC_PARENT_PAGE_URL"
fi

echo "Done. Redeploy or wait for next deploy for Confluence to see the new links."
