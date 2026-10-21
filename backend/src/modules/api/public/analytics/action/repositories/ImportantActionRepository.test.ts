import assert from "node:assert/strict";
import test from "node:test";
import prisma from "@/infra/database/prisma";
import type { CreateImportantActionInput } from "../DTOs/IImportantActionDTO";
import { ImportantActionRepository } from "./ImportantActionRepository";

test("retries reuse the event key, independent clicks and visitors get different keys", async (t) => {
  const rows = new Map<string, unknown>();
  const original = prisma.important_action_event.upsert;
  const stub = t.mock.fn(
    async (args: { where: { id: string }; create: unknown; update: object }) => {
      assert.deepEqual(args.update, {});
      if (!rows.has(args.where.id)) rows.set(args.where.id, args.create);
      return rows.get(args.where.id);
    },
  );
  prisma.important_action_event.upsert = stub as unknown as typeof original;
  t.after(() => {
    prisma.important_action_event.upsert = original;
  });
  const input: CreateImportantActionInput = {
    eventId: "click-1",
    visitorId: "visitor-1",
    sessionId: "session-1",
    actionType: "whatsapp_click",
    pageKind: "psychologist_profile",
    displayMode: "browser",
    occurredAt: new Date(),
  };
  const repository = new ImportantActionRepository();
  await repository.create(input);
  await repository.create(input);
  assert.equal(rows.size, 1);
  await repository.create({ ...input, eventId: "click-2" });
  await repository.create({ ...input, visitorId: "visitor-2" });
  assert.equal(rows.size, 3);
});
