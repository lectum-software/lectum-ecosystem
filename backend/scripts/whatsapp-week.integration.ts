import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { once } from "node:events";
import express from "express";
import prisma from "../src/infra/database/prisma";
import { CleanRepository } from "../src/modules/api/private/notification/clean/repositories/CleanRepository";
import { ClickRepository } from "../src/modules/api/private/notification/click/repositories/ClickRepository";
import { SeenRepository } from "../src/modules/api/private/notification/seen/repositories/SeenRepository";
import updateNotification from "../src/modules/api/private/notification/update/use-cases/services";
import { index as analytics } from "../src/modules/api/private/psychologist/analytics/use-cases/services";
import reportRoutes from "../src/modules/api/private/psychologist/whatsapp-reports";
import { reportService } from "../src/modules/api/private/psychologist/whatsapp-reports/use-cases/services";
import { adminWhatsappReports } from "../src/modules/whatsapp-reports/admin";
import {
  acquiredPatientsSummary,
  whatsappPeopleCounts,
} from "../src/modules/whatsapp-reports/counts";
import { hashWhatsappVisitor, previousWhatsappWeek } from "../src/modules/whatsapp-reports/policy";
import {
  answerWhatsappReport,
  getWhatsappReport,
  latestWhatsappReport,
  openWhatsappReport,
} from "../src/modules/whatsapp-reports/repository";
import { runWeeklyWhatsappReports } from "../src/modules/whatsapp-reports/scheduler";

const database = new URL(process.env.DATABASE_URL ?? "http://invalid");
assert.equal(database.hostname, "127.0.0.1");
assert.equal(database.port, "55432");
assert.equal(database.pathname, "/lectum_whatsapp_dev_20261017");
const prefix = `weekly-test-${randomUUID()}`;
const ids = ["professional", "other", "patient", "empty"].map((name) => `${prefix}-${name}`);
const now = new Date("2026-10-19T12:00:00Z");
const week = previousWhatsappWeek(now);
const auth = { id: ids[0], role: "psicologo" };

async function answerOverHttp(id: string) {
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.auth = auth;
    req.language = "pt";
    next();
  });
  app.use("/reports", reportRoutes);
  const server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  try {
    const address = server.address();
    assert.ok(address && typeof address === "object");
    const response = await fetch(`http://127.0.0.1:${address.port}/reports/${id}`, {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ count: 0 }),
    });
    assert.equal(response.status, 200, "real validator/controller accepts zero");
    assert.equal((await response.json()).data.acquired_count, 0);
  } finally {
    server.closeAllConnections();
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  }
}

