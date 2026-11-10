import assert from "node:assert/strict";
import { test } from "node:test";
import { assertStripeUserCancellationConfirmed } from "./user-cancellation-policy";

const identity = { accountId: "acct_cancel", mode: "test" as const };
const expected = { identity, subscriptionId: "sub_cancel", localSubscriptionId: "local-cancel" };
const remote = {
  ...identity,
  subscriptionId: expected.subscriptionId,
  localSubscriptionId: expected.localSubscriptionId,
  cancelAtPeriodEnd: true,
  gatewayStatus: "active",
};

test("user cancellation accepts only the exact post-mutation stop or terminal subscription", () => {
  assert.doesNotThrow(() => assertStripeUserCancellationConfirmed(remote, expected));
  for (const gatewayStatus of ["canceled", "incomplete_expired"])
    assert.doesNotThrow(() =>
      assertStripeUserCancellationConfirmed(
        { ...remote, cancelAtPeriodEnd: false, gatewayStatus },
        expected,
      ),
    );
  assert.throws(() =>
    assertStripeUserCancellationConfirmed({ ...remote, cancelAtPeriodEnd: false }, expected),
  );
});

test("a different merchant, mode, local contract or remote ID never confirms user cancellation", () => {
  for (const change of [
    { accountId: "acct_other" },
    { mode: "live" as const },
    { subscriptionId: "sub_other" },
    { localSubscriptionId: "local-other" },
    { localSubscriptionId: null },
  ])
    assert.throws(() => assertStripeUserCancellationConfirmed({ ...remote, ...change }, expected));
});
