# Phase 6 — Website inbox & sandboxed email

## Website messenger

Floating button on public pages (`PublicLayout`). Guests submit name, email, topic, and message without signing in. Thread stored as `conversations` with `channel: "website"`. Session id kept in `localStorage` for follow-ups.

Does **not** confirm availability from the bot — system reply only acknowledges handover to a human.

## Manager inbox (`/manager/messages`)

- Channel labels: website / in_app / email / whatsapp  
- Status: open, pending, escalated, resolved  
- Assign to me, escalate, resolve  
- Internal notes (staff-only)  
- Reply sends in-app message + **sandbox** outbound email log  

## Email sandbox

`enqueueOutboundEmail` always logs to `message_delivery_logs` with `mode: sandbox` (or `live_blocked` if `VITE_EMAIL_MODE=live` without a provider).

- Idempotency via `idempotencyKey`  
- Retry increments attempts; **no external SMTP/API call** in Phase 6  

## Deploy

```bash
firebase deploy --only firestore:rules,firestore:indexes --project rentalrooms-50a77
```
