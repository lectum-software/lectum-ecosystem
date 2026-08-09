# Repository Instructions

Use [AGENTS.md](../AGENTS.md) as the canonical workspace instruction file.

Hard rules:

- Since 2026-08-07, homologation and production are live and may contain real data.
- `homolog` auto-deploys homologation; `main` auto-deploys production. Work and push only on `homolog`; if currently on `main`, stop and tell the user to switch branches.
- Never push directly to `main`. Promote only through a reviewed merge after homologation smoke tests.
- When the user explicitly asks to put the current homologated code in production, use `gh` to create or reuse a `homolog` → `main` PR, wait for required checks, merge it without deleting `homolog`, and run production smoke tests. Do not delegate the merge unless access is genuinely blocked.
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
- Before every new agent-created commit, run `pnpm version:bump` exactly once, include all four synchronized package manifests, and run `pnpm check:version`. A retry of the same failed commit must not bump again.
- Verify published versions through backend `/ping` and frontend/admin `/version`; `/version` stays public, uncached, noindex, and unlinked.
- If a task changes `backend/prisma/schema.prisma` or `backend/prisma/migrations`, run `pnpm --dir backend db:migrate` during execution.
- If `prisma migrate dev` fails because of existing development data/state, ask the user before resetting the database or running destructive commands.
- Treat `backend/`, `frontend/`, and `admin/` as separate apps that share this repository only for development.

Validation baseline:

- Root: `pnpm check`
- Backend: `pnpm --dir backend check`
- Backend database changes: `pnpm --dir backend db:migrate`
- Frontend: `pnpm --dir frontend check`
- Admin: `pnpm --dir admin check`
