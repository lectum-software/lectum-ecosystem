import "@/config/dotenv";
import prisma from "@/infra/database/prisma";
import { recoverStripeInvoice } from "@/modules/billing/invoices/recovery";
import { parseFiscalRecoveryArguments } from "@/modules/billing/invoices/recovery-policy";

const HELP = `Recupera UM job fiscal Stripe apos GETs de pagamento verificado; dry-run por padrao.
--invoice-id <in_...> --account <acct_...> --mode <test|live>
--actor-admin-id <admin ativo confirmado>
--expected-job-attempts <numero|absent> --expected-invoice-attempts <numero|absent>
--reason <provider_recovered|configuration_corrected|missing_fiscal_job>
[--apply --confirm <test|live>]

Nao cobra, emite nota, altera provider, flags ou executa worker. Apply escreve
somente fila/auditoria locais; workers ja habilitados podem emitir depois.
Exige inventario exato e nenhum lease; nao reabre job em andamento nem nota autorizada.
Preserva tentativas, snapshot, referencia idempotente e documento existente.
Documento existente sera apenas consultado; nunca cria outro para reparar rejeicao.
Corrija a causa primeiro. Segredos nunca vao nos argumentos.
`;
async function main() {
  const args = parseFiscalRecoveryArguments(process.argv.slice(2));
  if (!args) return console.log(HELP);
  console.log(JSON.stringify(await recoverStripeInvoice(args)));
}
main()
  .catch(() => {
    console.error(
      "Recuperacao fiscal bloqueada. Revise escopo, pagamento, inventario e responsavel.",
    );
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
