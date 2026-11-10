import { Suspense } from "react";
import { StripeBillingReturnLogic } from "@/app/app/professional/billing/return/logic";
import { LoadingState } from "@/components/ui/loading-state";

export const dynamic = "force-dynamic";

export default function StripeBillingReturnPage() {
  return (
    <Suspense fallback={<LoadingState label="Verificando confirmação" />}>
      <StripeBillingReturnLogic />
    </Suspense>
  );
}
