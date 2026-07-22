import { Suspense } from "react";
import { AdminFinanceChargesClient } from "./client";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <AdminFinanceChargesClient />
    </Suspense>
  );
}
