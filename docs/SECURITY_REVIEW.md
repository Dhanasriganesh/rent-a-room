# Security review (Phase 9)

Walk this before production traffic. Record completion in **Settings → Security review**.

## Access control

- [ ] Only intended admin email can sign in as `admin` (bootstrap locked).
- [ ] Staff created only via invitations (`/invite/:token`).
- [ ] Public register creates **renter** only.
- [ ] Owner accounts are company-onboarded (not open self-serve if that is your policy).

## Firestore rules

- [ ] Deploy current `firestore.rules` to the production project.
- [ ] `move_events`, `allocations`, `contracts` are staff-write.
- [ ] `platform_settings` writes are admin-only (except bootstrap `lock`).
- [ ] Guests can create website conversations/messages with size limits only.

## Secrets

- [ ] No `WHATSAPP_ACCESS_TOKEN`, SMTP passwords, or service accounts in `VITE_*`.
- [ ] `.env` is gitignored; `.env.example` has placeholders only.
- [ ] WhatsApp `productionApproved` is false until written approval.

## Data exposure

- [ ] Contracts never public.
- [ ] Delivery logs staff-only.
- [ ] Audit logs staff-only.
- [ ] **Residual risk:** `messages` allow any signed-in user to read (legacy). New messages store `participantIds` for a future rule tighten + backfill.

## Abuse surfaces

- [ ] Client rate limits on apply, chat, register.
- [ ] Optional: Firebase App Check on the web app.
- [ ] Optional: Cloud Functions quotas / reCAPTCHA on public chat.

## Logging

- [ ] Sensitive fields (passwords, tokens) never written to `audit_logs`.
- [ ] ErrorBoundary does not show stack traces to users.
