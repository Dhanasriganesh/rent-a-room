# Outbound email (Gmail SMTP)

Uses the same pattern as your nodemailer Gmail script, but **only on the server** (Cloud Function). App passwords must never go in `VITE_*` or the React app.

## One-time setup

1. Enable **Blaze** plan on the Firebase project (required for outbound network from Functions).
2. Install deps:

```bash
cd functions
npm install
```

3. Store Gmail secrets (do **not** commit these):

```bash
firebase functions:secrets:set GMAIL_USER
# paste: your-gmail@gmail.com

firebase functions:secrets:set GMAIL_APP_PASSWORD
# paste: Gmail App Password (16 chars, spaces ok)
```

Create an App Password in Google Account → Security → 2-Step Verification → App passwords.

4. Deploy:

```bash
firebase deploy --only functions
```

5. In the app: **Superadmin → Settings → Email mode → Live**.

## Local emulator (optional)

Copy `functions/.env.example` → `functions/.env` with `GMAIL_USER` / `GMAIL_APP_PASSWORD`, then:

```bash
firebase emulators:start --only functions
```

Point the web app at the emulator if needed (`connectFunctionsEmulator`).

## Templates

| Template | When |
|----------|------|
| `renter_credentials_new` | Manager creates tenant login + temp password |
| `renter_credentials_existing` | Email already had an account |

## Security

- Rotate any App Password that was pasted into chat or committed by mistake.
- Prefer Secrets Manager (`functions:secrets:set`) over plain `.env` in production.
