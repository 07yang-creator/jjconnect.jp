#!/usr/bin/env bash
# Install launchd plist for automatic backups.
# Run once from repo root: ./scripts/install-backup-launchd.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
PLIST_SRC="$SCRIPT_DIR/com.jjconnect.backup.plist"
PLIST_DEST="$HOME/Library/LaunchAgents/com.jjconnect.backup.plist"

# Substitute REPO_ROOT_PLACEHOLDER with actual path
sed "s|REPO_ROOT_PLACEHOLDER|$REPO_ROOT|g" "$PLIST_SRC" > "$PLIST_DEST"
echo "Installed $PLIST_DEST"
echo "Load with: launchctl load $PLIST_DEST"
echo "Unload with: launchctl unload $PLIST_DEST"
