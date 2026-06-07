"use client";

import {
  ArrowLeft,
  BadgeCheck,
  CheckCircle2,
  ClipboardCheck,
  Loader2,
  LockKeyhole,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { usePsychologistFreeProfile } from "@/api/callers/psychologist-free-profile";
import type { FreeProfileCatalogItem } from "@/api/generator/types/free-profile";
import { InlineAlert } from "@/components/ui/inline-alert";
import { LoadingState } from "@/components/ui/loading-state";
import { cn } from "@/lib/utils";
import { Button } from "@/registry/new-york-v4/ui/button";
import { PrivateTemplate } from "@/templates/private";
import { type FreeProfileForm, parseLanguages, useFreeProfileForm } from "./use-form";

type ApiErrorData = {
  error?: string;
  message?: string;
};

type ApiError = Error & {
  data?: ApiErrorData;
};

const resolveApiError = (error: unknown) => {
  const apiError = error as ApiError;
  return (
    apiError?.data?.error ||
    apiError?.data?.message ||
    apiError.message ||
    "Não foi possível salvar o perfil agora."
  );
};

const toggleValue = (values: string[], id: string) => {
  return values.includes(id) ? values.filter((item) => item !== id) : [...values, id];
};

const SectionCard = ({
  children,
  title,
  description,
}: {
  children: React.ReactNode;
  title: string;
  description?: string;
}) => (
  <section className="rounded-[var(--lectum-card-radius)] border border-border bg-surface p-5 shadow-[var(--lectum-shadow-soft)]">
    <h2 className="text-lg font-bold text-foreground">{title}</h2>
    {description ? <p className="mt-1 text-sm leading-6 text-muted">{description}</p> : null}
    <div className="mt-5">{children}</div>
  </section>
);

const CatalogPicker = ({
  items,
  limit,
  name,
  selected,
  title,
  onChange,
}: {
  items: FreeProfileCatalogItem[];
  limit?: number;
  name: keyof Pick<FreeProfileForm, "specialty_ids" | "service_ids" | "approach_ids">;
  selected: string[];
  title: string;
  onChange: (
    name: keyof Pick<FreeProfileForm, "specialty_ids" | "service_ids" | "approach_ids">,
    value: string[],
  ) => void;
}) => {
  const isEmpty = items.length === 0;

  return (
    <div className="grid gap-3">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-bold text-foreground">{title}</h3>
        {limit ? (
          <span className="text-xs font-semibold text-muted">
            {selected.length}/{limit}
          </span>
        ) : null}
      </div>

      {isEmpty ? (
        <InlineAlert title="Catálogo vazio" variant="warning">
          Nenhuma opção ativa foi encontrada no backend para esta seção.
        </InlineAlert>
      ) : null}

      <div className="grid gap-2 sm:grid-cols-2">
        {items.map((item) => {
          const checked = selected.includes(item.id);
          const disabled = Boolean(limit && !checked && selected.length >= limit);

          return (
            <label
              className={cn(
                "flex cursor-pointer items-center gap-3 rounded-2xl border border-border bg-surface-muted px-4 py-3 text-sm font-semibold text-foreground transition",
                checked && "border-primary bg-primary-soft text-primary",
                disabled && "cursor-not-allowed opacity-50",
              )}
              key={item.id}
            >
              <input
                checked={checked}
                className="h-4 w-4 accent-primary"
                disabled={disabled}
                onChange={() => onChange(name, toggleValue(selected, item.id))}
                type="checkbox"
              />
              {item.name}
            </label>
          );
        })}
      </div>
    </div>
  );
};

export const ProfessionalProfileSetupLogic = () => {
  const { profile, update } = usePsychologistFreeProfile({
    callbacks: {
      update: {
        onSuccess: () => toast.success("Perfil gratuito atualizado"),
        onError: (error) => toast.error(resolveApiError(error)),
      },
    },
  });
  const form = useFreeProfileForm(profile.data);
  const Form = form.Form;
  const selectedSpecialties = form.hook.watch("specialty_ids") || [];
  const selectedServices = form.hook.watch("service_ids") || [];
  const selectedApproaches = form.hook.watch("approach_ids") || [];
  const published = form.hook.watch("published");

  const setCatalogValue = (
    name: keyof Pick<FreeProfileForm, "specialty_ids" | "service_ids" | "approach_ids">,
    value: string[],
  ) => {
    form.hook.setValue(name, value, { shouldDirty: true, shouldValidate: true });
  };

  const submit = form.hook.handleSubmit((values) => {
    update.mutate({
      name: values.name,
      headline: values.headline || null,
      bio: values.bio || null,
      modality: values.modality || null,
      languages: parseLanguages(values.languagesText),
      specialty_ids: values.specialty_ids,
      service_ids: values.service_ids,
      approach_ids: values.approach_ids,
      published: values.published,
    });
  });

  return (
    <PrivateTemplate showHeader={false}>
      <section className="mx-auto grid w-full max-w-[430px] gap-5 md:max-w-4xl">
        <Link
          className="inline-flex items-center gap-2 text-sm font-semibold text-muted"
          href="/app/professional/whatsapp/verify"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Voltar para WhatsApp
        </Link>

        <header className="rounded-[var(--lectum-card-radius)] border border-border bg-surface px-5 py-7 text-center shadow-[var(--lectum-shadow-soft)]">
          <span className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-primary-soft text-primary">
            <ClipboardCheck className="h-10 w-10" aria-hidden="true" />
          </span>
          <p className="mt-6 text-xs font-bold uppercase tracking-[0.18em] text-primary">
            Perfil gratuito
          </p>
          <h1 className="mt-3 text-2xl font-bold leading-tight text-foreground">
            Configure seu perfil profissional
          </h1>
          <p className="mt-3 text-base leading-7 text-muted">
            Este recorte permite configurar o perfil gratuito sem documentos CRP. Campos sensíveis
            de CRP continuam bloqueados.
          </p>
        </header>

        {profile.isLoading ? <LoadingState label="Carregando perfil profissional" /> : null}

        {profile.isError ? (
          <InlineAlert title="Não foi possível carregar o perfil" variant="error">
            {resolveApiError(profile.error)}
          </InlineAlert>
        ) : null}

        {profile.data ? (
          <Form className="grid gap-5" {...form.formProps} onSubmit={submit}>
            <InlineAlert title="Dados públicos" variant="info">
              Nome, título, bio, modalidade e idiomas aparecem no perfil e na listagem de
              psicólogos.
            </InlineAlert>

            <SectionCard
              title="Catálogos do perfil"
              description="No plano gratuito, selecione até 3 especialidades."
            >
              <div className="grid gap-6">
                <CatalogPicker
                  items={profile.data.catalogs.specialties}
                  limit={profile.data.plan.specialty_limit}
                  name="specialty_ids"
                  onChange={setCatalogValue}
                  selected={selectedSpecialties}
                  title="Especialidades"
                />
                <CatalogPicker
                  items={profile.data.catalogs.services}
                  name="service_ids"
                  onChange={setCatalogValue}
                  selected={selectedServices}
                  title="Serviços"
                />
                <CatalogPicker
                  items={profile.data.catalogs.approaches}
                  name="approach_ids"
                  onChange={setCatalogValue}
                  selected={selectedApproaches}
                  title="Abordagens"
                />
              </div>
            </SectionCard>

            <SectionCard
              title="Publicação"
              description="Publique quando os dados principais estiverem preenchidos."
            >
              <div className="grid gap-4">
                <div className="flex items-center justify-between gap-4 rounded-2xl border border-border bg-surface-muted p-4 text-left">
                  <div>
                    <p className="font-bold text-foreground">Perfil visível para pacientes</p>
                    <p className="mt-1 text-sm leading-5 text-muted">
                      A publicação gratuita não valida CRP por API e não altera documentos
                      profissionais.
                    </p>
                  </div>
                  <input
                    checked={published}
                    className="h-5 w-5 accent-primary"
                    onChange={(event) =>
                      form.hook.setValue("published", event.target.checked, {
                        shouldDirty: true,
                        shouldValidate: true,
                      })
                    }
                    type="checkbox"
                  />
                </div>
                <InlineAlert title="CRP/documentos fora deste recorte" variant="warning">
                  <div className="flex gap-2">
                    <LockKeyhole className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                    <span>
                      CRP, status de documento e validação profissional continuam somente leitura
                      até a TASK-11.
                    </span>
                  </div>
                </InlineAlert>
              </div>
            </SectionCard>

            <div className="sticky bottom-4 z-10 rounded-full bg-surface/90 p-2 shadow-[var(--lectum-shadow-soft)] backdrop-blur">
              <Button
                className="h-14 w-full rounded-full text-base"
                disabled={update.isPending}
                type="submit"
              >
                {update.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <BadgeCheck className="h-4 w-4" aria-hidden="true" />
                )}
                Salvar perfil gratuito
              </Button>
            </div>

            {profile.data.profile.published ? (
              <InlineAlert title="Perfil publicado" variant="success">
                <div className="flex gap-2">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                  <span>Seu perfil está marcado como publicado no plano gratuito.</span>
                </div>
              </InlineAlert>
            ) : null}
          </Form>
        ) : null}
      </section>
    </PrivateTemplate>
  );
};
