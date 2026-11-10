import prisma from "@/infra/database/prisma";
import { financialFailureCode } from "@/modules/billing/stripe/financial-ledger/policy";
import { reconcileStripeFinancialLedger } from "@/modules/billing/stripe/financial-ledger/service";
import { parseStripeLedgerArguments } from "./stripe-ledger-arguments";

async function main() {
  const options = parseStripeLedgerArguments(process.argv.slice(2));
  if (!options) {
    console.log(
      "Uso: reconcile-stripe-ledger --subscription-id <id-local> --account <conta> --mode test|live [--max-pages 1..5] [--apply --confirm test|live] [--refresh]",
    );
    console.log(
      "Dry-run por padrão. Somente GET no gateway; apply grava fatos/cobertura no banco. Refresh reinicia leitura, nunca cobrança. Sem SendNF.",
    );
    return;
  }
  console.log(JSON.stringify(await reconcileStripeFinancialLedger(options)));
}
main()
  .catch((error: unknown) => {
    console.error(JSON.stringify({ success: false, code: financialFailureCode(error) }));
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
