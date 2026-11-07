export function VerticalVideoPlayerSurface({
  title,
  opensExpanded,
  hidden,
  hasContentAction,
  persistent,
  mediaLayout,
  controls,
  onClick,
}: {
  title: string;
  opensExpanded: boolean;
  hidden: boolean;
  hasContentAction: boolean;
  persistent: boolean;
  mediaLayout: boolean;
  controls: boolean;
  onClick: () => void;
}) {
  const label = opensExpanded
    ? `Abrir vídeo: ${title}`
    : hidden
      ? `Mostrar controles do vídeo: ${title}`
      : hasContentAction
        ? `Mostrar interface do vídeo: ${title}`
        : `Alternar reprodução do vídeo: ${title}`;
  const bottom = persistent
    ? hidden
      ? 0
      : mediaLayout
        ? "calc(var(--lectum-bottom-fixed-padding) + 4.5rem)"
        : "calc(var(--lectum-bottom-fixed-padding) + 5.25rem)"
    : controls
      ? "max(64px, 20%)"
      : 0;
  return (
    <button
      data-lectum-video-surface="true"
      aria-label={label}
      className="absolute inset-x-0 top-0 z-[1] cursor-pointer border-0 bg-transparent p-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-media-foreground/50"
      onClick={onClick}
      style={{ bottom }}
      type="button"
    />
  );
}
