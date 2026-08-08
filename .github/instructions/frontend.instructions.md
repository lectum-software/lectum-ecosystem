---
name: Lectum Frontend
description: Frontend rules for the Lectum Next.js app.
applyTo: "frontend/**"
---

# Lectum Frontend Instructions

- Use Next.js 16, React 19, TypeScript, Tailwind CSS 4, TanStack Query 5, Redux Toolkit, Biome and ESLint.
- Read `frontend/AGENTS.md` and relevant Next.js 16 docs in `frontend/node_modules/next/dist/docs/` before changing app-router APIs.
- Follow the Lectum prototype visual language: Manrope, mobile-first, `#F6F7F8` background, `#308CE8` primary blue, white cards, soft borders, 12-24px radius.
- Use `_product/tasks/PROTO-INVENTORY.md` before implementing any prototype-backed screen.
- Use Builder/Quick Copy when available in the client; otherwise cite the exported `_product/proto` images used.
- Do not keep temporary visual-tool asset URLs as production assets.
- Keep auth/session behavior real; do not bypass guards with fake users.
- Validate with `pnpm --dir frontend check` and `pnpm --dir frontend build` for visual or route changes.
- Do not call Axios directly in UI components; use `api/req`, `api/callers`, `handleReq` and React Query.
- Do not create a parallel auth/session system; use the HttpOnly session cookie, in-memory Redux,
  API hydration through `useUserSet`, the non-sensitive navigation marker and `proxy.ts`.
- Any page with fields, edit state, validation, advanced filters or submit must use the `TASK-02` form foundation: `frontend/src/hooks/form`, `frontend/src/components/controllers`, React Hook Form, Zod and inline PT-BR errors.
- Do not render ad hoc inputs in product forms when a controller applies.
