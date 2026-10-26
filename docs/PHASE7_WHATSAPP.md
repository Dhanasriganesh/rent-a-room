# Phase 7 — WhatsApp (Cloud API)

## Architecture

| Layer | Responsibility |
|-------|----------------|
| `src/lib/whatsapp/adapter.js` | Provider interface; E.164 / no-groups guards |
| `sandboxProvider.js` | Dry-run send — **never calls Meta** |
| Manager `/manager/whatsapp` | Test send, templates, webhook simulation, go-live checklist |
| Cloud Functions (next) | Verify webhook signatures, hold tokens, real send |

**Client apps must not store WhatsApp access tokens.** Rejected if written via settings API.

## Modes

- `sandbox` (default) — log only  
- `test` — Meta test number via Functions (when deployed)  
- `live` — blocked unless `platform_settings/whatsapp.productionApproved === true`

## Acceptance (this phase)

1. Sandbox send writes `message_delivery_logs` with `channel: whatsapp`.  
2. “Ingest test inbound” creates a Messages inbox thread on channel `whatsapp`.  
3. Status webhook simulation logs delivered/read/failed.  
4. No live number migration without checklist + written approval.

## Coexistence / client number

Do **not** migrate the client’s existing WhatsApp Business number until:

1. Checklist complete in the WhatsApp UI  
2. Written approval stored (`productionApproved`)  
3. Cloud Function webhook URL verified with Meta  
4. Rollback plan documented  

Group messaging is **unsupported**. Rent details are never sent to shared groups.

## Env (Functions only — not Vite)

```
WHATSAPP_ACCESS_TOKEN=
WHATSAPP_PHONE_NUMBER_ID=
WHATSAPP_BUSINESS_ACCOUNT_ID=
WHATSAPP_APP_SECRET=
WHATSAPP_WEBHOOK_VERIFY_TOKEN=
WHATSAPP_MODE=sandbox
```

## Deploy rules

```bash
firebase deploy --only firestore:rules,firestore:indexes --project rentalrooms-50a77
```
