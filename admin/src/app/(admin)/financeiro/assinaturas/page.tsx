import { Suspense } from "react";
import { AdminFinanceSubscriptionsClient } from "./client";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <AdminFinanceSubscriptionsClient />
    </Suspense>
  );
}
