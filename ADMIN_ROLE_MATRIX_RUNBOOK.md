# Admin Role Matrix Runbook

## Purpose

This runbook describes safe operations for admin role matrix sync, assignment sync, export, and rollback.

## Required Environment

- Worker vars/secrets:
  - `SUPABASE_URL`
  - `SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`
  - `ROLE_MATRIX_SHEET_URL`
  - `ROLE_ASSIGNMENTS_SHEET_URL`
- Optional (for Next middleware cross-origin verification):
  - `JJC_AUTH_API_BASE`

## Accepted Role Codes

`A`, `B`, `CB`, `VB`, `T`, `S`, `W`, `WN`, `W1`, `W2`, `W3`, `S_writer`

## Supported Sheet Formats

### Permission matrix tab

- Role code column can be in any column.
- Resource headers can be in row 0-11.
- Resource headers must map to known resource names in worker config.
- Permission cells support: `R`, `R/W`, `allow`, `deny`, `-`, `✓`.

### Role assignment tab

Two formats are supported:

1. Role columns format: each column header is a role code and cells below are emails.
2. Row format: each row provides `email` + `role`/`role_level`.

## Operational API Endpoints

- Preview matrix diff: `GET /api/admin/preview-role-matrix-sync`
- Sync matrix: `POST /api/admin/sync-role-matrix`
- Sync assignments: `POST /api/admin/sync-role-assignments`
- Sync all: `POST /api/admin/sync-auth-all`
- Rollback matrix: `POST /api/admin/rollback-role-matrix`
- Export matrix: `GET /api/admin/export-role-matrix?format=json|csv`
- Export assignments: `GET /api/admin/export-role-assignments?format=json|csv`

All endpoints require admin authorization.

## Safe Change Procedure

1. Run preview:
   - `GET /api/admin/preview-role-matrix-sync`
2. Confirm expected `added/removed/changed` counts.
3. Run sync:
   - `POST /api/admin/sync-role-matrix`
4. Run assignment sync (or all-in-one):
   - `POST /api/admin/sync-role-assignments` or `POST /api/admin/sync-auth-all`
5. Verify:
   - `GET /api/admin/export-role-matrix?format=json`
   - `GET /api/admin/stats/roles`

## Rollback Procedure

1. Get recent snapshot id from sync response or logs.
2. Execute:
   - `POST /api/admin/rollback-role-matrix` with body `{ "snapshot_id": <id> }`
3. Re-verify exports and permission checks.

## Validation and Quality Checks

- Matrix parser reports:
  - `parseReport.total`
  - `parseReport.skipped`
  - `parseReport.errors`
- Assignment parser rejects invalid email/role pairs.
- Sync returns `syncReport` with:
  - `updated`
  - `matched`
  - `notFound`
  - `skipped`
- Review non-empty `notFound` before considering run complete.

## Failure Handling

- `503 ROLE_MATRIX_SHEET_URL` or `ROLE_ASSIGNMENTS_SHEET_URL` not set:
  - configure env var/secret and retry.
- `502` sheet fetch failure:
  - check sheet sharing and URL.
- Supabase write failures:
  - verify `SUPABASE_SERVICE_ROLE_KEY`.
- Unexpected parse errors:
  - export sheet as CSV and confirm headers/role values.

## Security Notes

- Admin pages are edge-guarded and API-guarded.
- Do not expose service role keys in frontend.
- Keep Google Sheet read-only by link; never public edit.
