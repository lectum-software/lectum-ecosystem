"use client";

import { ArrowLeft, MessageCircle, UserRound } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useReviewEligibility } from "@/api/callers/reviews";
import { EmptyState } from "@/components/ui/empty-state";
import { InlineAlert } from "@/components/ui/inline-alert";
import { LoadingState } from "@/components/ui/loading-state";
import { VerifiedBadgeIcon } from "@/components/ui/verified-badge";
import { useAppSelector } from "@/hooks/redux";
import { useAuthTokenPresence } from "@/hooks/use-auth-token-presence";
import { Button } from "@/registry/new-york-v4/ui/button";
import { PrivateTemplate } from "@/templates/private";
import { formatCrpLabel } from "@/utils/crp";
import { isPublicMediaUrl, resolvePublicMediaUrl } from "@/utils/media";
import { TestimonialForm } from "./testimonial-form";

const unavailableReason = (reason?: string) => {
  if (reason === "already_reviewed")
    return "Você já deixou um depoimento para este psicólogo. Você pode editá-lo em Meus depoimentos.";
  if (reason === "own_profile") return "Não é possível deixar um depoimento no próprio perfil.";
  if (reason === "professional_plan_required")
    return "Este psicólogo não está recebendo novos depoimentos no momento.";
  if (reason === "patient_required") return "Somente pacientes podem publicar depoimentos.";
  return "Este perfil não está disponível para receber depoimentos.";
};

export const NewTestimonialPage = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const psychologistId = searchParams.get("psychologist_id") || searchParams.get("id") || "";
  const hasToken = useAuthTokenPresence();
  const user = useAppSelector((state) => state.user);
  const isPatient = user?.role === "paciente";
  const eligibility = useReviewEligibility(psychologistId, hasToken && isPatient);
  const professional = eligibility.data;
  const avatar = resolvePublicMediaUrl(professional?.psychologist_avatar ?? null);
  const profileHref = `/psicologos/${encodeURIComponent(psychologistId)}`;

  return (
    <PrivateTemplate>
      <section className="mx-auto grid w-full max-w-xl gap-5">
        <header className="flex items-center gap-3">
          <Button asChild variant="ghost" className="h-10 w-10 shrink-0 p-0">
            <Link aria-label="Voltar" href={psychologistId ? profileHref : "/psicologos"}>
              <ArrowLeft className="size-5" />
            </Link>
          </Button>
          <h1 className="text-xl font-bold">Deixar depoimento</h1>
        </header>

        {!psychologistId ? (
          <EmptyState
            icon={UserRound}
            title="Escolha um psicólogo"
            description="Abra o perfil do psicólogo para deixar seu depoimento."
            action={
              <Button asChild>
                <Link href="/psicologos">Buscar psicólogos</Link>
              </Button>
            }
          />
        ) : !hasToken ? (
          <EmptyState
            icon={UserRound}
            title="Entre para deixar seu depoimento"
            description="Use sua conta de paciente para compartilhar sua experiência."
            action={
              <Button asChild>
                <Link
                  href={`/auth/login?redirectTo=${encodeURIComponent(`/app/avaliacoes/nova?psychologist_id=${encodeURIComponent(psychologistId)}`)}`}
                >
                  Entrar
                </Link>
              </Button>
            }
          />
        ) : !user || (isPatient && eligibility.isLoading) ? (
          <LoadingState label="Carregando profissional" />
        ) : !isPatient ? (
          <EmptyState
            icon={MessageCircle}
            title="Publicação disponível para pacientes"
            description={unavailableReason("patient_required")}
          />
        ) : eligibility.isError ? (
          <InlineAlert title="Não foi possível verificar" variant="error">
            <p>Não foi possível carregar o profissional agora.</p>
            <Button variant="ghost" onClick={() => eligibility.refetch()}>
              Tentar novamente
            </Button>
          </InlineAlert>
        ) : professional?.eligible ? (
          <>
            <div className="flex items-center gap-3 border-b border-border pb-5">
              <span className="relative grid size-12 shrink-0 place-items-center overflow-hidden rounded-full bg-primary-soft text-primary">
                {avatar ? (
                  <Image
                    alt={`Foto de ${professional.psychologist_name}`}
                    src={avatar}
                    fill
                    sizes="48px"
                    className="object-cover"
                    unoptimized={isPublicMediaUrl(professional.psychologist_avatar)}
                  />
                ) : (
                  <UserRound className="size-6" aria-hidden />
                )}
              </span>
              <div className="min-w-0">
                <h2 className="flex items-center gap-1.5 font-semibold">
                  <span className="min-w-0 break-words">{professional.psychologist_name}</span>
                  {professional.psychologist_verified ? (
                    <VerifiedBadgeIcon className="size-4 shrink-0" aria-label="Perfil verificado" />
                  ) : null}
                </h2>
                <p className="text-sm text-muted">
                  {professional.psychologist_gender?.toLowerCase() === "feminino"
                    ? "Psicóloga"
                    : "Psicólogo"}{" "}
                  · {formatCrpLabel(professional.psychologist_crp)}
                </p>
              </div>
            </div>
            <TestimonialForm
              key={psychologistId}
              psychologistId={psychologistId}
              onSuccess={() =>
                router.replace(
                  `/app/avaliacoes/sucesso?psychologist_id=${encodeURIComponent(psychologistId)}`,
                )
              }
            />
          </>
        ) : professional ? (
          <EmptyState
            icon={MessageCircle}
            title={
              professional.reason === "already_reviewed"
                ? "Depoimento já publicado"
                : "Depoimento indisponível"
            }
            description={unavailableReason(professional.reason)}
            action={
              <Button asChild variant="outline">
                <Link
                  href={
                    professional.reason === "already_reviewed" ? "/app/avaliacoes" : profileHref
                  }
                >
                  {professional.reason === "already_reviewed" ? "Meus depoimentos" : "Ver perfil"}
                </Link>
              </Button>
            }
          />
        ) : null}
      </section>
    </PrivateTemplate>
  );
};
