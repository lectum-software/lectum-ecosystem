import assert from "node:assert/strict";
import test from "node:test";
import { isChannelAllowed, isNotificationEnabled, normalizeNotificationPrefs } from "./preferences";

test("billing notices ignore current and legacy opt-outs on every channel", () => {
  for (const entry of [
    undefined,
    { enabled: false },
    { in_app: false, push: false, email: false },
    { enabled: false, in_app: false, push: false, email: false },
  ]) {
    const prefs = { billing_subscription_status: entry };
    assert.equal(isNotificationEnabled(prefs, "billing_subscription_status"), true);
    for (const channel of ["in_app", "push", "email"] as const) {
      assert.equal(isChannelAllowed(prefs, "billing_subscription_status", channel), true);
    }
    for (const role of ["paciente", "psicologo", undefined]) {
      assert.deepEqual(normalizeNotificationPrefs(prefs, role).billing_subscription_status, {
        enabled: true,
      });
    }
  }
});

test("normalization rejects a billing opt-out without changing optional categories", () => {
  const prefs = normalizeNotificationPrefs(
    {
      billing_subscription_status: { enabled: false },
      nova_resposta: { enabled: false },
      novo_post: { enabled: false, post_author_scope: "patients_only" },
      top_mentor_podium: { enabled: false },
    },
    "psicologo",
  );
  assert.equal(prefs.billing_subscription_status.enabled, true);
  for (const key of ["nova_resposta", "novo_post", "top_mentor_podium"]) {
    assert.equal(isNotificationEnabled(prefs, key), false);
    for (const channel of ["in_app", "push", "email"] as const) {
      assert.equal(isChannelAllowed(prefs, key, channel), false);
    }
  }
});
