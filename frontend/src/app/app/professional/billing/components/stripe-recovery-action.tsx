"use client";

import Link from "next/link";
import { useStripeBillingConfig } from "@/api/callers/psychologist-billing/stripe";
import { InlineAlert } from "@/components/ui/inline-alert";
import { Button } from "@/registry/new-york-v4/ui/button";
import { canReplaceStripePendingCard, isStripeBillingActionPending } from "@/utils/stripe-billing";

/** Navigation and GET configuration only: mounting this card never confirms a payment. */
export const StripeRecoveryAction = () => {
  const config = useStripeBillingConfig();
  const pending = config.data?.pending_operation;
  if (config.isError)
    return (
      <InlineAlert title="Não foi possível conferir pendências" variant="warning">
        <p>Recarregue o status antes de iniciar outra tentativa.</p>
        <Button className="mt-3" variant="outline" onClick={() => void config.refetch()}>
          Verificar status
        </Button>
      </InlineAlert>
    );
  if (!pending || pending.state === "complete" || pending.state === "failed") return null;
  const financial = isStripeBillingActionPending(pending);
  const cardChange = pending.kind === "payment_method";
  const replaceCard = financial && canReplaceStripePendingCard(pending);
  return (
    <InlineAlert title={cardChange ? "Alteração do cartão em andamento" : "Pagamento pendente"}>
      <div className="grid gap-3">
        <p>
          {cardChange
            ? "Continue a alteração já iniciada. Salvar o cartão não cobra uma pendência."
            : pending.state === "review_required"
              ? "Esta tentativa precisa ser conferida. Não inicie outra assinatura nem repita o pagamento enquanto verificamos o resultado."
              : replaceCard
                ? "Se ainda não atualizou, informe outro cartão de crédito. Depois de salvar o cartão, confira esta tentativa e confirme o pagamento. A troca do cartão não faz a cobrança."
                : "Confira a tentativa já iniciada. Se for necessária confirmação ou autenticação do banco, você poderá continuar sem criar outra assinatura."}
        </p>
        {replaceCard ? (
          <Button asChild className="h-11 w-full">
            <Link href="/app/profissional/assinatura/cartao">Atualizar cartão</Link>
          </Button>
        ) : null}
        <Button asChild className="h-11 w-full" variant={replaceCard ? "outline" : "default"}>
          <Link
            href={
              cardChange
                ? "/app/profissional/assinatura/cartao"
                : "/app/profissional/assinatura/pagamento"
            }
          >
            {cardChange
              ? "Continuar alteração"
              : financial && pending.state === "requires_confirmation" && !replaceCard
                ? "Continuar pagamento"
                : "Conferir tentativa"}
          </Link>
        </Button>
      </div>
    </InlineAlert>
  );
};
