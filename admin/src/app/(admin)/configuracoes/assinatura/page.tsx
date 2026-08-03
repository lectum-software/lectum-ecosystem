import { Suspense } from "react";
import { AdminFinanceSubscriptionsClient } from "../../financeiro/assinaturas/client";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <AdminFinanceSubscriptionsClient />
    </Suspense>
  );
}
