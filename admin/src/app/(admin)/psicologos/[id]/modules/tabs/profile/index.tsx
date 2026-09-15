"use client";

import {
  BookOpen,
  CheckCircle2,
  CreditCard,
  FileText,
  Globe2,
  Heart,
  Mail,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { useState } from "react";
import type { AdminPsychologistDetail } from "@/api/req/psychologists";
import { CardShell, IconCircle } from "../../components/shared";
import { formatNullable } from "../../support/formatters";
import { FeatureLine, FieldRow, InfoCard, TextBlock, VideoCard } from "../general/index";
import { RegistryVerificationCard } from "../registry/index";
import { PersonalDataEditForm, ProfileEditButton, ProfileReadOnlyPersonalData } from "./personal";
import { ProfileProfessionalEditForm, ProfileReadOnlyProfessionalData } from "./professional";

export const ProfileTab = ({ detail, id }: { detail: AdminPsychologistDetail; id: string }) => {
  const profile = detail.profile;
  const academic = profile.academic;
  const [editingSection, setEditingSection] = useState<"personal" | "professional" | null>(null);
  const hasAcademicFormation = Boolean(
    academic.title ||
      academic.institution ||
      academic.graduation_year ||
      academic.formations.length > 0,
  );
  const activeFeatures = [
    {
      enabled: profile.features.discount_first_session,
      icon: CreditCard,
      label: "Desconto 1ª sessão",
    },
    {
      enabled: profile.features.accepts_insurance,
      icon: ShieldCheck,
      label: "Aceita convênios",
    },
    {
      enabled: profile.features.social_value,
      icon: Heart,
      label: "Valor social",
    },
  ].filter((feature) => feature.enabled);

  return (
    <div className="space-y-5" data-psychologist-detail-tab="perfil">
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(360px,0.8fr)] xl:items-start">
        <div className="space-y-5">
          <InfoCard
            action={
              editingSection === "personal" ? null : (
                <ProfileEditButton
                  disabled={editingSection === "professional"}
                  onClick={() => setEditingSection("personal")}
                />
              )
            }
            icon={UserRound}
            title="Dados pessoais"
          >
            {editingSection === "personal" ? (
              <PersonalDataEditForm
                detail={detail}
                id={id}
                onCancel={() => setEditingSection(null)}
              />
            ) : (
              <ProfileReadOnlyPersonalData detail={detail} />
            )}
          </InfoCard>

          <InfoCard
            action={
              editingSection === "professional" ? null : (
                <ProfileEditButton
                  disabled={editingSection === "personal"}
                  onClick={() => setEditingSection("professional")}
                />
              )
            }
            icon={FileText}
            title="Dados profissionais"
          >
            {editingSection === "professional" ? (
              <ProfileProfessionalEditForm
                detail={detail}
                id={id}
                onCancel={() => setEditingSection(null)}
              />
            ) : (
              <ProfileReadOnlyProfessionalData detail={detail} />
            )}
          </InfoCard>

          <CardShell className="p-5">
            <div className="flex items-center gap-3">
              <IconCircle icon={CheckCircle2} />
              <h2 className="text-lg font-bold text-foreground">Selos e facilidades</h2>
            </div>
            <div className="mt-4 grid gap-3">
              {activeFeatures.length > 0 ? (
                activeFeatures.map((feature) => (
                  <FeatureLine icon={feature.icon} key={feature.label} label={feature.label} />
                ))
              ) : (
                <p className="rounded-2xl bg-surface-muted p-4 text-sm leading-6 text-foreground">
                  Nenhum selo cadastrado.
                </p>
              )}
            </div>
          </CardShell>

          <CardShell className="p-5">
            <div className="flex items-center gap-3">
              <IconCircle icon={Mail} />
              <h2 className="text-lg font-bold text-foreground">Bio</h2>
            </div>
            <div className="mt-4">
              <TextBlock empty="Nenhuma bio cadastrada.">{profile.content.bio}</TextBlock>
            </div>
          </CardShell>

          <CardShell className="p-5">
            <div className="flex items-center gap-3">
              <IconCircle icon={Globe2} />
              <h2 className="text-lg font-bold text-foreground">Texto de apresentação</h2>
            </div>
            <div className="mt-4">
              <TextBlock empty="Nenhum texto de apresentação cadastrado.">
                {profile.content.headline}
              </TextBlock>
            </div>
          </CardShell>

          <VideoCard detail={detail} />

          <InfoCard icon={BookOpen} title="Formação & Títulos">
            {hasAcademicFormation ? (
              <>
                <FieldRow label="Título" value={formatNullable(academic.title)} />
                <FieldRow label="Instituição" value={formatNullable(academic.institution)} />
                <FieldRow
                  label="Ano de formação"
                  value={formatNullable(academic.graduation_year)}
                />
                <div className="border-b border-border py-3 last:border-0">
                  <dt className="text-sm font-black text-muted">Formações adicionais</dt>
                  <dd className="mt-2 text-sm font-bold text-foreground">
                    {academic.formations.length === 0 ? (
                      "Não informado"
                    ) : (
                      <ul className="list-disc space-y-1 pl-5">
                        {academic.formations.map((formation) => (
                          <li key={formation}>{formation}</li>
                        ))}
                      </ul>
                    )}
                  </dd>
                </div>
              </>
            ) : (
              <div className="rounded-2xl bg-surface-muted p-4 text-sm leading-6 text-foreground">
                Nenhuma formação cadastrada.
              </div>
            )}
          </InfoCard>
        </div>

        <aside className="xl:sticky xl:top-5 xl:max-h-[calc(100dvh-2.5rem)] xl:self-start xl:overflow-y-auto xl:overscroll-contain xl:pr-1">
          <RegistryVerificationCard id={id} />
        </aside>
      </div>
    </div>
  );
};
