# Execute next Lectum task

Execute the next pending task listed in `_product/tasks/README.md`.

Instructions:

1. Read `AGENTS.md`, `.codex/skills/execute-lectum-task/SKILL.md`, `_product/tasks/README.md`, and the selected task.
2. Read `_product/tasks/ARCHITECTURE.md` and `_product/tasks/PACKAGES.md`.
3. Read `_product/tasks/DATA-MODEL.md` when the task touches Prisma models, DTOs or API contracts.
4. Confirm dependencies are complete.
5. If the task involves UI, read `_product/tasks/PROTO-INVENTORY.md`; use Builder/Quick Copy when available in the client, otherwise use the exported `_product/proto` images and register the tool limitation.
6. Use the `TASK-02` form foundation for product forms/fields.
7. Do not use mocks, fake permanent data, or simulated endpoints.
8. If an external decision is missing, register the blocker and do not implement the dependent feature.
9. Reuse existing frontend/backend architecture before creating new structure.
10. Install no package unless the task and `PACKAGES.md` allow it.
11. Implement the task.
12. If the task changes `backend/prisma/schema.prisma` or `backend/prisma/migrations`, run `pnpm --dir backend db:migrate`. If it fails because of existing development data/state, ask the user before resetting the database.
13. Run relevant checks/builds.
14. Create/update ADRs.
15. Mark completed acceptance criteria.
16. Commit with a conventional commit message.

Return the task ID, changed files, ADRs, validations, commit hash and any real blockers.
