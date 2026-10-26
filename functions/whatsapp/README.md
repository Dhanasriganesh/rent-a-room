# WhatsApp Cloud Functions (Phase 7+)

Scaffold for server-side Meta integration. **Not deployed in Phase 7 UI work.**

When ready:

1. Add Firebase Functions to the project (Blaze plan).
2. Store secrets with `firebase functions:secrets:set WHATSAPP_ACCESS_TOKEN` (etc.).
3. Implement:
   - `GET /whatsapp/webhook` — Meta verify challenge using `WHATSAPP_WEBHOOK_VERIFY_TOKEN`
   - `POST /whatsapp/webhook` — verify `X-Hub-Signature-256` with app secret; call `ingestWhatsAppWebhook` via Admin SDK
   - `POST /whatsapp/send` — staff-authenticated callable that uses Cloud API (not the browser)
4. Point Meta App webhook to the Function HTTPS URL.
5. Keep Vite `VITE_*` free of tokens.

Until then, use **Manager → WhatsApp → sandbox send / ingest test webhook**.
