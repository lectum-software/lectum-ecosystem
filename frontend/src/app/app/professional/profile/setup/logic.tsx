"use client";

import {
  ArrowLeft,
  Award,
  BadgeCheck,
  BookOpen,
  Camera,
  CheckCircle2,
  ExternalLink,
  FileVideo,
  GraduationCap,
  Loader2,
  type LucideIcon,
  MapPin,
  Sparkles,
  UserRound,
  WalletCards,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { usePsychologistFreeProfile } from "@/api/callers/psychologist-free-profile";
import type { FreeProfileCatalogItem } from "@/api/generator/types/free-profile";
import { components } from "@/components/controllers";
import { InlineAlert } from "@/components/ui/inline-alert";
import { LoadingState } from "@/components/ui/loading-state";
import { cn } from "@/lib/utils";
import { Button } from "@/registry/new-york-v4/ui/button";
import { PrivateTemplate } from "@/templates/private";
import { CITY_OPTIONS_BY_STATE, PUBLIC_TARGET_OPTIONS, WEEKDAY_OPTIONS } from "./options";
import {
  type FreeProfileForm,
  getLanguages,
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

const isHttpsUrl = (value?: string | null) => Boolean(value?.startsWith("https://"));

const SectionCard = ({
  children,
  title,
  description,
  icon: Icon,
}: {
  children: React.ReactNode;
  title: string;
  description?: string;
  icon?: LucideIcon;
}) => (
  <section className="rounded-[var(--lectum-card-radius)] border border-border bg-surface p-5 shadow-[var(--lectum-shadow-soft)]">
    <div className="flex items-center gap-2">
      {Icon ? <Icon className="h-4 w-4 text-primary" aria-hidden="true" /> : null}
      <h2 className="text-base font-bold text-foreground">{title}</h2>
    </div>
    {description ? <p className="mt-2 text-xs leading-5 text-muted">{description}</p> : null}
    <div className="mt-5">{children}</div>
  </section>
);

const CatalogPicker = ({
  description,
  items,
  limit,
  name,
  selected,
  title,
  onChange,
}: {
  description?: string;
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
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-foreground">{title}</h3>
          {description ? <p className="mt-1 text-xs leading-5 text-muted">{description}</p> : null}
        </div>
        {limit ? (
          <span className="rounded-full bg-surface-muted px-2.5 py-1 text-xs font-semibold text-muted">
            {selected.length}/{limit}
          </span>
        ) : null}
      </div>

      {isEmpty ? (
        <InlineAlert title="Catálogo vazio" variant="warning">
          Nenhuma opção ativa foi encontrada no backend para esta seção.
        </InlineAlert>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {items.map((item) => {
          const checked = selected.includes(item.id);
          const disabled = Boolean(limit && !checked && selected.length >= limit);

          return (
            <button
              className={cn(
                "rounded-full border border-border bg-surface-muted px-3 py-2 text-xs font-semibold text-foreground transition",
                checked && "border-primary bg-primary text-white shadow-sm",
                disabled && "cursor-not-allowed opacity-50",
              )}
              disabled={disabled}
              key={item.id}
              onClick={() => onChange(name, toggleValue(selected, item.id))}
              type="button"
            >
              {item.name}
            </button>
          );
        })}
      </div>
    </div>
  );
};

const ChipPicker = ({
  items,
  selected,
  onChange,
}: {
  items: { label: string; value: string }[];
  selected: string[];
  onChange: (value: string[]) => void;
}) => (
  <div className="flex flex-wrap gap-2">
    {items.map((item) => {
      const checked = selected.includes(item.value);
      return (
        <button
          className={cn(
            "rounded-full border border-border bg-surface-muted px-3 py-2 text-xs font-semibold text-foreground transition",
            checked && "border-primary bg-primary text-white shadow-sm",
          )}
          key={item.value}
          onClick={() => onChange(toggleValue(selected, item.value))}
          type="button"
        >
          {item.label}
        </button>
      );
    })}
  </div>
);

const BooleanBenefit = ({
  checked,
  description,
  title,
  onChange,
}: {
  checked: boolean;
  description: string;
  title: string;
  onChange: (checked: boolean) => void;
}) => (
  <label className="flex items-center justify-between gap-4 rounded-2xl bg-primary-soft/50 p-4">
    <span className="flex items-start gap-3">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-surface text-primary shadow-sm">
        <Award className="h-4 w-4" aria-hidden="true" />
      </span>
      <span>
        <span className="block text-sm font-bold text-foreground">{title}</span>
        <span className="mt-1 block text-xs leading-5 text-muted">{description}</span>
      </span>
    </span>
    <input
      checked={checked}
      className="h-5 w-5 shrink-0 accent-primary"
      onChange={(event) => onChange(event.target.checked)}
      type="checkbox"
    />
  </label>
);

export const ProfessionalProfileSetupLogic = () => {
  const [avatarFieldOpen, setAvatarFieldOpen] = useState(false);
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
  const selectedTargets = form.hook.watch("target_audience") || [];
  const selectedDays = form.hook.watch("available_days") || [];
  const published = form.hook.watch("published");
  const whatsappPhone = form.hook.watch("whatsapp");
  const countryCode = form.hook.watch("countryCode");
  const avatarUrl = form.hook.watch("avatar_url");
  const addressState = form.hook.watch("address_state");
  const addressCity = form.hook.watch("address_city");
  const baseCityOptions = CITY_OPTIONS_BY_STATE[addressState] || [];
  const cityOptions =
    addressCity && !baseCityOptions.some((item) => item.value === addressCity)
      ? [{ label: addressCity, value: addressCity }, ...baseCityOptions]
      : baseCityOptions;
  const whatsappUrl = toWhatsappPhoneE164(whatsappPhone, countryCode)?.replace(
    /^\+/,
    "https://wa.me/",
  );

  const setArrayValue = (
    name: keyof Pick<FreeProfileForm, "target_audience" | "available_days">,
    value: string[],
  ) => {
    form.hook.setValue(name, value, { shouldDirty: true, shouldValidate: true });
  };

  const setCatalogValue = (
    name: keyof Pick<FreeProfileForm, "specialty_ids" | "service_ids" | "approach_ids">,
    value: string[],
  ) => {
    form.hook.setValue(name, value, { shouldDirty: true, shouldValidate: true });
  };

  const renderField = (
    name: keyof FreeProfileForm,
    override: Partial<(typeof renderedFields)[number]> = {},
  ) => {
    const field = renderedFields.find((item) => item.name === name);
    if (!field) return null;
    const Component = components[field.field];
    if (!Component) return null;

    return <Component control={form.hook.control} key={String(name)} {...field} {...override} />;
  };

  const renderFields = (names: (keyof FreeProfileForm)[]) => (
    <div className="grid gap-4">{names.map((name) => renderField(name))}</div>
  );

  const submit = form.hook.handleSubmit((values) => {
    update.mutate({
      name: values.name,
      avatar_url: values.avatar_url || null,
      cpf: values.cpf || null,
      gender: values.gender || null,
      race_color: values.race_color || null,
      crp_region: values.crp_region || null,
      crp_number: values.crp_number || null,
      whatsapp: toWhatsappPhoneE164(values.whatsapp, values.countryCode),
      headline: values.headline || null,
      bio: values.bio || null,
      video_url: values.video_url || null,
      modality: values.modality || null,
      languages: getLanguages(values.language),
      target_audience: values.target_audience,
      discount_first_session: values.discount_first_session,
      social_value: values.social_value,
      accepts_insurance: values.accepts_insurance,
      academic: {
        title: values.academic_title || null,
        institution: values.academic_institution || null,
        graduation_year: values.academic_graduation_year || null,
      },
      available_days: values.available_days,
      address: {
        street: values.address_street || null,
        number: values.address_number || null,
        complement: values.address_complement || null,
        district: values.address_district || null,
        zip: values.address_zip || null,
        city: values.address_city || null,
        state: values.address_state || null,
      },
      specialty_ids: values.specialty_ids,
      service_ids: values.service_ids,
      approach_ids: values.approach_ids,
      published: values.published,
    });
  });

  return (
    <PrivateTemplate showHeader={false}>
      <section className="mx-auto grid w-full max-w-[394px] gap-4 md:max-w-3xl">
        <div className="flex items-center justify-between gap-3">
          <Link
            className="inline-flex items-center gap-2 text-sm font-semibold text-muted"
            href="/app/professional/whatsapp/verify"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Editar Perfil
          </Link>
          <button
            className="text-sm font-semibold text-primary"
            form="free-profile-form"
            type="submit"
          >
            Salvar
          </button>
        </div>

        <header className="rounded-[var(--lectum-card-radius)] border border-border bg-surface px-5 py-7 text-center shadow-[var(--lectum-shadow-soft)]">
          <button
            className="relative mx-auto block h-24 w-24 overflow-hidden rounded-full bg-surface-muted ring-4 ring-white"
            onClick={() => setAvatarFieldOpen((current) => !current)}
            type="button"
          >
            {isHttpsUrl(avatarUrl) ? (
              <Image
                alt="Foto profissional"
                className="object-cover"
                fill
                sizes="96px"
                src={avatarUrl}
              />
            ) : (
              <span className="grid h-full w-full place-items-center text-primary">
                <UserRound className="h-10 w-10" aria-hidden="true" />
              </span>
            )}
            <span className="absolute right-0 bottom-0 grid h-8 w-8 place-items-center rounded-full bg-primary text-white shadow-sm">
              <Camera className="h-4 w-4" aria-hidden="true" />
            </span>
          </button>
          <p className="mt-4 text-xs leading-5 text-muted">
            Toque na foto para abrir o campo de alteração da foto profissional
          </p>
        </header>

        {profile.isLoading ? <LoadingState label="Carregando perfil profissional" /> : null}

        {profile.isError ? (
          <InlineAlert title="Não foi possível carregar o perfil" variant="error">
            {resolveApiError(profile.error)}
          </InlineAlert>
        ) : null}

        {profile.data ? (
          <Form
            className="grid gap-4"
            {...form.formProps}
            fields={[]}
            id="free-profile-form"
            onSubmit={submit}
          >
            {avatarFieldOpen ? (
              <SectionCard title="Foto de perfil">{renderField("avatar_url")}</SectionCard>
            ) : null}

            <Link
              className="flex items-center justify-between rounded-2xl border border-primary/20 bg-primary-soft p-4 text-primary"
              href="/app/professional/billing/plans"
            >
              <span>
                <span className="block text-sm font-bold">Upgrade para o Plano Profissional</span>
                <span className="mt-1 block text-xs leading-5">
                  Aumente limites, inclua mais recursos e ganhe visibilidade.
                </span>
              </span>
              <Sparkles className="h-5 w-5 shrink-0" aria-hidden="true" />
            </Link>

            <SectionCard icon={UserRound} title="Informações básicas">
              <div className="grid gap-4">
                {renderFields(["name", "gender", "race_color", "cpf", "crp_region", "crp_number"])}
                <div className="relative">
                  {renderField("whatsapp", { inputClassName: "pr-12" })}
                  <a
                    aria-label="Testar link do WhatsApp"
                    className={cn(
                      "absolute right-2 bottom-4 grid h-9 w-9 place-items-center rounded-full text-primary transition hover:bg-primary-soft",
                      !whatsappUrl && "pointer-events-none opacity-40",
                    )}
                    href={whatsappUrl || "#"}
                    rel="noreferrer"
                    target="_blank"
                  >
                    <ExternalLink className="h-4 w-4" aria-hidden="true" />
                  </a>
                </div>
              </div>
            </SectionCard>

            <SectionCard icon={BookOpen} title="Apresentação">
              <div className="grid gap-4">
                {renderField("headline")}
                {renderField("bio")}
                <div className="rounded-2xl border border-dashed border-border bg-surface-muted p-4 text-center">
                  <FileVideo className="mx-auto h-8 w-8 text-muted" aria-hidden="true" />
                  <p className="mt-2 text-sm font-bold text-foreground">Vídeo de Apresentação</p>
                  <p className="mt-1 text-xs leading-5 text-muted">
                    Cole uma URL pública do vídeo. Upload de arquivo será tratado apenas quando
                    houver storage privado.
                  </p>
                  <div className="mt-4 text-left">{renderField("video_url")}</div>
                </div>
              </div>
            </SectionCard>

            <div className="grid gap-3">
              <BooleanBenefit
                checked={form.hook.watch("discount_first_session")}
                description="Reduza a barreira do primeiro contato."
                onChange={(checked) =>
                  form.hook.setValue("discount_first_session", checked, {
                    shouldDirty: true,
                    shouldValidate: true,
                  })
                }
                title="Desconto na 1ª sessão"
              />
              <BooleanBenefit
                checked={form.hook.watch("social_value")}
                description="Atenda a população de baixa renda."
                onChange={(checked) =>
                  form.hook.setValue("social_value", checked, {
                    shouldDirty: true,
                    shouldValidate: true,
                  })
                }
                title="Valor social"
              />
              <BooleanBenefit
                checked={form.hook.watch("accepts_insurance")}
                description="Atenda pacientes que possuem planos de saúde."
                onChange={(checked) =>
                  form.hook.setValue("accepts_insurance", checked, {
                    shouldDirty: true,
                    shouldValidate: true,
                  })
                }
                title="Aceita Convênios"
              />
            </div>

            <SectionCard icon={Award} title="Especialidades e Filtros">
              <div className="grid gap-6">
                <CatalogPicker
                  description="Selecione até 3 opções. Faça o upgrade para adicionar 10 especialidades."
                  items={profile.data.catalogs.specialties}
                  limit={profile.data.plan.specialty_limit}
                  name="specialty_ids"
                  onChange={setCatalogValue}
                  selected={selectedSpecialties}
                  title="Especialidades"
                />
                <CatalogPicker
                  description="Selecione 1 opção. Faça o upgrade para adicionar todos os serviços."
                  items={profile.data.catalogs.services}
                  limit={profile.data.plan.service_limit}
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
                <div className="grid gap-3">
                  <h3 className="text-sm font-bold text-foreground">Público</h3>
                  <ChipPicker
                    items={PUBLIC_TARGET_OPTIONS}
                    onChange={(value) => setArrayValue("target_audience", value)}
                    selected={selectedTargets}
                  />
                </div>
                {renderField("language")}
              </div>
            </SectionCard>

            <SectionCard icon={GraduationCap} title="Formação Acadêmica">
              {renderFields(["academic_title", "academic_institution", "academic_graduation_year"])}
            </SectionCard>

            <SectionCard icon={MapPin} title="Atendimento">
              <div className="grid gap-5">
                {renderField("modality")}
                <div className="grid gap-3">
                  <h3 className="text-sm font-bold text-foreground">
                    Dias com horários disponíveis
                  </h3>
                  <ChipPicker
                    items={WEEKDAY_OPTIONS}
                    onChange={(value) => setArrayValue("available_days", value)}
                    selected={selectedDays}
                  />
                </div>
              </div>
            </SectionCard>

            <SectionCard icon={MapPin} title="Endereço Profissional">
              <div className="grid gap-4">
                {renderField("address_street")}
                <div className="grid grid-cols-2 gap-3">
                  {renderField("address_number")}
                  {renderField("address_complement")}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {renderField("address_district")}
                  {renderField("address_zip")}
                </div>
                {renderField("address_state")}
                {renderField("address_city", { options: cityOptions })}
                <p className="text-xs leading-5 text-muted">
                  Suas informações de cidade e estado ficarão disponíveis no seu perfil público.
                </p>
              </div>
            </SectionCard>

            <SectionCard icon={WalletCards} title="Publicação">
              <div className="grid gap-4">
                <label className="flex items-center justify-between gap-4 rounded-2xl border border-border bg-surface-muted p-4 text-left">
                  <span>
                    <span className="block font-bold text-foreground">
                      Perfil visível para pacientes
                    </span>
                    <span className="mt-1 block text-sm leading-5 text-muted">
                      A publicação gratuita não valida CRP por API e não altera documentos
                      profissionais.
                    </span>
                  </span>
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
                </label>
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
                Salvar alterações
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
