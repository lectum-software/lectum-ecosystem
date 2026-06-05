"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { LoadingState } from "@/components/ui/loading-state";
import { useAppSelector } from "@/hooks/redux";
import { PrivateTemplate } from "@/templates/private";

const roleHomePaths = {
  paciente: "/app/psychologists",
  psicologo: "/app/profile",
} as const;

export const AppHomeLogic = () => {
  const router = useRouter();
  const user = useAppSelector((state) => state.user);
  const target =
    user?.role === "paciente" || user?.role === "psicologo" ? roleHomePaths[user.role] : null;

  useEffect(() => {
    if (target) {
      router.replace(target);
    }
  }, [router, target]);

  return (
    <PrivateTemplate>
      <section className="grid min-h-[55vh] place-items-center">
        <LoadingState label="Abrindo sua área privada" />
      </section>
    </PrivateTemplate>
  );
};
