import { Suspense } from "react";
import { AdminPatientsListClient } from "./client";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <AdminPatientsListClient />
    </Suspense>
  );
}
