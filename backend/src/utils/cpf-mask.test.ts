import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it } from "node:test";
import { maskCpf as registryMask } from "../modules/api/admin/private/psychologists/registry-verification/use-cases/services/registry-support";
import { maskCpf } from "./cpf-mask";

describe("minimização do CPF de exibição", () => {
  it("oculta o centro do documento, inclusive quando a entrada já está formatada", () => {
    // Sequência repetida intencionalmente inválida, sem documento de uma pessoa.
    assert.equal(maskCpf("0".repeat(11)), "000.***.***-00");
    assert.equal(maskCpf(" 000.000.000-00 "), "000.***.***-00");
    assert.equal(maskCpf("9".repeat(11))?.replace(/\D/g, "").length, 5);
  });

  it("não devolve valores brutos em documentos incompletos ou inesperados", () => {
    for (const value of ["1", "1".repeat(10), "1".repeat(12), "texto1"]) {
      assert.equal(maskCpf(value), "CPF informado");
    }
    for (const value of [undefined, null, "", "  ", "texto inesperado"]) {
      assert.equal(maskCpf(value), null);
    }
  });

  it("verificação e helper público do módulo usam a mesma função segura", () => {
    assert.equal(registryMask, maskCpf);
    assert.equal(registryMask("0".repeat(11)), "000.***.***-00");
  });

  it("auditoria pessoal reutiliza máscara sem carregar seus serviços (wiring estático)", () => {
    const source = readFileSync(
      resolve(
        __dirname,
        "../modules/api/admin/private/psychologists/profile-edit/use-cases/services/personal.ts",
      ),
      "utf8",
    );
    assert.match(source, /import \{ maskCpf \} from "@\/utils\/cpf-mask"/);
    assert.match(source, /if \(key === "cpf"\) return maskCpf\(/);
    assert.doesNotMatch(source, /export const maskCpf =/);
  });
});
