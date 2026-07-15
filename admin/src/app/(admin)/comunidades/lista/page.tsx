import { Suspense } from "react";
import { AdminCommunitiesListClient } from "./client";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <AdminCommunitiesListClient />
    </Suspense>
  );
}
