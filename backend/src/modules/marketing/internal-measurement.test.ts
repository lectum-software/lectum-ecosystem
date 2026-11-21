import assert from "node:assert/strict";
import { test } from "node:test";
import type { Request, Response } from "express";
import prisma from "@/infra/database/prisma";
import { ContactRepository } from "@/modules/api/private/directory/psychologists/repositories/ContactRepository";
import { ImportantActionRepository } from "@/modules/api/public/analytics/action/repositories/ImportantActionRepository";
import { store } from "@/modules/api/public/analytics/action/use-cases/services";
import { MarketingConsentRepository } from "./consent-repository";
import { allowsInternalMeasurement, guardMeasurementIdentity } from "./internal-measurement";

test("identity guard preserves authenticated choices and denies unresolved credentials", () => {
  for (const authenticated of [true, false]) {
    for (const choice of [true, false, undefined]) {
      const req = {
        headers: { authorization: "Bearer test-only" },
        auth: authenticated ? { id: "account" } : undefined,
        body: { measurement_allowed: choice },
      } as unknown as Request;
      let continued = 0;
      guardMeasurementIdentity(req, {} as Response, () => {
        continued += 1;
      });
      assert.equal(req.body.measurement_allowed, authenticated ? choice : false);
      assert.equal(continued, 1);
    }
  }
});

test("missing or refused browser choice never reads account consent", async () => {
  for (const value of [undefined, false, "true", 1, null]) {
    assert.equal(
      await allowsInternalMeasurement(value, "account", async () => {
        assert.fail("must not read identifiers without browser choice");
      }),
      false,
    );
  }
});

test("refused WhatsApp action never creates or links analytics records", async (t) => {
  const session = t.mock.method(ImportantActionRepository.prototype, "upsertSession", async () => {
    assert.fail("refused measurement must not write a session");
  });
  for (const action_type of ["whatsapp_click", "psychologist_video_whatsapp_click"]) {
    for (const measurement_allowed of [undefined, false]) {
      const result = await store({ b: { action_type, measurement_allowed } } as unknown as Request);
      assert.equal(result.data.tracked, false);
    }
  }
  assert.equal(session.mock.callCount(), 0);
});

test("account consent is checked fresh and errors fail closed", async (t) => {
  const status = t.mock.method(MarketingConsentRepository.prototype, "status", async () => ({
    granted: false,
  }));
  assert.equal(await allowsInternalMeasurement(true, "account"), false);
  status.mock.mockImplementation(async () => ({ granted: true }));
  assert.equal(await allowsInternalMeasurement(true, "account"), true);
  status.mock.mockImplementation(async () => {
    throw new Error("unavailable");
  });
  assert.equal(await allowsInternalMeasurement(true, "account"), false);
  assert.equal(await allowsInternalMeasurement(true, null), true);
});

test("refusal preserves contact URL without contact record; valid choice records once", async (t) => {
  const originalFind = prisma.user.findFirst;
  const originalCreate = prisma.contact_request.create;
  t.after(() => {
    prisma.user.findFirst = originalFind;
    prisma.contact_request.create = originalCreate;
  });
  const find = t.mock.fn(
    async (): Promise<unknown> => ({
      id: "professional",
      name: "Test",
      psychologist_profile: { whatsapp: "+5511999999999" },
    }),
  );
  const create = t.mock.fn(async () => ({ id: "contact" }));
  prisma.user.findFirst = find as unknown as typeof originalFind;
  prisma.contact_request.create = create as unknown as typeof originalCreate;
  const repository = new ContactRepository();
  for (const choice of [undefined, false]) {
    const result = await repository.registerClick({
      p: { id: "professional" },
      b: { measurement_allowed: choice },
    });
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.data.tracked, false);
      assert.ok(result.data.whatsapp_url);
    }
  }
  assert.equal(create.mock.callCount(), 0);
  const result = await repository.registerClick({
    p: { id: "professional" },
    b: { measurement_allowed: true },
  });
  assert.equal(result.ok && result.data.tracked, true);
  assert.equal(create.mock.callCount(), 1);
  find.mock.mockImplementation(async () => null);
  assert.equal(
    (await repository.registerClick({ p: { id: "missing" }, b: { measurement_allowed: true } })).ok,
    false,
  );
  assert.equal(create.mock.callCount(), 1);
});
