import { Suspense } from "react";
import { ProfessionalBillingCardLogic } from "@/app/app/professional/billing/card/logic";
import { LoadingState } from "@/components/ui/loading-state";

export default function ProfessionalBillingCardPage() {
  return (
    <Suspense fallback={<LoadingState label="Carregando cart?o" />}>
      <ProfessionalBillingCardLogic />
    </Suspense>
  );
}
