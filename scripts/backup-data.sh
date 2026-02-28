#!/usr/bin/env bash
# Backup data: Supabase, D1, R2 (weekly)
# Usage: ./scripts/backup-data.sh
# Loads config from scripts/backup.env

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
ENV_FILE="$SCRIPT_DIR/backup.env"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Error: $ENV_FILE not found. Copy from backup.env.example and fill in values."
  exit 1
fi

# shellcheck source=/dev/null
source "$ENV_FILE"

: "${BACKUP_ROOT:?BACKUP_ROOT not set in backup.env}"
: "${SUPABASE_DB_URL:?SUPABASE_DB_URL not set in backup.env}"

DATE=$(date +%Y-%m-%d)
DATA_DIR="$BACKUP_ROOT/data/$DATE"
mkdir -p "$DATA_DIR"

echo "[$(date -Iseconds)] Starting data backup to $DATA_DIR"

# 1. Supabase PostgreSQL dump
if command -v pg_dump &>/dev/null && [[ -n "${SUPABASE_DB_URL:-}" ]]; then
  echo "  Exporting Supabase..."
  pg_dump "$SUPABASE_DB_URL" --no-owner --no-acl > "$DATA_DIR/supabase.sql" 2>/dev/null || {
    echo "  Warning: pg_dump failed (install postgresql or check SUPABASE_DB_URL)"
  }
else
  echo "  Skipping Supabase (pg_dump not found or SUPABASE_DB_URL empty)"
fi

# 2. D1 export (run from workers dir where wrangler.toml lives)
WORKERS_DIR="$REPO_ROOT/workers"
if [[ -f "$WORKERS_DIR/wrangler.toml" ]] && command -v npx &>/dev/null; then
  echo "  Exporting D1..."
  (cd "$WORKERS_DIR" && npx wrangler d1 export jjconnect-db --remote --output="$DATA_DIR/d1.sql" 2>/dev/null) || {
    echo "  Warning: D1 export failed (run wrangler login, check database_id)"
  }
else
  echo "  Skipping D1 (wrangler.toml not found or npx unavailable)"
fi

# 3. R2 (optional - via rclone if R2_RCLONE_REMOTE is set)
if [[ -n "${R2_RCLONE_REMOTE:-}" ]] && command -v rclone &>/dev/null; then
  echo "  Exporting R2..."
  mkdir -p "$DATA_DIR/r2"
  rclone copy "$R2_RCLONE_REMOTE:jjconnect" "$DATA_DIR/r2" --progress 2>/dev/null || {
    echo "  Warning: R2 copy failed (configure rclone R2 remote)"
  }
else
  echo "  Skipping R2 (R2_RCLONE_REMOTE not set or rclone not found)"
fi

echo "[$(date -Iseconds)] Data backup complete: $DATA_DIR"
