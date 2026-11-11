import "@/config/dotenv";
import prisma from "@/infra/database/prisma";
import { getInvoiceConfig, InvoiceError } from "@/modules/billing/invoices/config";
import { invoiceOperationReference } from "@/modules/billing/invoices/diagnostics";
import { invoiceDocumentStatus } from "@/modules/billing/invoices/document-authorization";
import {
  assertExistingInvoiceDocument,
  invoiceDocumentSnapshot,
  reconcileExistingInvoiceDocument,
} from "@/modules/billing/invoices/existing-document";
import {
  invoiceGatewayScopes,
  invoiceScopeMatches,
} from "@/modules/billing/invoices/gateway-scope";
import { InvoiceRepository } from "@/modules/billing/invoices/repository";
import { SendNfAdapter } from "@/modules/billing/invoices/SendNfAdapter";

const HELP = `Consulta UM documento fiscal ja existente, por GETs SendNF; dry-run por padrao.
--invoice-id <id LOCAL billing_invoice> --document-id <id SendNF existente> --mode <test|live>
[--apply]
Apply atualiza somente a observacao local por compare-and-set. Nao executa workers,
nao consulta gateways financeiros, nao cobra, nao cria/cancela/emite documentos,
nao altera configuracoes. Exige escopo exato e nenhum lease ativo. Sem segredos nos argumentos.
`;

function argumentsFor(argv: string[]) {
  if (argv.length === 1 && ["--help", "-h"].includes(argv[0])) return null;
  const flags = new Map<string, string | true>();
  for (let i = 0; i < argv.length; i++) {
    const flag = argv[i];
    if (flags.has(flag)) throw new InvoiceError("resource_invalid");
    if (flag === "--apply") flags.set(flag, true);
    else {
      if (!["--invoice-id", "--document-id", "--mode"].includes(flag))
        throw new InvoiceError("resource_invalid");
      const value = argv[++i];
      if (!value || value.startsWith("--")) throw new InvoiceError("resource_invalid");
      flags.set(flag, value);
    }
  }
  const invoiceId = flags.get("--invoice-id");
  const documentId = flags.get("--document-id");
  const mode = flags.get("--mode");
  if (
    typeof invoiceId !== "string" ||
    !/^[A-Za-z0-9_-]{1,128}$/.test(invoiceId) ||
    typeof documentId !== "string" ||
    !/^[A-Za-z0-9_-]{1,100}$/.test(documentId) ||
    (mode !== "test" && mode !== "live")
  )
    throw new InvoiceError("resource_invalid");
  return { invoiceId, documentId, mode, apply: flags.has("--apply") };
}

async function main() {
  const args = argumentsFor(process.argv.slice(2));
  if (!args) return console.log(HELP);
  const config = getInvoiceConfig();
  if (!config || config.mode !== args.mode) throw new InvoiceError("configuration_invalid");
  const repository = new InvoiceRepository();
  const invoice = await repository.findExistingDocument(args.invoiceId);
  if (
    !invoice ||
    invoice.document_id !== args.documentId ||
    (invoice.lease_until !== null && invoice.lease_until.getTime() >= Date.now()) ||
    !invoiceScopeMatches(invoiceGatewayScopes(config.mode), invoice)
  )
    throw new InvoiceError("document_mismatch");
  invoiceDocumentSnapshot(invoice, config);
  const provider = new SendNfAdapter(config.apiKey, config.companyId, config.mode);
  let status: string;
  if (args.apply) {
    const result = await reconcileExistingInvoiceDocument(invoice, config, provider, repository);
    status = result.invoice.status;
  } else {
    await provider.verifyIdentity();
    const document = await provider.getDocument(args.documentId);
    assertExistingInvoiceDocument(document, invoice, config);
    if (!(await repository.isDocumentCurrent(invoice)))
      throw new InvoiceError("document_observation_conflict", true);
    status = invoiceDocumentStatus(document);
  }
  console.log(
    JSON.stringify({
      operation: "observe_existing_fiscal_document",
      invoice_ref: invoiceOperationReference(invoice.id),
      company_ref: invoiceOperationReference(config.companyId),
      mode: config.mode,
      result: args.apply ? "observed" : "dry_run",
      document_status: status,
      provider_writes: false,
    }),
  );
}

main()
  .catch(() => {
    console.error("Consulta fiscal bloqueada. Revise escopo, documento existente e concorrencia.");
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
