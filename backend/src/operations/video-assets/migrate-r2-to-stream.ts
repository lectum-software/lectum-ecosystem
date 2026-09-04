import "@/config/dotenv";

import prisma from "@/infra/database/prisma";
import { getVideoStreamProvider } from "@/infra/video-stream";
import { env } from "@/main/server/environment";
import {
  acquireR2ToStreamMigrationLock,
  listLegacyVideoCandidates,
  type MigrationItemResult,
  type R2ToStreamMigrationLock,
  R2ToStreamMigrationService,
  resolveR2MigrationTargetEnvironment,
} from "@/modules/video-assets/r2-migration";
import { parseR2ToStreamArguments, R2ToStreamArgumentError } from "./r2-to-stream-arguments";

class R2ToStreamOperationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "R2ToStreamOperationError";
  }
}

const help = `Migra vídeos legados do R2 para Cloudflare Stream sem apagar a origem.

Uso seguro no container do backend:
  pnpm video:migrate-r2-to-stream
  pnpm video:migrate-r2-to-stream -- --dry-run --limit=5
  pnpm video:migrate-r2-to-stream -- --apply --confirm=homolog --limit=5

Filtros opcionais:
  --purpose=all|profile_presentation|community_post|community_reply
  --poll-seconds=10        Intervalo de consulta ao Stream (5..60)
  --wait-seconds=1800      Espera máxima por vídeo (60..3600)

Proteções:
  - o padrão é dry-run;
  - --apply exige --confirm igual ao ambiente detectado;
  - apenas uma execução pode aplicar a migração por banco;
  - a troca no banco ocorre somente depois de o Stream ficar pronto;
  - objetos e capas R2 nunca são apagados por este comando.
`;

const summarize = (results: MigrationItemResult[]) => {
  const totals = {
    already_attached: 0,
    eligible: 0,
    failed: 0,
    migrated: 0,
    processing: 0,
    skipped: 0,
  };
  const byPurpose = {
    community_post: 0,
    community_reply: 0,
    profile_presentation: 0,
  };
  let totalBytes = 0;

  for (const result of results) {
    totals[result.outcome] += 1;
    byPurpose[result.purpose] += 1;
    totalBytes += result.sizeBytes ?? 0;
  }

  return { byPurpose, totalBytes, totals };
};

const assertApplySafety = (
  confirmation: "homolog" | "production" | null,
  detectedEnvironment: "homolog" | "production" | null,
) => {
  if (!detectedEnvironment) {
    throw new R2ToStreamOperationError(
      "Não foi possível detectar com segurança se o container é homolog ou production.",
    );
  }
  if (!confirmation || confirmation !== detectedEnvironment) {
    throw new R2ToStreamOperationError(
      `Confirme este ambiente com --confirm=${detectedEnvironment}.`,
    );
  }
};

const main = async () => {
  if (process.argv.includes("--help")) {
    console.log(help);
    return;
  }

  const options = parseR2ToStreamArguments(process.argv.slice(2));
  if (!options) {
    console.log(help);
    return;
  }

  const detectedEnvironment = resolveR2MigrationTargetEnvironment(process.env);
  if (!detectedEnvironment) {
    throw new R2ToStreamOperationError(
      "Não foi possível detectar com segurança se o container é homolog ou production.",
    );
  }
  if (options.apply) assertApplySafety(options.confirmEnvironment, detectedEnvironment);

  const provider = getVideoStreamProvider();
  if (!provider) {
    throw new R2ToStreamOperationError(
      "Cloudflare Stream não está habilitado ou possui configuração incompleta.",
    );
  }

  let migrationLock: R2ToStreamMigrationLock | null = null;
  if (options.apply) {
    migrationLock = await acquireR2ToStreamMigrationLock(env.DATABASE_URL);
    if (!migrationLock) {
      throw new R2ToStreamOperationError("Já existe uma migração R2 para Stream em execução.");
    }
  }

  try {
    const candidates = await listLegacyVideoCandidates({
      limit: options.limit,
      purpose: options.purpose,
    });
    const service = new R2ToStreamMigrationService(provider);
    const results: MigrationItemResult[] = [];

    for (const candidate of candidates) {
      if (migrationLock && !migrationLock.isHealthy()) {
        throw new R2ToStreamOperationError(
          "O lock de segurança do banco foi perdido; a execução foi interrompida.",
        );
      }
      const result = await service.process(candidate, options);
      if (migrationLock && !migrationLock.isHealthy()) {
        throw new R2ToStreamOperationError(
          "O lock de segurança do banco foi perdido; a execução foi interrompida.",
        );
      }
      results.push(result);
      console.log("[R2_STREAM_MIGRATION_ITEM_RESULT]", {
        migrationRef: result.migrationRef,
        outcome: result.outcome,
        purpose: result.purpose,
        ...(result.reason ? { reason: result.reason } : {}),
        ...(result.sizeBytes ? { sizeBytes: result.sizeBytes } : {}),
      });
    }

    const summary = summarize(results);
    console.log(
      JSON.stringify(
        {
          batch_limit: options.limit,
          candidates_in_batch: candidates.length,
          environment: detectedEnvironment ?? "unknown",
          mode: options.apply ? "apply" : "dry-run",
          more_candidates_may_exist: candidates.length === options.limit,
          r2_objects_deleted: 0,
          items: results,
          ...summary,
        },
        null,
        2,
      ),
    );

    if (summary.totals.failed > 0) process.exitCode = 1;
    else if (summary.totals.processing > 0 || summary.totals.skipped > 0) process.exitCode = 2;
  } finally {
    await migrationLock?.release();
  }
};

main()
  .catch((error: unknown) => {
    const message =
      error instanceof R2ToStreamArgumentError || error instanceof R2ToStreamOperationError
        ? error.message
        : "Não foi possível executar a migração com segurança. Consulte os logs sanitizados.";
    console.error(`[R2_STREAM_MIGRATION_ABORTED] ${message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
