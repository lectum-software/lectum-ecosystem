import { Suspense } from "react";
import { GlobalContentClient } from "./client";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <GlobalContentClient />
    </Suspense>
  );
}
