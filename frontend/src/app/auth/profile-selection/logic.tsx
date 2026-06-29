"use client";

import { BriefcaseBusiness, ChevronRight, UserRound } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Logo } from "@/components/ui/logo";
import { cn } from "@/lib/utils";
import { AuthTemplate } from "@/templates/auth";

const profileOptions = [
  {
    href: "/auth/register/patient",
    icon: UserRound,
    title: "Sou Usuário/Paciente",
    description: "Cadastre-se para publicar na comunidade, salvar favoritos e mais.",
  },
  {
    href: "/auth/register/psychologist",
    icon: BriefcaseBusiness,
    title: "Sou Psicólogo",
    description: "Cadastre-se para se conectar com pacientes e crescer sua carreira.",
  },
];

export const ProfileSelectionLogic = () => {
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirectTo") ?? searchParams.get("callbackUrl");
  const appendRedirect = (href: string) => {
    if (!redirectTo) return href;

    const params = new URLSearchParams({
      redirectTo,
    });

    return `${href}?${params.toString()}`;
  };

  return (
    <AuthTemplate contentClassName="items-stretch justify-start py-0">
      <div className="flex min-h-full w-full flex-1 flex-col">
        <header className="flex shrink-0 justify-center pt-7 sm:pt-8">
          <Logo className="w-[126px] sm:w-[144px]" priority />
        </header>

        <div className="flex flex-1 flex-col justify-start pt-16 sm:pt-20">
          <div className="grid w-full gap-6">
            <div className="grid justify-items-center gap-1.5 text-center">
              <h1 className="text-lg font-extrabold text-foreground sm:text-xl">
                Qual o seu perfil?
              </h1>
              <p className="text-[13px] leading-5 text-muted sm:text-sm">
                Escolha como deseja continuar
              </p>
            </div>

            <div className="grid gap-4">
              {profileOptions.map((option) => {
                const Icon = option.icon;

                return (
                  <Link
                    className={cn(
                      "group flex min-h-[96px] items-center gap-3.5 rounded-[var(--lectum-card-radius)] border border-border bg-surface px-5 py-4 shadow-[var(--lectum-shadow-soft)] transition",
                      "hover:border-primary/40 hover:bg-primary-soft/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
                    )}
                    href={appendRedirect(option.href)}
                    key={option.href}
                  >
                    <span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-primary-soft text-primary">
                      <Icon className="h-6 w-6" aria-hidden="true" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[15px] font-bold leading-5 text-foreground">
                        {option.title}
                      </span>
                      <span className="mt-1 block text-[13px] leading-5 text-muted">
                        {option.description}
                      </span>
                    </span>
                    <ChevronRight
                      className="h-5 w-5 shrink-0 text-subtle transition group-hover:text-primary"
                      aria-hidden="true"
                    />
                  </Link>
                );
              })}
            </div>

            <p className="text-center text-[13px] text-muted sm:text-sm">
              Já possui uma conta?{" "}
              <Link
                className="font-semibold text-primary hover:text-primary-hover"
                href={appendRedirect("/auth/login")}
              >
                Fazer login
              </Link>
            </p>
          </div>
        </div>
      </div>
    </AuthTemplate>
  );
};
