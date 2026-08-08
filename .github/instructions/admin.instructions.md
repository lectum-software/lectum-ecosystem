---
name: Lectum Admin
description: Admin rules for the separate Lectum Next.js application.
applyTo: "admin/**"
---

# Lectum Admin Instructions

- Treat `admin/` as a separately built and deployed application, not a frontend route group.
- Reuse the existing API client, admin shell, query/loading/error components and form foundation before creating alternatives.
- Every `/api/admin/private/*` endpoint must remain protected by the backend's central admin authentication.
- Never expose raw API/provider errors, secrets, stacks, SQL, internal URLs or user PII in UI or logs.
- Preserve least privilege, read-only behavior where intended and explicit confirmation/auditability for administrative mutations.
- Validate loading, empty, forbidden, expired-session and retry states with real API contracts; do not add fake dashboard data.
- Use safe internal redirects and the configured public frontend URL for cross-application links.
- Run `pnpm --dir admin check` and `pnpm --dir admin build` for UI/route changes.
- Publish first through `homolog`; never push directly to `main`.
