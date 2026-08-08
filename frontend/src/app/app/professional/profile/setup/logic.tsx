"use client";

import {
  Award,
  BadgeCheck,
  BookOpen,
  Camera,
  ChevronDown,
  ExternalLink,
  Eye,
  FileVideo,
  Filter,
  GraduationCap,
  Loader2,
  type LucideIcon,
  MapPin,
  PencilLine,
  Plus,
  Trash2,
  TriangleAlert,
  UploadCloud,
  UserRound,
  X,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  type ChangeEvent,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Controller, type FieldPath, useFieldArray } from "react-hook-form";
import { toast } from "sonner";
import { useAccount } from "@/api/callers/account";
import { usePsychologistFreeProfile } from "@/api/callers/psychologist-free-profile";
import { getSafeApiErrorMessage } from "@/api/errors";
import type {
  FreeProfileCatalogCategory,
  FreeProfileCatalogItem,
} from "@/api/generator/types/free-profile";
import { AccountDeleteSection } from "@/components/account/account-delete-section";
import { components } from "@/components/controllers";
import { Container } from "@/components/controllers/container";
import { describedBy, fieldId } from "@/components/controllers/utils";
import { ActionableCoachMark } from "@/components/onboarding/actionable-coach-mark";
import { AppPageHeader } from "@/components/ui/app-page-header";
import { InlineAlert } from "@/components/ui/inline-alert";
import { LoadingState } from "@/components/ui/loading-state";
import { VerticalVideoPlayer } from "@/components/ui/vertical-video-player";
import { useAppSelector } from "@/hooks/redux";
import { cn } from "@/lib/utils";
import { Button } from "@/registry/new-york-v4/ui/button";
import { PrivateTemplate } from "@/templates/private";
import { isPublicMediaUrl, resolvePublicMediaUrl } from "@/utils/media";
import { CITY_OPTIONS_BY_STATE } from "./brazil-cities";
import { WEEKDAY_OPTIONS } from "./options";
import {
  type AcademicFormationForm,
  type FreeProfileForm,
  getLanguages,
  toWhatsappPhoneE164,
  useFreeProfileForm,
} from "./use-form";

const PROFESSIONAL_PROFILE_MENU_HREF = "/app/perfil";
const PSYCHOLOGIST_PROFILE_VIDEO_TIP_SELECTOR = '[data-psychologist-tip-target="profile-video"]';

const resolveApiError = (error: unknown) =>
  getSafeApiErrorMessage(error, "Não foi possível salvar o perfil agora.");

type CatalogTagGroup = {
  title: string;
  items: FreeProfileCatalogItem[];
};

const catalogCollator = new Intl.Collator("pt-BR", { sensitivity: "base" });

const compareCatalogItems = (left: FreeProfileCatalogItem, right: FreeProfileCatalogItem) => {
  const leftPosition = left.position ?? Number.POSITIVE_INFINITY;
  const rightPosition = right.position ?? Number.POSITIVE_INFINITY;

  if (leftPosition !== rightPosition) return leftPosition - rightPosition;

  return catalogCollator.compare(left.name, right.name);
};

const compareCatalogCategories = (
  left: FreeProfileCatalogCategory,
  right: FreeProfileCatalogCategory,
) => {
  const leftPosition = left.position ?? Number.POSITIVE_INFINITY;
  const rightPosition = right.position ?? Number.POSITIVE_INFINITY;

  if (leftPosition !== rightPosition) return leftPosition - rightPosition;

  return catalogCollator.compare(left.name, right.name);
};
const toggleValue = (values: string[], id: string) => {
  return values.includes(id) ? values.filter((item) => item !== id) : [...values, id];
};

const profileSetupSelectableChip =
  "inline-flex h-auto min-h-9 items-center justify-center rounded-[14px] border border-border/90 bg-white px-3.5 py-2 text-xs font-semibold leading-4 text-foreground shadow-[0_1px_2px_rgb(15_23_42_/_4%)] transition hover:border-primary/45 hover:bg-primary-soft/70 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 dark:border-border dark:bg-surface";

const profileSetupSelectableChipStyle: CSSProperties = {
  fontSize: "12px",
  lineHeight: "16px",
  fontWeight: 600,
  padding: "8px 14px",
  minHeight: "36px",
  height: "auto",
  borderRadius: "14px",
  borderWidth: "1.25px",
};

const profileSetupButtonGroup =
  "m-0 flex w-full min-w-0 flex-wrap items-center gap-2 border-0 bg-transparent p-0";

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

const ProfileInactiveBanner = () => (
  <div className="rounded-[var(--lectum-card-radius)] border border-danger/25 bg-danger/10 px-4 py-4 shadow-[0_14px_34px_rgb(239_68_68_/_8%)]">
    <div className="flex items-start gap-3">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/80 text-danger shadow-sm">
        <TriangleAlert className="h-5 w-5" aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <p className="text-sm font-extrabold tracking-[-0.01em] text-danger">Perfil não ativo</p>
        <p className="mt-1 text-sm leading-6 text-foreground/80">
          Seu perfil ainda não está sendo exibido publicamente porque existem informações
          obrigatórias pendentes.
        </p>
      </div>
    </div>
  </div>
);

const VideoRemovalConfirmationModal = ({
  disabled = false,
  onClose,
  onConfirm,
  open,
}: {
  disabled?: boolean;
  onClose: () => void;
  onConfirm: () => void;
  open: boolean;
}) => {
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !disabled) {
        onClose();
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [disabled, onClose, open]);

  if (!open) return null;

  return (
    <div
      aria-labelledby="video-removal-confirmation-title"
      aria-modal="true"
      className="fixed inset-0 z-[150] grid place-items-center bg-foreground/55 px-4 py-6 text-foreground backdrop-blur-md dark:bg-background/75"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !disabled) {
          onClose();
        }
      }}
      role="dialog"
    >
      <section className="w-full max-w-[430px] rounded-[28px] border border-danger/20 bg-surface p-5 shadow-[var(--lectum-shadow)]">
        <div className="flex items-start gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-danger/10 text-danger">
            <TriangleAlert className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h2
              className="text-lg font-extrabold tracking-[-0.02em] text-foreground"
              id="video-removal-confirmation-title"
            >
              Excluir vídeo de apresentação?
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted">
              Se você excluir o vídeo, seu perfil será removido da página de psicólogos até que um
              novo vídeo de apresentação seja enviado.
            </p>
            <p className="mt-2 text-sm font-semibold leading-6 text-foreground">
              Tem certeza que deseja excluir?
            </p>
          </div>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-[1fr_auto]">
          <Button disabled={disabled} onClick={onClose} type="button" variant="outline">
            Manter vídeo
          </Button>
          <Button
            className="min-w-36"
            disabled={disabled}
            onClick={onConfirm}
            type="button"
            variant="destructive"
          >
            {disabled ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
            Excluir vídeo
          </Button>
        </div>
      </section>
    </div>
  );
};

