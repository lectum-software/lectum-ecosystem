import { ArrowDown, ArrowUp } from "lucide-react";

export const RuleOrderControls = ({
  disabled,
  index,
  onMove,
  total,
}: {
  disabled: boolean;
  index: number;
  onMove: (targetIndex: number) => void;
  total: number;
}) => (
  <>
    {[
      { delta: -1, Icon: ArrowUp, label: "Subir" },
      { delta: 1, Icon: ArrowDown, label: "Descer" },
    ].map(({ delta, Icon, label }) => {
      const targetIndex = index + delta;
      const unavailable =
        disabled || index < 0 || index >= total || targetIndex < 0 || targetIndex >= total;
      return (
        <button
          aria-label={`${label} regra ${index + 1}`}
          className="inline-flex min-h-11 min-w-11 items-center justify-center gap-2 rounded-xl border border-border px-3 text-sm font-bold text-muted transition hover:border-primary hover:text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-40"
          data-rule-order={delta < 0 ? "up" : "down"}
          disabled={unavailable}
          key={label}
          onClick={() => {
            if (!unavailable) onMove(targetIndex);
          }}
          title={`${label} regra ${index + 1}`}
          type="button"
        >
          <Icon aria-hidden className="h-4 w-4" />
          {label}
        </button>
      );
    })}
  </>
);
