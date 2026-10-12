// Read-only regression against an explicitly configured, isolated local database.
import assert from "node:assert/strict";

const url = new URL(process.env.DATABASE_URL ?? "");
assert.ok(["127.0.0.1", "localhost", "[::1]"].includes(url.hostname), "Local database required");
const { default: prisma } = await import("../src/infra/database/prisma/index.ts");
const { PostListRepository } = await import(
  "../src/modules/api/private/posts/repositories/queries/PostListRepository.ts"
);
try {
  const owners = await prisma.user.findMany({
    where: { deleted: false, role: { in: ["psicologo", "paciente"] } },
    select: { id: true, role: true },
  });
  let checked = 0,
    positive = 0,
    patients = 0;
  const repository = new PostListRepository();
  for (const auth of owners) {
    const result = await repository.mine({ auth, q: { page: 1, limit: 50, type: "all" } });
    for (const item of result.items) {
      if (auth.role !== "psicologo") {
        assert.equal(Object.hasOwn(item, "whatsapp_clicks_count"), false);
        patients++;
        continue;
      }
      const types = item.type === "post" ? ["community_post", "post"] : ["post_reply", "reply"];
      const count = await prisma.important_action_event.count({
        where: {
          deleted: false,
          action_type: "whatsapp_click",
          target_id: item.id,
          target_type: { in: types },
          OR: [{ user_id: null }, { user_id: { not: auth.id } }],
        },
      });
      assert.equal(item.whatsapp_clicks_count, count);
      if (count > 0) positive++;
      checked++;
    }
    const saved = await repository.saved({ auth, q: { page: 1, limit: 50, type: "all" } });
    for (const item of saved.items)
      assert.equal(Object.hasOwn(item, "whatsapp_clicks_count"), false);
  }
  assert.ok(checked > 0, "Real professional publications required");
  console.log(JSON.stringify({ checked, positive, patientItems: patients, readOnly: true }));
} finally {
  await prisma.$disconnect();
}
