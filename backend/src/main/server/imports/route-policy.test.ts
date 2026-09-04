import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  getExpectedPrivateRole,
  isAuditedLegacyPublicPlaybackRoute,
  isUserAuthOnlyPrivateRoute,
  listPrivateRoutePolicyViolations,
} from "./route-policy";

describe("private route policy", () => {
  it("mantem favoritos e avaliacoes user-level apenas com _auth", () => {
    assert.equal(isUserAuthOnlyPrivateRoute("/api/private/user/favorites"), true);
    assert.equal(isUserAuthOnlyPrivateRoute("/api/private/user/reviews"), true);
    assert.equal(getExpectedPrivateRole("/api/private/user/favorites"), null);
    assert.equal(getExpectedPrivateRole("/api/private/user/reviews"), null);

    const violations = listPrivateRoutePolicyViolations([
      { path: "/api/private/user/favorites", role: "paciente" },
      { authOnly: true, path: "/api/private/user/reviews" },
    ]);

    assert.deepEqual(
      violations.userAuthOnlyViolations.map((route) => route.path),
      ["/api/private/user/favorites"],
    );
    assert.deepEqual(violations.roleGuardViolations, []);
  });

  it("abre somente o adaptador legado auditado de playback público", () => {
    const legacyPlayback = {
      legacyPublicPlayback: true,
      path: "/api/private/video-assets",
    } as const;

    assert.equal(isAuditedLegacyPublicPlaybackRoute(legacyPlayback), true);
    assert.equal(
      isAuditedLegacyPublicPlaybackRoute({
        legacyPublicPlayback: true,
        path: "/api/private/user/favorites",
      }),
      false,
    );

    const violations = listPrivateRoutePolicyViolations([
      legacyPlayback,
      { path: "/api/private/video-assets" },
      { authOnly: true, path: "/api/private/video-assets" },
    ]);

    assert.deepEqual(
      violations.userAuthOnlyViolations.map((route) => route.path),
      ["/api/private/video-assets"],
    );
  });

  it("mantem namespaces patient e psychologist fail-closed por role", () => {
    assert.equal(getExpectedPrivateRole("/api/private/patient/favorites"), "paciente");
    assert.equal(getExpectedPrivateRole("/api/private/psychologist/analytics"), "psicologo");

    const violations = listPrivateRoutePolicyViolations([
      { path: "/api/private/patient/favorites" },
      { path: "/api/private/psychologist/analytics", role: "paciente" },
      { path: "/api/private/psychologist/cfp", role: "psicologo" },
    ]);

    assert.deepEqual(
      violations.roleGuardViolations.map((route) => route.path),
      ["/api/private/patient/favorites", "/api/private/psychologist/analytics"],
    );
  });
});
