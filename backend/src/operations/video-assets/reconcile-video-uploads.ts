import "@/config/dotenv";
import { resolveR2MigrationTargetEnvironment } from "@/modules/video-assets/r2-migration/policy";
import { parseReconcileVideoUploadArguments } from "./reconcile-arguments";

const help = `Inspeção manual de uploads existentes, sem envio, exclusão ou publicação.
Uso no container do backend:
  node dist/operations/video-assets/reconcile-video-uploads.js --owner-id=ID --dry-run --limit=20
  node dist/operations/video-assets/reconcile-video-uploads.js --asset-id=ID --dry-run
  node dist/operations/video-assets/reconcile-video-uploads.js --asset-id=ID --apply --confirm=homolog
Dry-run é o padrão. Owner lista até 20 tentativas por lote; use --offset=nextOffset para continuar.
Offset é limitado a 10000, com ordenação por criação; novas reservas podem deslocar as páginas.
Apply exige um único asset e confirmação homolog/production correspondente ao runtime.
Ready, excluídos, cancelados, migrações e apresentação de perfil são somente leitura.
Não associa conteúdo nem corrige autorização. Relatório usa referências hash, sem IDs/URLs.
Uma reserva expirada não prova a causa histórica da interrupção do envio.`;

let closeDatabase: (() => Promise<void>) | null = null;

const main = async () => {
  const options = parseReconcileVideoUploadArguments(process.argv.slice(2));
  if (!options) {
    console.log(help);
    return;
  }
  const environment = resolveR2MigrationTargetEnvironment(process.env);
  if (!environment || (options.apply && options.confirmation !== environment))
    throw new Error("environment_required");
  // Parse scope and environment before importing runtime clients. Help needs no credentials,
  // and configuration failures stay inside the sanitized error boundary.
  const { default: prisma } = await import("@/infra/database/prisma");
  closeDatabase = () => prisma.$disconnect();
  const { reconcileVideoUploads } = await import("@/modules/video-assets/reconciliation/service");
  const report = await reconcileVideoUploads(options);
  console.log(JSON.stringify({ environment, ...report }, null, 2));
  if (
    report.count === 0 ||
    report.items.some((item) => !item.providerReadSucceeded || item.concurrentChange)
  )
    process.exitCode = 2;
};

void main()
  .catch(() => {
    console.error(
      "[VIDEO_UPLOAD_RECONCILIATION_FAILED] Operação não concluída. Confira escopo, confirmação e configuração. Nenhum arquivo foi excluído.",
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeDatabase?.().catch(() => {
      console.error(
        "[VIDEO_UPLOAD_RECONCILIATION_CLOSE_FAILED] Não foi possível encerrar a consulta.",
      );
      process.exitCode = 1;
    });
  });
