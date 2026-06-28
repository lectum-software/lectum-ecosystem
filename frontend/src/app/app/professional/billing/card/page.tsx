import { Suspense } from "react";
import { LoadingState } from "@/components/ui/loading-state";
import { ProfessionalBillingCardLogic } from "./logic";

export default function Page() {
  return (
    <Suspense fallback={<LoadingState label="Carregando cartão" />}>
      <ProfessionalBillingCardLogic />
    </Suspense>
  );
}
