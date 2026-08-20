"use client";

import { useRouter } from "next/navigation";
import {
  type ChangeEvent,
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { type FieldPath, useFieldArray } from "react-hook-form";
import { toast } from "sonner";
import { useAccount } from "@/api/callers/account";
import { usePsychologistFreeProfile } from "@/api/callers/psychologist-free-profile";
import { components } from "@/components/controllers";
import { useAppSelector } from "@/hooks/redux";
import { isPublicMediaUrl, resolvePublicMediaUrl } from "@/utils/media";
import { PROFILE_VIDEO_DEFAULT_LIMIT_MB } from "@/utils/profile-video-upload";
import { CITY_OPTIONS_BY_STATE } from "../brazil-cities";
import {
  AVATAR_MAX_SIZE_BYTES,
  type AvatarDraft,
  type AvatarDragState,
  clampPercent,
  cropAvatarFile,
} from "../components/avatar-city-fields";
import {
  compareCatalogItems,
  createOrderedSpecialtyGroups,
  PROFESSIONAL_PROFILE_MENU_HREF,
  PSYCHOLOGIST_PROFILE_VIDEO_TIP_SELECTOR,
  resolveApiError,
  toFreeProfessionalProfilePayload,
} from "../modules/profile-setup-support";
import {
  type AcademicFormationForm,
  type FreeProfileForm,
  toWhatsappPhoneE164,
  useFreeProfileForm,
} from "../use-form";
import { useProfileVideoUpload } from "./use-profile-video-upload";

export const useProfessionalProfileSetupController = () => {
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
  const videoUploadLimitMb =
    profile.data?.upload_limits?.presentation_video_mb ?? PROFILE_VIDEO_DEFAULT_LIMIT_MB;
  const { handleFileChange: handleVideoChange, progress: videoUploadProgress } =
    useProfileVideoUpload({
      maxSizeMb: videoUploadLimitMb,
      onFileSelected: () => setVideoActionsOpen(false),
      startUpload: (input, onSettled) => uploadVideo.mutate(input, { onSettled }),
    });
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
    profile.data?.activation && !profile.data.activation.active && published,
  );
  const showHiddenProfileBanner = Boolean(profile.data && !published);
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
  const orderedSpecialtyGroups = useMemo(
    () => createOrderedSpecialtyGroups(profile.data),
    [profile.data],
  );
  const orderedServiceOptions = useMemo(
    () => [...(profile.data?.catalogs.services || [])].sort(compareCatalogItems),
    [profile.data?.catalogs.services],
  );
  const orderedTargetAudienceOptions = useMemo(
    () => [...(profile.data?.catalogs.target_audiences || [])].sort(compareCatalogItems),
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
    name: keyof Pick<
      FreeProfileForm,
      "specialty_ids" | "service_ids" | "approach_ids" | "target_audience"
    >,
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

    update.mutate(
      toFreeProfessionalProfilePayload(values, profile.data, shouldLockProfessionalIdentityFields),
    );
  });

  return {
    Form,
    academicFormations,
    addressCity,
    addressState,
    applyAvatarDraft,
    availableDaysError,
    avatarActionsOpen,
    avatarDraft,
    avatarEditorOpen,
    avatarFrameRef,
    avatarInputRef,
    canUploadVideo,
    cityOptions,
    clearAvatarDraft,
    confirmVideoRemoval,
    coverImageActionsOpen,
    coverImageDraftUrl,
    coverImageInputRef,
    deleteCoverImage,
    deleteVideo,
    form,
    handleAvatarChange,
    handleAvatarPointerDown,
    handleAvatarPointerEnd,
    handleAvatarPointerMove,
    handleAvatarRemoval,
    handleCoverImageChange,
    handleCoverImageRemoval,
    handleVideoActionsToggle,
    handleVideoChange,
    handleVideoCoverChange,
    handleVideoCoverRequest,
    handleVideoRemoval,
    handleVideoUploadCardClick,
    isPublicAvatar,
    isPublicCoverImage,
    isSavingMedia,
    isSubmitting,
    lockedCrpRegionFieldProps,
    lockedIdentityFieldProps,
    openAvatarFilePicker,
    openCoverImageFilePicker,
    openVideoFilePicker,
    orderedApproachOptions,
    orderedServiceOptions,
    orderedSpecialtyGroups,
    orderedTargetAudienceOptions,
    profile,
    publicProfileHref,
    published,
    renderAcademicField,
    renderField,
    selectedApproaches,
    selectedDays,
    selectedServices,
    selectedSpecialties,
    selectedTargets,
    serviceIdsError,
    setArrayValue,
    setAvatarActionsOpen,
    setAvatarEditorOpen,
    setCatalogValue,
    setCoverImageActionsOpen,
    setFailedCoverImageUrl,
    setShowProfileVideoTip,
    setVideoRemovalConfirmOpen,
    showInactiveProfileBanner,
    showHiddenProfileBanner,
    showProfileVideoTip,
    submit,
    targetAudienceError,
    update,
    uploadAvatar,
    uploadCoverImage,
    uploadVideo,
    uploadVideoCover,
    videoUploadLimitMb,
    videoUploadProgress,
    videoActionsOpen,
    videoCoverInputRef,
    videoCoverSrc,
    videoInputRef,
    videoRemovalConfirmOpen,
    videoSrc,
    visibleAvatarSrc,
    visibleCoverImageSrc,
    whatsappUrl,
  };
};

export type ProfessionalProfileSetupController = ReturnType<
  typeof useProfessionalProfileSetupController
>;
