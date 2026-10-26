# Phase 9 — Production hardening

## Delivered in-app

| Item | Where |
|------|--------|
| Client rate limits | `src/lib/rateLimit.js` → apply, website chat, register |
| Ops flags | `platform_settings/hardening` · `/manager/settings` |
| Maintenance / apply / chat gates | `createApplication`, `startWebsiteEnquiry` |
| Error boundary | `src/components/ErrorBoundary.jsx` (no stack leak to UI) |
| Listing fetch cap | `getPublishedListings` default limit 100 |
| Message `participantIds` | Written on new sends (prep for tighter rules) |
| Security + readiness checklists | Settings UI + docs below |

## Companion docs

- [SECURITY_REVIEW.md](./SECURITY_REVIEW.md)
- [BACKUPS_RESTORE.md](./BACKUPS_RESTORE.md)
- [DEPLOY_ROLLBACK.md](./DEPLOY_ROLLBACK.md)
- [STAFF_GUIDE.md](./STAFF_GUIDE.md)

## Acceptance

1. Rapid apply / chat / register attempts hit a client rate-limit error.  
2. Maintenance mode blocks apply + website chat.  
3. Admin can tick security & production checklists and stamp backup/restore dates.  
4. `npm run build` succeeds; deploy/rollback steps documented.  
5. No WhatsApp/email tokens in Vite env.

## Known follow-ups (Cloud Functions)

- Server-side App Check + rate limits (client limits are bypassable).  
- Tighten `messages` list rules using `participantIds` after a backfill.  
- Live email/WhatsApp only via Functions + Secret Manager.

## Offline verify

```bash
node scripts/verify-phase9.mjs
```
