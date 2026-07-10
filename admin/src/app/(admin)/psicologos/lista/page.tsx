import { Suspense } from "react";
import { AdminPsychologistsListClient } from "./client";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <AdminPsychologistsListClient />
    </Suspense>
  );
}
