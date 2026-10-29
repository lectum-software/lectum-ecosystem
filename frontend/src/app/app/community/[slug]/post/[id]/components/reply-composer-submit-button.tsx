import { Loader2, Send } from "lucide-react";
import { Button } from "@/registry/new-york-v4/ui/button";

export const ReplyComposerSubmitButton = ({
  disabled,
  loading,
  onClick,
}: {
  disabled: boolean;
  loading: boolean;
  onClick: () => void;
}) => (
  <Button
    aria-label="Enviar resposta"
    className="h-11 w-11 shrink-0 rounded-full bg-primary p-0 text-primary-foreground shadow-lectum-soft hover:bg-primary-hover disabled:bg-surface-muted disabled:text-subtle disabled:opacity-100 disabled:shadow-none"
    disabled={disabled}
    onClick={onClick}
    type="button"
  >
    {loading ? (
      <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
    ) : (
      <Send className="h-4 w-4" aria-hidden="true" />
    )}
  </Button>
);
