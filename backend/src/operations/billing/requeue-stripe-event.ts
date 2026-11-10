import "@/config/dotenv";
import prisma from "@/infra/database/prisma";
import { parseStripeEventRequeueArguments } from "./stripe-event-requeue-policy";
import { requeueStripeEvent } from "./stripe-event-requeue-service";

const HELP = `Reagenda UM evento Stripe local em revisao; dry-run por padrao.

Uso: pnpm --dir backend exec tsx src/operations/billing/requeue-stripe-event.ts
  --event-id <id LOCAL da inbox> --account <acct_...> --mode <test|live>
  --expected-attempts <tentativas atuais; >=1>
  --actor-admin-id <admin existente, ativo e confirmado>
  --reason <provider_recovered|configuration_corrected|binding_reconciled>
  [--apply --confirm <test|live>]

Somente review_required, API version configurada e sem lease/processamento concluido.
Preserva tentativas e referencias. Sem --apply, nenhuma alteracao ou auditoria.
Nao chama provider nem executa worker; credenciais nunca vao nos argumentos.
O worker habilitado pode conciliar e atribuir cartao depois. Corrija a causa antes.
Runtime live exige destino produtivo canonico e autorizacao operacional separada.
`;

async function main() {
  const args = parseStripeEventRequeueArguments(process.argv.slice(2));
  if (!args) {
    console.log(HELP);
    return;
  }
  console.log(JSON.stringify(await requeueStripeEvent(args)));
}

main()
  .catch(() => {
    console.error("Reprocessamento bloqueado. Revise destino, estado, tentativas e responsavel.");
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
