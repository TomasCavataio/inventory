# MSLO Inventory System

This repository contains the MVP for the Municipalidad de San Lorenzo (MSLO) inventory system.

## Stack
- Backend: Node.js + TypeScript + Express + Prisma
- Database: PostgreSQL
- Frontend: React + Vite
- API: REST (versioned)

## Quick start
1. Start the database:

```
docker compose up -d
```

2. Install dependencies:

```
npm install
```

3. Configure the API:

```
copy apps\api\.env.example apps\api\.env
```

4. Run migrations and seed:

```
cd apps\api
npx prisma migrate dev
npm run seed
```

5. Start the dev servers:

```
cd ..\..
npm run dev
```

## Documentation
- Architecture overview: docs/architecture.md
- Data model: docs/data-model.md
- OpenAPI spec: docs/openapi.yaml
- Quick start (roles and flows): docs/operational-manual.md

## Notes
- Default admin user is created by the seed script.
- Defaults come from `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`, `SEED_ADMIN_NAME` in `apps/api/.env` (see `apps/api/.env.example`).
- Sample users use `SEED_USER_PASSWORD` from `apps/api/.env`.
- Seed script also creates sample master data, stock, movements, and alerts.
- Alerts can be recomputed on demand via the API.
