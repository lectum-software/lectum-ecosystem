"use client";

import { Heart, Share2 } from "lucide-react";
import { type CSSProperties, type MouseEvent, type Ref, useEffect, useState } from "react";
import { cn } from "@/lib/utils";

import { getPsychologistDisplayName, type PsychologistCardItem } from "./psychologist-card-support";

export const AvailabilityBadge = ({ available }: { available?: boolean }) => {
  if (!available) return null;

  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full text-[10px] font-semibold leading-none text-success"
      style={{
        height: "clamp(22px, 3.6vw, 26px)",
        paddingLeft: "clamp(10px, 3vw, 14px)",
        paddingRight: "clamp(10px, 3vw, 14px)",
        background: "color-mix(in srgb, var(--lectum-media-foreground) 92%, transparent)",
        borderRadius: "999px",
        zIndex: 5,
      }}
    >
      <span
        className="h-2 w-2 rounded-full bg-success motion-safe:animate-pulse"
        aria-hidden="true"
      />
      Disponível hoje
    </span>
  );
};

export const FavoriteButton = ({
  canFavorite = true,
  favoritePending,
  onToggleFavorite,
  psychologist,
  buttonStyle,
  className,
}: {
  canFavorite?: boolean;
  favoritePending?: boolean;
  onToggleFavorite: (psychologist: PsychologistCardItem) => void;
  psychologist: PsychologistCardItem;
  buttonStyle?: CSSProperties;
  className?: string;
}) => {
  const isFavorited = psychologist.favorited;
  const displayName = getPsychologistDisplayName(psychologist);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (!isAnimating) return;

    const timer = window.setTimeout(() => {
      setIsAnimating(false);
    }, 420);

    return () => {
      clearTimeout(timer);
    };
  }, [isAnimating]);

  const handleFavoriteClick = () => {
    if (favoritePending || !canFavorite) return;

    setIsAnimating(true);
    onToggleFavorite(psychologist);
  };

  return (
    <button
      aria-label={
        !canFavorite
          ? "Favoritos disponíveis apenas para usuários autenticados"
          : psychologist.favorited
            ? `Remover ${displayName} dos favoritos`
            : `Favoritar ${displayName}`
      }
      aria-pressed={psychologist.favorited}
      className={cn(
        "grid place-items-center rounded-full transition disabled:cursor-not-allowed disabled:opacity-60",
        "duration-300",
        isAnimating ? "scale-110" : "scale-100",
        isFavorited ? "bg-danger-soft text-danger" : "bg-primary-foreground/94 text-muted",
        className,
      )}
      disabled={favoritePending || !canFavorite}
      onClick={handleFavoriteClick}
      style={{
        width: "clamp(38px, 10vw, 44px)",
        height: "clamp(38px, 10vw, 44px)",
        borderRadius: "999px",
        zIndex: 5,
        ...buttonStyle,
      }}
      title={!canFavorite ? "Favoritos disponíveis apenas para usuários autenticados" : undefined}
      type="button"
    >
      <Heart
        aria-hidden="true"
        className={cn(
          "h-[22px] w-[22px] transition-transform duration-300",
          isAnimating ? "scale-125" : "scale-100",
          isFavorited ? "fill-danger stroke-danger" : "fill-none stroke-muted",
        )}
      />
    </button>
  );
};

export const ShareButton = ({
  route,
  psychologistName,
  buttonStyle,
  className,
  buttonRef,
}: {
  route: string;
  psychologistName: string;
  buttonRef?: Ref<HTMLButtonElement>;
  buttonStyle?: CSSProperties;
  className?: string;
}) => {
  const handleShare = async (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();

    const shareUrl = new URL(route, window.location.origin).toString();

    if (typeof navigator !== "undefined" && "share" in navigator) {
      try {
        await navigator.share({
          title: `Perfil de ${psychologistName}`,
          text: `Confira o perfil de ${psychologistName} na Lectum.`,
          url: shareUrl,
        });

        return;
      } catch {
        // ignore
      }
    }

    await navigator.clipboard?.writeText(shareUrl);
  };

  return (
    <button
      ref={buttonRef}
      aria-label={`Compartilhar perfil de ${psychologistName}`}
      className={cn(
        "grid place-items-center rounded-full bg-primary-foreground/94 text-muted transition",
        className,
      )}
      onClick={handleShare}
      style={{
        width: "clamp(38px, 10vw, 44px)",
        height: "clamp(38px, 10vw, 44px)",
        borderRadius: "999px",
        zIndex: 6,
        ...buttonStyle,
      }}
      type="button"
    >
      <Share2 aria-hidden="true" className="h-5 w-5" />
    </button>
  );
};
