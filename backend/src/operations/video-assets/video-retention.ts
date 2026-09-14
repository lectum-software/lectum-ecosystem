import "@/config/dotenv";
import { S3 } from "@/config/multer/s3";
import prisma from "@/infra/database/prisma";
import { resolveR2MigrationTargetEnvironment } from "@/modules/video-assets/r2-migration/policy";
import { isVideoRetentionReviewDue } from "@/modules/video-assets/retention/policy";
import { catalogLegacyR2Videos } from "@/modules/video-assets/retention/r2-inventory";
import { VideoRetentionRepository } from "@/modules/video-assets/retention/repository";
import { parseVideoRetentionArguments } from "./retention-arguments";

const help = `Catálogo manual de retenção. Não apaga nem migra bytes ou reativa conteúdo.
Uso no container do backend, após migration:
  node dist/operations/video-assets/video-retention.js --catalog-r2 --dry-run --limit=5
  node dist/operations/video-assets/video-retention.js --catalog-r2 --apply --confirm=homolog --limit=5
  node dist/operations/video-assets/video-retention.js --list --limit=50
O apply só cria marcações no banco. Repita lotes para catalogar objetos ainda não marcados.
--review-after=AAAA-MM-DD é opcional (UTC), não expira o arquivo nem libera exclusão.
--list aceita --after=CURSOR retornado pelo lote anterior. Hold sempre permanece ativo.
Imagens/formatos desconhecidos não são registrados como vídeo. Conflitos exigem revisão.
Nenhum resultado deste comando autoriza limpeza automática.`;

const main = async () => {
  const options = parseVideoRetentionArguments(process.argv.slice(2));
  if (!options) {
    console.log(help);
    return;
  }
  const environment = resolveR2MigrationTargetEnvironment(process.env);
  if (!environment || (options.apply && options.confirmation !== environment))
    throw new Error("environment_required");
  if (options.action === "catalog-r2") {
    const result = await catalogLegacyR2Videos(options);
    console.log(
      JSON.stringify(
        { environment, mode: options.apply ? "apply" : "dry-run", ...result },
        null,
        2,
      ),
    );
    if (result.failed || result.conflicts || result.unknown) process.exitCode = 2;
    return;
  }
  const rows = await new VideoRetentionRepository().list(options);
  const now = new Date();
  console.log(
    JSON.stringify(
      {
        environment,
        mode: "read_only",
        count: rows.length,
        nextCursor: rows.length === options.limit ? rows.at(-1)?.identity_hash : null,
        items: rows.map((row) => ({
          ref: row.identity_hash.slice(0, 16),
          reason: row.reason,
          provider: row.provider,
          retainedAt: row.retained_at,
          reviewAfter: row.review_after,
          reviewDue: isVideoRetentionReviewDue(row.review_after, now),
          deletionHold: row.deletion_hold,
          deletionAuthorized: false,
        })),
      },
      null,
      2,
    ),
  );
};

void main()
  .catch(() => {
    console.error(
      "[VIDEO_RETENTION_FAILED] Não foi possível concluir. Confira os argumentos e a configuração; nenhum arquivo foi excluído.",
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    S3.destroy();
    await prisma.$disconnect().catch(() => {
      console.error("[VIDEO_RETENTION_CLOSE_FAILED] Não foi possível encerrar a consulta.");
      process.exitCode = 1;
    });
  });
