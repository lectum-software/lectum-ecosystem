import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildLogoutSubscriptionFilter,
  resolveAuthenticatedLogoutDeviceId,
  runBestEffortLogoutSubscriptionCleanup,
} from "./logout-subscription";

describe("logout notification subscription cleanup", () => {
  it("restringe a limpeza ao usuário e dispositivo autenticados", () => {
    assert.deepEqual(buildLogoutSubscriptionFilter("current-user", "current-device"), {
      deleted: false,
      device_id: "current-device",
      user_id: "current-user",
    });
  });

  it("revoga o device especial autenticado em vez do fingerprint enviado no header", () => {
    const specialDevice = "admin_view_as:paciente:admin_123:user_456:session_789";

    assert.equal(
      resolveAuthenticatedLogoutDeviceId({
        device: specialDevice,
        headers: { "x-device": "browser_device_123456" },
      }),
      specialDevice,
    );
  });

  it("não interrompe o logout quando a limpeza auxiliar falha", async () => {
    let failures = 0;
    const cleaned = await runBestEffortLogoutSubscriptionCleanup(
      async () => {
        throw new Error("provider detail must not escape");
      },
      () => {
        failures += 1;
      },
    );

    assert.equal(cleaned, false);
    assert.equal(failures, 1);
  });
});
