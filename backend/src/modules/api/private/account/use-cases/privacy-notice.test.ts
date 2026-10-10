import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { test } from "node:test";
import { onboardingTipsSchema } from "../validator";

test("privacy notice accepts an optional boolean in the existing tips contract", () => {
  const fields = onboardingTipsSchema.body;
  assert.ok(Array.isArray(fields));
  const field = fields.find((value) => value.key === "has_seen_patient_privacy_notice");
  assert.ok(field && "method" in field && "optional" in field);
  assert.equal(field.method, "boolean");
  assert.equal(field.optional, true);
});

test("privacy notice persistence is scoped to the authenticated patient", () => {
  const service = readFileSync(resolve(__dirname, "services.ts"), "utf8");
  assert.match(
    service,
    /data\.b\.has_seen_patient_privacy_notice !== undefined && current\.role !== "paciente"/,
  );
  assert.match(service, /repository\.updateOnboardingTips\(current\.id, next\)/);
  assert.match(
    service,
    /has_seen_patient_privacy_notice: Boolean\(updated\.has_seen_patient_privacy_notice\)/,
  );
  const schema = readFileSync(resolve(process.cwd(), "prisma/schema.prisma"), "utf8");
  assert.match(schema, /has_seen_patient_privacy_notice\s+Boolean\s+@default\(false\)/);
});
