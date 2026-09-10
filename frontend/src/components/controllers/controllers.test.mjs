import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { registerHooks } from "node:module";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { useForm } from "react-hook-form";
import ts from "typescript";
import { editOtpValue, isCompleteOtpValue, normalizeOtpValue } from "./otp/value.ts";

const sourceRoot = new URL("../../", import.meta.url);
registerHooks({
  resolve(specifier, context, nextResolve) {
    const base = specifier.startsWith("@/") ? sourceRoot : context.parentURL;
    const path = specifier.startsWith("@/") ? specifier.slice(2) : specifier;
    if (specifier.startsWith("@/") || specifier.startsWith(".")) {
      for (const suffix of [".ts", ".tsx", "/index.ts", "/index.tsx"]) {
        const url = new URL(`${path}${suffix}`, base);
        if (existsSync(url)) return { shortCircuit: true, url: url.href };
      }
    }
    return nextResolve(specifier, context);
  },
  load(url, context, nextLoad) {
    if (url.startsWith(sourceRoot.href) && url.endsWith(".tsx")) {
      const source = ts.transpileModule(readFileSync(new URL(url), "utf8"), {
        fileName: fileURLToPath(url),
        compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.ESNext },
      }).outputText;
      return { format: "module", shortCircuit: true, source };
    }
    return nextLoad(url, context);
  },
});

const { InputController } = await import("./input/index.tsx");
const { OtpController } = await import("./otp/index.tsx");
const { Container } = await import("./container.tsx");
const { SelectController } = await import("./select/index.tsx");

function PasswordField(props) {
  const { control } = useForm({ defaultValues: { password: "" } });
  return createElement(InputController, {
    control,
    name: "password",
    id: "password",
    label: "Senha",
    type: "password",
    ...props,
  });
}
function CodeField({ value }) {
  const { control } = useForm({ defaultValues: { code: value } });
  return createElement(OtpController, { control, name: "code", label: "Código", length: 6 });
}

test("rótulo de senha não inclui botão, descrição nem mensagem de erro", () => {
  const html = renderToStaticMarkup(createElement(PasswordField, { description: "Descrição" }));
  const labels = [...html.matchAll(/<label\b[^>]*>(.*?)<\/label>/g)];
  assert.equal(labels.length, 1);
  assert.match(labels[0][0], /for="password"/);
  assert.match(labels[0][1], /Senha/);
  assert.doesNotMatch(labels[0][1], /button|Descrição|role="alert"|input/);
  assert.match(html, /aria-describedby="password-description"/);
});

test("mostrar senha participa do teclado e controla o campo correto", () => {
  const html = renderToStaticMarkup(createElement(PasswordField));
  const button = html.match(/<button\b[^>]*>/)?.[0];
  assert.ok(button);
  assert.match(button, /aria-controls="password"/);
  assert.match(button, /aria-label="Mostrar senha"/);
  assert.match(button, /focus-visible:ring-2/);
  assert.doesNotMatch(button, /tabindex="-1"| disabled=/);
});

test("senha desabilitada ou somente leitura não permite alternar a exposição", () => {
  for (const props of [{ disabled: true }, { readOnly: true }]) {
    const html = renderToStaticMarkup(createElement(PasswordField, props));
    assert.match(html.match(/<button\b[^>]*>/)?.[0] ?? "", /disabled=""/);
  }
});

test("grupo sem htmlFor não cria label inválido e mantém slot de erro", () => {
  const html = renderToStaticMarkup(
    createElement(
      Container,
      {
        name: "code",
        htmlFor: "code",
        label: "Código",
        skipHtmlFor: true,
        error: "Confira o código",
      },
      createElement("fieldset", { "aria-label": "Código" }),
    ),
  );
  assert.doesNotMatch(html, /<label/);
  assert.match(html, /id="code-error" role="alert">Confira o código/);
  assert.match(html, /min-h-4/);
});

test("OTP preserva as casas ao apagar e substituir um dígito central", () => {
  assert.equal(editOtpValue("123456", 2, "", 6), "12 456");
  assert.equal(editOtpValue("12 456", 2, "9", 6), "129456");
  assert.equal(editOtpValue("12 456", 1, "", 6), "1  456");
});

