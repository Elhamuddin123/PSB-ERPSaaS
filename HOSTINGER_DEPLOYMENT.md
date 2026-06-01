# Hostinger Shared Hosting Deployment

This project splits frontend and backend builds.
Use `psb-erp.com` for static frontend files and `api.psb-erp.com` for the Node backend.

## Frontend

1. Build the frontend:
   ```bash
   npm run build:frontend-only
   ```
2. Upload the contents of `dist/public` to Hostinger static site hosting or `public_html` for `psb-erp.com`.
3. Confirm the frontend URL is `https://psb-erp.com`.

### Frontend runtime config

The frontend uses Vite runtime env `VITE_API_URL`.
Your production build should use:

```env
VITE_API_URL=https://api.psb-erp.com
VITE_APP_URL=https://psb-erp.com
```

This is loaded via `.env.production` when running `npm run build:frontend-only`.

## Backend

1. Build the backend:
   ```bash
   npm run build:backend-only
   ```
2. Deploy the backend bundle from `dist/backend` to Hostinger Node.js hosting for `api.psb-erp.com`.
3. Set the startup command to:
   ```bash
   node dist/backend/boot.js
   ```
4. Use Node.js `20.x`.

## Backend environment variables

Set these in Hostinger Node.js app settings (do not rely on `.env` for production secrets if possible):

- `NODE_ENV=production`
- `APP_ID`
- `APP_SECRET`
- `DATABASE_URL`
- `KIMI_AUTH_URL`
- `KIMI_OPEN_URL`
- `OWNER_UNION_ID` (optional but recommended)
- `OPENAI_API_KEY` (if using AI features)
- `EXCHANGE_API_KEY` / `EXCHANGE_API_URL` (if using exchange rates)
- `SESSION_SAMESITE_NONE` / `ALLOW_CROSS_SITE_COOKIES` / `FORCE_COOKIE_SECURE` (cookie behavior)
- `UPLOAD_DIR` (optional)
- `PORT` (optional, default `3000`)

## Verify

- Frontend app should load at `https://psb-erp.com`.
- API should be accessible at `https://api.psb-erp.com/api/trpc`.
- If working correctly, the browser will call the backend using the `VITE_API_URL` built into the static files.

## Important note

Because Hostinger shared hosting does not provide a custom reverse proxy easily, this guide uses **Option A**:
- Frontend uses a direct backend domain: `https://api.psb-erp.com`
- No `/api/*` proxy is required on `psb-erp.com`
