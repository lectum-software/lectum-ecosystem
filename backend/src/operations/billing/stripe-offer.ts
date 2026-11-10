import "@/config/dotenv";
import prisma from "@/infra/database/prisma";
import { parseStripeOfferArguments } from "./stripe-offer-policy";
import { configureStripeOffer } from "./stripe-offer-service";

const HELP = `Configura a oferta Stripe local; dry-run por padrao. Nenhuma cobranca e criada.

Uso: pnpm --dir backend exec tsx src/operations/billing/stripe-offer.ts
  --account <acct_...> --mode <test|live> --price <price_...>
  --expected-revision <revisao atual; 0 se inexistente>
  --actor-admin-id <admin existente, ativo e confirmado>
  --reason <initial_catalog|enable_checkout|pause_checkout|replace_offer>
  [--apply] [--enable-sales|--disable-sales]

Sem --apply, somente consulta e exibe o plano da alteracao.
Sem --enable-sales, uma oferta nova ou preco substituido fica desabilitado.
Plano profissional deve existir; este comando nao faz seed nem muda beneficios.
Somente BRL 29,90/mes autorizado nesta etapa. Chaves nunca vao nos argumentos.
Live exige runtime produtivo canonico e autorizacao operacional previa.
Habilitar vendas exige segredo de webhook configurado e reconciliador habilitado.
Essas presencas NAO comprovam entrega real de eventos: valide E2E antes de habilitar.
Nao altera contratos, cartoes, catalogo remoto, MP nem emite nota fiscal.
`;

const main = async () => {
  const args = parseStripeOfferArguments(process.argv.slice(2));
  if (!args) {
    console.log(HELP);
    return;
  }
  console.log(JSON.stringify(await configureStripeOffer(args)));
  if (args.sales === "enable")
    console.error(
      "A verificacao de configuracao nao substitui o teste E2E de webhook, recuperacao e checkout.",
    );
};

main()
  .catch(() => {
    console.error(
      "Configuracao da oferta bloqueada. Revise destino, revisao, plano e responsavel.",
    );
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
