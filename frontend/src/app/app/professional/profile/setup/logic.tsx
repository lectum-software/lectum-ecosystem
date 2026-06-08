"use client";

import {
  ArrowLeft,
  ArrowRight,
  Award,
  BadgeCheck,
  BookOpen,
  Camera,
  CheckCircle2,
  ChevronDown,
  ExternalLink,
  FileVideo,
  GraduationCap,
  Loader2,
  type LucideIcon,
  MapPin,
  Plus,
  Trash2,
  UploadCloud,
  UserRound,
  X,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { type ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import { Controller, type FieldPath, useFieldArray } from "react-hook-form";
import { toast } from "sonner";
import { usePsychologistFreeProfile } from "@/api/callers/psychologist-free-profile";
import type { FreeProfileCatalogItem } from "@/api/generator/types/free-profile";
import { components } from "@/components/controllers";
import { Container } from "@/components/controllers/container";
import { describedBy, fieldId } from "@/components/controllers/utils";
import { InlineAlert } from "@/components/ui/inline-alert";
import { LoadingState } from "@/components/ui/loading-state";
import { cn } from "@/lib/utils";
import { Button } from "@/registry/new-york-v4/ui/button";
import { PrivateTemplate } from "@/templates/private";
import { isPublicMediaUrl, resolvePublicMediaUrl } from "@/utils/media";
import { CITY_OPTIONS_BY_STATE } from "./brazil-cities";
import { PUBLIC_TARGET_OPTIONS, WEEKDAY_OPTIONS } from "./options";
import {
  type AcademicFormationForm,
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
  required,
  selected,
  title,
  onChange,
}: {
  description?: string;
  items: FreeProfileCatalogItem[];
  limit?: number;
  name: keyof Pick<FreeProfileForm, "specialty_ids" | "service_ids" | "approach_ids">;
  required?: boolean;
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
          <h3 className="flex items-center gap-1 text-sm font-bold text-foreground">
            <span>{title}</span>
            {required ? <span className="text-danger">*</span> : null}
          </h3>
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

const CatalogTagField = ({
  description,
  items,
  limit,
  name,
  placeholder,
  required,
  selected,
  title,
  onChange,
}: {
  description?: string;
  items: FreeProfileCatalogItem[];
  limit?: number;
  name: keyof Pick<FreeProfileForm, "specialty_ids" | "approach_ids">;
  placeholder: string;
  required?: boolean;
  selected: string[];
  title: string;
  onChange: (
    name: keyof Pick<FreeProfileForm, "specialty_ids" | "service_ids" | "approach_ids">,
    value: string[],
  ) => void;
}) => {
  const [open, setOpen] = useState(false);
  const isEmpty = items.length === 0;
  const selectedItems = items.filter((item) => selected.includes(item.id));
  const selectedMap = new Set(selected);
  const limitReached = Boolean(limit && selected.length >= limit);

  const removeItem = (id: string) => {
    onChange(
      name,
      selected.filter((item) => item !== id),
    );
  };

  const toggleItem = (id: string) => {
    if (selectedMap.has(id)) {
      removeItem(id);
      return;
    }

    if (limitReached) return;
    onChange(name, [...selected, id]);

    if (limit === 1) {
      setOpen(false);
    }
  };

  return (
    <div className="grid gap-3">
      <div>
        <h3 className="flex items-center gap-1 text-sm font-bold text-foreground">
          <span>{title}</span>
          {required ? <span className="text-danger">*</span> : null}
        </h3>
        {description ? <p className="mt-1 text-xs leading-5 text-muted">{description}</p> : null}
      </div>

      {isEmpty ? (
        <InlineAlert title="Catálogo vazio" variant="warning">
          Nenhuma opção ativa foi encontrada no backend para esta seção.
        </InlineAlert>
      ) : null}

      <div className="relative">
        <div
          className={cn(
            "flex min-h-12 items-center gap-2 rounded-[var(--lectum-control-radius)] border border-border bg-surface px-3 py-2 shadow-sm transition focus-within:border-primary focus-within:ring-4 focus-within:ring-primary/10",
            open && "border-primary ring-4 ring-primary/10",
          )}
        >
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
            {selectedItems.map((item) => (
              <span
                className="inline-flex max-w-full items-center gap-1 rounded-md bg-primary-soft px-2 py-1 text-[0.68rem] font-bold text-primary"
                key={item.id}
              >
                <span className="max-w-[11rem] truncate">{item.name}</span>
                <button
                  aria-label={`Remover ${item.name}`}
                  className="grid h-3.5 w-3.5 place-items-center rounded-full text-primary transition hover:bg-primary/10"
                  onClick={() => removeItem(item.id)}
                  type="button"
                >
                  <X className="h-3 w-3" aria-hidden="true" />
                </button>
              </span>
            ))}
            <button
              aria-expanded={open}
              className={cn(
                "min-w-[9rem] flex-1 py-1 text-left text-xs text-subtle outline-none",
                limitReached && "text-muted",
              )}
              onClick={() => setOpen((current) => !current)}
              type="button"
            >
              {placeholder}
            </button>
          </div>
          <button
            aria-label={`Abrir opções de ${title}`}
            className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-muted transition hover:bg-primary-soft hover:text-primary"
            onClick={() => setOpen((current) => !current)}
            type="button"
          >
            <ChevronDown
              className={cn("h-4 w-4 transition", open && "rotate-180")}
              aria-hidden="true"
            />
          </button>
        </div>

        {open ? (
          <div className="absolute z-20 mt-2 max-h-56 w-full overflow-y-auto rounded-2xl border border-border bg-surface p-2 shadow-[var(--lectum-shadow-soft)]">
            {items.length > 0 ? (
              <div className="grid gap-1">
                {items.map((item) => {
                  const checked = selectedMap.has(item.id);
                  const disabled = Boolean(limitReached && !checked);

                  return (
                    <button
                      className={cn(
                        "flex items-center justify-between gap-3 rounded-xl px-3 py-2 text-left text-sm font-semibold text-foreground transition hover:bg-primary-soft hover:text-primary",
                        checked && "bg-primary-soft text-primary",
                        disabled &&
                          "cursor-not-allowed opacity-45 hover:bg-transparent hover:text-foreground",
                      )}
                      disabled={disabled}
                      key={item.id}
                      onClick={() => toggleItem(item.id)}
                      type="button"
                    >
                      <span>{item.name}</span>
                      {checked ? <span className="text-xs font-bold">Selecionado</span> : null}
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="px-3 py-2 text-sm text-muted">Nenhuma opção ativa encontrada.</p>
            )}
          </div>
        ) : null}
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

const normalizeCitySearch = (value: string) =>
  value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .trim();

const CityField = ({
  control,
  options,
  selectedValue,
  stateSelected,
}: {
  control: ReturnType<typeof useFreeProfileForm>["hook"]["control"];
  options: { label: string; value: string | number | boolean; disabled?: boolean }[];
  selectedValue?: string;
  stateSelected: boolean;
}) => {
  const selectedLabel = options.find((option) => option.value === selectedValue)?.label;
  const [search, setSearch] = useState(selectedLabel ? String(selectedLabel) : "");
  const inputId = fieldId<FreeProfileForm>("address_city");
  const normalizedSearch = normalizeCitySearch(search);
  const filteredOptions = normalizedSearch
    ? options.filter((option) =>
        normalizeCitySearch(String(option.label)).includes(normalizedSearch),
      )
    : options;
  const shouldShowOptions = stateSelected && (!selectedLabel || search !== String(selectedLabel));

  return (
    <Controller
      control={control}
      name="address_city"
      render={({ field, fieldState }) => {
        const error = fieldState.error?.message;

        return (
          <Container
            error={error}
            htmlFor={inputId}
            label="Cidade"
            name="address_city"
            required
            skipHtmlFor
          >
            <input
              aria-label="Filtrar cidades"
              aria-describedby={describedBy({
                id: inputId,
                error,
              })}
              aria-invalid={Boolean(error)}
              className={cn(
                "h-12 rounded-[var(--lectum-control-radius)] border border-border bg-surface px-4 text-sm text-foreground shadow-sm outline-none transition placeholder:text-subtle focus:border-primary focus:ring-4 focus:ring-primary/10 disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-muted",
                error && "border-danger focus:border-danger focus:ring-danger/10",
              )}
              disabled={!stateSelected}
              id={inputId}
              onBlur={field.onBlur}
              onChange={(event) => {
                const nextSearch = event.target.value;
                setSearch(nextSearch);

                if (selectedLabel && nextSearch !== String(selectedLabel)) {
                  field.onChange("");
                }
              }}
              placeholder={stateSelected ? "Buscar cidade" : "Selecione o estado"}
              ref={field.ref}
              type="search"
              value={search}
            />

            {shouldShowOptions ? (
              <div className="max-h-56 overflow-y-auto rounded-2xl border border-border bg-surface p-2">
                {filteredOptions.length > 0 ? (
                  <div className="grid gap-1">
                    {filteredOptions.map((option) => {
                      const checked = option.value === field.value;

                      return (
                        <button
                          className={cn(
                            "rounded-xl px-3 py-2 text-left text-sm font-semibold text-foreground transition hover:bg-primary-soft hover:text-primary",
                            checked && "bg-primary-soft text-primary",
                          )}
                          key={String(option.value)}
                          onClick={() => {
                            field.onChange(option.value);
                            setSearch(String(option.label));
                          }}
                          type="button"
                        >
                          {option.label}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <p className="px-3 py-2 text-sm text-muted">
                    Nenhuma cidade encontrada para este filtro.
                  </p>
                )}
              </div>
            ) : null}
          </Container>
        );
      }}
    />
  );
};

export const ProfessionalProfileSetupLogic = () => {
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const [avatarActionsOpen, setAvatarActionsOpen] = useState(false);
  const { deleteAvatar, deleteVideo, profile, update, uploadAvatar, uploadVideo } =
    usePsychologistFreeProfile({
      callbacks: {
        update: {
          onSuccess: () => toast.success("Perfil profissional atualizado"),
          onError: (error) => toast.error(resolveApiError(error)),
        },
        avatar: {
          onSuccess: () => toast.success("Foto de perfil atualizada"),
          onError: (error) => toast.error(resolveApiError(error)),
        },
        deleteAvatar: {
          onSuccess: () => toast.success("Foto de perfil removida"),
          onError: (error) => toast.error(resolveApiError(error)),
        },
        video: {
          onSuccess: () => toast.success("Vídeo de apresentação atualizado"),
          onError: (error) => toast.error(resolveApiError(error)),
        },
        deleteVideo: {
          onSuccess: () => toast.success("Vídeo de apresentação removido"),
          onError: (error) => toast.error(resolveApiError(error)),
        },
      },
    });
  const form = useFreeProfileForm(profile.data);
  const academicFormations = useFieldArray({
    control: form.hook.control,
    name: "academic_formations",
  });
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
  const avatarSrc = resolvePublicMediaUrl(profile.data?.user.avatar);
  const isPublicAvatar = isPublicMediaUrl(profile.data?.user.avatar);
  const videoSrc = resolvePublicMediaUrl(profile.data?.profile.video_url);
  const canUploadVideo = Boolean(profile.data?.plan.can_upload_video);
  const isSavingMedia =
    uploadAvatar.isPending ||
    deleteAvatar.isPending ||
    uploadVideo.isPending ||
    deleteVideo.isPending;
  const isSubmitting = update.isPending || isSavingMedia;
  const addressState = form.hook.watch("address_state");
  const addressCity = form.hook.watch("address_city");
  const baseCityOptions = useMemo(() => CITY_OPTIONS_BY_STATE[addressState] || [], [addressState]);
  const cityOptions =
    addressCity && !baseCityOptions.some((item) => item.value === addressCity)
      ? [{ label: addressCity, value: addressCity }, ...baseCityOptions]
      : baseCityOptions;
  const whatsappUrl = toWhatsappPhoneE164(whatsappPhone, countryCode)?.replace(
    /^\+/,
    "https://wa.me/",
  );

  useEffect(() => {
    if (!addressState || !addressCity) return;

    if (!baseCityOptions.some((item) => item.value === addressCity)) {
      form.hook.setValue("address_city", "", { shouldDirty: true, shouldValidate: true });
    }
  }, [addressCity, addressState, baseCityOptions, form.hook]);

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

  const renderAcademicField = (
    index: number,
    name: keyof AcademicFormationForm,
    label: string,
    placeholder: string,
  ) => {
    const Component = components.input;

    return (
      <Component
        control={form.hook.control}
        field="input"
        label={label}
        name={`academic_formations.${index}.${name}` as FieldPath<FreeProfileForm>}
        placeholder={placeholder}
      />
    );
  };

  const handleAvatarChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;
    setAvatarActionsOpen(false);
    uploadAvatar.mutate(file);
  };

  const openAvatarFilePicker = () => {
    setAvatarActionsOpen(false);
    avatarInputRef.current?.click();
  };

  const handleAvatarRemoval = () => {
    if (!profile.data?.user.avatar) return;
    setAvatarActionsOpen(false);
    deleteAvatar.mutate();
  };

  const handleVideoChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;
    uploadVideo.mutate(file);
  };

  const handleVideoRemoval = () => {
    if (!profile.data?.profile.video_url) return;
    deleteVideo.mutate();
  };

  const submit = form.hook.handleSubmit((values) => {
    update.mutate({
      name: values.name,
      cpf: values.cpf || null,
      gender: values.gender || null,
      race_color: values.race_color || null,
      religion: values.religion || null,
      crp_region: values.crp_region || null,
      crp_number: values.crp_number || null,
      whatsapp: toWhatsappPhoneE164(values.whatsapp, values.countryCode),
      headline: values.headline || null,
      bio: values.bio || null,
      modality: values.modality || null,
      languages: getLanguages(values.language),
      target_audience: values.target_audience,
      discount_first_session: values.discount_first_session,
      social_value: values.social_value,
      accepts_insurance: values.accepts_insurance,
      academic: values.academic_formations[0]
        ? {
            title: values.academic_formations[0].title || null,
            institution: values.academic_formations[0].institution || null,
            graduation_year: values.academic_formations[0].graduation_year || null,
          }
        : { title: null, institution: null, graduation_year: null },
      academic_formations: values.academic_formations.map((item) => ({
        title: item.title || null,
        institution: item.institution || null,
        graduation_year: item.graduation_year || null,
      })),
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
            href="/app/profile"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Voltar ao perfil
          </Link>
          <button
            className="text-sm font-semibold text-primary"
            disabled={isSubmitting}
            form="free-profile-form"
            type="submit"
          >
            Salvar
          </button>
        </div>

        <header className="rounded-[var(--lectum-card-radius)] border border-border bg-surface px-5 py-7 text-center shadow-[var(--lectum-shadow-soft)]">
          <div className="relative mx-auto h-28 w-28">
            <div className="relative mx-auto grid h-28 w-28 place-items-center overflow-hidden rounded-full border-4 border-white bg-primary text-3xl font-bold text-white shadow-[var(--lectum-shadow-soft)]">
              {avatarSrc ? (
                <Image
                  alt="Foto profissional"
                  className="h-full w-full object-cover"
                  height={112}
                  src={avatarSrc}
                  unoptimized={isPublicAvatar}
                  width={112}
                />
              ) : (
                <span className="grid h-full w-full place-items-center text-white">
                  <UserRound className="h-10 w-10" aria-hidden="true" />
                </span>
              )}
            </div>
            <div className="absolute right-0 bottom-0">
              <button
                aria-expanded={avatarActionsOpen}
                aria-haspopup="menu"
                aria-label="Opções da foto profissional"
                className="grid h-9 w-9 place-items-center rounded-full border-2 border-surface bg-primary text-white shadow-sm transition hover:bg-primary/90 disabled:opacity-60"
                disabled={isSavingMedia}
                onClick={() => setAvatarActionsOpen((current) => !current)}
                type="button"
              >
                {isSavingMedia ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Camera className="h-4 w-4" aria-hidden="true" />
                )}
              </button>

              {avatarActionsOpen ? (
                <div
                  className="absolute right-0 top-10 z-20 w-44 overflow-hidden rounded-2xl border border-border bg-surface text-left shadow-[var(--lectum-shadow-soft)]"
                  role="menu"
                >
                  <button
                    className="flex w-full items-center gap-2 px-4 py-3 text-sm font-semibold text-foreground transition hover:bg-primary-soft hover:text-primary"
                    onClick={openAvatarFilePicker}
                    role="menuitem"
                    type="button"
                  >
                    <UploadCloud className="h-4 w-4" aria-hidden="true" />
                    Alterar imagem
                  </button>
                  <button
                    className="flex w-full items-center gap-2 px-4 py-3 text-sm font-semibold text-danger transition hover:bg-danger/10 disabled:cursor-not-allowed disabled:opacity-45"
                    disabled={!profile.data?.user.avatar}
                    onClick={handleAvatarRemoval}
                    role="menuitem"
                    type="button"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                    Excluir imagem
                  </button>
                </div>
              ) : null}
            </div>
          </div>
          <input
            accept="image/png,image/jpeg,image/webp"
            className="sr-only"
            onChange={handleAvatarChange}
            ref={avatarInputRef}
            type="file"
          />
          <p className="mt-4 text-xs leading-5 text-muted">
            Use o botão junto à foto para alterar ou excluir uma imagem PNG, JPG ou WebP de até 5MB.
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
            {profile.data.plan.is_free ? (
              <Link
                className="flex items-center gap-3 rounded-2xl border border-primary/20 bg-primary-soft p-4 text-primary"
                href="/app/professional/billing/plans"
              >
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-surface text-primary shadow-sm">
                  <BadgeCheck className="h-5 w-5" aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-bold">Upgrade para o Plano Profissional</span>
                  <span className="mt-1 block text-xs leading-5">
                    Aumente limites, inclua mais recursos e ganhe visibilidade.
                  </span>
                </span>
                <ArrowRight className="h-5 w-5 shrink-0" aria-hidden="true" />
              </Link>
            ) : null}

            <SectionCard icon={UserRound} title="Informações básicas">
              <div className="grid gap-4">
                {renderFields([
                  "name",
                  "cpf",
                  "gender",
                  "race_color",
                  "religion",
                  "crp_region",
                  "crp_number",
                ])}
                <div className="flex items-start gap-2">
                  <div className="min-w-0 flex-1">{renderField("whatsapp")}</div>
                  <a
                    aria-label="Testar link do WhatsApp"
                    className={cn(
                      "mt-7 grid h-12 w-12 shrink-0 place-items-center rounded-full border border-border text-primary transition hover:bg-primary-soft",
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
                {canUploadVideo ? (
                  <div className="rounded-2xl border border-border bg-surface-muted p-4">
                    <div className="flex items-start gap-3">
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-surface text-primary shadow-sm">
                        <FileVideo className="h-5 w-5" aria-hidden="true" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-foreground">Vídeo de Apresentação</p>
                        <p className="mt-1 text-xs leading-5 text-muted">
                          Envie um vídeo MP4, MOV ou WebM de até 50MB para destacar seu perfil.
                        </p>
                      </div>
                    </div>

                    {videoSrc ? (
                      // biome-ignore lint/a11y/useMediaCaption: vídeos enviados pelo usuário ainda não têm faixa de legenda no recorte atual.
                      <video
                        className="mt-4 aspect-video w-full rounded-2xl border border-border bg-black object-cover"
                        controls
                        preload="metadata"
                        src={videoSrc}
                      >
                        Seu navegador não suporta a pré-visualização de vídeo.
                      </video>
                    ) : (
                      <button
                        className="mt-4 grid min-h-32 w-full place-items-center rounded-2xl border border-dashed border-border bg-surface px-4 py-6 text-center transition hover:border-primary hover:bg-primary-soft/40 disabled:cursor-not-allowed disabled:opacity-60"
                        disabled={uploadVideo.isPending}
                        onClick={() => videoInputRef.current?.click()}
                        type="button"
                      >
                        <span>
                          {uploadVideo.isPending ? (
                            <Loader2
                              className="mx-auto h-8 w-8 animate-spin text-primary"
                              aria-hidden="true"
                            />
                          ) : (
                            <UploadCloud
                              className="mx-auto h-8 w-8 text-primary"
                              aria-hidden="true"
                            />
                          )}
                          <span className="mt-3 block text-sm font-bold text-foreground">
                            Toque para enviar seu vídeo
                          </span>
                          <span className="mt-1 block text-xs text-muted">MP4, MOV ou WebM.</span>
                        </span>
                      </button>
                    )}

                    <input
                      accept="video/mp4,video/webm,video/quicktime"
                      className="sr-only"
                      onChange={handleVideoChange}
                      ref={videoInputRef}
                      type="file"
                    />

                    <div className="mt-4 grid gap-2 sm:grid-cols-2">
                      <Button
                        disabled={uploadVideo.isPending || deleteVideo.isPending}
                        onClick={() => videoInputRef.current?.click()}
                        type="button"
                        variant="outline"
                      >
                        {uploadVideo.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                        ) : (
                          <UploadCloud className="h-4 w-4" aria-hidden="true" />
                        )}
                        {videoSrc ? "Trocar vídeo" : "Enviar vídeo"}
                      </Button>
                      <Button
                        disabled={!videoSrc || uploadVideo.isPending || deleteVideo.isPending}
                        onClick={handleVideoRemoval}
                        type="button"
                        variant="outline"
                      >
                        {deleteVideo.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                        ) : (
                          <Trash2 className="h-4 w-4" aria-hidden="true" />
                        )}
                        Remover vídeo
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-border bg-surface-muted p-4 text-center opacity-80">
                    <FileVideo className="mx-auto h-8 w-8 text-muted" aria-hidden="true" />
                    <p className="mt-2 text-sm font-bold text-foreground">Vídeo de Apresentação</p>
                    <p className="mt-1 text-xs leading-5 text-muted">
                      Upload de vídeo está disponível no Plano Profissional. Faça upgrade para
                      enviar um vídeo de apresentação.
                    </p>
                    <Link
                      className="mt-4 inline-flex items-center justify-center gap-2 rounded-full bg-primary-soft px-4 py-2 text-xs font-bold text-primary"
                      href="/app/professional/billing/plans"
                    >
                      <UploadCloud className="h-4 w-4" aria-hidden="true" />
                      Upgrade para enviar vídeo
                    </Link>
                  </div>
                )}
              </div>
            </SectionCard>

            <SectionCard icon={Award} title="Especialidades e Filtros">
              <div className="grid gap-6">
                <CatalogTagField
                  description={
                    profile.data.plan.is_free
                      ? "Selecione até 3 opções. Faça o upgrade para adicionar 10 especialidades."
                      : "Selecione até 10 especialidades."
                  }
                  items={profile.data.catalogs.specialties}
                  limit={profile.data.plan.specialty_limit}
                  name="specialty_ids"
                  onChange={setCatalogValue}
                  placeholder="Adicione uma especialidade..."
                  required
                  selected={selectedSpecialties}
                  title={`Especialidades (Até ${profile.data.plan.specialty_limit} tags)`}
                />
                <CatalogPicker
                  description={
                    profile.data.plan.is_free
                      ? "Selecione 1 opção. Faça o upgrade para adicionar todos os serviços."
                      : "Selecione todos os serviços que você oferece."
                  }
                  items={profile.data.catalogs.services}
                  limit={profile.data.plan.service_limit}
                  name="service_ids"
                  onChange={setCatalogValue}
                  required
                  selected={selectedServices}
                  title="Serviços"
                />
                <CatalogTagField
                  description={
                    profile.data.plan.is_free
                      ? "Selecione 1 opção. Faça o upgrade para adicionar várias abordagens."
                      : "Selecione todas as abordagens que fazem parte da sua prática."
                  }
                  items={profile.data.catalogs.approaches}
                  limit={profile.data.plan.approach_limit}
                  name="approach_ids"
                  onChange={setCatalogValue}
                  placeholder="Adicione uma abordagem..."
                  required
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
                <div className="grid gap-3">
                  <h3 className="text-sm font-bold text-foreground">Selos e condições</h3>
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
              </div>
            </SectionCard>

            <SectionCard icon={GraduationCap} title="Formação Acadêmica">
              <div className="grid gap-4">
                {academicFormations.fields.map((field, index) => (
                  <div className="grid gap-4 rounded-2xl border border-border p-4" key={field.id}>
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="text-sm font-bold text-foreground">Formação {index + 1}</h3>
                      {academicFormations.fields.length > 1 ? (
                        <button
                          className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-bold text-danger transition hover:bg-danger/10"
                          onClick={() => academicFormations.remove(index)}
                          type="button"
                        >
                          <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                          Remover
                        </button>
                      ) : null}
                    </div>
                    {renderAcademicField(
                      index,
                      "title",
                      "Título e especialidade",
                      "Ex.: Doutor em Neuropsicologia",
                    )}
                    {renderAcademicField(
                      index,
                      "institution",
                      "Instituição",
                      "Ex.: Universidade de São Paulo",
                    )}
                    {renderAcademicField(index, "graduation_year", "Ano de formação", "Ex.: 2012")}
                  </div>
                ))}
                <button
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-primary/30 px-4 py-3 text-sm font-bold text-primary transition hover:bg-primary-soft disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={academicFormations.fields.length >= 5}
                  onClick={() =>
                    academicFormations.append({
                      title: "",
                      institution: "",
                      graduation_year: "",
                    })
                  }
                  type="button"
                >
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  Adicionar nova formação
                </button>
              </div>
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
                <CityField
                  control={form.hook.control}
                  key={addressState || "sem-estado"}
                  options={cityOptions}
                  selectedValue={addressCity}
                  stateSelected={Boolean(addressState)}
                />
                <p className="text-xs leading-5 text-muted">
                  Suas informações de cidade e estado ficarão disponíveis no seu perfil público.
                </p>
              </div>
            </SectionCard>

            <section className="rounded-[var(--lectum-card-radius)] border border-border bg-surface p-5 shadow-[var(--lectum-shadow-soft)]">
              <label className="flex items-center justify-between gap-4 rounded-2xl border border-border bg-surface-muted p-4 text-left">
                <span className="block font-bold text-foreground">
                  Perfil visível para pacientes
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
            </section>

            <div className="sticky bottom-4 z-10 rounded-full bg-surface/90 p-2 shadow-[var(--lectum-shadow-soft)] backdrop-blur">
              <Button
                className="h-14 w-full rounded-full text-base"
                disabled={isSubmitting}
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
                  <span>Seu perfil está marcado como publicado para pacientes.</span>
                </div>
              </InlineAlert>
            ) : null}
          </Form>
        ) : null}
      </section>
    </PrivateTemplate>
  );
};
