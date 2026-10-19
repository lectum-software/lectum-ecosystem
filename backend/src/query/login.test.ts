import assert from "node:assert/strict";
import test from "node:test";
import { loginInclude } from "./login";

test("login separa escolha anterior do plano e assinaturas com acesso vigente", () => {
  const profile = loginInclude().psychologist_profile.include;
  assert.deepEqual(profile._count, {
    select: { subscriptions: { where: { deleted: false } } },
  });
  assert.equal(profile.subscriptions.where.deleted, false);
  assert.equal(profile.subscriptions.take, 5);
  assert.ok(profile.subscriptions.where.OR);
  assert.match(JSON.stringify(profile.subscriptions.where), /current_period_end/);
  assert.match(JSON.stringify(profile.subscriptions.where), /billing_grace_ends_at/);
});
