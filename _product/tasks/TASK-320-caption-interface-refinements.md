# TASK-320 - Caption interface refinements

## Scope

User screenshots from 2026-11-09 are the visual reference. Reuse existing UI;
Builder is not available in this session. No player lifecycle or default-player changes.

- [x] Desktop transcript uses available content width without widening its video.
- [x] Directory mobile and desktop action rails omit CC; immersive CC beside volume remains.
- [x] Active CC fills its interior continuously, with only the letters transparent.
- [x] Edit-caption menu item uses the normal foreground color.
- [x] Directory captions start enabled regardless of mute; preserve explicit saved choice.
- [x] Focused tests, frontend check/build and mobile/desktop visual verification.

Frontend-only, no migration, environment or dependency changes. No push/deploy
requested. Pooled default promotion remains deferred in TASK-319.

Decision: ADR-0684. Rollback: revert these presentation changes.

Visual checks at 390px and 1440px confirmed transcript width and immersive CC
in both player modes. Six focused tests passed, including active icon pixel
checks and default-on captions with sound. Frontend check and production build passed. The
authenticated profile menu color was verified in source, not in a live session.
