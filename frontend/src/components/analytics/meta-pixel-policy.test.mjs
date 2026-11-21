import "../../../scripts/register-source-modules.mjs";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const { prepareProfessionalPixelCommands, professionalCheckoutReady } = await import(
  "./meta-pixel-policy.ts"
);

test("Pixel commands disable auto configuration and omit automatic matching/PageView", () => {
  const eventId = "a".repeat(64);
  assert.deepEqual(
    prepareProfessionalPixelCommands({
      pixelId: "1606598847399888",
      eventId,
      eventName: "InitiateCheckout",
    }),
    [
      ["set", "autoConfig", false, "1606598847399888"],
      ["init", "1606598847399888"],
      ["trackSingle", "1606598847399888", "InitiateCheckout", {}, { eventID: eventId }],
    ],
  );
});

test("Subscribe and patient activity cannot be prepared as browser events", () => {
  for (const eventName of ["Subscribe", "Contact", "CommunityPost", "PageView"]) {
    assert.equal(
      prepareProfessionalPixelCommands({
        pixelId: "1606598847399888",
        eventName,
        eventId: "a".repeat(64),
      }),
      null,
    );
  }
});

test("checkout hook remains blocked, including repeated SDK readiness callbacks", () => {
  for (let i = 0; i < 10; i++)
    assert.deepEqual(professionalCheckoutReady(), {
      transmitted: false,
      reason: "pending_compliance_review",
    });
  const text = readFileSync(new URL("./meta-pixel-policy.ts", import.meta.url), "utf8");
  assert.doesNotMatch(
    text,
    /window\.|document\.|fetch\(|sendBeacon\(|localStorage\.|sessionStorage\.|\.cookie\s*=|addEventListener\(/,
  );
});

test("registration matches CAPI account type", () => {
  const commands = prepareProfessionalPixelCommands({
    pixelId: "1606598847399888",
    eventName: "CompleteRegistration",
    eventId: "a".repeat(64),
  });
  assert.deepEqual(commands[2][3], { account_type: "professional" });
});
