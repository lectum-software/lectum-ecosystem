import assert from "node:assert/strict";
import { test } from "node:test";
import { projectFiscalRequirements } from "./fiscal-requirements";

const incomplete = {
  addressComplete: true,
  identityComplete: false,
  emailComplete: true,
  registryVerificationAllowed: true,
  whatsappComplete: true,
};

test("fiscal guidance preserves address and phone steps before eligible registry verification", () => {
  assert.equal(projectFiscalRequirements(incomplete).next_action, "registry_verification");
  assert.equal(
    projectFiscalRequirements({ ...incomplete, whatsappComplete: false }).next_action,
    "complete_registration",
  );
  assert.equal(
    projectFiscalRequirements({ ...incomplete, addressComplete: false }).next_action,
    "billing_address",
  );
});

test("approved, rejected, courtesy and expired profiles need assistance instead of another CFP check", () => {
  assert.equal(
    projectFiscalRequirements({ ...incomplete, registryVerificationAllowed: false }).next_action,
    "support",
  );
  assert.equal(
    projectFiscalRequirements({ ...incomplete, emailComplete: false }).next_action,
    "support",
  );
});

test("data readiness never creates authorization, a document, benefit or a public identity value", () => {
  assert.deepEqual(projectFiscalRequirements({ ...incomplete, identityComplete: true }), {
    address_complete: true,
    identity_complete: true,
    next_action: "none",
  });
});
