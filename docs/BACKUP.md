# Backup Guide

Automatic backups store **data** (weekly) and **web** (monthly) in a local folder and sync to Google Drive.

## What Is Backed Up

| Category | Frequency | Contents |
|----------|-----------|----------|
| **Data** | Weekly (Sunday) | Supabase PostgreSQL dump, D1 SQLite export, R2 bucket (if configured) |
| **Web** | Monthly (1st) | Git archive of full repo (excludes node_modules, .next, etc.) |

## Prerequisites

1. **Supabase**: Get the Postgres connection string from Dashboard > Project Settings > Database.
2. **Cloudflare**: Run `npx wrangler login` and set `database_id` in `workers/wrangler.toml`.
3. **rclone**: Install with `brew install rclone`, run `rclone config` and add a Google Drive remote.
4. **pg_dump**: Install PostgreSQL client (e.g. `brew install postgresql`) for Supabase backup.

## Setup

1. Copy the backup env template and fill in values:

   ```bash
   cp scripts/backup.env.example scripts/backup.env
   # Edit scripts/backup.env
   ```

2. Create the backup directory (or use your configured BACKUP_ROOT, e.g. external volume):

   ```bash
   mkdir -p "/Volumes/2025 Backup/RepoBack JJCONNCT.jp"
   ```

3. Test manually:

   ```bash
   ./scripts/backup-data.sh
   ./scripts/backup-web.sh
   source scripts/backup.env
   rclone sync "$BACKUP_ROOT" "$RCLONE_REMOTE:$RCLONE_PATH" --dry-run
   ```

4. Install the launchd schedule (runs daily at 2 AM, triggers data/web based on day):

   ```bash
   ./scripts/install-backup-launchd.sh
   launchctl load ~/Library/LaunchAgents/com.jjconnect.backup.plist
   ```

## Output Layout

```
/Volumes/2025 Backup/RepoBack JJCONNCT.jp/   # or your BACKUP_ROOT
├── data/
│   └── YYYY-MM-DD/
│       ├── supabase.sql
│       ├── d1.sql
│       └── r2/          # If R2_RCLONE_REMOTE is set
└── web/
    └── YYYY-MM/
        └── jjconnect-web-YYYY-MM-DD.tar.gz
```

## Manual Commands

```bash
# Run data backup now
./scripts/backup-data.sh

# Run web backup now
./scripts/backup-web.sh

# Run full backup logic (weekly + monthly + sync)
./scripts/backup-run.sh

# Sync only (no backup) - source backup.env first for BACKUP_ROOT and RCLONE_REMOTE
source scripts/backup.env
rclone sync "$BACKUP_ROOT" "$RCLONE_REMOTE:$RCLONE_PATH"
```

## Restore

### Supabase

```bash
psql "$SUPABASE_DB_URL" < ~/Backups/jjconnect.jp/data/YYYY-MM-DD/supabase.sql
```

### D1

```bash
cd workers
npx wrangler d1 execute jjconnect-db --remote --file=path/to/d1.sql
```

### R2

```bash
rclone copy ~/Backups/jjconnect.jp/data/YYYY-MM-DD/r2 "$R2_RCLONE_REMOTE:jjconnect"
```

### Web

```bash
tar -xzf ~/Backups/jjconnect.jp/web/YYYY-MM/jjconnect-web-YYYY-MM-DD.tar.gz -C /path/to/restore
```

## Disable Automatic Backup

```bash
launchctl unload ~/Library/LaunchAgents/com.jjconnect.backup.plist
```
