import assert from "node:assert/strict";
import test from "node:test";
import {
  hasProfessionalRegistryApproval,
  isVerifiedProfessionalEntitlement,
  professionalRegistryApprovalWhere,
} from "./subscription-entitlement";

test("persistent approval survives courtesy expiry without retaining benefits", () => {
  const profile = { crp_status: "aprovado", subscriptions: [] };
  assert.equal(hasProfessionalRegistryApproval(profile), true);
  assert.equal(isVerifiedProfessionalEntitlement(profile), false);
});

test("explicit rejection overrides an active grant and older automatic evidence", () => {
  const profile = {
    crp_status: "rejeitado",
    cfp_verified_at: new Date(),
    subscriptions: [{ source: "admin_grant" }],
  };
  assert.equal(hasProfessionalRegistryApproval(profile), false);
  assert.equal(isVerifiedProfessionalEntitlement(profile), false);
  assert.deepEqual(professionalRegistryApprovalWhere().crp_status, { not: "rejeitado" });
});
