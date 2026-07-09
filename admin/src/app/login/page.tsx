import { Suspense } from "react";
import { LoadingSplash } from "@/components/admin-shell/loading-splash";
import { LoginPageClient } from "./client";

export default function LoginPage() {
  return (
    <Suspense fallback={<LoadingSplash message="Carregando login administrativo..." />}>
      <LoginPageClient />
    </Suspense>
  );
}
