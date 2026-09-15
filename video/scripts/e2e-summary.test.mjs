import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { formatE2eSummary } from "./e2e-summary.mjs";

// Testes do relatório, não da API, da fila ou de processamento real de vídeo.
test("E2E sem caso de cancelamento o informa como não testado", () => {
  const lines = formatE2eSummary(false);
  assert.ok(lines.some((line) => line.includes("NÃO TESTADO: cancelamento")));
  assert.ok(
    lines.filter((line) => line.includes("OK:")).every((line) => !line.includes("cancelamento")),
  );
});

test("E2E com cancelamento confirmado pode declará-lo validado", () => {
  const lines = formatE2eSummary(true);
  assert.ok(lines.some((line) => line.includes("OK:") && line.includes("cancelamento")));
  assert.ok(lines.every((line) => !line.includes("NÃO TESTADO")));
});

test("relatório não presume cobertura de cancelamento por argumento ausente", () => {
  assert.deepEqual(formatE2eSummary(), formatE2eSummary(false));
  assert.ok(formatE2eSummary().some((line) => line.includes("NÃO TESTADO")));
});

test("os controles obrigatórios permanecem no sumário em ambos os caminhos", () => {
  for (const validated of [false, true]) {
    const text = formatE2eSummary(validated).join("\n");
    for (const label of ["autenticação", "recusas", "fila", "FFmpeg", "Range", "remoção"]) {
      assert.ok(text.includes(label));
    }
  }
});

test("script marca cancelamento validado só após a asserção do estado terminal", async () => {
  const source = await readFile(new URL("./e2e.mjs", import.meta.url), "utf8");
  assert.match(source, /let cancellationValidated = false;/);
  assert.match(
    source,
    /assert\.equal\(canceled\.status, "canceled", JSON\.stringify\(canceled\)\);\s*cancellationValidated = true;/,
  );
  assert.match(source, /formatE2eSummary\(cancellationValidated\)/);
});
