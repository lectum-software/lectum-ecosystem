import assert from "node:assert/strict";
import { test } from "node:test";
import { startMetaDeliveryScheduler, stopMetaDeliveryScheduler } from "./delivery-scheduler";
import { professionalActionCommitted } from "./professional-events";

test("disabled scheduler and professional hooks do not start delivery", async (t) => {
  const previous = process.env.META_CAPI_ENABLED;
  process.env.META_CAPI_ENABLED = "false";
  t.after(() => {
    if (previous === undefined) delete process.env.META_CAPI_ENABLED;
    else process.env.META_CAPI_ENABLED = previous;
  });
  const interval = t.mock.method(globalThis, "setInterval", () => {
    throw new Error("unexpected_timer");
  });
  const network = t.mock.method(globalThis, "fetch", async () => {
    throw new Error("unexpected_network");
  });
  assert.equal(startMetaDeliveryScheduler(), false);
  assert.equal(
    startMetaDeliveryScheduler(async () => {
      throw new Error("unexpected_resolver");
    }),
    false,
  );
  for (const conversion of ["professional_registration", "professional_checkout"] as const)
    assert.equal(
      (
        await professionalActionCommitted(conversion, () => {
          throw new Error("unexpected_identity");
        })
      ).status,
      "disabled",
    );
  await stopMetaDeliveryScheduler();
  assert.equal(interval.mock.callCount(), 0);
  assert.equal(network.mock.callCount(), 0);
});
