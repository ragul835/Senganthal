# Senganthal boutique

Full-stack boutique storefront with a React/Vite frontend and a Node.js/Express API backed by PostgreSQL. Customers use guest checkout; a single labelled admin manages products, photos, orders, messages, subscribers, reviews, and upcoming designs.

## Local setup

Requirements: Node.js 22.12+, npm, Docker (or an existing PostgreSQL database).

```bash
cp .env.example .env
docker compose up -d postgres
npm install
npm run db:migrate
ADMIN_EMAIL=admin@example.com ADMIN_PASSWORD='replace-with-a-long-password' npm run db:seed
npm run dev:all
```

Open `http://localhost:5173`. The API listens on `http://localhost:3000`; Vite proxies `/api` during development.

## RWAT-style service manager

The executable `manage-service.sh` follows the grouped, menu-first lifecycle style used by the Yoga site, adapted for this application. The plural `manage-services.sh` name remains as a compatibility alias.

```bash
./manage-service.sh             # interactive Yoga-style menu
./manage-service.sh db-setup    # start PostgreSQL, migrate, and seed admin
./manage-service.sh dev-start   # background API + frontend
./manage-service.sh quick       # complete nohup deployment and smoke test
./manage-service.sh status      # application, PM2, and PostgreSQL status
./manage-service.sh --help      # every CLI command
```

## Verification and production

```bash
npm test
npm run lint
npm run build
```

With the API running, verify the complete login, image upload, catalog, checkout, order lookup, order-status, contact, subscriber, and review flow:

```bash
ADMIN_EMAIL=admin@example.com ADMIN_PASSWORD='your-admin-password' npm run smoke
```

For production, set `NODE_ENV=production`, a random 32+ character `SESSION_SECRET`, the production `DATABASE_URL`, `FRONTEND_ORIGIN`, `PUBLIC_APP_URL`, and SMTP variables. Run `npm run db:migrate`, then `npm start`. Serve `dist/` with Nginx and proxy `/api/` to port 3000. Persist and back up both PostgreSQL and `server/uploads/` (or replace local storage with object storage before horizontal scaling).

The API never trusts cart prices: order totals are recalculated against current catalog records. Admin sessions are opaque, hashed in PostgreSQL, HTTP-only, SameSite cookies. Password-reset tokens are single-use and expire after one hour.