const CatalogPicker = ({
  description,
  error,
  items,
  limit,
  name,
  required,
  selected,
  showLimitCounter = true,
  title,
  onChange,
}: {
  description?: string;
  error?: string;
  items: FreeProfileCatalogItem[];
  limit?: number;
  name: keyof Pick<FreeProfileForm, "specialty_ids" | "service_ids" | "approach_ids">;
  required?: boolean;
  selected: string[];
  showLimitCounter?: boolean;
  title: string;
  onChange: (
    name: keyof Pick<FreeProfileForm, "specialty_ids" | "service_ids" | "approach_ids">,
    value: string[],
  ) => void;
}) => {
  const isEmpty = items.length === 0;

  return (
    <Container
      description={description}
      error={error}
      label={title}
      name={String(name)}
      required={required}
      skipHtmlFor
    >
      {isEmpty ? (
        <InlineAlert title="Catálogo vazio" variant="warning">
          Nenhuma opção ativa foi encontrada no backend para esta seção.
        </InlineAlert>
      ) : null}

      {limit && showLimitCounter ? (
        <span className="-mt-1 w-fit rounded-full bg-surface-muted px-2.5 py-1 text-xs font-semibold text-muted">
          {selected.length}/{limit}
        </span>
      ) : null}

      <fieldset
        aria-label={title}
        aria-invalid={Boolean(error)}
        className={profileSetupButtonGroup}
      >
        {items.map((item) => {
          const checked = selected.includes(item.id);
          const disabled = Boolean(limit && !checked && selected.length >= limit);

          return (
            <button
              aria-pressed={checked}
              className={cn(
                profileSetupSelectableChip,
                checked &&
                  "border-primary bg-primary text-white shadow-none hover:border-primary hover:bg-primary hover:text-white",
                disabled && "cursor-not-allowed opacity-50",
              )}
              style={profileSetupSelectableChipStyle}
              disabled={disabled}
              key={item.id}
              onClick={() => onChange(name, toggleValue(selected, item.id))}
              type="button"
            >
              {item.name}
            </button>
          );
        })}
      </fieldset>
    </Container>
  );
};

