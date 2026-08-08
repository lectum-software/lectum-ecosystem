# Execute next Lectum task

Execute the next pending task listed in `_product/tasks/README.md`.

Instructions:

1. Check the current branch. Stop on `main` and tell the user to switch to `homolog`.
2. Read `AGENTS.md`, `.codex/skills/execute-lectum-task/SKILL.md`, `_product/tasks/README.md`, and the selected task.
3. Read `_product/tasks/ARCHITECTURE.md` and `_product/tasks/PACKAGES.md`.
4. Read `_product/tasks/DATA-MODEL.md` when the task touches Prisma models, DTOs or API contracts.
5. Confirm dependencies are complete.
6. If the task involves UI, read `_product/tasks/PROTO-INVENTORY.md`; use Builder/Quick Copy when available in the client, otherwise use the exported `_product/proto` images and register the tool limitation.
7. Use the `TASK-02` form foundation for product forms/fields.
8. Do not use mocks, fake permanent data, or simulated endpoints.
9. If an external decision is missing, register the blocker and do not implement the dependent feature.
10. Reuse existing frontend/backend architecture before creating new structure.
11. Install no package unless the task and `PACKAGES.md` allow it.
12. Implement the task.
13. If the task changes `backend/prisma/schema.prisma` or `backend/prisma/migrations`, run `pnpm --dir backend db:migrate`. If it fails because of existing development data/state, ask the user before resetting the database.
14. Run relevant checks/builds.
15. Create/update ADRs.
16. Mark completed acceptance criteria.
17. Commit with a conventional commit message.
18. Record data/env/rollout/rollback impact. A mandatory new env requires a deploy alert without its value.
19. Confirm `homolog`, warn that push auto-deploys homologation, and run `git push`. Never push directly to `main`; recommend reviewed promotion only after smoke tests.

Return the task ID, changed files, ADRs, validations, commit hash, push status and any real blockers.
