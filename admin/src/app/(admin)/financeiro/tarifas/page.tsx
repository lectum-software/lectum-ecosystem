import { Suspense } from "react";
import { AdminStripeFeesClient } from "./client";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <AdminStripeFeesClient />
    </Suspense>
  );
}
