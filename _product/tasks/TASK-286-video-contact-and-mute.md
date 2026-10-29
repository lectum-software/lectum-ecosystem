# TASK-286 - Compact video contact and inline mute restoration

Status: in progress. Scope approved by the user on 2026-10-29 for production.

## Scope

- Replace only the over-video WhatsApp CTA with a compact green capsule, aligned
  right, without an arrow. Match the approved read-only preview: 13px semibold,
  17px icon, 1rem horizontal padding, 34px visual height and 44px touch target.
- Preserve the existing contact destination, professional naming and analytics.
- Keep fixed profile contact and reels side-rail WhatsApp unchanged.
- Restore the existing muted indicator in inline videos that open reels.
  Its click enables sound only; the remaining video surface opens reels.
- Keep transparent overlay space clickable through to the video surface.
- No database, Backend, Admin or Video behavior changes; isolate unrelated billing work.

## Acceptance

- [x] Approved visual dimensions implemented using existing components.
- [x] Muted indicator independent of the traditional playback controls.
- [x] Mute click consumed; audio preference callback preserved.
- [x] Focused tests, frontend checks and release build pass on isolated candidate.
- [x] Real component browser verification at mobile and desktop widths.
- [ ] Reviewed PR, verified deployment gates and production smoke.

## Deployment gate

Vercel auto-published frontend and Admin after PR #140. User confirms those
triggers have not been disabled. Dokploy Autodeploy remains off per user.
Do not push or merge this release until Vercel triggers are verified/neutralized.
No deployment secrets should be requested or printed. ADR-0651.

User subsequently confirmed saving Ignored Build Step = Don't build anything in
both Vercel frontend and Admin. The screenshot before that action showed Automatic.
Manual frontend publication remains required after validation and reviewed merge.
Backend/Admin/Video do not require deployment for this frontend-only behavior change.

Review: the original success token failed small-white-text contrast and changed
in dark mode. Use a constant #15803d background (white contrast above 4.5:1),
without changing global status colors or the other contact buttons.

Browser evidence: six scenarios at 320/390/1440px, real local clip and actual
components/styles, no page errors. Touch target 44px, visible capsule 34px,
long names truncated, mute click/keyboard do not open reels and blank overlay
space reaches the video. The existing 1rem spacing token renders as 15px on
mobile and 16px on desktop. No external contact or analytics writes performed.
The contact color is centralized as whatsapp-contact; white uses media-foreground.

Release candidate: 0.1.741. Frontend build and full frontend check passed with
Node 24.22.1. Independent code review found no remaining issues after the color
contrast correction. Production frontend/backend remain 0.1.740 before rollout;
health and readiness return 200. No migration or new environment variable.
Keep Backend, Admin and Video deployed versions unchanged for this release.
