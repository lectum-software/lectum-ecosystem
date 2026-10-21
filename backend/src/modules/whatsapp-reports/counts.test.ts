import assert from "node:assert/strict";
import test from "node:test";
import prisma from "@/infra/database/prisma";
import { acquiredPatientsSummary, whatsappPeopleCounts } from "./counts";

test("patient reports keep DISTINCT people with account, visitor and legacy identity", async (t) => {
  const original = prisma.$queryRaw;
  let query = "";
  const stub = t.mock.fn(async (strings: TemplateStringsArray) => {
    query = strings.join("?");
    return [{ psychologist_id: "professional", people_count: 1 }];
  });
  prisma.$queryRaw = stub as unknown as typeof original;
  t.after(() => {
    prisma.$queryRaw = original;
  });
  const result = await whatsappPeopleCounts(
    new Date("2026-10-19"),
    new Date("2026-10-26"),
    "professional",
  );
  assert.equal(result[0].people_count, 1);
  assert.match(query, /COUNT\(DISTINCT COALESCE\('user:'/);
  assert.match(query, /'visitor:' \|\| c.visitor_key/);
  assert.match(query, /FROM contact_requests/);
  assert.match(query, /c.user_id <> c.psychologist_id/);
});
test("acquired patients sum psychologist answers, not contacts or clicks", async (t) => {
  const original = prisma.professional_whatsapp_week.findMany;
  prisma.professional_whatsapp_week.findMany = t.mock.fn(async () => [
    { acquired_count: 2 },
    { acquired_count: 3 },
    { acquired_count: null },
  ]) as unknown as typeof original;
  t.after(() => {
    prisma.professional_whatsapp_week.findMany = original;
  });
  assert.deepEqual(
    await acquiredPatientsSummary("professional", new Date("2026-10-01"), new Date("2026-10-26")),
    { acquired_patients: 5, unanswered_weeks: 1 },
  );
});
