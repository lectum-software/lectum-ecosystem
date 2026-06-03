---
name: Lectum Product Docs
description: Product task and ADR documentation rules.
applyTo: "_product/**/*.md,adrs/**/*.md,.codex/**/*.md,AGENTS.md,.github/**/*.md"
---

# Lectum Product Documentation Instructions

- Write tasks so they can be executed without chat history.
- Include context, objective, scope, out of scope, acceptance criteria, validation and ADR/commit expectations.
- Use explicit blockers for external decisions: payment, storage, WhatsApp, CFP, e-mail/SMS, legal/LGPD and moderation.
- Do not reference architectural material outside the executor workspace as required context.
- Criteria must be checkboxes that the executor can mark from `[ ]` to `[x]`.
- Prefer concrete commands over generic "run tests" language.
- Record important decisions in `adrs/`.
- Reference `_product/tasks/ARCHITECTURE.md` when describing implementation rules.
- Reference `_product/tasks/PACKAGES.md` when describing dependencies.
