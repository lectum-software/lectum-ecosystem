import { Loader2, Send } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/registry/new-york-v4/ui/button";

export const ReplyComposerSubmitButton = ({
  appearance = "default",
  disabled,
  loading,
  onClick,
}: {
  appearance?: "default" | "reels";
  disabled: boolean;
  loading: boolean;
  onClick: () => void;
}) => (
  <Button
    aria-label="Enviar resposta"
    className={cn(
      "h-11 w-11 shrink-0 rounded-full bg-primary p-0 text-primary-foreground shadow-lectum-soft hover:bg-primary-hover disabled:bg-surface-muted disabled:text-subtle disabled:opacity-100 disabled:shadow-none",
      appearance === "reels" &&
        "text-media-foreground disabled:bg-media-control/92 disabled:text-media-foreground/40",
    )}
    disabled={disabled}
    onClick={onClick}
    onPointerDown={(event) => {
      // Keep the focused field and send target in place until the click submits.
      if (appearance === "reels" && event.button === 0) event.preventDefault();
    }}
    type="button"
  >
    {loading ? (
      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
    ) : (
      <Send className="h-4 w-4" aria-hidden="true" />
    )}
  </Button>
);
