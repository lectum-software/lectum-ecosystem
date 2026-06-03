# Repository Instructions

Use [AGENTS.md](../AGENTS.md) as the canonical workspace instruction file.

Hard rules:

- Execute product work from `_product/tasks/README.md`, one task at a time.
- Do not use mocks, fake permanent data, or simulated endpoints to satisfy acceptance criteria.
- If an external decision is missing, stop and register the blocker.
- For visual work, use `_product/tasks/PROTO-INVENTORY.md`.
- Use Builder/Quick Copy when available in the client; otherwise use exported `_product/proto` images and register the tool limitation.
- Before closing a task, mark acceptance criteria, create/update ADRs, run checks/builds, and commit.
- Treat `backend/` and `frontend/` as separate apps that share this repository only for development.

Validation baseline:

- Root: `pnpm check`
- Backend: `pnpm --dir backend check`
- Frontend: `pnpm --dir frontend check`
