import type { SubscriptionPlan } from "@/api/generator/types/billing";
import { billingPlanAdmission, formatBillingPlanPrice } from "@/utils/billing-plan-offer";

export const PlanAdmissionPrice = ({ plan }: { plan: SubscriptionPlan }) => {
  const admission = billingPlanAdmission(plan);
  return (
    <div className="mt-7 space-y-2">
      {admission.amountCents !== null ? (
        <div className="flex items-end gap-2">
          <strong className="text-4xl font-bold leading-none text-foreground">
            {formatBillingPlanPrice(admission.amountCents)}
          </strong>
          <span className="pb-1 text-sm font-medium text-muted">/mês</span>
        </div>
      ) : (
        <p className="text-lg font-bold leading-7 text-foreground">
          {admission.status === "paused"
            ? "Novas assinaturas pausadas"
            : admission.status === "unknown"
              ? "Confira o valor ao continuar"
              : "Preço indisponível no momento"}
        </p>
      )}
      {plan.slug === "profissional" && admission.amountCents !== null ? (
        <p className="text-xs font-medium leading-5 text-muted">
          Valor para novas assinaturas. O valor final é confirmado na etapa de pagamento.
        </p>
      ) : null}
    </div>
  );
};
