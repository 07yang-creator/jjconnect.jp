#!/usr/bin/env bash
# Backup entry point: runs data (weekly) and web (monthly), then syncs to Google Drive.
# Schedule via launchd to run daily.
# Usage: ./scripts/backup-run.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="$SCRIPT_DIR/backup.env"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Error: $ENV_FILE not found. Copy from backup.env.example and fill in values."
  exit 1
fi

# shellcheck source=/dev/null
source "$ENV_FILE"

: "${BACKUP_ROOT:?BACKUP_ROOT not set in backup.env}"

DAY_OF_WEEK=$(date +%u)   # 1=Mon .. 7=Sun
DAY_OF_MONTH=$(date +%d | sed 's/^0//')  # 1..31 (no leading zero, for macOS compatibility)

# Weekly data backup: run on Sunday (7)
DATA_BACKUP_DAY=7
# Monthly web backup: run on 1st of month
WEB_BACKUP_DAY=1

RAN_BACKUP=false

# Run data backup weekly
if [[ "$DAY_OF_WEEK" == "$DATA_BACKUP_DAY" ]]; then
  echo "[$(date -Iseconds)] Running weekly data backup"
  "$SCRIPT_DIR/backup-data.sh"
  RAN_BACKUP=true
fi

# Run web backup monthly
if [[ "$DAY_OF_MONTH" == "$WEB_BACKUP_DAY" ]]; then
  echo "[$(date -Iseconds)] Running monthly web backup"
  "$SCRIPT_DIR/backup-web.sh"
  RAN_BACKUP=true
fi

# Sync to Google Drive if rclone is configured
if [[ -n "${RCLONE_REMOTE:-}" ]] && command -v rclone &>/dev/null; then
  RCLONE_PATH="${RCLONE_PATH:-jjconnect.jp}"
  echo "[$(date -Iseconds)] Syncing to $RCLONE_REMOTE:$RCLONE_PATH"
  rclone sync "$BACKUP_ROOT" "$RCLONE_REMOTE:$RCLONE_PATH" --progress
  echo "[$(date -Iseconds)] Sync complete"
else
  echo "[$(date -Iseconds)] Skipping Google Drive sync (RCLONE_REMOTE not set or rclone not found)"
fi

if [[ "$RAN_BACKUP" != true ]]; then
  echo "[$(date -Iseconds)] No backup scheduled for today (data: Sun, web: 1st)"
fi
