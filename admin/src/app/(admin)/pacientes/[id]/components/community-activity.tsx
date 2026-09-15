"use client";

import { Loader2 } from "lucide-react";
import Image from "next/image";
import type { ReactNode } from "react";
import type { AdminPatientDetail, PatientsDetailCommunity } from "@/api/req/patients";
import { cn } from "@/lib/utils";
import { numberFormatter } from "../modules/detail-config";
import { isApiMediaSrc, safeAvatarSrc } from "../modules/detail-support";

import { Badge, CardShell } from "./common";

export const CommunityAvatar = ({
  community,
  index,
}: {
  community: PatientsDetailCommunity;
  index: number;
}) => {
  const imageSrc = safeAvatarSrc(community.avatar_url);

  if (imageSrc) {
    return (
      <Image
        alt={`Avatar da comunidade ${community.name}`}
        className="h-11 w-11 shrink-0 rounded-[18px] object-cover"
        height={44}
        src={imageSrc}
        unoptimized={isApiMediaSrc(imageSrc)}
        width={44}
      />
    );
  }

  return (
    <span
      className="grid h-11 w-11 shrink-0 place-items-center rounded-[18px] text-sm font-black text-primary-foreground"
      style={{ backgroundColor: community.color || "var(--admin-primary)" }}
    >
      {index + 1}
    </span>
  );
};

export const formatPatientCommunityPeriodActions = (interactions: number) =>
  interactions === 1
    ? "1 interação no período"
    : `${numberFormatter.format(interactions)} interações no período`;

export const patientCommunityEngagementDiagnosisClassName = (id: string | undefined) =>
  cn(
    "whitespace-nowrap",
    id === "muito_ativo" && "bg-success/10 text-success",
    id === "ativo" && "bg-primary-soft text-primary",
    id === "pouco_ativo" && "bg-warning/10 text-warning",
    (!id || id === "sem_base") && "bg-surface-muted text-muted",
  );

export const getPatientCommunityEngagementDiagnosis = (
  community: PatientsDetailCommunity,
): NonNullable<PatientsDetailCommunity["engagement_diagnosis"]> =>
  community.engagement_diagnosis ?? {
    id: "sem_base",
    label: "Sem base",
    source: "conteudo",
  };

export const getPatientCommunityUpvotes = (community: PatientsDetailCommunity) =>
  community.upvotes ?? community.votes;

export const getPatientCommunityDownvotes = (community: PatientsDetailCommunity) =>
  community.downvotes ?? 0;

export const PatientActiveCommunitiesBlock = ({
  communities,
  engagementDiagnosis,
  isRefreshing,
  periodControls,
}: {
  communities: PatientsDetailCommunity[];
  engagementDiagnosis: AdminPatientDetail["communities"]["engagement_diagnosis"];
  isRefreshing: boolean;
  periodControls: ReactNode;
}) => (
  <CardShell className="min-w-0 max-w-full overflow-hidden p-5">
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_auto] xl:items-start">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-lg font-bold text-foreground">Comunidades ativas</h2>
          <Badge
            className={cn(
              "border border-current/10",
              patientCommunityEngagementDiagnosisClassName(engagementDiagnosis.id),
            )}
          >
            Engajamento geral: {engagementDiagnosis.label}
          </Badge>
          {isRefreshing ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary-soft px-2.5 py-1 text-[11px] font-black text-primary">
              <Loader2 aria-hidden className="h-3.5 w-3.5 animate-spin" />
              Atualizando
            </span>
          ) : null}
        </div>
        <p className="mt-1 text-xs font-bold leading-5 text-muted">
          Publicações que realizou, votos que deu e conteúdo que salvou nas comunidades.
        </p>
        <Badge className="mt-3 w-fit bg-surface-muted text-muted">
          {numberFormatter.format(communities.length)} comunidades
        </Badge>
      </div>
      {periodControls}
    </div>

    {communities.length === 0 ? (
      <p className="mt-5 rounded-2xl border border-dashed border-border bg-surface-muted p-4 text-sm font-bold text-muted">
        Nenhuma comunidade com interação do paciente foi encontrada no período.
      </p>
    ) : (
      <div className="mt-5 overflow-x-auto rounded-[1.35rem] border border-border bg-surface">
        <table className="w-full min-w-[980px] border-collapse text-left">
          <caption className="sr-only">
            Lista de comunidades ativas do paciente por comunidade, posts, comentários, upvotes,
            downvotes, salvamentos e engajamento, com status de seguimento junto ao nome.
          </caption>
          <thead className="bg-surface-muted/80">
            <tr className="text-xs font-black text-muted">
              <th className="px-4 py-3" scope="col">
                Comunidade
              </th>
              <th className="px-4 py-3 text-center" scope="col">
                Posts
              </th>
              <th className="px-4 py-3 text-center" scope="col">
                Comentários
              </th>
              <th className="px-4 py-3 text-center" scope="col">
                Upvotes
              </th>
              <th className="px-4 py-3 text-center" scope="col">
                Downvotes
              </th>
              <th className="px-4 py-3 text-center" scope="col">
                Salvamentos
              </th>
              <th className="px-4 py-3 text-center" scope="col">
                Engajamento
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {communities.map((community, index) => {
              const diagnosis = getPatientCommunityEngagementDiagnosis(community);

              return (
                <tr
                  className="align-middle transition hover:bg-surface-muted/45"
                  key={community.id}
                >
                  <th className="px-4 py-4" scope="row">
                    <div className="flex min-w-0 items-center gap-3">
                      <CommunityAvatar community={community} index={index} />
                      <span className="min-w-0">
                        <span className="flex min-w-0 items-center gap-2">
                          <span className="block max-w-[18rem] truncate text-sm font-black text-foreground">
                            {community.name}
                          </span>
                          <Badge
                            className={cn(
                              "shrink-0 whitespace-nowrap",
                              community.is_member
                                ? "bg-success/10 text-success"
                                : "bg-surface-muted text-muted",
                            )}
                          >
                            {community.is_member ? "Seguindo" : "Não seguindo"}
                          </Badge>
                        </span>
                        <span className="mt-1 block text-xs font-bold text-muted">
                          {formatPatientCommunityPeriodActions(community.interactions)}
                        </span>
                      </span>
                    </div>
                  </th>
                  <td className="px-4 py-4 text-center text-sm font-bold text-muted">
                    {numberFormatter.format(community.posts)}
                  </td>
                  <td className="px-4 py-4 text-center text-sm font-bold text-muted">
                    {numberFormatter.format(community.comments)}
                  </td>
                  <td className="px-4 py-4 text-center text-sm font-bold text-muted">
                    {numberFormatter.format(getPatientCommunityUpvotes(community))}
                  </td>
                  <td className="px-4 py-4 text-center text-sm font-bold text-muted">
                    {numberFormatter.format(getPatientCommunityDownvotes(community))}
                  </td>
                  <td className="px-4 py-4 text-center text-sm font-bold text-muted">
                    {numberFormatter.format(community.saves)}
                  </td>
                  <td className="px-4 py-4 text-center">
                    <Badge className={patientCommunityEngagementDiagnosisClassName(diagnosis.id)}>
                      {diagnosis.label}
                    </Badge>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    )}
  </CardShell>
);
