import { UsersRound } from "lucide-react";
import type { AdminPsychologistStatistics } from "@/api/req/psychologists/types/statistics";

const number = new Intl.NumberFormat("pt-BR");
const date = new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo" });
export function AcquiredPatientsCard({
  data,
}: {
  data: AdminPsychologistStatistics["whatsapp_reports"];
}) {
  return (
    <article className="h-full w-full min-w-0 overflow-hidden rounded-card border border-primary/35 bg-surface p-4 shadow-admin-soft">
      <span className="grid h-10 w-10 place-items-center rounded-full bg-primary-soft text-primary">
        <UsersRound aria-hidden className="h-5 w-5" />
      </span>
      <h3 className="mt-4 text-xs font-extrabold leading-snug">Pacientes adquiridos</h3>
      <p className="mt-2 text-2xl font-extrabold leading-none tabular-nums">
        {data?.acquired_patients == null ? "—" : number.format(data.acquired_patients)}
      </p>
      <p className="mt-3 text-xs text-muted">Dados informados pelo psicólogo.</p>
      {data && data.unanswered_weeks > 0 ? (
        <p className="mt-1 text-xs text-muted">
          {data.unanswered_weeks}{" "}
          {data.unanswered_weeks === 1 ? "semana pendente" : "semanas pendentes"}
        </p>
      ) : null}
    </article>
  );
}
export function AcquiredPatientsSection({
  data,
}: {
  data: AdminPsychologistStatistics["whatsapp_reports"];
}) {
  return (
    <section
      aria-label="Histórico de pacientes adquiridos"
      className="mt-5 min-w-0 border-t border-border pt-3"
    >
      {!data ? (
        <p className="mt-3 text-sm text-muted">Dados ainda indisponíveis.</p>
      ) : (
        <>
          <p className="mt-3 text-sm text-muted">
            {data.answered_weeks}{" "}
            {data.answered_weeks === 1 ? "semana respondida" : "semanas respondidas"} ·{" "}
            {data.unanswered_weeks} {data.unanswered_weeks === 1 ? "pendente" : "pendentes"}
          </p>
          {data.total_weeks === 0 ? (
            <p className="mt-3 text-sm text-muted">Sem resumos para este período.</p>
          ) : (
            <details className="mt-4">
              <summary className="cursor-pointer py-2 text-sm font-semibold">
                Histórico semanal
              </summary>
              <div className="max-w-full overflow-x-auto">
                <table
                  className="w-full min-w-[460px] text-left text-sm"
                  aria-label="Respostas semanais do psicólogo"
                >
                  <thead className="border-b border-border text-xs text-muted">
                    <tr>
                      <th scope="col" className="px-2 py-3">
                        Semana
                      </th>
                      <th scope="col" className="px-2 py-3 text-right">
                        Cliques no WhatsApp
                      </th>
                      <th scope="col" className="px-2 py-3 text-right">
                        Pacientes adquiridos
                      </th>
                      <th scope="col" className="px-2 py-3">
                        Resposta
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.weeks.map((week) => (
                      <tr key={week.id} className="border-b border-border/60">
                        <th scope="row" className="whitespace-nowrap px-2 py-3 font-medium">
                          {date.format(new Date(week.week_start))} a{" "}
                          {date.format(new Date(new Date(week.week_end).getTime() - 1))}
                        </th>
                        <td className="px-2 py-3 text-right tabular-nums">
                          {number.format(week.people_count)}
                        </td>
                        <td className="px-2 py-3 text-right tabular-nums">
                          {week.acquired_count === null ? "—" : number.format(week.acquired_count)}
                        </td>
                        <td className="whitespace-nowrap px-2 py-3 text-muted">
                          {week.answered_at ? date.format(new Date(week.answered_at)) : "Pendente"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {data.total_weeks > data.weeks.length ? (
                <p className="mt-2 text-xs text-muted">
                  Exibindo as {data.weeks.length} semanas mais recentes. Refine o período para
                  consultar semanas anteriores.
                </p>
              ) : null}
            </details>
          )}
        </>
      )}
    </section>
  );
}
