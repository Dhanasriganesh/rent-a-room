# Deploy and rollback

Project id (current): `rentalrooms-50a77` — confirm in `.firebaserc` before any deploy.

## Build

```bash
npm ci
npm run build
```

## Firestore rules & indexes

```bash
npx firebase-tools deploy --only firestore:rules,firestore:indexes --project rentalrooms-50a77
```

Deploy rules **before** shipping app builds that write new collections (`move_events`, etc.).

## Hosting (if using Firebase Hosting)

```bash
npx firebase-tools deploy --only hosting --project rentalrooms-50a77
```

Or deploy `dist/` to your existing CDN / static host.

## App release checklist

1. `node scripts/verify-phase9.mjs` (and earlier phase verifies as needed).  
2. `npm run build`.  
3. Deploy rules/indexes.  
4. Deploy hosting / static assets.  
5. Smoke as admin: Overview → Inventory → Applicants → Rent → Messages → Maintenance → Lifecycle → Reports → Settings.  
6. Confirm WhatsApp/email still sandbox unless intentionally live.

## Rollback

| Layer | Action |
|-------|--------|
| App UI | Redeploy previous git tag / previous `dist` |
| Rules | `git checkout <good-sha> -- firestore.rules` then deploy rules |
| Indexes | Indexes are additive; removing unused ones is optional |
| Feature flags | Settings → enable maintenance mode; disable apply/chat |

Do **not** `firebase deploy` from an unknown machine with prod credentials casually. Prefer CI or a named operator laptop.

## Observability

Watch Firebase Console:

- Authentication → usage spikes / failed sign-ins  
- Firestore → error rates / hot documents  
- `message_delivery_logs` failed / `live_blocked`  
- `audit_logs` for unexpected role or settings changes  

Record custom notes under Settings → Observability notes.
