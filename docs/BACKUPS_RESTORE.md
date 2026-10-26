# Backups and restore

## What to back up

| Asset | How |
|-------|-----|
| Firestore data | Scheduled export to a GCS bucket (Firebase / GCP Console) |
| Auth users | Identity Platform / Firebase Auth export (or rely on daily GCP backups if enabled) |
| App source | Git remote (this repo) |
| Rules & indexes | In repo: `firestore.rules`, `firestore.indexes.json` |
| Hosting build | Rebuild from git tag; keep last known-good `dist` optional |

## Recommended schedule

1. Enable **Firestore managed export** daily to a project-owned bucket.  
2. Retain ≥ 30 days.  
3. After any risky migration (inventory cutover, mass status rewrite), take an **on-demand export** first.

## Restore drill (document the date)

1. Create a **scratch Firebase project** or temporary database.  
2. Import a recent export.  
3. Point a staging `.env` at the scratch project.  
4. Smoke: login as admin, open Owners / Applicants / Rent / Messages.  
5. Record date in Settings → **Mark restore drill today**.

Never run restore drills against production without a written plan and freeze window.

## Rollback of bad data

Prefer forward fixes with audit notes. If an export restore is required:

1. Freeze writes (Settings → Maintenance mode).  
2. Import export into production only with GCP admin + dual confirmation.  
3. Redeploy matching app commit.  
4. Spot-check allocations, contracts, rent charges.

Stamp **Mark backup verified today** after you confirm the latest export exists and is readable.
