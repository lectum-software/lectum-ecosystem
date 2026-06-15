"use client";

import { ArrowLeft, Camera, Loader2, Save, Trash2, UserRound } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type ChangeEvent, useMemo, useRef, useState } from "react";
import { useDispatch } from "react-redux";
import { usePatient } from "@/api/callers/patient";
import type {
  PatientPrivateProfile,
  PatientProfileAvatarRemoval,
  PatientProfileAvatarUpload,
} from "@/api/generator/types";
import { components } from "@/components/controllers";
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
    return "A edição deste perfil é exclusiva para pacientes.";
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

  const handleProfileUpdated = (data: PatientPrivateProfile) => {
    setApiError(null);
    dispatch(
      userActions.update({
        ...data.user,
        patient_profile: data.profile,
      }),
    );
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
    deleteAvatar.mutate();
  };

  return (
    <PrivateTemplate>
      <section className="mx-auto grid w-full max-w-[430px] gap-4 pb-6 sm:max-w-xl lg:max-w-2xl">
        <Button
          asChild
          className="h-10 w-fit justify-self-start rounded-full px-3 text-sm font-semibold text-muted hover:text-primary"
          variant="ghost"
        >
          <Link href="/app/profile" aria-label="Voltar ao perfil">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Voltar
          </Link>
        </Button>

        {!isPatient ? (
          <InlineAlert title="Perfil de paciente" variant="warning">
            Esta tela edita apenas dados do paciente. Psicólogos devem usar a tela de perfil
            profissional.
          </InlineAlert>
        ) : null}

        {profile.isLoading || profile.isPending ? (
          <div className="grid min-h-48 place-items-center rounded-[var(--lectum-card-radius)] border border-border bg-surface shadow-[var(--lectum-shadow-soft)]">
            <LoadingState label="Carregando dados do paciente" />
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
                      alt={storedUser?.name || "Foto do paciente"}
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
                  aria-label="Alterar foto de perfil"
                  className="absolute right-1 bottom-1 z-10 grid h-9 w-9 place-items-center rounded-full bg-primary text-white ring-4 ring-surface shadow-[var(--lectum-shadow-soft)] transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={isSavingAvatar || !isPatient}
                  onClick={openAvatarFilePicker}
                  type="button"
                >
                  {isSavingAvatar ? (
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <Camera className="h-4 w-4" aria-hidden="true" />
                  )}
                </button>
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
              {storedUser?.avatar ? (
                <button
                  className="text-xs font-semibold text-danger transition hover:text-danger/80 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={isSavingAvatar || !isPatient}
                  onClick={handleAvatarRemoval}
                  type="button"
                >
                  Remover foto
                </button>
              ) : null}
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
            <section className="grid justify-items-center gap-3 border-t border-border py-8 text-center">
              <button
                className="inline-flex items-center gap-2 text-sm font-semibold text-danger disabled:cursor-not-allowed disabled:opacity-60"
                disabled
                type="button"
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
                Excluir minha conta
              </button>
            </section>
          </form>
        ) : null}
      </section>
    </PrivateTemplate>
  );
};
