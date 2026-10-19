import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import prisma from "../src/infra/database/prisma";
import { index as analytics } from "../src/modules/api/private/psychologist/analytics/use-cases/services";
import { adminWhatsappReports } from "../src/modules/whatsapp-reports/admin";
import { acquiredPatientsSummary } from "../src/modules/whatsapp-reports/counts";
import { saveWhatsappWeek, whatsappReportHistory } from "../src/modules/whatsapp-reports/history";
import { previousWhatsappWeek, WHATSAPP_WEEK_MS } from "../src/modules/whatsapp-reports/policy";
import {
  answerWhatsappReport,
  openWhatsappReport,
} from "../src/modules/whatsapp-reports/repository";

const db = new URL(process.env.DATABASE_URL ?? "http://invalid");
assert.equal(db.hostname, "127.0.0.1");
assert.equal(db.port, "55432");
assert.equal(db.pathname, "/lectum_whatsapp_dev_20261017");
const ids = [0, 1].map(() => `acquired-test-${randomUUID()}`);
const now = new Date();
const current = previousWhatsappWeek(now).end;
const date = (value: Date) => value.toISOString().slice(0, 10);

async function main() {
  for (const id of ids)
    await prisma.user.create({
      data: { id, name: "Teste local", email: `${id}@example.invalid`, role: "psicologo" },
    });
  await prisma.contact_request.createMany({
    data: Array.from({ length: 3 }, () => ({
      psychologist_id: ids[0],
      visitor_key: randomUUID(),
      createdAt: current,
    })),
  });
  const initial = await whatsappReportHistory(ids[0]);
  assert.equal(initial.weeks.length, 5);
  assert.equal(initial.weeks[0].acquired_count, null);
  assert.equal(initial.weeks[0].people_count, 3);
  assert.equal((await saveWhatsappWeek(ids[0], date(current), 4)).kind, "invalid");
  assert.equal((await saveWhatsappWeek(ids[0], date(current), -1)).kind, "invalid");
  const saved = await saveWhatsappWeek(ids[0], date(current), 2);
  assert.equal(saved.kind, "ok");
  if (saved.kind !== "ok") throw Error("No report");
  assert.equal(await prisma.notification.count({ where: { user_id: ids[0] } }), 0);
  await Promise.all([
    saveWhatsappWeek(ids[0], date(current), 1),
    saveWhatsappWeek(ids[0], date(current), 1),
  ]);
  assert.equal(
    await prisma.professional_whatsapp_week.count({
      where: { psychologist_id: ids[0], week_start: current },
    }),
    1,
  );
  assert.equal((await answerWhatsappReport(ids[1], saved.data.id, 0)).kind, "missing");
  await answerWhatsappReport(ids[0], saved.data.id, 0);
  assert.equal((await whatsappReportHistory(ids[0])).weeks[0].acquired_count, 0);

  const notification = await prisma.notification.create({
    data: { user_id: ids[0], message_key: "weekly_whatsapp_report" },
  });
  await prisma.professional_whatsapp_week.update({
    where: { id: saved.data.id },
    data: { notification_id: notification.id },
  });
  await saveWhatsappWeek(ids[0], date(current), 2);
  assert.equal(
    (await prisma.notification.findUniqueOrThrow({ where: { id: notification.id } })).read,
    true,
  );
  const auth = { id: ids[0], role: "psicologo" };
  const preview = await analytics({ auth, q: { period: "all" } });
  assert.equal(preview.status, 200);
  assert.ok("data" in preview && "acquired_summary" in preview.data);
  assert.equal(preview.data.acquired_summary.acquired_patients, 2);
  assert.equal("metrics" in preview.data, false);
  const admin = await adminWhatsappReports(ids[0], date(current), date(now));
  assert.equal(admin.acquired_patients, 2);
  const today = new Date(
    `${new Date(now.getTime() - 3 * 3600000).toISOString().slice(0, 10)}T00:00:00-03:00`,
  );
  assert.equal(
    (await acquiredPatientsSummary(ids[0], new Date(0), new Date(today.getTime() - 1)))
      .acquired_patients,
    null,
  );

  const old = new Date(current.getTime() - 5 * WHATSAPP_WEEK_MS);
  const end = new Date(old.getTime() + WHATSAPP_WEEK_MS);
  const archived = await prisma.professional_whatsapp_week.create({
    data: {
      psychologist_id: ids[0],
      week_start: old,
      week_end: end,
      available_at: end,
      people_count: 1,
      acquired_count: 1,
      answered_at: now,
      push_status: "skipped",
    },
  });
  assert.equal((await saveWhatsappWeek(ids[0], date(old), 0)).kind, "closed");
  assert.equal((await answerWhatsappReport(ids[0], archived.id, 0)).kind, "closed");
  const expiredNotification = await prisma.notification.create({
    data: { user_id: ids[0], message_key: "weekly_whatsapp_report" },
  });
  await prisma.professional_whatsapp_week.update({
    where: { id: archived.id },
    data: { notification_id: expiredNotification.id, acquired_count: null, answered_at: null },
  });
  await openWhatsappReport(ids[0], archived.id, false);
  assert.equal(
    (await prisma.notification.findUniqueOrThrow({ where: { id: expiredNotification.id } })).read,
    true,
  );
  assert.equal(
    (await prisma.professional_whatsapp_week.findUniqueOrThrow({ where: { id: archived.id } }))
      .answered_at,
    null,
  );
  assert.equal(
    (await saveWhatsappWeek(ids[0], date(new Date(current.getTime() + WHATSAPP_WEEK_MS)), 0)).kind,
    "closed",
  );
  const history = await whatsappReportHistory(ids[0]);
  assert.equal(history.weeks[5].editable, false);
  assert.equal(history.weeks[5].acquired_count, null);
  await prisma.professional_whatsapp_week.createMany({
    data: Array.from({ length: 12 }, (_, index) => {
      const start = new Date(old.getTime() - (index + 1) * WHATSAPP_WEEK_MS);
      const finish = new Date(start.getTime() + WHATSAPP_WEEK_MS);
      return {
        psychologist_id: ids[0],
        week_start: start,
        week_end: finish,
        available_at: finish,
        people_count: 1,
        push_status: "skipped",
      };
    }),
  });
  const page1 = await whatsappReportHistory(ids[0]);
  const page2 = await whatsappReportHistory(ids[0], 1);
  assert.equal(page1.weeks.length, 17);
  assert.equal(page1.next_page, 1);
  assert.equal(page2.weeks.length, 1);
  assert.equal(page2.next_page, null);
  assert.equal(
    new Set([...page1.weeks, ...page2.weeks].map((week) => week.week_start.toISOString())).size,
    18,
  );
  assert.equal(
    (await whatsappReportHistory(ids[1])).weeks.every((item) => item.acquired_count === null),
    true,
  );
  console.log(
    "PASS: real database, uniqueness, zero/edit, ownership, notifications, free summary/admin and edit window.",
  );
}

main()
  .finally(async () => {
    await prisma.professional_whatsapp_week.deleteMany({ where: { psychologist_id: { in: ids } } });
    await prisma.notification.deleteMany({ where: { user_id: { in: ids } } });
    await prisma.contact_request.deleteMany({ where: { psychologist_id: { in: ids } } });
    await prisma.user.deleteMany({ where: { id: { in: ids } } });
    await prisma.$disconnect();
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
