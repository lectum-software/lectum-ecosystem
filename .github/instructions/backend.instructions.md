---
name: Lectum Backend
description: Backend rules for the Lectum Express and Prisma app.
applyTo: "backend/**"
---

# Lectum Backend Instructions

- Use Express 5, Prisma 7, TypeScript, Biome, Passport/JWT/Google OAuth and the existing package structure.
- Keep backend independent from frontend production assumptions.
- Do not create fake data paths to satisfy product criteria.
- Prefer real Prisma models, migrations and endpoints for every persisted feature.
- Keep translations in `backend/locales/pt` aligned with keys used by current code.
- Validate with `pnpm --dir backend check`; run `pnpm --dir backend build` for structural/backend feature changes.
- If an external provider is missing, register the blocker instead of stubbing the integration.
- New modules must follow `modules/api/{public|private}/{domain}/{case}` with validator, controller, service and repository when business logic exists.
- Register routes in `src/main/server/imports/write.ts`.
- Use `send`, `error500`, `error` and `msg`; do not invent response formats.
