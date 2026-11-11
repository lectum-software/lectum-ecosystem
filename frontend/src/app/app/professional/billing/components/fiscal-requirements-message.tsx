import Link from "next/link";
import type { BillingFiscalRequirements } from "@/api/generator/types/billing";

const guidance = {
  billing_address: {
    message: "Para emitir sua nota fiscal, complete o endereço de faturamento.",
    label: "Completar endereço fiscal",
    href: "/app/profissional/assinatura/endereco",
  },
  registry_verification: {
    message: "Para emitir sua nota fiscal, conclua a confirmação dos seus dados no CFP.",
    label: "Concluir verificação no CFP",
    href: "/app/profissional/cfp",
  },
  complete_registration: {
    message: "Para emitir sua nota fiscal, conclua as etapas pendentes do seu cadastro.",
    label: "Continuar cadastro",
    href: "/app/profissional/assinatura/concluir",
  },
  support: {
    message:
      "Precisamos confirmar seus dados fiscais. Fale com o suporte para concluir essa etapa.",
    label: "Falar com o suporte",
    href: "mailto:suporte@lectum.com.br?subject=Dados%20fiscais%20da%20assinatura",
  },
} as const;

export const FiscalRequirementsMessage = ({
  requirements,
  testMode,
  canReviewAddress,
}: {
  requirements?: BillingFiscalRequirements;
  testMode: boolean;
  canReviewAddress: boolean;
}) => {
  const action = requirements?.next_action;
  const selected =
    action === "billing_address" && !canReviewAddress
      ? guidance.support
      : action && action !== "none" && Object.hasOwn(guidance, action)
        ? guidance[action]
        : undefined;
  return (
    <p className="mt-2 text-xs leading-5 text-muted">
      {testMode ? "Documento de teste, sem valor fiscal. " : null}
      {selected ? (
        <>
          {selected.message} Seu pagamento já foi confirmado; não é necessário pagar novamente.{" "}
          <Link
            className="font-semibold text-primary underline"
            href={selected.href}
            prefetch={false}
          >
            {selected.label}
          </Link>
        </>
      ) : (
        <>
          {action === "none"
            ? "Dados fiscais completos. A nota ainda não está disponível. Acompanhe por aqui."
            : "Nota fiscal ainda não disponível. Acompanhe por aqui."}
          {!requirements && canReviewAddress ? (
            <>
              {" "}
              <Link
                className="font-semibold text-primary underline"
                href="/app/profissional/assinatura/endereco"
                prefetch={false}
              >
                Conferir endereço fiscal
              </Link>
            </>
          ) : null}
        </>
      )}
    </p>
  );
};
