#!/usr/bin/env bash
# Set the full HackCentral Forge environment contract for a tenant.
# Run from forge-native/ after registering/selecting the target app.
#
# Required plain vars:
#   SUPABASE_URL
#   SUPABASE_SCHEMA
#   FORGE_DATA_BACKEND
#   FORGE_APP_ID
#   FORGE_MACRO_KEY
#   HDC_RUNTIME_OWNER
#   HDC_RUNTIME_APP_ID
#   HDC_RUNTIME_ENVIRONMENT_ID
#   HDC_RUNTIME_MACRO_KEY
#   HACKDAY_TEMPLATE_APP_ID
#   HACKDAY_TEMPLATE_ENVIRONMENT_ID
#   HACKDAY_TEMPLATE_MACRO_KEY
#   CONFLUENCE_HDC_PARENT_PAGE_ID
#   CONFLUENCE_HDC_PARENT_PAGE_URL
#   HACKDAY_CREATE_APP_URL
#   FORGE_SITE_URL
#
# Required encrypted vars:
#   SUPABASE_SERVICE_ROLE_KEY
#   HACKDAY_CREATE_WEB_SECRET
#
# Optional:
#   CONVEX_URL
#   CONVEX_FORGE_QUERY
#   CONVEX_FORGE_CREATE_HACK
#   CONVEX_FORGE_CREATE_PROJECT
#   CONVEX_FORGE_UPDATE_MENTOR
#   HDC_EVENT_BACKUP_DAILY_MAX_EVENTS
#   ENVIRONMENT (default: production)

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
ENVIRONMENT="${ENVIRONMENT:-production}"

run_forge() {
  "${ROOT_DIR}/scripts/with-node22.sh" forge "$@"
}

require_var() {
  local name="$1"
  if [[ -z "${!name:-}" ]]; then
    echo "Missing required environment variable: ${name}" >&2
    exit 1
  fi
}

set_plain() {
  local key="$1"
  local value="$2"
  run_forge variables set -e "${ENVIRONMENT}" "${key}" "${value}"
}

set_secret() {
  local key="$1"
  local value="$2"
  run_forge variables set --encrypt -e "${ENVIRONMENT}" "${key}" "${value}"
}

set_optional_plain() {
  local key="$1"
  local value="${2:-}"
  if [[ -n "${value}" ]]; then
    set_plain "${key}" "${value}"
  fi
}

for key in \
  SUPABASE_URL \
  SUPABASE_SCHEMA \
  FORGE_DATA_BACKEND \
  FORGE_APP_ID \
  FORGE_MACRO_KEY \
  HDC_RUNTIME_OWNER \
  HDC_RUNTIME_APP_ID \
  HDC_RUNTIME_ENVIRONMENT_ID \
  HDC_RUNTIME_MACRO_KEY \
  HACKDAY_TEMPLATE_APP_ID \
  HACKDAY_TEMPLATE_ENVIRONMENT_ID \
  HACKDAY_TEMPLATE_MACRO_KEY \
  CONFLUENCE_HDC_PARENT_PAGE_ID \
  CONFLUENCE_HDC_PARENT_PAGE_URL \
  HACKDAY_CREATE_APP_URL \
  FORGE_SITE_URL
do
  require_var "${key}"
done

require_var SUPABASE_SERVICE_ROLE_KEY
require_var HACKDAY_CREATE_WEB_SECRET

set_plain SUPABASE_URL "${SUPABASE_URL}"
set_secret SUPABASE_SERVICE_ROLE_KEY "${SUPABASE_SERVICE_ROLE_KEY}"
set_plain SUPABASE_SCHEMA "${SUPABASE_SCHEMA}"
set_plain FORGE_DATA_BACKEND "${FORGE_DATA_BACKEND}"
set_optional_plain CONVEX_URL "${CONVEX_URL:-}"
set_optional_plain CONVEX_FORGE_QUERY "${CONVEX_FORGE_QUERY:-}"
set_optional_plain CONVEX_FORGE_CREATE_HACK "${CONVEX_FORGE_CREATE_HACK:-}"
set_optional_plain CONVEX_FORGE_CREATE_PROJECT "${CONVEX_FORGE_CREATE_PROJECT:-}"
set_optional_plain CONVEX_FORGE_UPDATE_MENTOR "${CONVEX_FORGE_UPDATE_MENTOR:-}"
set_plain FORGE_APP_ID "${FORGE_APP_ID}"
set_plain FORGE_MACRO_KEY "${FORGE_MACRO_KEY}"
set_plain HDC_RUNTIME_OWNER "${HDC_RUNTIME_OWNER}"
set_plain HDC_RUNTIME_APP_ID "${HDC_RUNTIME_APP_ID}"
set_plain HDC_RUNTIME_ENVIRONMENT_ID "${HDC_RUNTIME_ENVIRONMENT_ID}"
set_plain HDC_RUNTIME_MACRO_KEY "${HDC_RUNTIME_MACRO_KEY}"
set_plain HACKDAY_TEMPLATE_APP_ID "${HACKDAY_TEMPLATE_APP_ID}"
set_plain HACKDAY_TEMPLATE_ENVIRONMENT_ID "${HACKDAY_TEMPLATE_ENVIRONMENT_ID}"
set_plain HACKDAY_TEMPLATE_MACRO_KEY "${HACKDAY_TEMPLATE_MACRO_KEY}"
set_plain CONFLUENCE_HDC_PARENT_PAGE_ID "${CONFLUENCE_HDC_PARENT_PAGE_ID}"
set_plain CONFLUENCE_HDC_PARENT_PAGE_URL "${CONFLUENCE_HDC_PARENT_PAGE_URL}"
set_plain HACKDAY_CREATE_APP_URL "${HACKDAY_CREATE_APP_URL}"
set_secret HACKDAY_CREATE_WEB_SECRET "${HACKDAY_CREATE_WEB_SECRET}"
set_plain FORGE_SITE_URL "${FORGE_SITE_URL}"
set_optional_plain HDC_EVENT_BACKUP_DAILY_MAX_EVENTS "${HDC_EVENT_BACKUP_DAILY_MAX_EVENTS:-}"

echo "Forge tenant variables set for environment: ${ENVIRONMENT}"
