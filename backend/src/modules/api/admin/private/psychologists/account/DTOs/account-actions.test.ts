import assert from "node:assert/strict";
import { resolve } from "node:path";
import test from "node:test";
import ts from "typescript";

// Compila o DTO real isoladamente: a extensão global Request.b:any mascara seus campos.
// Não importa serviços, não substitui tipos/módulos e não executa código do DTO.
const filename = resolve(__dirname, "IAdminPsychologistAccountDTO.ts");
const program = ts.createProgram([filename], {
  baseUrl: resolve(__dirname, "../../../../../../.."),
  esModuleInterop: true,
  module: ts.ModuleKind.CommonJS,
  moduleResolution: ts.ModuleResolutionKind.Node10,
  noEmit: true,
  paths: { "@/*": ["*"] },
  skipLibCheck: true,
  strict: true,
  target: ts.ScriptTarget.ES2023,
  types: ["node"],
});
const source = program.getSourceFile(filename);
assert.ok(source);
const checker = program.getTypeChecker();
const moduleSymbol = checker.getSymbolAtLocation(source);
assert.ok(moduleSymbol);
const exportsByName = new Map(
  checker.getExportsOfModule(moduleSymbol).map((symbol) => [symbol.name, symbol]),
);

const bodyType = (name: string) => {
  const symbol = exportsByName.get(name);
  assert.ok(symbol);
  const dto = checker.getDeclaredTypeOfSymbol(symbol);
  const body = checker.getPropertyOfType(dto, "b");
  assert.ok(body);
  const type = checker.getTypeOfSymbolAtLocation(body, source);
  assert.equal(type.flags & ts.TypeFlags.Any, 0);
  return type;
};

test("BA07: DTO real compila sem extensão global de Request ou emissão", () => {
  const diagnostics = ts.getPreEmitDiagnostics(program);
  assert.deepEqual(
    diagnostics.map((diagnostic) => ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n")),
    [],
  );
});

test("BA07: duração opcional numérica pertence ao comando de mudança de status", () => {
  const body = bodyType("IAdminPsychologistAccountStatusActionDTO");
  assert.deepEqual(
    checker
      .getPropertiesOfType(body)
      .map((symbol) => symbol.name)
      .sort(),
    ["confirmation", "reason", "suspension_duration_days"],
  );
  const duration = checker.getPropertyOfType(body, "suspension_duration_days");
  assert.ok(duration);
  assert.notEqual(duration.flags & ts.SymbolFlags.Optional, 0);
  assert.equal(
    checker.typeToString(checker.getTypeOfSymbolAtLocation(duration, source)),
    "number | undefined",
  );
});

test("BA07: revogação de sessões mantém somente confirmação e motivo", () => {
  const body = bodyType("IAdminPsychologistAccountRevokeSessionsDTO");
  assert.deepEqual(
    checker
      .getPropertiesOfType(body)
      .map((symbol) => symbol.name)
      .sort(),
    ["confirmation", "reason"],
  );
});