const CatalogTagField = ({
  description,
  placeholderClassName = "text-xs",
  items,
  groupedItems,
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
  groupedItems?: CatalogTagGroup[];
  limit?: number;
  placeholderClassName?: string;
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
  const groupedCatalogItems =
    groupedItems && groupedItems.length > 0 ? groupedItems : [{ title: "Todos", items }];

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
                "min-w-[9rem] flex-1 py-1 text-left text-subtle outline-none",
                placeholderClassName,
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
                {groupedCatalogItems.map((group) => (
                  <div className="grid gap-1" key={group.title}>
                    <p className="px-1 text-[0.68rem] font-semibold uppercase tracking-[0.08em] text-muted">
                      {group.title}
                    </p>
                    <div className="grid gap-1">
                      {group.items.map((item) => {
                        const checked = selectedMap.has(item.id);
                        const disabled = Boolean(limitReached && !checked);

                        return (
                          <button
                            className={cn(
                              "flex items-center justify-between gap-3 rounded-xl px-3 py-2 text-left text-[11px] font-semibold text-foreground transition hover:bg-primary-soft hover:text-primary",
                              checked && "bg-primary-soft text-primary",
                              disabled &&
                                "cursor-not-allowed opacity-45 hover:bg-transparent hover:text-foreground",
                            )}
                            disabled={disabled}
                            key={`${item.id}-${group.title}`}
                            onClick={() => toggleItem(item.id)}
                            type="button"
                          >
                            <span>{item.name}</span>
                            {checked ? (
                              <span className="text-xs font-bold">Selecionado</span>
                            ) : null}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
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
  description,
  error,
  items,
  label,
  name,
  required,
  selected,
  onChange,
}: {
  description?: string;
  error?: string;
  items: { label: string; value: string }[];
  label: string;
  name: keyof Pick<FreeProfileForm, "target_audience" | "available_days">;
  required?: boolean;
  selected: string[];
  onChange: (value: string[]) => void;
}) => (
  <Container
    description={description}
    error={error}
    label={label}
    name={String(name)}
    required={required}
    skipHtmlFor
  >
    <fieldset aria-label={label} aria-invalid={Boolean(error)} className={profileSetupButtonGroup}>
      {items.map((item) => {
        const checked = selected.includes(item.value);
        return (
          <button
            aria-pressed={checked}
            className={cn(
              profileSetupSelectableChip,
              checked &&
                "border-primary bg-primary text-white shadow-none hover:border-primary hover:bg-primary hover:text-white",
            )}
            style={profileSetupSelectableChipStyle}
            key={item.value}
            onClick={() => onChange(toggleValue(selected, item.value))}
            type="button"
          >
            {item.label}
          </button>
        );
      })}
    </fieldset>
  </Container>
);

const BooleanBenefit = ({
  disabled = false,
  checked,
  description,
  title,
  onChange,
}: {
  disabled?: boolean;
  checked: boolean;
  description: string;
  title: string;
  onChange: (checked: boolean) => void;
}) => (
  <label
    className={cn(
      "flex items-center justify-between gap-4 rounded-2xl bg-primary-soft/50 p-4",
      disabled && "opacity-60",
    )}
  >
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
      checked={disabled ? false : checked}
      className="h-5 w-5 shrink-0 accent-primary disabled:cursor-not-allowed"
      disabled={disabled}
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

type AvatarDraft = {
  file: File;
  position: {
    x: number;
    y: number;
  };
  url: string;
};

type AvatarDragState = {
  height: number;
  originX: number;
  originY: number;
  pointerId: number;
  startX: number;
  startY: number;
  width: number;
};

const AVATAR_MAX_SIZE_BYTES = 5 * 1024 * 1024;
const AVATAR_CROP_SIZE = 512;

const clampPercent = (value: number) => Math.max(0, Math.min(100, value));

const cropAvatarFile = async (draft: AvatarDraft) => {
  const bitmap = await createImageBitmap(draft.file);
  const sourceSize = Math.min(bitmap.width, bitmap.height);
  const sourceX = Math.round((bitmap.width - sourceSize) * (draft.position.x / 100));
  const sourceY = Math.round((bitmap.height - sourceSize) * (draft.position.y / 100));
  const canvas = document.createElement("canvas");
  canvas.width = AVATAR_CROP_SIZE;
  canvas.height = AVATAR_CROP_SIZE;
  const context = canvas.getContext("2d");

  if (!context) {
    bitmap.close();
    throw new Error("Não foi possível preparar a imagem.");
  }

  context.drawImage(
    bitmap,
    sourceX,
    sourceY,
    sourceSize,
    sourceSize,
    0,
    0,
    AVATAR_CROP_SIZE,
    AVATAR_CROP_SIZE,
  );
  bitmap.close();

  const outputType =
    draft.file.type === "image/png" || draft.file.type === "image/webp"
      ? draft.file.type
      : "image/jpeg";
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, outputType, 0.92),
  );

  if (!blob) {
    throw new Error("Não foi possível preparar a imagem.");
  }

  return new File([blob], draft.file.name, {
    lastModified: Date.now(),
    type: outputType,
  });
};

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
  const router = useRouter();
  const currentUser = useAppSelector((state) => state.user);
  const isPsychologistUser = currentUser?.role === "psicologo";
  const accountTips = useAccount({
    enableSecurity: false,
    enableTips: isPsychologistUser,
  });
  const avatarFrameRef = useRef<HTMLDivElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const avatarDraftUrlRef = useRef<string | null>(null);
  const avatarDragRef = useRef<AvatarDragState | null>(null);
  const coverImageInputRef = useRef<HTMLInputElement>(null);
  const coverImageDraftUrlRef = useRef<string | null>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const videoCoverInputRef = useRef<HTMLInputElement>(null);
  const [avatarEditorOpen, setAvatarEditorOpen] = useState(false);
  const [avatarDraft, setAvatarDraft] = useState<AvatarDraft | null>(null);
  const [coverImageDraftUrl, setCoverImageDraftUrl] = useState<string | null>(null);
  const [failedCoverImageUrl, setFailedCoverImageUrl] = useState<string | null>(null);
  const [avatarActionsOpen, setAvatarActionsOpen] = useState(false);
  const [coverImageActionsOpen, setCoverImageActionsOpen] = useState(false);
  const [videoActionsOpen, setVideoActionsOpen] = useState(false);
  const [videoRemovalConfirmOpen, setVideoRemovalConfirmOpen] = useState(false);
  const [showProfileVideoTip, setShowProfileVideoTip] = useState(false);
  const hasShownProfileVideoTipThisVisitRef = useRef(false);
  const hasPersistedProfileVideoTipSeenRef = useRef(false);
  const {
    deleteAvatar,
    deleteCoverImage,
    deleteVideo,
    profile,
    update,
    uploadAvatar,
    uploadCoverImage,
    uploadVideo,
    uploadVideoCover,
  } = usePsychologistFreeProfile({
    callbacks: {
      update: {
        onSuccess: () => {
          toast.success("Perfil profissional atualizado");
          router.replace(PROFESSIONAL_PROFILE_MENU_HREF);
        },
        onError: (error) => toast.error(resolveApiError(error)),
      },
      avatar: {
        onSuccess: () => toast.success("Foto atualizada"),
        onError: (error) => toast.error(resolveApiError(error)),
      },
      deleteAvatar: {
        onSuccess: () => toast.success("Foto removida"),
        onError: (error) => toast.error(resolveApiError(error)),
      },
      coverImage: {
        onSuccess: () => {
          setFailedCoverImageUrl(null);
          toast.success("Imagem de capa atualizada");
        },
        onError: (error) => toast.error(resolveApiError(error)),
      },
      deleteCoverImage: {
        onSuccess: () => {
          setFailedCoverImageUrl(null);
          toast.success("Imagem de capa removida");
        },
        onError: (error) => toast.error(resolveApiError(error)),
      },
      video: {
        onSuccess: () => toast.success("Vídeo de apresentação atualizado"),
        onError: (error) => toast.error(resolveApiError(error)),
      },
      videoCover: {
        onSuccess: () => toast.success("Imagem de capa do vídeo atualizada"),
        onError: (error) => toast.error(resolveApiError(error)),
      },
      deleteVideo: {
        onSuccess: () => {
          setVideoRemovalConfirmOpen(false);
          toast.success("Vídeo de apresentação removido");
        },
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
  const visibleAvatarSrc = avatarDraft?.url || avatarSrc;
  const isPublicAvatar = isPublicMediaUrl(profile.data?.user.avatar);
  const coverImageSrc = resolvePublicMediaUrl(profile.data?.profile.cover_image_url);
  const coverImageFailed = Boolean(coverImageSrc && failedCoverImageUrl === coverImageSrc);
  const visibleCoverImageSrc = coverImageDraftUrl || (coverImageFailed ? null : coverImageSrc);
  const isPublicCoverImage =
    !coverImageDraftUrl && isPublicMediaUrl(profile.data?.profile.cover_image_url);
  const videoSrc = resolvePublicMediaUrl(profile.data?.profile.video_url);
  const videoCoverSrc = resolvePublicMediaUrl(profile.data?.profile.video_cover_url);
  const canUploadVideo = Boolean(profile.data?.plan.can_upload_video);
  const shouldLockProfessionalIdentityFields = Boolean(
    profile.data?.profile.identity_fields_locked,
  );
  const canShowProfileVideoTip =
    isPsychologistUser &&
    canUploadVideo &&
    profile.isSuccess &&
    accountTips.onboardingTips.isSuccess &&
    !accountTips.onboardingTips.data?.has_seen_psychologist_profile_video_tip;

  const persistProfileVideoTipSeen = useCallback(() => {
    if (
      !accountTips.userId ||
      hasPersistedProfileVideoTipSeenRef.current ||
      accountTips.onboardingTips.data?.has_seen_psychologist_profile_video_tip ||
      accountTips.updateOnboardingTips.isPending
    ) {
      return;
    }

    hasPersistedProfileVideoTipSeenRef.current = true;
    accountTips.updateOnboardingTips.mutate(
      {
        has_seen_psychologist_profile_video_tip: true,
      },
      {
        onError: () => {
          hasPersistedProfileVideoTipSeenRef.current = false;
        },
      },
    );
  }, [
    accountTips.onboardingTips.data?.has_seen_psychologist_profile_video_tip,
    accountTips.updateOnboardingTips,
    accountTips.userId,
  ]);

  useEffect(() => {
    hasShownProfileVideoTipThisVisitRef.current = false;
    hasPersistedProfileVideoTipSeenRef.current = false;

    const frame = window.requestAnimationFrame(() => setShowProfileVideoTip(false));

    if (!accountTips.userId) {
      return () => window.cancelAnimationFrame(frame);
    }

    return () => window.cancelAnimationFrame(frame);
  }, [accountTips.userId]);

  useEffect(() => {
    if (!canShowProfileVideoTip) return;
    if (hasShownProfileVideoTipThisVisitRef.current) return;
    if (videoActionsOpen || videoRemovalConfirmOpen) return;

    const timeout = window.setTimeout(() => {
      if (hasShownProfileVideoTipThisVisitRef.current) return;
      if (!document.querySelector(PSYCHOLOGIST_PROFILE_VIDEO_TIP_SELECTOR)) return;

      hasShownProfileVideoTipThisVisitRef.current = true;
      setShowProfileVideoTip(true);
      persistProfileVideoTipSeen();
    }, 700);

    return () => window.clearTimeout(timeout);
  }, [
    canShowProfileVideoTip,
    persistProfileVideoTipSeen,
    videoActionsOpen,
    videoRemovalConfirmOpen,
  ]);
  const lockedIdentityFieldProps: Partial<(typeof renderedFields)[number]> =
    shouldLockProfessionalIdentityFields ? { disabled: true } : {};
  const crpRegionValue = profile.data?.profile.crp_region;
  const crpRegionOptions =
    renderedFields.find((field) => field.name === "crp_region")?.options || [];
  const lockedCrpRegionFieldProps: Partial<(typeof renderedFields)[number]> =
    shouldLockProfessionalIdentityFields &&
    crpRegionValue &&
    !crpRegionOptions.some((option) => String(option.value) === String(crpRegionValue))
      ? {
          ...lockedIdentityFieldProps,
          options: [{ label: crpRegionValue, value: crpRegionValue }, ...crpRegionOptions],
        }
      : lockedIdentityFieldProps;
  const showInactiveProfileBanner = Boolean(
    profile.data?.activation && !profile.data.activation.active,
  );
  const isSavingMedia =
    uploadAvatar.isPending ||
    deleteAvatar.isPending ||
    uploadCoverImage.isPending ||
    deleteCoverImage.isPending ||
    uploadVideo.isPending ||
    uploadVideoCover.isPending ||
    deleteVideo.isPending;
  const isSubmitting = update.isPending || isSavingMedia;
  const publicProfileHref = profile.data?.user.id
    ? `/psicologos/${profile.data.user.id}`
    : undefined;
  const addressState = form.hook.watch("address_state");
  const addressCity = form.hook.watch("address_city");
  const baseCityOptions = useMemo(() => CITY_OPTIONS_BY_STATE[addressState] || [], [addressState]);
  const cityOptions =
    addressCity && !baseCityOptions.some((item) => item.value === addressCity)
      ? [{ label: addressCity, value: addressCity }, ...baseCityOptions]
      : baseCityOptions;
  const serviceIdsError = form.hook.formState.errors.service_ids?.message;
  const targetAudienceError = form.hook.formState.errors.target_audience?.message;
  const availableDaysError = form.hook.formState.errors.available_days?.message;
  const orderedApproachOptions = useMemo(
    () => [...(profile.data?.catalogs.approaches || [])].sort(compareCatalogItems),
    [profile.data?.catalogs.approaches],
  );
  const orderedSpecialtyGroups = useMemo(() => {
    const groups = new Map<
      string,
      {
        items: FreeProfileCatalogItem[];
        order: number;
        position: number;
        title: string;
      }
    >();

    const categories = [...(profile.data?.catalogs.specialty_categories || [])].sort(
      compareCatalogCategories,
    );

    for (const [order, category] of categories.entries()) {
      if (!category.active) continue;

      groups.set(category.id, {
        items: [],
        order,
        position: category.position ?? Number.POSITIVE_INFINITY,
        title: category.name,
      });
    }

    for (const item of profile.data?.catalogs.specialties || []) {
      const key = item.category?.id || "uncategorized";
      const current = groups.get(key) ?? {
        items: [],
        order: groups.size,
        position: item.category?.position ?? Number.POSITIVE_INFINITY,
        title: item.category?.name || "Outras especialidades",
      };

      current.items.push(item);
      groups.set(key, current);
    }

    return Array.from(groups.values())
      .filter((group) => group.items.length > 0)
      .sort((left, right) => {
        if (left.order !== right.order) return left.order - right.order;
        if (left.position !== right.position) return left.position - right.position;

        return catalogCollator.compare(left.title, right.title);
      })
      .map((group) => ({
        items: group.items.sort(compareCatalogItems),
        title: group.title,
      }));
  }, [profile.data?.catalogs.specialties, profile.data?.catalogs.specialty_categories]);
  const orderedServiceOptions = useMemo(
    () => [...(profile.data?.catalogs.services || [])].sort(compareCatalogItems),
    [profile.data?.catalogs.services],
  );
  const targetAudienceOptions = useMemo(
    () =>
      (profile.data?.catalogs.target_audiences || []).map((item) => ({
        label: item.name,
        value: item.slug,
      })),
    [profile.data?.catalogs.target_audiences],
  );
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

  useEffect(() => {
    return () => {
      if (avatarDraftUrlRef.current) {
        URL.revokeObjectURL(avatarDraftUrlRef.current);
      }

      if (coverImageDraftUrlRef.current) {
        URL.revokeObjectURL(coverImageDraftUrlRef.current);
      }
    };
  }, []);

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

  const clearAvatarDraft = () => {
    if (avatarDraftUrlRef.current) {
      URL.revokeObjectURL(avatarDraftUrlRef.current);
      avatarDraftUrlRef.current = null;
    }

    avatarDragRef.current = null;
    setAvatarEditorOpen(false);
    setAvatarDraft(null);
  };

  const handleAvatarChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;
    setAvatarActionsOpen(false);

    if (file.size > AVATAR_MAX_SIZE_BYTES) {
      toast.error("Envie uma imagem de até 5MB.");
      return;
    }

    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      toast.error("Envie uma imagem PNG, JPG ou WebP.");
      return;
    }

    if (avatarDraftUrlRef.current) {
      URL.revokeObjectURL(avatarDraftUrlRef.current);
    }

    const url = URL.createObjectURL(file);
    avatarDraftUrlRef.current = url;
    setAvatarDraft({
      file,
      position: {
        x: 50,
        y: 50,
      },
      url,
    });
    setAvatarEditorOpen(true);
  };

  const openAvatarFilePicker = () => {
    setAvatarActionsOpen(false);
    avatarInputRef.current?.click();
  };

  const handleAvatarRemoval = () => {
    setAvatarActionsOpen(false);
    clearAvatarDraft();
    if (!profile.data?.user.avatar) return;
    deleteAvatar.mutate();
  };

  const handleAvatarPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!avatarDraft) return;

    const rect = avatarFrameRef.current?.getBoundingClientRect();
    if (!rect) return;

    avatarDragRef.current = {
      height: rect.height || 1,
      originX: avatarDraft.position.x,
      originY: avatarDraft.position.y,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      width: rect.width || 1,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handleAvatarPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = avatarDragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    const deltaX = ((event.clientX - drag.startX) / drag.width) * 100;
    const deltaY = ((event.clientY - drag.startY) / drag.height) * 100;

    setAvatarDraft((current) =>
      current
        ? {
            ...current,
            position: {
              x: clampPercent(drag.originX - deltaX),
              y: clampPercent(drag.originY - deltaY),
            },
          }
        : current,
    );
  };

  const handleAvatarPointerEnd = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (avatarDragRef.current?.pointerId === event.pointerId) {
      avatarDragRef.current = null;
    }
  };

  const applyAvatarDraft = async () => {
    if (!avatarDraft) return;

    try {
      const croppedFile = await cropAvatarFile(avatarDraft);
      uploadAvatar.mutate(croppedFile, {
        onSuccess: clearAvatarDraft,
      });
    } catch {
      toast.error("Não foi possível preparar a imagem. Escolha outro arquivo e tente novamente.");
    }
  };

  const clearCoverImageDraft = () => {
    if (coverImageDraftUrlRef.current) {
      URL.revokeObjectURL(coverImageDraftUrlRef.current);
      coverImageDraftUrlRef.current = null;
    }

    setCoverImageDraftUrl(null);
  };

  const handleCoverImageChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;
    setCoverImageActionsOpen(false);

    if (file.size > AVATAR_MAX_SIZE_BYTES) {
      toast.error("Envie uma imagem de capa de até 5MB.");
      return;
    }

    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      toast.error("Envie uma imagem PNG, JPG ou WebP para a capa.");
      return;
    }

    clearCoverImageDraft();
    const previewUrl = URL.createObjectURL(file);
    coverImageDraftUrlRef.current = previewUrl;
    setCoverImageDraftUrl(previewUrl);
    uploadCoverImage.mutate(file, {
      onSuccess: clearCoverImageDraft,
    });
  };

  const handleCoverImageRemoval = () => {
    setCoverImageActionsOpen(false);
    clearCoverImageDraft();
    if (!profile.data?.profile.cover_image_url) return;
    deleteCoverImage.mutate();
  };

  const openCoverImageFilePicker = () => {
    setCoverImageActionsOpen(false);
    coverImageInputRef.current?.click();
  };

  const handleVideoChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;
    setVideoActionsOpen(false);
    uploadVideo.mutate(file);
  };

  const handleVideoCoverChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;

    if (file.size > AVATAR_MAX_SIZE_BYTES) {
      toast.error("Envie uma imagem de capa de até 5MB.");
      return;
    }

    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
      toast.error("Envie uma imagem PNG, JPG ou WebP para a capa.");
      return;
    }

    setVideoActionsOpen(false);
    uploadVideoCover.mutate(file);
  };

  const openVideoFilePicker = () => {
    hasShownProfileVideoTipThisVisitRef.current = true;
    persistProfileVideoTipSeen();
    setShowProfileVideoTip(false);
    setVideoActionsOpen(false);
    videoInputRef.current?.click();
  };

  const openVideoCoverFilePicker = () => {
    if (!videoSrc) {
      toast.info("Envie um vídeo antes de adicionar a imagem de capa.");
      return;
    }

    setVideoActionsOpen(false);
    videoCoverInputRef.current?.click();
  };

  const handleVideoRemoval = () => {
    if (!profile.data?.profile.video_url) return;
    setVideoActionsOpen(false);
    setVideoRemovalConfirmOpen(true);
  };

  const confirmVideoRemoval = () => {
    if (!profile.data?.profile.video_url || deleteVideo.isPending) return;
    deleteVideo.mutate();
  };

  const handleVideoCoverRequest = () => {
    hasShownProfileVideoTipThisVisitRef.current = true;
    persistProfileVideoTipSeen();
    setShowProfileVideoTip(false);
    openVideoCoverFilePicker();
  };

  const handleVideoActionsToggle = () => {
    hasShownProfileVideoTipThisVisitRef.current = true;
    persistProfileVideoTipSeen();
    setShowProfileVideoTip(false);
    setVideoActionsOpen((current) => !current);
  };

  const handleVideoUploadCardClick = () => {
    hasShownProfileVideoTipThisVisitRef.current = true;
    persistProfileVideoTipSeen();
    setShowProfileVideoTip(false);
    videoInputRef.current?.click();
  };

  const submit = form.hook.handleSubmit((values) => {
    if (values.published && !videoSrc) {
      toast.error("Adicione um vídeo de apresentação antes de publicar seu perfil.");
      return;
    }

    const lockedIdentityProfile = shouldLockProfessionalIdentityFields
      ? profile.data?.profile
      : null;
    const professionalFirstName = values.professional_first_name.trim();
    const professionalLastName = values.professional_last_name.trim();

    update.mutate({
      name: [professionalFirstName, professionalLastName].filter(Boolean).join(" "),
      professional_first_name: professionalFirstName,
      professional_last_name: professionalLastName,
      cpf: lockedIdentityProfile ? lockedIdentityProfile.cpf : values.cpf || null,
      birthdate: values.birthdate || null,
      gender: values.gender || null,
      race_color: values.race_color || null,
      religion: values.religion || null,
      crp_region: lockedIdentityProfile
        ? lockedIdentityProfile.crp_region
        : values.crp_region || null,
      crp_number: lockedIdentityProfile
        ? lockedIdentityProfile.crp_number
        : values.crp_number || null,
      whatsapp: toWhatsappPhoneE164(values.whatsapp, values.countryCode),
      headline: values.headline || null,
      bio: values.bio || null,
      modality: values.modality || null,
      languages: getLanguages(values.language),
      target_audience: values.target_audience,
      discount_first_session: values.discount_first_session,
      social_value: values.social_value,
      accepts_insurance: values.accepts_insurance,
      show_experience_tag: profile.data?.plan.is_free ? false : values.show_experience_tag,
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

  const renderProfileImagesPreview = () => (
    <header className="overflow-hidden rounded-[28px] border border-border/80 bg-surface p-4 text-left shadow-[var(--lectum-shadow-soft)]">
      <div className="mb-4">
        <h1 className="text-base font-extrabold tracking-[-0.01em] text-foreground">
          Imagens do perfil
        </h1>
        <p className="mt-1 text-xs leading-5 text-muted">
          Adicione uma capa horizontal e uma foto profissional.
        </p>
      </div>

      <div className="relative pb-12">
        <button
          aria-label="Selecionar imagem de capa do perfil"
          className="relative block aspect-[16/6] w-full overflow-hidden rounded-[24px] border border-border/70 bg-gradient-to-br from-primary-soft/70 via-surface to-surface-muted p-0 text-left shadow-inner transition hover:border-primary/40 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/15 disabled:cursor-not-allowed disabled:opacity-80"
          disabled={!profile.data || uploadCoverImage.isPending || deleteCoverImage.isPending}
          onClick={openCoverImageFilePicker}
          title="Selecionar imagem de capa"
          type="button"
        >
          {visibleCoverImageSrc ? (
            <Image
              alt="Pré-visualização da imagem de capa do perfil"
              className="object-cover"
              fill
              sizes="(min-width: 768px) 720px, calc(100vw - 40px)"
              src={visibleCoverImageSrc}
              unoptimized={isPublicCoverImage}
              onError={() => setFailedCoverImageUrl(visibleCoverImageSrc)}
            />
          ) : (
            <span className="absolute inset-0 grid place-items-center px-4 text-center">
              <span className="grid justify-items-center">
                {uploadCoverImage.isPending ? (
                  <Loader2 className="h-5 w-5 animate-spin text-primary" aria-hidden="true" />
                ) : (
                  <UploadCloud className="h-5 w-5 text-primary" aria-hidden="true" />
                )}
                <span className="mt-2 block text-xs font-extrabold text-foreground">
                  Adicionar capa
                </span>
                <span className="mt-0.5 block text-[11px] font-semibold text-muted">
                  JPG, PNG ou WebP
                </span>
              </span>
            </span>
          )}
        </button>

        <div className="absolute right-3 top-3">
          <button
            aria-expanded={coverImageActionsOpen}
            aria-haspopup="menu"
            aria-label="Editar imagem de capa"
            className="grid h-9 w-9 place-items-center rounded-full border border-border/70 bg-surface/90 text-foreground shadow-sm backdrop-blur transition hover:bg-primary-soft hover:text-primary disabled:cursor-not-allowed disabled:opacity-60"
            disabled={!profile.data || uploadCoverImage.isPending || deleteCoverImage.isPending}
            onClick={() => setCoverImageActionsOpen((current) => !current)}
            type="button"
          >
            {uploadCoverImage.isPending || deleteCoverImage.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <PencilLine className="h-4 w-4" aria-hidden="true" />
            )}
          </button>

          {coverImageActionsOpen ? (
            <div
              className="absolute right-0 top-11 z-20 w-44 overflow-hidden rounded-2xl border border-border bg-surface text-left shadow-[var(--lectum-shadow-soft)]"
              role="menu"
            >
              <button
                className="flex w-full items-center gap-2 px-4 py-3 text-xs font-semibold text-foreground transition hover:bg-primary-soft hover:text-primary disabled:cursor-not-allowed disabled:opacity-45"
                disabled={!profile.data || uploadCoverImage.isPending || deleteCoverImage.isPending}
                onClick={openCoverImageFilePicker}
                role="menuitem"
                type="button"
              >
                <UploadCloud className="h-4 w-4" aria-hidden="true" />
                Alterar capa
              </button>
              <button
                className="flex w-full items-center gap-2 px-4 py-3 text-xs font-semibold text-danger transition hover:bg-danger/10 disabled:cursor-not-allowed disabled:opacity-45"
                disabled={
                  (!profile.data?.profile.cover_image_url && !coverImageDraftUrl) ||
                  uploadCoverImage.isPending ||
                  deleteCoverImage.isPending
                }
                onClick={handleCoverImageRemoval}
                role="menuitem"
                type="button"
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
                Excluir capa
              </button>
            </div>
          ) : null}
        </div>

        <div className="absolute left-4 -bottom-1 flex items-end gap-3 sm:left-6">
          <div className="relative h-24 w-24 shrink-0">
            <button
              aria-label="Selecionar foto profissional"
              className={cn(
                "relative grid h-24 w-24 place-items-center overflow-hidden rounded-full border-4 border-surface bg-primary p-0 text-2xl font-bold text-white shadow-[var(--lectum-shadow-soft)] transition hover:ring-4 hover:ring-primary/15 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-80",
                avatarDraft && "ring-4 ring-primary/20",
              )}
              disabled={isSavingMedia}
              onClick={openAvatarFilePicker}
              title="Selecionar foto profissional"
              type="button"
            >
              {visibleAvatarSrc ? (
                <Image
                  alt={avatarDraft ? "Pré-visualização da foto profissional" : "Foto profissional"}
                  className="object-cover"
                  fill
                  sizes="96px"
                  src={visibleAvatarSrc}
                  style={{
                    objectPosition: avatarDraft
                      ? `${avatarDraft.position.x}% ${avatarDraft.position.y}%`
                      : "50% 50%",
                  }}
                  unoptimized={Boolean(avatarDraft) || isPublicAvatar}
                />
              ) : (
                <span className="grid h-full w-full place-items-center bg-primary-soft text-primary">
                  <UserRound className="h-9 w-9" aria-hidden="true" />
                </span>
              )}
            </button>
            <button
              aria-expanded={avatarActionsOpen}
              aria-haspopup="menu"
              aria-label="Editar foto"
              className="absolute right-0 bottom-0 grid h-8 w-8 place-items-center rounded-full border-2 border-surface bg-primary text-white shadow-sm transition hover:bg-primary/90 disabled:opacity-60"
              disabled={isSavingMedia}
              onClick={() => setAvatarActionsOpen((current) => !current)}
              type="button"
            >
              {isSavingMedia ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <PencilLine className="h-4 w-4" aria-hidden="true" />
              )}
            </button>

            {avatarActionsOpen ? (
              <div
                className="absolute bottom-0 left-[calc(100%-0.5rem)] z-30 w-44 overflow-hidden rounded-2xl border border-border bg-surface text-left shadow-[var(--lectum-shadow-soft)]"
                role="menu"
              >
                <button
                  className="flex w-full items-center gap-2 px-4 py-3 text-xs font-semibold text-foreground transition hover:bg-primary-soft hover:text-primary disabled:cursor-not-allowed disabled:opacity-45"
                  disabled={isSavingMedia}
                  onClick={openAvatarFilePicker}
                  role="menuitem"
                  type="button"
                >
                  <UploadCloud className="h-4 w-4" aria-hidden="true" />
                  Alterar foto
                </button>
                <button
                  className="flex w-full items-center gap-2 px-4 py-3 text-xs font-semibold text-danger transition hover:bg-danger/10 disabled:cursor-not-allowed disabled:opacity-45"
                  disabled={isSavingMedia || (!profile.data?.user.avatar && !avatarDraft)}
                  onClick={handleAvatarRemoval}
                  role="menuitem"
                  type="button"
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                  Excluir foto
                </button>
              </div>
            ) : null}
          </div>

          {avatarDraft ? (
            <span className="mb-2 rounded-full border border-primary/15 bg-surface/90 px-3 py-1 text-[11px] font-semibold text-muted shadow-sm backdrop-blur">
              Prévia selecionada
            </span>
          ) : null}
        </div>
      </div>

      <input
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        onChange={handleCoverImageChange}
        ref={coverImageInputRef}
        type="file"
      />
      <input
        accept="image/png,image/jpeg,image/webp"
        className="sr-only"
        onChange={handleAvatarChange}
        ref={avatarInputRef}
        type="file"
      />

      {avatarDraft ? (
        <div className="mt-3 flex flex-wrap items-center gap-2 border-border/70 border-t pt-3">
          <Button
            disabled={uploadAvatar.isPending}
            onClick={() => setAvatarEditorOpen(true)}
            type="button"
            variant="outline"
          >
            <Camera className="h-4 w-4" aria-hidden="true" />
            Ajustar foto
          </Button>
          <Button
            disabled={uploadAvatar.isPending}
            onClick={clearAvatarDraft}
            type="button"
            variant="ghost"
          >
            <X className="h-4 w-4" aria-hidden="true" />
            Descartar
          </Button>
        </div>
      ) : null}
    </header>
  );

  return (
    <PrivateTemplate
      desktopSidebarDefaultCollapsed
      showHeader={false}
      showMobileNavigation={false}
      showNavigation
    >
      {showProfileVideoTip ? (
        <ActionableCoachMark
          onDismiss={() => setShowProfileVideoTip(false)}
          placement={videoSrc ? "bottom" : "top"}
          targetSelector={PSYCHOLOGIST_PROFILE_VIDEO_TIP_SELECTOR}
          title="Seu vídeo é seu principal destaque"
        >
          <p>
            O vídeo é o elemento principal para destacar seu perfil nos resultados de busca. Ele
            ajuda pacientes a sentirem confiança antes do contato e pode ser decisivo para converter
            uma primeira conversa.
          </p>
        </ActionableCoachMark>
      ) : null}

      <VideoRemovalConfirmationModal
        disabled={deleteVideo.isPending}
        onClose={() => setVideoRemovalConfirmOpen(false)}
        onConfirm={confirmVideoRemoval}
        open={videoRemovalConfirmOpen}
      />
      <section className="mx-auto grid w-full max-w-[394px] gap-4 md:max-w-3xl">
        <AppPageHeader
          backHref={PROFESSIONAL_PROFILE_MENU_HREF}
          backLabel="Voltar ao perfil"
          rightActionHref={publicProfileHref}
          rightActionIcon={<Eye className="h-5 w-5" aria-hidden="true" />}
          rightActionLabel="Visualizar perfil público"
          title="Editar perfil"
        />

        {showInactiveProfileBanner ? <ProfileInactiveBanner /> : null}

        {renderProfileImagesPreview()}

        {avatarDraft && avatarEditorOpen ? (
          <div
            aria-labelledby="avatar-editor-title"
            aria-modal="true"
            className="fixed inset-0 z-50 grid place-items-center bg-foreground/50 px-4 py-6 backdrop-blur-sm"
            role="dialog"
          >
            <div className="grid max-h-[calc(100vh-3rem)] w-full max-w-[430px] gap-4 overflow-y-auto rounded-[28px] border border-border bg-surface p-5 shadow-[0_24px_70px_rgb(15_23_42_/_26%)]">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-extrabold text-foreground" id="avatar-editor-title">
                    Ajustar foto
                  </h2>
                  <p className="mt-1 text-sm leading-6 text-muted">
                    Arraste a imagem dentro do círculo para enquadrar o rosto antes de aplicar.
                  </p>
                </div>
                <button
                  aria-label="Fechar ajuste de foto"
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-muted transition hover:bg-surface-muted hover:text-foreground"
                  disabled={uploadAvatar.isPending}
                  onClick={() => setAvatarEditorOpen(false)}
                  type="button"
                >
                  <X className="h-5 w-5" aria-hidden="true" />
                </button>
              </div>

              <div className="rounded-3xl border border-border bg-surface-muted p-4">
                <div
                  className="relative mx-auto grid h-72 w-72 max-w-full cursor-grab touch-none place-items-center overflow-hidden rounded-full bg-primary text-white shadow-[inset_0_0_0_1px_rgb(255_255_255_/_60%)] active:cursor-grabbing"
                  onPointerCancel={handleAvatarPointerEnd}
                  onPointerDown={handleAvatarPointerDown}
                  onPointerMove={handleAvatarPointerMove}
                  onPointerUp={handleAvatarPointerEnd}
                  ref={avatarFrameRef}
                >
                  <Image
                    alt="Pré-visualização da foto profissional"
                    className="object-cover"
                    fill
                    sizes="288px"
                    src={avatarDraft.url}
                    style={{
                      objectPosition: `${avatarDraft.position.x}% ${avatarDraft.position.y}%`,
                    }}
                    unoptimized
                  />
                </div>
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                <Button disabled={uploadAvatar.isPending} onClick={applyAvatarDraft} type="button">
                  {uploadAvatar.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <UploadCloud className="h-4 w-4" aria-hidden="true" />
                  )}
                  Aplicar foto
                </Button>
                <Button
                  disabled={uploadAvatar.isPending}
                  onClick={clearAvatarDraft}
                  type="button"
                  variant="outline"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                  Cancelar
                </Button>
              </div>
            </div>
          </div>
        ) : null}

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
            <SectionCard icon={UserRound} title="Informações básicas">
              <div className="grid gap-4">
                <div className="grid gap-3">
                  <div className="grid gap-3 sm:grid-cols-2 sm:items-start">
                    {renderField("professional_first_name")}
                    {renderField("professional_last_name")}
                  </div>
                  {renderField("cpf", lockedIdentityFieldProps)}
                  {renderField("birthdate")}
                  {renderField("gender")}
                  {renderField("race_color")}
                  {renderField("religion")}
                  {renderField("crp_region", lockedCrpRegionFieldProps)}
                  {renderField("crp_number", lockedIdentityFieldProps)}
                </div>
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
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-surface text-primary shadow-sm">
                          <FileVideo className="h-5 w-5" aria-hidden="true" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold leading-5 text-foreground">
                            Vídeo de Apresentação <span className="text-danger">*</span>
                          </p>
                        </div>
                      </div>

                      <div className="relative shrink-0">
                        <button
                          aria-expanded={videoActionsOpen}
                          aria-haspopup="menu"
                          aria-label="Editar vídeo de apresentação"
                          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-surface text-primary transition hover:bg-primary-soft disabled:cursor-not-allowed disabled:opacity-60"
                          disabled={
                            uploadVideo.isPending ||
                            uploadVideoCover.isPending ||
                            deleteVideo.isPending
                          }
                          data-psychologist-tip-target={videoSrc ? "profile-video" : undefined}
                          onClick={handleVideoActionsToggle}
                          type="button"
                        >
                          <PencilLine className="h-4 w-4" aria-hidden="true" />
                        </button>

                        {videoActionsOpen ? (
                          <div
                            className="absolute right-0 top-11 z-20 w-64 overflow-hidden rounded-2xl border border-border bg-surface text-left shadow-[var(--lectum-shadow-soft)]"
                            role="menu"
                          >
                            <button
                              className="flex w-full items-center gap-2 px-4 py-3 text-xs font-semibold text-foreground transition hover:bg-primary-soft hover:text-primary disabled:cursor-not-allowed disabled:opacity-45"
                              disabled={
                                !videoSrc ||
                                uploadVideo.isPending ||
                                uploadVideoCover.isPending ||
                                deleteVideo.isPending
                              }
                              onClick={handleVideoCoverRequest}
                              role="menuitem"
                              type="button"
                            >
                              <Camera className="h-4 w-4" aria-hidden="true" />
                              Adicionar imagem de capa
                            </button>
                            <button
                              className="flex w-full items-center gap-2 px-4 py-3 text-xs font-semibold text-foreground transition hover:bg-primary-soft hover:text-primary disabled:cursor-not-allowed disabled:opacity-45"
                              disabled={uploadVideo.isPending || uploadVideoCover.isPending}
                              onClick={openVideoFilePicker}
                              role="menuitem"
                              type="button"
                            >
                              <UploadCloud className="h-4 w-4" aria-hidden="true" />
                              Trocar vídeo
                            </button>
                            <button
                              className="flex w-full items-center gap-2 px-4 py-3 text-xs font-semibold text-danger transition hover:bg-danger/10 disabled:cursor-not-allowed disabled:opacity-45"
                              disabled={
                                !videoSrc ||
                                uploadVideo.isPending ||
                                uploadVideoCover.isPending ||
                                deleteVideo.isPending
                              }
                              onClick={handleVideoRemoval}
                              role="menuitem"
                              type="button"
                            >
                              <Trash2 className="h-4 w-4" aria-hidden="true" />
                              Excluir vídeo
                            </button>
                          </div>
                        ) : null}
                      </div>
                    </div>

                    <p className="mt-3 w-full text-xs leading-5 text-muted">
                      Envie um vídeo vertical de até 50MB. Ele é obrigatório para publicar o perfil
                      e aparecer na área pública da Lectum.
                    </p>

                    {videoSrc ? (
                      <VerticalVideoPlayer
                        className="mt-4 w-full rounded-2xl md:mx-auto md:max-w-[390px] md:rounded-[22px] lg:max-w-[300px]"
                        poster={videoCoverSrc || undefined}
                        src={videoSrc}
                        title="Pré-visualização do vídeo de apresentação"
                      />
                    ) : (
                      <button
                        className="mt-4 grid min-h-32 w-full place-items-center rounded-2xl border border-dashed border-border bg-surface px-4 py-6 text-center transition hover:border-primary hover:bg-primary-soft/40 disabled:cursor-not-allowed disabled:opacity-60"
                        disabled={uploadVideo.isPending}
                        data-psychologist-tip-target={!videoSrc ? "profile-video" : undefined}
                        onClick={handleVideoUploadCardClick}
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
                    <input
                      accept="image/jpeg,image/png,image/webp"
                      className="sr-only"
                      onChange={handleVideoCoverChange}
                      ref={videoCoverInputRef}
                      type="file"
                    />
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-border bg-surface-muted p-4 text-center opacity-80">
                    <FileVideo className="mx-auto h-8 w-8 text-muted" aria-hidden="true" />
                    <p className="mt-2 text-sm font-bold text-foreground">
                      Vídeo de Apresentação <span className="text-danger">*</span>
                    </p>
                    <p className="mt-1 text-xs leading-5 text-muted">
                      Upload de vídeo deve estar disponível para todos os planos. Recarregue a
                      página se esta opção não aparecer.
                    </p>
                    <Link
                      className="mt-4 inline-flex items-center justify-center gap-2 rounded-full bg-primary-soft px-4 py-2 text-xs font-bold text-primary"
                      href="/app/profissional/perfil/configurar"
                    >
                      <UploadCloud className="h-4 w-4" aria-hidden="true" />
                      Atualizar tela
                    </Link>
                  </div>
                )}
              </div>
            </SectionCard>

            <SectionCard icon={Filter} title="Filtros">
              <div className="grid gap-6">
                <CatalogTagField
                  description={
                    profile.data.plan.is_free
                      ? "Selecione até 3 opções. Faça o upgrade para adicionar 10 especialidades."
                      : "Selecione até 10 especialidades."
                  }
                  items={profile.data.catalogs.specialties}
                  groupedItems={orderedSpecialtyGroups}
                  limit={profile.data.plan.specialty_limit}
                  name="specialty_ids"
                  onChange={setCatalogValue}
                  placeholder="Adicione uma especialidade..."
                  placeholderClassName="text-[12px]"
                  required
                  selected={selectedSpecialties}
                  title="Especialidades"
                />
                <CatalogTagField
                  description={
                    profile.data.plan.is_free
                      ? "Selecione 1 opção. Faça o upgrade para adicionar várias abordagens."
                      : "Selecione todas as abordagens que fazem parte da sua prática."
                  }
                  items={orderedApproachOptions}
                  limit={profile.data.plan.approach_limit}
                  name="approach_ids"
                  onChange={setCatalogValue}
                  placeholder="Adicione uma abordagem..."
                  placeholderClassName="text-[12px]"
                  required
                  selected={selectedApproaches}
                  title="Abordagens"
                />
                {renderField("language")}
                <CatalogPicker
                  description={
                    profile.data.plan.is_free
                      ? "Selecione 1 opção. Faça o upgrade para adicionar todos os serviços."
                      : "Selecione todos os serviços que você oferece."
                  }
                  error={serviceIdsError}
                  items={orderedServiceOptions}
                  limit={profile.data.plan.service_limit}
                  name="service_ids"
                  onChange={setCatalogValue}
                  required
                  selected={selectedServices}
                  showLimitCounter={false}
                  title="Serviços"
                />
                <ChipPicker
                  error={targetAudienceError}
                  items={targetAudienceOptions}
                  label="Público"
                  name="target_audience"
                  onChange={(value) => setArrayValue("target_audience", value)}
                  required
                  selected={selectedTargets}
                />
                <div className="grid gap-3">
                  <h3 className="text-sm font-bold text-foreground">Selos e Facilidades</h3>
                  <BooleanBenefit
                    checked={Boolean(
                      !profile.data?.plan.is_free && form.hook.watch("show_experience_tag"),
                    )}
                    disabled={profile.data?.plan.is_free}
                    description="Mostre a tag com o tempo de experiência calculado pelo registro profissional."
                    onChange={(checked) =>
                      form.hook.setValue("show_experience_tag", checked, {
                        shouldDirty: true,
                        shouldValidate: true,
                      })
                    }
                    title="Exibir tempo de experiência"
                  />
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
                  <div className="grid gap-3 rounded-2xl border border-border p-4" key={field.id}>
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="text-sm font-bold text-foreground">Formação {index + 1}</h3>
                      {academicFormations.fields.length > 1 ? (
                        <button
                          aria-label={`Remover formação ${index + 1}`}
                          className="grid h-8 w-8 place-items-center rounded-full text-danger transition hover:bg-danger/10"
                          onClick={() => academicFormations.remove(index)}
                          type="button"
                        >
                          <Trash2 className="h-4 w-4" aria-hidden="true" />
                        </button>
                      ) : null}
                    </div>
                    <div className="grid gap-2">
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
                      {renderAcademicField(
                        index,
                        "graduation_year",
                        "Ano de formação",
                        "Ex.: 2012",
                      )}
                    </div>
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
                <ChipPicker
                  error={availableDaysError}
                  items={WEEKDAY_OPTIONS}
                  label="Dias com horários disponíveis"
                  name="available_days"
                  onChange={(value) => setArrayValue("available_days", value)}
                  selected={selectedDays}
                />
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
                <span className="grid min-w-0 gap-1">
                  <span className="block font-bold text-foreground">
                    Perfil visível para pacientes
                  </span>
                  <span className="block text-sm leading-5 text-muted">
                    Em caso de férias ou agenda lotada, desabilite a visibilidade para pausar a
                    exibição do seu perfil aos pacientes.
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
            <AccountDeleteSection />
          </Form>
        ) : null}
      </section>
    </PrivateTemplate>
  );
};
