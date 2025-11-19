#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
OUT_DIR="${ROOT}/out"
TRIAGE_SCRIPT="${ROOT}/scripts/diagnostics/triage_social_usage.ts"
MIGRATION_FILE="${ROOT}/supabase/migrations/20251113_fix_usage_limits.sql"

mkdir -p "${OUT_DIR}"

echo "[VERIFY] Using project root: ${ROOT}"
echo "[VERIFY] Output directory: ${OUT_DIR}"

if [[ -f "${MIGRATION_FILE}" ]]; then
  if [[ -z "${DATABASE_URL:-}" ]]; then
    echo "[VERIFY] DATABASE_URL not set. Skipping direct migration execution."
  else
    echo "[VERIFY] Applying migration ${MIGRATION_FILE}"
    psql "${DATABASE_URL}" -f "${MIGRATION_FILE}"
  fi
else
  echo "[VERIFY] Migration file not found: ${MIGRATION_FILE}"
fi

echo "[VERIFY] Running triage before changes"
npx tsx "${TRIAGE_SCRIPT}" > "${OUT_DIR}/triage_before.txt"

API_BASE="${API_BASE:-http://localhost:3000}"
FREE_USER_EMAIL="${FREE_USER_EMAIL:-}"

echo "[VERIFY] Hitting API endpoints (expects dev server running at ${API_BASE})"
if [[ -n "${FREE_USER_EMAIL}" ]]; then
  curl -sf "${API_BASE}/api/usage/status" \
    -H "Content-Type: application/json" \
    --cookie "pleia-session-email=${FREE_USER_EMAIL}" \
    | tee "${OUT_DIR}/usage_status.json"
else
  echo "[VERIFY] FREE_USER_EMAIL not provided; skipping /api/usage/status call"
fi

curl -sf "${API_BASE}/api/trending?limit=10&enrich=1" | tee "${OUT_DIR}/trending_enriched.json"

if [[ -n "${FREE_USER_EMAIL}" ]]; then
  curl -sf "${API_BASE}/api/social/friends/request" \
    -H "Content-Type: application/json" \
    --cookie "pleia-session-email=${FREE_USER_EMAIL}" \
    -d '{"username":"qa-pleia-bot1"}' \
    | tee "${OUT_DIR}/friend_request.json" || true
else
  echo "[VERIFY] FREE_USER_EMAIL not provided; skipping friend request call"
fi

echo "[VERIFY] Running triage after changes"
npx tsx "${TRIAGE_SCRIPT}" > "${OUT_DIR}/triage_after.txt"

if command -v diff >/dev/null 2>&1; then
  echo "[VERIFY] Diff triage before vs after"
  diff -u "${OUT_DIR}/triage_before.txt" "${OUT_DIR}/triage_after.txt" || true
else
  echo "[VERIFY] diff not available; skipping diff output"
fi

echo "[VERIFY] Done. Check ${OUT_DIR} for artifacts."


