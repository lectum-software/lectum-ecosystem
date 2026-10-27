import { UserRoundPlus } from "lucide-react";
import Link from "next/link";
import { Button } from "@/registry/new-york-v4/ui/button";

type Props = {
  startLabel?: string;
  endLabel?: string;
  peopleCount?: number;
  answered: boolean;
  href?: string | null;
  relativeTime: string;
};

export function WeeklyWhatsappNotification({
  startLabel,
  endLabel,
  peopleCount,
  answered,
  href,
  relativeTime,
}: Props) {
  return (
    <div className="flex w-full items-start gap-4 px-3 py-3 text-left">
      <span className="mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-primary-soft text-primary">
        <UserRoundPlus className="h-5 w-5" aria-hidden={true} />
      </span>
      <div className="min-w-0 flex-1 border-b border-border/70 pb-4">
        <div className="flex items-start justify-between gap-3">
          <h3 className="min-w-0 text-[15px] font-bold leading-5 text-foreground">
            Pacientes adquiridos
          </h3>
          {!answered ? (
            <span className="mt-1 inline-flex shrink-0 items-center">
              <span className="h-2.5 w-2.5 rounded-full bg-primary" aria-hidden={true} />
              <span className="sr-only">Não lida</span>
            </span>
          ) : null}
        </div>
        <p className="mt-1 text-sm text-muted">
          {startLabel && endLabel ? `De ${startLabel} a ${endLabel}, ` : ""}
          {peopleCount !== undefined
            ? `${peopleCount} ${peopleCount === 1 ? "pessoa clicou" : "pessoas clicaram"} no seu WhatsApp. `
            : ""}
          {answered ? "Agendamentos informados." : "Quantas agendaram uma consulta?"}
        </p>
        {href ? (
          <Button
            asChild
            className="mt-3 min-h-11 max-w-full whitespace-normal rounded-lg px-4 py-2 text-center text-sm font-semibold shadow-none"
          >
            <Link href={href}>{answered ? "Ver resposta" : "Informar pacientes"}</Link>
          </Button>
        ) : null}
        <span className="mt-2 block text-xs font-medium text-subtle">{relativeTime}</span>
      </div>
    </div>
  );
}
