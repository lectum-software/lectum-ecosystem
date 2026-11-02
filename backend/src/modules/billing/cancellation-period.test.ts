import assert from "node:assert/strict";
import { test } from "node:test";
import { resolveCancellationState } from "./cancellation-period";

const end = new Date("2027-02-10T12:00:00Z");
test("cancelamento preserva o prazo vigente, sem aceitar extensao do webhook", () => {
  assert.deepEqual(
    resolveCancellationState(
      { status: "ativa", current_period_end: end },
      {
        status: "cancelada",
        currentPeriodEnd: new Date("2027-03-10"),
      },
    ),
    { status: "cancelada", current_period_end: end },
  );
});
test("webhooks atrasados nao reativam nem encurtam o prazo cancelado", () => {
  for (const status of ["ativa", "inativa", "inadimplente", "cancelada"]) {
    assert.deepEqual(
      resolveCancellationState(
        { status: "cancelada", current_period_end: end },
        {
          status,
          currentPeriodEnd: null,
        },
      ),
      { status: "cancelada", current_period_end: end },
    );
  }
});
test("cancelamento de agendamento ou cobranca pendente nao cria periodo pago", () => {
  for (const status of ["inativa", "inadimplente"]) {
    assert.deepEqual(
      resolveCancellationState(
        { status, current_period_end: end },
        {
          status: "cancelada",
        },
      ),
      { status: "cancelada", current_period_end: null },
    );
  }
});
test("renovacao normal continua atualizando o prazo", () => {
  assert.deepEqual(
    resolveCancellationState(
      { status: "ativa" },
      {
        status: "ativa",
        currentPeriodEnd: end,
      },
    ),
    { status: "ativa", current_period_end: end },
  );
});
