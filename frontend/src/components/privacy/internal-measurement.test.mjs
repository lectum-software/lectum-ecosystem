import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

test("patient email signup checks fresh consent before identity; OAuth carries none", () => {
  const source = readFileSync(
    new URL("../../app/auth/register/patient/logic.tsx", import.meta.url),
    "utf8",
  );
  assert.match(source, /const measurementAllowed = hasInternalMeasurementConsent\(\)/);
  assert.match(source, /measurementAllowed \? getOrCreateAnalyticsIdentity\(\) : null/);
  assert.match(source, /measurement_allowed: measurementAllowed/);
  const google = source.slice(
    source.indexOf("const handleGoogleRegister"),
    source.indexOf("return (", source.indexOf("const handleGoogleRegister")),
  );
  assert.doesNotMatch(
    google,
    /getOrCreateAnalyticsIdentity|analytics_visitor_id|analytics_session_id/,
  );
});

test("WhatsApp measures only after successful contact verification and fresh consent", () => {
  const source = readFileSync(
    new URL("../psychologists/psychologist-whatsapp-redirect-button.tsx", import.meta.url),
    "utf8",
  );
  const verification = source.indexOf("await tracking.mutateAsync()");
  const consent = source.indexOf(
    "const measurementAllowed = allowedAtStart && hasInternalMeasurementConsent()",
  );
  const measure = source.indexOf("void importantActionTracking");
  assert.ok(verification > 0 && verification < consent && consent < measure);
  assert.match(source.slice(verification, consent), /catch[\s\S]*return;/);
  assert.match(source, /measurement_allowed: measurementAllowed/);
  assert.match(source, /measurementAllowed \? getOrCreateAnalyticsIdentity\(\) : null/);
});
