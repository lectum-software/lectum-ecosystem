import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import prisma from "../src/infra/database/prisma";
import { deleteAccountContent } from "../src/modules/account-deletion/content";
import { resolveCancellationState } from "../src/modules/billing/cancellation-period";
import { restoreFreePlanAfterProfessionalCancellation } from "../src/modules/billing/free-subscription";
import { acceptRegistrationLegal } from "../src/modules/legal/registration";
import { assertDisposableLocalDatabaseTarget } from "../src/utils/local-database-safety";
import { activeProfessionalEntitlementWhere } from "../src/utils/subscription-entitlement";

const rollback = new Error("fixture_rollback");
async function main() {
  assertDisposableLocalDatabaseTarget();
  const db = new URL(process.env.DATABASE_URL!);
  assert.ok(["localhost", "127.0.0.1", "[::1]"].includes(db.hostname));
  assert.match(db.pathname, /(?:test|dev|qa)/i);
  const prefix = `lifecycle-${randomUUID()}`;
  try {
    await prisma.$transaction(
      async (tx) => {
        const owner = await tx.user.create({
          data: { name: prefix, email: `${prefix}@example.invalid`, role: "psicologo" },
        });
        const other = await tx.user.create({
          data: { name: prefix, email: `other-${prefix}@example.invalid` },
        });
        const profile = await tx.psychologist_profile.create({ data: { user_id: owner.id } });
        const community = await tx.community.create({ data: { name: prefix, slug: prefix } });
        const key = `posts/media/${prefix}.jpg`;
        const url = `/public/files/${key}`;
        const post = await tx.community_post.create({
          data: {
            author_id: owner.id,
            community_id: community.id,
            title: "Private title",
            content: "Private text",
            media_url: url,
            media_type: "image",
          },
        });
        const solo = await tx.community_post.create({
          data: {
            author_id: owner.id,
            community_id: community.id,
            title: "Solo",
            content: "Delete",
          },
        });
        const parent = await tx.post_reply.create({
          data: { author_id: owner.id, post_id: post.id, content: "Delete", media_url: url },
        });
        const child = await tx.post_reply.create({
          data: {
            author_id: other.id,
            post_id: post.id,
            parent_reply_id: parent.id,
            content: "Keep third party",
          },
        });
        const ownLeaf = await tx.post_reply.create({
          data: {
            author_id: owner.id,
            post_id: post.id,
            parent_reply_id: child.id,
            content: "Delete leaf",
          },
        });
        await tx.community_post_media.create({
          data: { post_id: post.id, media_url: url, media_type: "image" },
        });
        const video = await tx.video_asset.create({
          data: {
            owner_id: owner.id,
            provider_uid: randomUUID().replaceAll("-", ""),
            purpose: "post",
            mime_type: "video/mp4",
            size_bytes: 123n,
            upload_expires_at: new Date(),
            status: "ready",
          },
        });
        const review = await tx.professional_review.create({
          data: {
            author_id: other.id,
            psychologist_id: owner.id,
            rating: 5,
            comment: "Third party review",
            response: "Delete response",
          },
        });
        const plan = await tx.subscription_plan.findFirstOrThrow({
          where: { slug: "profissional", active: true, deleted: false },
        });
        const end = new Date(Date.now() + 86400000);
        const paid = await tx.professional_subscription.create({
          data: {
            psychologist_id: profile.id,
            plan_id: plan.id,
            source: "mercadopago",
            gateway: "mercadopago",
            status: "ativa",
            current_period_end: end,
          },
        });
        await tx.professional_subscription.update({
          where: { id: paid.id },
          data: resolveCancellationState(paid, { status: "cancelada" }),
        });
        assert.equal(
          (
            await tx.professional_subscription.findFirst({
              where: { ...activeProfessionalEntitlementWhere(), id: paid.id },
            })
          )?.id,
          paid.id,
        );
        assert.equal(
          (await restoreFreePlanAfterProfessionalCancellation({ psychologistId: profile.id, tx }))
            ?.id,
          paid.id,
        );
        await tx.professional_subscription.update({
          where: { id: paid.id },
          data: { current_period_end: new Date(Date.now() - 1000) },
        });
        assert.equal(
          await tx.professional_subscription.findFirst({
            where: { ...activeProfessionalEntitlementWhere(), id: paid.id },
          }),
          null,
        );
        assert.equal(
          (await restoreFreePlanAfterProfessionalCancellation({ psychologistId: profile.id, tx }))
            ?.plan?.slug,
          "gratuito",
        );
        const docs = [];
        for (const kind of ["terms", "privacy"]) {
          const last = await tx.legal_document_version.aggregate({
            where: { kind },
            _max: { version: true },
          });
          docs.push(
            await tx.legal_document_version.create({
              data: {
                kind,
                version: (last._max.version ?? 0) + 1,
                title: prefix,
                body: prefix,
                change_summary: prefix,
                content_hash: prefix,
                status: "published",
                created_by_admin_id: prefix,
                updated_by_admin_id: prefix,
                published_by_admin_id: prefix,
                published_at: new Date(Date.now() + 86400000),
              },
            }),
          );
        }
        const input = {
          legal_document_ids: docs.map((doc) => doc.id),
          terms_accepted: true,
          privacy_acknowledged: true,
          adult_confirmed: true,
        };
        await assert.rejects(
          acceptRegistrationLegal(tx, owner.id, { ...input, privacy_acknowledged: false }),
          /legal_acceptance_required/,
        );
        await assert.rejects(
          acceptRegistrationLegal(tx, owner.id, { ...input, legal_document_ids: ["old", "old"] }),
          /legal_documents_changed/,
        );
        await acceptRegistrationLegal(tx, owner.id, input);
        const accepted = await tx.legal_acceptance.findMany({ where: { user_id: owner.id } });
        assert.equal(accepted.length, 2);
        await acceptRegistrationLegal(tx, owner.id, input);
        assert.deepEqual(
          await tx.legal_acceptance.findMany({ where: { user_id: owner.id } }),
          accepted,
        );
        await deleteAccountContent(tx, owner.id, new Date());
        const removedPost = await tx.community_post.findUniqueOrThrow({ where: { id: post.id } });
        assert.equal(removedPost.content, "Conteúdo removido");
        assert.equal(removedPost.media_url, null);
        assert.equal(removedPost.deleted, false);
        assert.equal(
          (await tx.community_post.findUniqueOrThrow({ where: { id: solo.id } })).deleted,
          true,
        );
        const removedParent = await tx.post_reply.findUniqueOrThrow({ where: { id: parent.id } });
        assert.equal(removedParent.content, "Conteúdo removido");
        assert.equal(removedParent.deleted, false);
        assert.equal(
          (await tx.post_reply.findUniqueOrThrow({ where: { id: child.id } })).content,
          child.content,
        );
        assert.equal(
          (await tx.post_reply.findUniqueOrThrow({ where: { id: ownLeaf.id } })).deleted,
          true,
        );
        assert.equal(
          (await tx.video_asset.findUniqueOrThrow({ where: { id: video.id } })).deleted,
          true,
        );
        assert.equal(
          (await tx.professional_review.findUniqueOrThrow({ where: { id: review.id } })).response,
          null,
        );
        const queue = await tx.account_media_deletion.findMany({ where: { owner_id: owner.id } });
        assert.equal(queue.length, 2);
        assert.ok(queue.some((item) => item.object_key === key));
        assert.ok(queue.some((item) => item.object_key === video.provider_uid));
        await deleteAccountContent(tx, owner.id, new Date());
        assert.equal(await tx.account_media_deletion.count({ where: { owner_id: owner.id } }), 2);
        throw rollback;
      },
      { timeout: 30000 },
    );
  } catch (error) {
    if (error !== rollback) throw error;
  }
  assert.equal(await prisma.user.count({ where: { name: prefix } }), 0);
  console.log(
    "PASS: content/media queue, third-party replies, paid-period expiry, versioned acceptance and complete rollback.",
  );
}
main()
  .catch((error: unknown) => {
    console.error("Lifecycle integration failed; fixtures rolled back.");
    if (error instanceof assert.AssertionError) console.error(error.message);
    else if (error instanceof Error)
      console.error(error.name, error.message.split("\n").slice(-3).join("\n"));
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
