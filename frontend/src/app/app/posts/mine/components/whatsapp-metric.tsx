import { POST_ACTION_COUNT_CLASSNAME } from "@/components/community/post-action-button";
import { WhatsAppIcon } from "@/components/ui/whatsapp-icon";

export const WhatsappMetric = ({
  count,
  isPsychologist,
}: {
  count?: number;
  isPsychologist: boolean;
}) => {
  if (!isPsychologist || typeof count !== "number" || !Number.isSafeInteger(count) || count < 0)
    return null;
  const label = `Cliques no WhatsApp: ${count.toLocaleString("pt-BR")}`;
  return (
    <span
      className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 px-2 text-muted"
      aria-label={label}
      role="img"
      title={label}
      data-post-card-ignore-click="true"
    >
      <WhatsAppIcon aria-hidden="true" className="h-[17px] w-[17px] shrink-0" />
      <span aria-hidden="true" className={POST_ACTION_COUNT_CLASSNAME}>
        {count.toLocaleString("pt-BR")}
      </span>
    </span>
  );
};