async function main() {
  for (const [index, id] of ids.entries()) {
    await prisma.user.create({
      data: {
        id,
        name: "Teste local temporário",
        email: `${id}@example.invalid`,
        role: index === 2 ? "paciente" : "psicologo",
        notification_preference: { create: { prefs: { weekly_whatsapp_report: { push: false } } } },
      },
    });
  }
  const visitor = hashWhatsappVisitor(randomUUID());
  await prisma.contact_request.createMany({
    data: [
      ...Array.from({ length: 10 }, () => ({
        psychologist_id: ids[0],
        user_id: ids[2],
        createdAt: week.start,
      })),
      ...Array.from({ length: 10 }, () => ({
        psychologist_id: ids[0],
        visitor_key: visitor,
        createdAt: new Date(week.end.getTime() - 1),
      })),
      { psychologist_id: ids[0], user_id: ids[0], createdAt: week.start },
      { psychologist_id: ids[0], user_id: ids[2], createdAt: week.end },
    ],
  });
  const counts = await whatsappPeopleCounts(week.start, week.end, ids[0]);
  assert.equal(
    counts[0].people_count,
    2,
    "repeated authenticated and anonymous clicks collapse; self excluded",
  );
  process.env.WEEKLY_WHATSAPP_REPORTS_ENABLED = "false";
  await runWeeklyWhatsappReports(now);
  assert.equal(await latestWhatsappReport(ids[0], now), null);
  process.env.WEEKLY_WHATSAPP_REPORTS_ENABLED = "true";
  process.env.WEEKLY_WHATSAPP_REPORTS_START_AT = "invalid";
  await runWeeklyWhatsappReports(now);
  assert.equal(await latestWhatsappReport(ids[0], now), null);
  process.env.WEEKLY_WHATSAPP_REPORTS_START_AT = "2026-10-26T12:00:00Z";
  await runWeeklyWhatsappReports(now);
  assert.equal(await latestWhatsappReport(ids[0], now), null);
  assert.equal(await prisma.notification.count({ where: { user_id: ids[0] } }), 0);
  process.env.WEEKLY_WHATSAPP_REPORTS_START_AT = "2026-10-19T12:00:00Z";
  await runWeeklyWhatsappReports(new Date("2026-10-19T11:59:59Z"));
  assert.equal(await latestWhatsappReport(ids[0], now), null);
  await Promise.all([runWeeklyWhatsappReports(now), runWeeklyWhatsappReports(now)]);
  const report = await latestWhatsappReport(ids[0], now);
  assert.ok(report);
  assert.equal(report.people_count, 2);
  assert.equal(
    await prisma.notification.count({ where: { user_id: ids[0] } }),
    1,
    "concurrent schedulers create one notification",
  );
  assert.equal(
    await prisma.notification.count({ where: { user_id: ids[3] } }),
    0,
    "no click means no notification",
  );
  assert.equal(await getWhatsappReport(ids[1], report.id), null, "owner isolation");
  assert.equal((await answerWhatsappReport(ids[1], report.id, 0)).kind, "missing");
  const claims = await Promise.all([
    openWhatsappReport(ids[0], report.id, true, now),
    openWhatsappReport(ids[0], report.id, true, now),
  ]);
  assert.equal(claims.filter(Boolean).length, 1, "one automatic opening across devices");
  assert.equal(
    await latestWhatsappReport(ids[0], now),
    null,
    "closing without response never reopens automatically",
  );
  const persisted = await prisma.professional_whatsapp_week.findUniqueOrThrow({
    where: { id: report.id },
  });
  const notificationId = persisted.notification_id;
  assert.equal(persisted.push_status, "skipped", "push opt-out respected, no external delivery");
  await new SeenRepository().seen({ auth });
  await new CleanRepository().clean({ auth });
  await updateNotification({ auth, p: { id: notificationId }, b: { read: true } });
  await new ClickRepository().click({ auth, p: { id: notificationId } });
  assert.equal(
    (await prisma.notification.findUniqueOrThrow({ where: { id: notificationId } })).read,
    false,
  );
  assert.deepEqual(await acquiredPatientsSummary(ids[0], week.start, week.end), {
    acquired_patients: null,
    unanswered_weeks: 1,
  });
  for (const invalid of [-1, null, "0", 3, 0.5])
    assert.equal((await answerWhatsappReport(ids[0], report.id, invalid)).kind, "invalid");
  await answerOverHttp(report.id);
  assert.equal(
    (await prisma.notification.findUniqueOrThrow({ where: { id: notificationId } })).read,
    true,
  );
  assert.deepEqual(
    await acquiredPatientsSummary(ids[0], week.start, new Date(week.end.getTime() - 1)),
    { acquired_patients: 0, unanswered_weeks: 0 },
  );
  await answerWhatsappReport(ids[0], report.id, 2);
  const adminReport = await adminWhatsappReports(ids[0], "2026-10-12", "2026-10-18");
  assert.equal(adminReport.acquired_patients, 2);
  assert.equal(adminReport.answered_weeks, 1);
  assert.equal(adminReport.weeks[0].id, report.id);
  assert.equal(adminReport.source, "psychologist_reported");
  assert.equal((await adminWhatsappReports(ids[1], "2026-10-12", "2026-10-18")).total_weeks, 0);
  assert.equal((await adminWhatsappReports(ids[0], "2026-10-19", "2026-10-25")).total_weeks, 0);
  assert.equal((await acquiredPatientsSummary(ids[0], week.start, week.end)).acquired_patients, 2);
  assert.ok(
    await openWhatsappReport(ids[0], report.id, false, now),
    "manual reopening permits correction",
  );
  assert.equal(
    await latestWhatsappReport(ids[0], new Date("2026-11-02T12:00:00Z")),
    null,
    "old report never opens automatically",
  );
  const preview = await analytics({ auth, q: {} });
  assert.equal(preview.status, 200);
  assert.deepEqual(preview.data, {
    access: { mode: "preview", has_professional_entitlement: false },
  });
  const denied = await reportService(
    { auth: { id: ids[2], role: "paciente" }, p: { id: report.id }, b: {} },
    "show",
  );
  assert.equal(denied.status, 403);
  console.log(
    "PASS: real PostgreSQL dedup, calendar, concurrency, free preview, ownership, pending badge, zero/edit, old reports and push opt-out.",
  );
}

main()
  .finally(async () => {
    process.env.WEEKLY_WHATSAPP_REPORTS_ENABLED = "false";
    await prisma.notification_delivery.deleteMany({ where: { user_id: { in: ids } } });
    await prisma.notification.deleteMany({ where: { user_id: { in: ids } } });
    await prisma.contact_request.deleteMany({ where: { psychologist_id: { in: ids } } });
    await prisma.user.deleteMany({ where: { id: { in: ids } } });
    await prisma.$disconnect();
  })
  .catch(() => {
    console.error("Weekly WhatsApp local integration failed.");
    process.exitCode = 1;
  });
