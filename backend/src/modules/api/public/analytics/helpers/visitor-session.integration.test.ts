import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";

test("visitor sessions serialize concurrent events without allowing ownership changes", {
  skip: process.env.ANALYTICS_SESSION_INTEGRATION !== "1",
}, async () => {
  const db = new URL(process.env.DATABASE_URL ?? "");
  assert.ok(["localhost", "127.0.0.1", "::1"].includes(db.hostname));
  assert.match(db.pathname, /(?:_dev_|_test_)/);
  const { default: prisma } = await import("@/infra/database/prisma");
  const { upsertOwnedVisitorSession, linkVisitorSessionsToUser } = await import(
    "./visitor-session"
  );
  const visitorId = randomUUID();
  const users: string[] = [randomUUID(), randomUUID()];
  const sessionId = randomUUID();
  try {
    for (const id of users)
      await prisma.user.create({
        data: {
          id,
          email: `${id}@example.invalid`,
          name: "Temporary session integration",
          role: "paciente",
        },
      });
    const anonymous = await Promise.all(
      Array.from({ length: 20 }, () => upsertOwnedVisitorSession({ visitorId, sessionId })),
    );
    assert.ok(anonymous.every((row) => row?.id === anonymous[0]?.id && row?.user_id === null));
    assert.equal(await prisma.visitor_session.count({ where: { visitor_id: visitorId } }), 1);
    const claims = await Promise.all(
      Array.from({ length: 20 }, (_, i) =>
        upsertOwnedVisitorSession({ visitorId, sessionId, userId: users[i % 2] }),
      ),
    );
    const owned = await prisma.visitor_session.findUniqueOrThrow({
      where: {
        visitor_id_session_id: { visitor_id: visitorId, session_id: sessionId },
      },
    });
    assert.ok(users.includes(owned.user_id!));
    for (const [i, row] of claims.entries()) {
      if (users[i % 2] === owned.user_id) assert.equal(row?.user_id, owned.user_id);
      else assert.equal(row, null);
    }
    assert.equal(await upsertOwnedVisitorSession({ visitorId, sessionId }), null);
    const other = users.find((id) => id !== owned.user_id)!;
    assert.equal(await linkVisitorSessionsToUser(visitorId, other), 0);
    const updated = await upsertOwnedVisitorSession({
      visitorId,
      sessionId,
      userId: owned.user_id,
      viewportWidth: 390,
    });
    assert.equal(updated?.viewport_width, 390);
    assert.equal(updated?.user_id, owned.user_id);
    const newSession = randomUUID();
    await upsertOwnedVisitorSession({ visitorId, sessionId: newSession });
    await Promise.all([
      linkVisitorSessionsToUser(visitorId, users[0]),
      upsertOwnedVisitorSession({ visitorId, sessionId: newSession, userId: users[1] }),
    ]);
    const winner = await prisma.visitor_session.findUniqueOrThrow({
      where: {
        visitor_id_session_id: { visitor_id: visitorId, session_id: newSession },
      },
    });
    const loser = users.find((id) => id !== winner.user_id)!;
    assert.equal(
      await upsertOwnedVisitorSession({ visitorId, sessionId: newSession, userId: loser }),
      null,
    );
  } finally {
    await prisma.visitor_session.deleteMany({ where: { visitor_id: visitorId } });
    await prisma.user.deleteMany({ where: { id: { in: users } } });
    await prisma.$disconnect();
  }
});
