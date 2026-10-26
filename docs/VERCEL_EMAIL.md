# Vercel email (Gmail SMTP)

Live mail uses `api/send.js`. Gmail credentials stay in **Vercel Environment Variables** (server-only).

Staff must be signed in — the API checks their Firebase login. **No separate EMAIL_API_KEY.**

## Vercel → Settings → Environment Variables

| Name | Notes |
|------|--------|
| `GMAIL_USER` | e.g. `grahmindinnovations@gmail.com` |
| `GMAIL_APP_PASSWORD` | Gmail App Password |
| `GMAIL_FROM_NAME` | `HomeRental` |
| `FIREBASE_WEB_API_KEY` | Same value as `VITE_FIREBASE_API_KEY` |
| `FIREBASE_PROJECT_ID` | Same value as `VITE_FIREBASE_PROJECT_ID` |
| `VITE_EMAIL_MODE` | `live` |

Also keep your existing `VITE_FIREBASE_*` vars.

Do **not** put Gmail passwords in any `VITE_*` variable.

Redeploy after changing env. Superadmin → Settings → **Email mode → Live**.

## Local

```bash
npm run email:api
```

`.env`: `VITE_EMAIL_API_URL=http://localhost:8787` and `VITE_EMAIL_MODE=live`.
