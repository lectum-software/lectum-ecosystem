"use client";

import Image from "next/image";
import type { DirectoryPsychologist } from "@/api/generator/types/directory";
import { VerifiedBadgeIcon } from "@/components/ui/verified-badge";
import { isPublicMediaUrl, resolvePublicMediaUrl } from "@/utils/media";
import { getInitials } from "./profile-format";

export const PsychologistFilterSearchSuggestions = ({
  isLoading,
  items,
  onSelect,
}: {
  isLoading: boolean;
  items: DirectoryPsychologist[];
  onSelect: (psychologist: DirectoryPsychologist) => void;
}) => (
  <div
    aria-label="Sugestões de psicólogos"
    className="mt-2 overflow-hidden rounded-2xl border border-border/80 bg-surface text-foreground shadow-[0_18px_45px_rgb(15_23_42_/_10%)]"
    onMouseDown={(event) => event.preventDefault()}
    role="listbox"
  >
    <div className="border-border/70 border-b px-3 py-2 text-[11px] font-extrabold tracking-[0.08em] text-muted uppercase">
      Profissionais encontrados
    </div>

    {isLoading ? (
      <div className="px-3 py-3 text-sm font-medium text-muted">Buscando psicólogos...</div>
    ) : items.length > 0 ? (
      <div className="max-h-[292px] overflow-y-auto py-1">
        {items.map((psychologist) => {
          const avatarSrc = resolvePublicMediaUrl(psychologist.avatar);

          return (
            <button
              aria-label={`Abrir perfil de ${psychologist.name}`}
              aria-selected={false}
              className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition duration-150 ease-out hover:bg-primary-soft/55 focus-visible:bg-primary-soft/65 focus-visible:outline-none"
              key={psychologist.id}
              onClick={() => onSelect(psychologist)}
              role="option"
              type="button"
            >
              <span className="relative grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full bg-primary-soft text-sm font-extrabold text-primary ring-1 ring-primary/10">
                {avatarSrc ? (
                  <Image
                    alt=""
                    className="object-cover"
                    fill
                    sizes="40px"
                    src={avatarSrc}
                    unoptimized={isPublicMediaUrl(psychologist.avatar)}
                  />
                ) : (
                  getInitials(psychologist.name)
                )}
              </span>

              <span className="flex min-w-0 flex-1 items-center gap-1.5">
                <span className="truncate text-sm font-extrabold leading-5 text-foreground">
                  {psychologist.name}
                </span>
                {psychologist.verified ? <VerifiedBadgeIcon className="h-4 w-4 shrink-0" /> : null}
              </span>
            </button>
          );
        })}
      </div>
    ) : (
      <div className="px-3 py-3 text-sm font-medium text-muted">Nenhum psicólogo encontrado</div>
    )}
  </div>
);

export const getReadableVideoDuration = (video: HTMLVideoElement) =>
  Number.isFinite(video.duration) && video.duration > 0 ? video.duration : 0;
