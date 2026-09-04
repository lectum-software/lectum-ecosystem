import type { DirectoryPsychologist } from "@/api/generator/types/directory";
import { resolvePublicMediaUrl } from "@/utils/media";
import { buildBenefitChips } from "../../modules/filter-config";
import { clampNumber, VIDEO_PROGRESS_BOTTOM_WITH_NAV } from "../../modules/onboarding";
import { formatDisplayName, splitNameForBadge } from "../../modules/profile-format";
import type { PsychologistsViewModel } from "../types";

export const buildPsychologistSlideView = ({
  index,
  model,
  psychologist,
}: {
  index: number;
  model: PsychologistsViewModel;
  psychologist: DirectoryPsychologist;
}) => {
  const {
    actionColumnTranslateY,
    activePsychologistIndex,
    currentUserId,
    favoriteOverrides,
    isUiHidden,
    isVideoMuted,
    isVideoPaused,
    isVideoPlaybackFailed,
    metrics,
    videoProgress,
    videoVolume,
  } = model.setup;
  const { favoritePendingId } = model.favorite;

  const isActiveSlide = index === activePsychologistIndex;

  const slideVideoSrc = resolvePublicMediaUrl(psychologist.video_url);

  const slidePosterSrc = psychologist.video_cover_url
    ? resolvePublicMediaUrl(psychologist.video_cover_url)
    : null;

  const slideShouldShowVideo = Boolean(slideVideoSrc) && (!isActiveSlide || !isVideoPlaybackFailed);

  const slideIsUiHidden = isActiveSlide && isUiHidden;

  const slideUsesNativeVideoControls = isActiveSlide && slideShouldShowVideo && slideIsUiHidden;

  const slideShouldRenderProgress =
    Boolean(slideVideoSrc) &&
    (!metrics.isDesktopLayout || isActiveSlide) &&
    (!isActiveSlide || slideShouldShowVideo) &&
    !slideUsesNativeVideoControls;

  const slideBio = psychologist.headline?.trim() ?? "";

  const slideDisplayName = formatDisplayName(psychologist.name);

  const slideNameParts = splitNameForBadge(psychologist.name);

  const slideBenefitChips = buildBenefitChips(psychologist);

  const slideIsOwnProfile = Boolean(currentUserId && currentUserId === psychologist.id);

  const slideIsFavorited = slideIsOwnProfile
    ? false
    : (favoriteOverrides[psychologist.id] ?? Boolean(psychologist.favorited));

  const slideFavoriteLabel = slideIsOwnProfile
    ? "Você não pode favoritar o próprio perfil"
    : slideIsFavorited
      ? `Remover ${slideDisplayName} dos favoritos`
      : `Favoritar ${slideDisplayName}`;

  const slideIsFavoritePending = !slideIsOwnProfile && favoritePendingId === psychologist.id;

  const slideActionColumnTranslateY = isActiveSlide ? actionColumnTranslateY : 0;

  const slideShouldHideChrome = slideIsUiHidden || (metrics.isDesktopLayout && !isActiveSlide);

  const slideFavoriteDisabled = slideShouldHideChrome || slideIsOwnProfile;

  const slideFavoriteTabIndex = slideFavoriteDisabled ? -1 : undefined;

  const slideUiVisibilityClass = slideShouldHideChrome
    ? "psychologists-ui-inert pointer-events-none opacity-0"
    : "opacity-100";

  const slideOverlayVisibilityClass = slideShouldHideChrome ? "opacity-0" : "opacity-100";

  const slideProgressRatio =
    isActiveSlide && videoProgress.duration
      ? clampNumber(videoProgress.currentTime / videoProgress.duration, 0, 1)
      : 0;

  const slideProgressBottom = metrics.navBarHeight > 0 ? VIDEO_PROGRESS_BOTTOM_WITH_NAV : "0px";

  const slideCanSeekProgress =
    isActiveSlide && slideShouldShowVideo && slideIsUiHidden && !slideUsesNativeVideoControls;

  const slideVideoAreaLabel =
    isActiveSlide && slideShouldShowVideo && (isVideoMuted || videoVolume <= 0 || isVideoPaused)
      ? `Ativar som e reproduzir vídeo de ${slideDisplayName}`
      : slideIsUiHidden
        ? `Mostrar interface de ${slideDisplayName}`
        : `Ocultar interface de ${slideDisplayName}`;

  return {
    index,
    psychologist,
    isActiveSlide,
    slideVideoSrc,
    slidePosterSrc,
    slideShouldShowVideo,
    slideIsUiHidden,
    slideUsesNativeVideoControls,
    slideShouldRenderProgress,
    slideBio,
    slideDisplayName,
    slideNameParts,
    slideBenefitChips,
    slideIsOwnProfile,
    slideIsFavorited,
    slideFavoriteLabel,
    slideIsFavoritePending,
    slideActionColumnTranslateY,
    slideShouldHideChrome,
    slideFavoriteDisabled,
    slideFavoriteTabIndex,
    slideUiVisibilityClass,
    slideOverlayVisibilityClass,
    slideProgressRatio,
    slideProgressBottom,
    slideCanSeekProgress,
    slideVideoAreaLabel,
  };
};

export type PsychologistSlideView = ReturnType<typeof buildPsychologistSlideView>;