test("OTP preserva zero inicial e casas vazias iniciais", () => {
  assert.equal(editOtpValue("012345", 0, "", 6), " 12345");
  assert.equal(editOtpValue(" 12345", 0, "0", 6), "012345");
  assert.equal(editOtpValue("", 5, "7", 6), "     7");
});

test("OTP cola código completo ou parcial sem ultrapassar as casas", () => {
  assert.equal(editOtpValue("", 0, "012-345", 6), "012345");
  assert.equal(editOtpValue("123456", 2, "78901234", 6), "127890");
  assert.equal(editOtpValue("123456", 2, "9", 6), "129456");
  assert.equal(editOtpValue("123456", 6, "9", 6), "123456");
});

test("OTP incompleto nunca fica apto ao envio, mesmo com seis posições", () => {
  for (const value of ["", "12345", "12 456", " 12345", "1234567", "12a456"]) {
    assert.equal(isCompleteOtpValue(value, 6), false);
  }
  assert.equal(isCompleteOtpValue("012345", 6), true);
  assert.equal(normalizeOtpValue("12 456", 6), "12 456");
  assert.equal(editOtpValue("123456", 5, "", 6), "12345");
  assert.equal(normalizeOtpValue("", 6), "");
});

test("controller renderiza a lacuna na posição original, sem deslocar os demais dígitos", () => {
  const html = renderToStaticMarkup(createElement(CodeField, { value: "12 456" }));
  assert.deepEqual(
    [...html.matchAll(/<input\b[^>]*value="([^"]*)"/g)].map((match) => match[1]),
    ["1", "2", "", "4", "5", "6"],
  );
  assert.match(html, /autoComplete="one-time-code"/);
});

test("confirmação descarta caches de sessão sem afrouxar o guard", () => {
  const logic = readFileSync(new URL("app/auth/verify-email/logic.tsx", sourceRoot), "utf8");
  const setter = readFileSync(new URL("hooks/user-set/index.tsx", sourceRoot), "utf8");
  assert.match(logic, /useUserSet\("\/app", \{ reloadAfterSet: true \}\)/);
  assert.match(logic, /isCompleteOtpValue\(code, CODE_LENGTH\)/);
  assert.ok(
    setter.indexOf("dispatch(userActions.create(data))") <
      setter.indexOf("window.location.replace(target)"),
  );
  assert.ok(
    setter.indexOf("resolveAuthRedirect(data") < setter.indexOf("window.location.replace(target)"),
  );
});

function SelectField(props) {
  const { control } = useForm({ defaultValues: { selection: null } });
  return createElement(SelectController, {
    control,
    name: "selection",
    label: "Opção",
    description: "Escolha uma opção",
    ...props,
  });
}

test("select mantém nome e descrição separados em todas as variantes", () => {
  for (const props of [
    {},
    { useCustomSelect: true },
    { searchable: true },
    { searchable: true, searchMode: "dropdown" },
  ]) {
    const html = renderToStaticMarkup(createElement(SelectField, props));
    const label = html.match(/<label\b[^>]*>(.*?)<\/label>/)?.[1] ?? "";
    assert.match(label, /Opção/);
    assert.doesNotMatch(label, /Escolha uma opção|button|input|select/);
    assert.match(html, /aria-describedby="selection-description"/);
    assert.match(
      renderToStaticMarkup(createElement(SelectField, { ...props, disabled: true })),
      /disabled=""/,
    );
  }
});

test("opções usam click nativo para teclado/toque e Escape devolve o foco", () => {
  const source = readFileSync(new URL("select/index.tsx", import.meta.url), "utf8");
  const mouseHandlers = [...source.matchAll(/onMouseDown=\{([^}]+)\}/g)];
  assert.equal(mouseHandlers.length, 2);
  for (const [, handler] of mouseHandlers) {
    assert.match(handler, /event.preventDefault\(\)/);
    assert.doesNotMatch(handler, /field.onChange/);
  }
  assert.match(source, /onClick=\{\(\) => \{\s*field.onChange\(option.value\)/);
  assert.match(source, /onClick=\{\(\) => \{\s*field.onChange\(null\)/);
  assert.match(source, /event.key !== "Escape"/);
  assert.match(source, /querySelector<HTMLElement>\('\[role="combobox"\]'\)\?\.focus\(\)/);
  assert.match(source, /removeEventListener\("keydown", handleEscape, true\)/);
});
