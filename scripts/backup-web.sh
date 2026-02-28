#!/usr/bin/env bash
# Backup web: full repo snapshot (monthly)
# Usage: ./scripts/backup-web.sh
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

DATE=$(date +%Y-%m-%d)
MONTH=$(date +%Y-%m)
WEB_DIR="$BACKUP_ROOT/web/$MONTH"
mkdir -p "$WEB_DIR"
ARCHIVE="$WEB_DIR/jjconnect-web-$DATE.tar.gz"

echo "[$(date -Iseconds)] Starting web backup to $ARCHIVE"

cd "$REPO_ROOT"

if git rev-parse --git-dir &>/dev/null; then
  # Use git archive to exclude .gitignore patterns (node_modules, .next, etc.)
  git archive --format=tar.gz --output="$ARCHIVE" HEAD
  echo "[$(date -Iseconds)] Web backup complete: $ARCHIVE"
else
  echo "Error: not a git repository"
  exit 1
fi
