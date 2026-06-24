"use client";

import { ImagePlus, Loader2, Pencil, Save, Trash2, UserRound } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { type ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import { useDispatch } from "react-redux";
import { toast } from "sonner";
import { usePatient } from "@/api/callers/patient";
import type {
  PatientPrivateProfile,
  PatientProfileAvatarRemoval,
  PatientProfileAvatarUpload,
} from "@/api/generator/types";
import { AccountDeleteSection } from "@/components/account/account-delete-section";
import { components } from "@/components/controllers";
import { AppPageHeader } from "@/components/ui/app-page-header";
import { InlineAlert } from "@/components/ui/inline-alert";
import { LoadingState } from "@/components/ui/loading-state";
import { useAppSelector } from "@/hooks/redux";
import { Button } from "@/registry/new-york-v4/ui/button";
import * as userActions from "@/store/modules/user/actions";
import { PrivateTemplate } from "@/templates/private";
import { isPublicMediaUrl, resolvePublicMediaUrl } from "@/utils/media";
import { toPatientProfilePayload, usePatientProfileForm } from "./use-form";

type ApiErrorData = {
  error?: string;
  message?: string;
  status?: number;
};

type ApiError = Error & {
  data?: ApiErrorData;
};

const AVATAR_MAX_SIZE_BYTES = 5 * 1024 * 1024;
const AVATAR_ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp"];

const getInitials = (name?: string | null, email?: string | null) => {
  const source = name?.trim() || email?.split("@")[0] || "Lectum";
  const parts = source.split(/\s+/).filter(Boolean);

  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();

  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
};

const resolvePatientProfileError = (error: unknown) => {
  const apiError = error as ApiError;
  const rawMessage =
    apiError?.data?.error ||
    apiError?.data?.message ||
    (error instanceof Error ? error.message : "");
  const normalized = rawMessage.toLowerCase();

  if (normalized.includes("telefone")) return "Informe um telefone válido ou deixe o campo vazio.";
  if (normalized.includes("perfil") || normalized.includes("autoriz")) {
    return "A edição deste perfil é exclusiva para perfis pessoais.";
  }
  if (normalized.includes("token") || normalized.includes("sess")) {
    return "Sua sessão precisa estar ativa para editar o perfil.";
  }

  return rawMessage || "Não foi possível salvar seu perfil agora.";
};

export const ProfileEditLogic = () => {
  const router = useRouter();
  const dispatch = useDispatch();
  const storedUser = useAppSelector((state) => state.user);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [isAvatarMenuOpen, setIsAvatarMenuOpen] = useState(false);

  const handleProfileUpdated = (data: PatientPrivateProfile) => {
    setApiError(null);
    dispatch(
      userActions.update({
        ...data.user,
        patient_profile: data.profile,
      }),
    );
    toast.success("Perfil atualizado com sucesso");
    router.push("/app/profile");
  };

  const handleAvatarUpdated = (data: PatientProfileAvatarUpload | PatientProfileAvatarRemoval) => {
    setApiError(null);
    dispatch(
      userActions.update({
        ...data.profile.user,
        patient_profile: data.profile.profile,
      }),
    );
  };

  const { deleteAvatar, profile, updateProfile, uploadAvatar } = usePatient({
    callbacks: {
      updateProfile: {
        onSuccess: handleProfileUpdated,
        onError: (error) => setApiError(resolvePatientProfileError(error)),
      },
      avatar: {
        onSuccess: handleAvatarUpdated,
        onError: (error) => setApiError(resolvePatientProfileError(error)),
      },
      deleteAvatar: {
        onSuccess: handleAvatarUpdated,
        onError: (error) => setApiError(resolvePatientProfileError(error)),
      },
    },
  });

  const form = usePatientProfileForm({ profile: profile.data, user: storedUser });
  const { formProps, hook } = form;

  const profileError = useMemo(
    () => (profile.error ? resolvePatientProfileError(profile.error) : null),
    [profile.error],
  );
  const visibleError = apiError || profileError;
  const isPatient = storedUser?.role === "paciente";
  const avatarSrc = resolvePublicMediaUrl(storedUser?.avatar);
  const avatarIsPublicMedia = isPublicMediaUrl(storedUser?.avatar);
  const isSaving = updateProfile.isPending;
  const isSavingAvatar = uploadAvatar.isPending || deleteAvatar.isPending;

  const onSubmit = hook.handleSubmit((values) => {
    setApiError(null);
    updateProfile.mutate(toPatientProfilePayload(values, profile.data));
  });

  const openAvatarFilePicker = () => {
    if (isSavingAvatar || !isPatient) return;
    avatarInputRef.current?.click();
  };

  const handleAvatarFilePickerOption = () => {
    setIsAvatarMenuOpen(false);
    openAvatarFilePicker();
  };

  const handleAvatarChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;
    setApiError(null);

    if (file.size > AVATAR_MAX_SIZE_BYTES) {
      setApiError("Envie uma foto de perfil de até 5MB.");
      return;
    }

    if (!AVATAR_ALLOWED_TYPES.includes(file.type)) {
      setApiError("Envie uma foto PNG, JPG ou WebP.");
      return;
    }

    uploadAvatar.mutate(file);
  };

  const handleAvatarRemoval = () => {
    if (isSavingAvatar || !storedUser?.avatar || !isPatient) return;
    setApiError(null);
    setIsAvatarMenuOpen(false);
    deleteAvatar.mutate();
  };

  useEffect(() => {
    if (!isAvatarMenuOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsAvatarMenuOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isAvatarMenuOpen]);

  return (
    <PrivateTemplate>
      <section className="mx-auto grid w-full max-w-[430px] gap-4 pb-6 sm:max-w-xl lg:max-w-2xl">
        <AppPageHeader backHref="/app/profile" backLabel="Voltar ao perfil" title="Editar perfil" />

        {!isPatient ? (
          <InlineAlert title="Perfil pessoal" variant="warning">
            Esta tela edita apenas dados do perfil pessoal. Psicólogos devem usar a tela de perfil
            profissional.
          </InlineAlert>
        ) : null}

        {profile.isLoading || profile.isPending ? (
          <div className="grid min-h-48 place-items-center rounded-[var(--lectum-card-radius)] border border-border bg-surface shadow-[var(--lectum-shadow-soft)]">
            <LoadingState label="Carregando seus dados" />
          </div>
        ) : null}

        {!profile.isLoading && !profile.isPending ? (
          <form
            className="grid gap-4"
            data-testid="form"
            id="patient-profile-form"
            noValidate
            onSubmit={onSubmit}
          >
            <section className="grid justify-items-center gap-3 rounded-[var(--lectum-card-radius)] border border-border bg-surface px-5 py-8 text-center shadow-[var(--lectum-shadow-soft)]">
              <div className="relative h-32 w-32">
                <div className="grid h-32 w-32 place-items-center overflow-hidden rounded-full bg-surface-muted text-3xl font-extrabold text-primary ring-4 ring-primary-soft">
                  {avatarSrc ? (
                    <Image
                      alt={storedUser?.name || "Foto do perfil"}
                      className="h-full w-full object-cover"
                      height={128}
                      src={avatarSrc}
                      unoptimized={avatarIsPublicMedia}
                      width={128}
                    />
                  ) : (
                    getInitials(storedUser?.name, storedUser?.email)
                  )}
                </div>
                <button
                  aria-expanded={isAvatarMenuOpen}
                  aria-haspopup="menu"
                  aria-label="Abrir opções da foto de perfil"
                  className="absolute right-1 bottom-1 z-10 grid h-9 w-9 place-items-center rounded-full bg-primary text-white ring-4 ring-surface shadow-[var(--lectum-shadow-soft)] transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={isSavingAvatar || !isPatient}
                  onClick={() => setIsAvatarMenuOpen((current) => !current)}
                  type="button"
                >
                  {isSavingAvatar ? (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <Pencil className="h-4 w-4" aria-hidden="true" />
                  )}
                </button>
                {isAvatarMenuOpen ? (
                  <>
                    <button
                      aria-label="Fechar opções da foto"
                      className="fixed inset-0 z-20 cursor-default bg-transparent"
                      onClick={() => setIsAvatarMenuOpen(false)}
                      tabIndex={-1}
                      type="button"
                    />
                    <div
                      className="fixed inset-x-4 bottom-[calc(env(safe-area-inset-bottom)+1rem)] z-30 overflow-hidden rounded-[28px] border border-border bg-white p-2 text-left shadow-[0_24px_70px_rgba(15,23,42,0.22)] ring-1 ring-[#D9E8F8]/70 sm:absolute sm:top-[calc(100%+0.75rem)] sm:right-auto sm:bottom-auto sm:left-1/2 sm:w-56 sm:-translate-x-1/2 sm:rounded-2xl"
                      role="menu"
                    >
                      <button
                        className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold text-foreground transition hover:bg-primary-soft hover:text-primary disabled:cursor-not-allowed disabled:opacity-60"
                        disabled={isSavingAvatar || !isPatient}
                        onClick={handleAvatarFilePickerOption}
                        role="menuitem"
                        type="button"
                      >
                        <span className="grid h-9 w-9 place-items-center rounded-full bg-primary-soft text-primary">
                          <ImagePlus className="h-4 w-4" aria-hidden="true" />
                        </span>
                        Alterar foto
                      </button>
                      <button
                        className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold text-danger transition hover:bg-danger/10 disabled:cursor-not-allowed disabled:opacity-50"
                        disabled={isSavingAvatar || !storedUser?.avatar || !isPatient}
                        onClick={handleAvatarRemoval}
                        role="menuitem"
                        type="button"
                      >
                        <span className="grid h-9 w-9 place-items-center rounded-full bg-danger/10 text-danger">
                          <Trash2 className="h-4 w-4" aria-hidden="true" />
                        </span>
                        Remover foto
                      </button>
                    </div>
                  </>
                ) : null}
              </div>
              <p className="max-w-full whitespace-nowrap text-[11px] leading-5 tracking-[-0.02em] text-muted sm:text-sm sm:tracking-normal">
                Envie uma foto de perfil PNG, JPG ou WebP de até 5MB
              </p>
              <input
                accept="image/png,image/jpeg,image/webp"
                className="sr-only"
                onChange={handleAvatarChange}
                ref={avatarInputRef}
                type="file"
              />
            </section>
            <section className="grid gap-3 rounded-[var(--lectum-card-radius)] border border-border bg-surface p-5 shadow-[var(--lectum-shadow-soft)]">
              <div className="flex items-center gap-2">
                <UserRound className="h-5 w-5 text-primary" aria-hidden="true" />
                <h2 className="text-lg font-extrabold text-foreground">Informações Básicas</h2>
              </div>
              <div className="grid min-w-0 gap-0.5">
                {formProps.fields.map((field) => {
                  const Component = components[field.field];

                  if (!Component) return null;

                  return (
                    <Component
                      control={hook.control}
                      key={`patient-profile-${String(field.name)}`}
                      {...field}
                    />
                  );
                })}
              </div>
            </section>
            {visibleError ? (
              <InlineAlert title="Não foi possível salvar" variant="error">
                {visibleError}
              </InlineAlert>
            ) : null}
            <Button
              className="h-14 w-full rounded-full"
              disabled={isSaving || !isPatient}
              type="submit"
            >
              {isSaving ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <Save className="h-4 w-4" aria-hidden="true" />
              )}
              Salvar Alterações
            </Button>
          </form>
        ) : null}
        {!profile.isLoading && !profile.isPending ? <AccountDeleteSection /> : null}
      </section>
    </PrivateTemplate>
  );
};
