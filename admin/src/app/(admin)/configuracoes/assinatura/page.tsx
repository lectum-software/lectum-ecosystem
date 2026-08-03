import { Suspense } from "react";
import { AdminSubscriptionSettingsClient } from "./client";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <AdminSubscriptionSettingsClient />
    </Suspense>
  );
}
