<!-- README for PSB-ERPSaaS -->

# PSB-ERPSaaS

Enterprise Travel Agency ERP & Ticket Management SaaS Platform.

## Overview

PSB-ERPSaaS is a multi-tenant ERP platform for travel agencies, ticketing firms, and B2B operations.

Features include:

- Ticket management
- Customer CRM
- Accounting and finance
- Wallet and payment management
- Expense tracking
- Reporting and analytics
- Supplier management
- Invoice management
- Multi-tenant SaaS support
- AI assistant integration

## Tech Stack

- Frontend: React, TypeScript, Vite, Tailwind CSS
- Backend: Node.js, Hono, tRPC, Drizzle ORM, MySQL
- Build: Vite, esbuild
- Database migrations: drizzle-kit

## Repository Structure

```text
api/            # backend routes and server entrypoint
src/            # frontend application source
db/             # database schema, SQL exports, and migrations
contracts/      # shared types/constants
dist/           # build output for frontend and backend
scripts/        # utility scripts
```

## Prerequisites

- Node.js 20.x or higher
- npm 9.x or higher
- MySQL database

## Local Setup

1. Clone repository

```bash
git clone https://github.com/Elhamuddin123/PSB-ERPSaaS.git
cd "PSB-ERPSaaS"
```

2. Install dependencies

```bash
npm install
```

3. Create `.env` file

Example values:

```env
DATABASE_URL=mysql://user:password@127.0.0.1:3306/database
APP_ID=psb-erp
APP_SECRET=your-production-secret-longer-than-32-chars
KIMI_AUTH_URL=https://your-kimi-auth-server
KIMI_OPEN_URL=https://your-kimi-open-server
NODE_ENV=development
```

4. Run the app in development

```bash
npm run dev
```

## Build Commands

Frontend build only:

```bash
npm run build:frontend-only
```

Backend build only:

```bash
npm run build:backend-only
```

Build both locally:

```bash
npm run build:local
```

## Production Deployment

### Backend

1. Build the backend:

```bash
npm run build:backend-only
```

2. Deploy the `dist/backend` folder and `package.json`/`node_modules` as required by your host.

3. Configure production environment variables:

```text
NODE_ENV=production
DATABASE_URL=mysql://user:password@host:3306/database
APP_ID=psb-erp
APP_SECRET=your-production-secret
KIMI_AUTH_URL=https://your-kimi-auth-server
KIMI_OPEN_URL=https://your-kimi-open-server
SESSION_SAMESITE_NONE=true
FORCE_COOKIE_SECURE=true
VITE_API_URL=https://api.psb-erp.com
```

4. Set the startup command:

```bash
node dist/backend/boot.js
```

### Frontend

1. Build the frontend:

```bash
npm run build:frontend-only
```

2. Serve `dist/public` from your static hosting platform.

3. Make sure the frontend uses the correct backend URL by setting:

```text
VITE_API_URL=https://api.psb-erp.com
```

## Hostinger Deployment Notes

- Use Node 20.x for backend hosting.
- Deploy the backend to the API subdomain, e.g. `api.psb-erp.com`.
- Deploy `dist/public` to the main frontend/static domain, e.g. `psb-erp.com`.
- Ensure the browser app is configured with `VITE_API_URL` pointing to your backend domain.
- Set `SESSION_SAMESITE_NONE=true` if the frontend and backend are on different domains and the session cookie must be shared.

## Database Deployment

1. Create the database and user.
2. Run migrations:

```bash
npm run db:migrate
```

3. Seed initial data if needed:

```bash
mysql -u user -p database < db/seed.sql
```

4. If you deploy a fresh database, use `db/init_schema.sql` and `db/add_foreign_keys.sql` if your host requires separate FK application.

## Common Commands

- `npm run dev` — start frontend/dev server
- `npm run build:frontend-only` — build frontend only
- `npm run build:backend-only` — build backend only
- `npm run start` — start production backend from `dist/backend/boot.js`
- `npm run lint` — lint code
- `npm run test` — run tests
- `npm run db:generate` — generate Drizzle schema artifacts
- `npm run db:migrate` — apply database migrations
- `npm run db:push` — push schema changes

## Notes

- The backend is deployed from `dist/backend/boot.js`.
- The frontend assets are deployed from `dist/public`.
- `Session.cookieName` is `kimi_sid`, and cookie-based auth requires `credentials: include` from the frontend.

## Author

Elhamuddin Mukhtari