# Repository Instructions

Use [AGENTS.md](../AGENTS.md) as the canonical workspace instruction file.

Hard rules:

- Since 2026-08-07, homologation and production are live and may contain real data.
- Since 2026-10-06, validate on localhost, then release through a reviewed PR to production. Follow `_product/tasks/LOCAL-TO-PRODUCTION.md`; remote homologation is no longer a mandatory gate.
- Work and commit on `homolog`, but keep commits local until a release is authorized. Before any push, verify external homologation auto-deploy triggers are disabled; documentation alone does not disable providers. Never push directly to `main`.
- With explicit production authorization, verify local checks/builds/flows and production health, publish the validated commits, use `gh` to create/reuse `homolog` → `main`, wait for required checks, merge without deleting `homolog`, and run production smoke tests. Do not bypass required checks or use remote deployment to compensate for missing local validation.
- Never reset, destructively seed, bulk-delete, or clean storage in a published environment.
- Evolve databases with expand/backfill/contract; never make a field required without existing-data compatibility and never edit an applied migration.
- A new mandatory env requires an explicit **DEPLOY ALERT** naming the key, affected app, provisioning order, and failure impact, without exposing its value. Prefer a safe optional/default first deploy.
- Keep API changes additive during rollout and never expose technical/provider details, PII, secrets, stacks, or SQL in public responses, logs, or UI.
- Execute product work from `_product/tasks/README.md`, one task at a time.
- Do not use mocks, fake permanent data, or simulated endpoints to satisfy acceptance criteria.
- If an external decision is missing, stop and register the blocker.
- For visual work, use `_product/tasks/PROTO-INVENTORY.md`.
- Use Builder/Quick Copy when available in the client; otherwise use exported `_product/proto` images and register the tool limitation.
- Before closing a task, mark acceptance criteria, create/update ADRs, run checks/builds, and commit.
- Before every new agent-created commit, run `pnpm version:bump` exactly once, include all five synchronized package manifests, and run `pnpm check:version`. A retry of the same failed commit must not bump again.
- Verify published versions through backend `/ping` and frontend/admin/video `/version`; `/version` stays public, uncached, noindex, and unlinked.
- If a task changes `backend/prisma/schema.prisma` or `backend/prisma/migrations`, run `pnpm --dir backend db:migrate` during execution.
- If `prisma migrate dev` fails because of existing development data/state, ask the user before resetting the database or running destructive commands.
- Treat `backend/`, `frontend/`, `admin/`, and `video/` as separate apps that share this repository only for development.

Validation baseline:

- Root: `pnpm check`
- Backend: `pnpm --dir backend check`
- Backend database changes: `pnpm --dir backend db:migrate`
- Frontend: `pnpm --dir frontend check`
- Admin: `pnpm --dir admin check`
- Video: `pnpm --dir video check`
