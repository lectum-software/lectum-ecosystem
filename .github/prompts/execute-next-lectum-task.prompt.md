# Execute next Lectum task

Execute the next pending task listed in `_product/tasks/README.md`.

Instructions:

1. Read `AGENTS.md`, `.codex/skills/execute-lectum-task/SKILL.md`, `_product/tasks/README.md`, and the selected task.
2. Read `_product/tasks/ARCHITECTURE.md` and `_product/tasks/PACKAGES.md`.
3. Confirm dependencies are complete.
4. If the task involves UI, read `_product/tasks/PROTO-INVENTORY.md`; use Builder/Quick Copy when available in the client, otherwise use the exported `_product/proto` images and register the tool limitation.
5. Do not use mocks, fake permanent data, or simulated endpoints.
6. If an external decision is missing, register the blocker and do not implement the dependent feature.
7. Reuse existing frontend/backend architecture before creating new structure.
8. Install no package unless the task and `PACKAGES.md` allow it.
9. Implement the task.
10. Run relevant checks/builds.
11. Create/update ADRs.
12. Mark completed acceptance criteria.
13. Commit with a conventional commit message.

Return the task ID, changed files, ADRs, validations, commit hash and any real blockers.
