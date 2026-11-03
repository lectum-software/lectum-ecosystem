import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import prisma from "@/infra/database/prisma";
import {
  getVerificationVideoStatus,
  markVerificationVideoWatched,
} from "@/modules/api/private/notification/verification-video/repository";
import { assertDisposableLocalDatabaseTarget } from "@/utils/local-database-safety";

async function main() {
  assertDisposableLocalDatabaseTarget();
  const ids: string[] = [];
  try {
    for (let index = 0; index < 2; index += 1) {
      const user = await prisma.user.create({
        data: { name: "QA verification video", email: `qa-video-${randomUUID()}@example.invalid` },
      });
      ids.push(user.id);
    }
    const [first, second] = ids as [string, string];
    assert.deepEqual(await getVerificationVideoStatus(first), { watched: false });
    await Promise.all([markVerificationVideoWatched(first), markVerificationVideoWatched(first)]);
    assert.deepEqual(await getVerificationVideoStatus(first), { watched: true });
    assert.deepEqual(await getVerificationVideoStatus(second), { watched: false });
    assert.equal(
      await prisma.user_background.count({
        where: { user_id: first, type: "verification_video_watched" },
      }),
      1,
    );
    console.log("verification video: persistence, isolation and idempotency passed");
  } finally {
    await prisma.user.deleteMany({ where: { id: { in: ids } } });
    await prisma.$disconnect();
  }
}

main().catch(() => {
  console.error("verification video integration failed");
  process.exitCode = 1;
});
