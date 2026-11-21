import assert from "node:assert/strict";
import { test } from "node:test";
import { resolveSignupAnalyticsIdentity } from "./signup-identity";

test("patient attribution requires explicit boolean acceptance", () => {
  for (const measurement_allowed of [undefined, false, "true", 1, null]) {
    assert.equal(
      resolveSignupAnalyticsIdentity({
        role: "paciente",
        analytics_visitor_id: "visitor-test",
        measurement_allowed: measurement_allowed as boolean,
      }),
      null,
    );
  }
  assert.deepEqual(
    resolveSignupAnalyticsIdentity({
      role: "paciente",
      measurement_allowed: true,
      analytics_visitor_id: "visitor-test",
    }),
    { visitor_id: "visitor-test" },
  );
  assert.equal(
    resolveSignupAnalyticsIdentity({
      role: "paciente",
      measurement_allowed: true,
      analytics_visitor_id: "invalid value",
    }),
    null,
  );
});

test("professional attribution keeps its existing behavior", () => {
  assert.deepEqual(
    resolveSignupAnalyticsIdentity({
      role: "psicologo",
      analytics_visitor_id: "visitor-test",
    }),
    { visitor_id: "visitor-test" },
  );
});
