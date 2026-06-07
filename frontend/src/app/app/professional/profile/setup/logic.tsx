"use client";

import {
  ArrowLeft,
  BadgeCheck,
  CheckCircle2,
  ClipboardCheck,
  ExternalLink,
  Loader2,
  Sparkles,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { toast } from "sonner";
import { usePsychologistFreeProfile } from "@/api/callers/psychologist-free-profile";
import type { FreeProfileCatalogItem } from "@/api/generator/types/free-profile";
import { components } from "@/components/controllers";
import { InlineAlert } from "@/components/ui/inline-alert";
import { LoadingState } from "@/components/ui/loading-state";
import { cn } from "@/lib/utils";
import { Button } from "@/registry/new-york-v4/ui/button";
import { PrivateTemplate } from "@/templates/private";
import {
  type FreeProfileForm,
  parseLanguages,
  toWhatsappPhoneE164,
  useFreeProfileForm,
} from "./use-form";

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
  const renderedFields = form.formProps.fields;
  const selectedSpecialties = form.hook.watch("specialty_ids") || [];
  const selectedServices = form.hook.watch("service_ids") || [];
  const selectedApproaches = form.hook.watch("approach_ids") || [];
  const published = form.hook.watch("published");
  const whatsappPhone = form.hook.watch("whatsapp");
  const countryCode = form.hook.watch("countryCode");
  const whatsappUrl = toWhatsappPhoneE164(whatsappPhone, countryCode)?.replace(
    /^\+/,
    "https://wa.me/",
  );

  const setCatalogValue = (
    name: keyof Pick<FreeProfileForm, "specialty_ids" | "service_ids" | "approach_ids">,
    value: string[],
  ) => {
    form.hook.setValue(name, value, { shouldDirty: true, shouldValidate: true });
  };

  const renderFields = (names: (keyof FreeProfileForm)[]) => (
    <div className="grid gap-4">
      {names.map((name) => {
        const field = renderedFields.find((item) => item.name === name);
        if (!field) return null;
        const Component = components[field.field];
        if (!Component) return null;

        return <Component control={form.hook.control} key={String(name)} {...field} />;
      })}
    </div>
  );

  const submit = form.hook.handleSubmit((values) => {
    update.mutate({
      name: values.name,
      cpf: values.cpf || null,
      crp_region: values.crp_region || null,
      crp_number: values.crp_number || null,
      whatsapp: toWhatsappPhoneE164(values.whatsapp, values.countryCode),
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
      <section className="mx-auto grid w-full max-w-[394px] gap-5 md:max-w-3xl">
        <Link
          className="inline-flex items-center gap-2 text-sm font-semibold text-muted"
          href="/app/professional/whatsapp/verify"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Voltar para WhatsApp
        </Link>

        <header className="rounded-[var(--lectum-card-radius)] border border-border bg-surface px-5 py-7 text-center shadow-[var(--lectum-shadow-soft)]">
          <span className="relative mx-auto block h-24 w-24 overflow-hidden rounded-full bg-surface-muted ring-4 ring-white">
            {profile.data?.user.avatar ? (
              <Image
                alt="Foto profissional"
                className="object-cover"
                fill
                sizes="96px"
                src={profile.data.user.avatar}
              />
            ) : (
              <span className="grid h-full w-full place-items-center text-primary">
                <ClipboardCheck className="h-10 w-10" aria-hidden="true" />
              </span>
            )}
          </span>
          <p className="mt-4 text-xs leading-5 text-muted">
            Toque na foto para alterar sua foto profissional
          </p>
        </header>

        {profile.isLoading ? <LoadingState label="Carregando perfil profissional" /> : null}

        {profile.isError ? (
          <InlineAlert title="Não foi possível carregar o perfil" variant="error">
            {resolveApiError(profile.error)}
          </InlineAlert>
        ) : null}

        {profile.data ? (
          <Form className="grid gap-5" {...form.formProps} fields={[]} onSubmit={submit}>
            <InlineAlert title="Seja verificado e aumente sua visibilidade" variant="info">
              No plano gratuito, CPF e dados de registro ficam editáveis sem consulta CFP/CRP por
              API.
            </InlineAlert>

            <SectionCard title="Informações básicas">
              <div className="grid gap-4">
                {renderFields(["name", "cpf", "crp_region", "crp_number", "whatsapp"])}
                <div className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-surface-muted p-4">
                  <div>
                    <p className="text-sm font-bold text-foreground">Testar link do WhatsApp</p>
                    <p className="mt-1 text-xs leading-5 text-muted">
                      Abre o contato com o número informado no formulário.
                    </p>
                  </div>
                  <Button
                    asChild
                    className="h-10 w-10 rounded-full"
                    disabled={!whatsappUrl}
                    type="button"
                    variant="outline"
                  >
                    <a
                      aria-label="Abrir link do WhatsApp"
                      href={whatsappUrl || "#"}
                      rel="noreferrer"
                      target="_blank"
                    >
                      <ExternalLink className="h-4 w-4" aria-hidden="true" />
                    </a>
                  </Button>
                </div>
              </div>
            </SectionCard>

            <SectionCard title="Bio">{renderFields(["headline", "bio"])}</SectionCard>

            <SectionCard
              title="Filtros"
              description="No plano gratuito, selecione até 3 especialidades."
            >
              <div className="grid gap-6">
                {renderFields(["modality", "languagesText"])}
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
              title="Benefícios e publicação"
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
                <InlineAlert title="Documentos fora deste recorte" variant="warning">
                  <div className="flex gap-2">
                    <Sparkles className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                    <span>
                      CPF, regional, registro e WhatsApp podem ser editados aqui. Upload de
                      documento e validação profissional continuam fora do plano gratuito.
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
