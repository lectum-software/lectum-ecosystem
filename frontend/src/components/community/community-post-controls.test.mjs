import "../../../scripts/register-source-modules.mjs";
import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { Controller, useForm } from "react-hook-form";

const { AnonymousPostSwitch } = await import(
  "../../app/app/community/[slug]/post/new/views/anonymous-post-switch.tsx"
);
const { createCommunityPostSchema, toCreateCommunityPostPayload } = await import(
  "../../app/app/community/[slug]/post/new/use-form.tsx"
);
const { getReplyOwnerActionCopy } = await import("./reply-owner-action-copy.ts");

// Real component, RHF/schema and handlers. SSR does not execute browser Tab/Space/Enter
// or reproduce the mobile keyboard. Handler inputs below only classify click.detail.
const control = (props = {}) =>
  AnonymousPostSwitch({
    checked: false,
    onBlur: () => {},
    onChange: () => {},
    restoreEditorFocus: () => {},
    ...props,
  });

function AnonymousField({ value }) {
  const { control } = useForm({ defaultValues: { anonymous: value } });
  return createElement(Controller, {
    control,
    name: "anonymous",
    render: ({ field }) =>
      createElement(AnonymousPostSwitch, {
        checked: Boolean(field.value),
        onBlur: field.onBlur,
        onChange: field.onChange,
        restoreEditorFocus: () => {},
      }),
  });
}

test("anonimato usa button na sequência nativa, sem interceptar Space/Enter nem submeter", () => {
  const element = control();
  assert.equal(element.type, "button");
  assert.equal(element.props.type, "button");
  assert.ok(element.props.tabIndex === undefined || element.props.tabIndex === 0);
  assert.equal(element.props.disabled, undefined);
  assert.equal(element.props.onKeyDown, undefined);
  assert.equal(element.props.onKeyUp, undefined);
  const html = renderToStaticMarkup(element);
  assert.doesNotMatch(html, /tabindex="-1"|disabled=""/);
});

for (const value of [false, true]) {
  test(`RHF/SSR reais mantêm anonymous=${value}, nome e tokens do switch`, () => {
    const html = renderToStaticMarkup(createElement(AnonymousField, { value }));
    assert.match(html, new RegExp(`aria-checked="${value}"`));
    assert.match(html, /aria-label="Publicar anonimamente"/);
    assert.match(html, /role="switch"/);
    assert.match(html, /focus:ring-4 focus:ring-primary\/15/);
    assert.equal(html.includes("translate-x-5"), value);
  });

  test(`click sem ponteiro alterna ${value} sem solicitar foco no editor`, () => {
    const calls = [];
    const element = control({
      checked: value,
      onChange: (next) => calls.push(["change", next]),
      restoreEditorFocus: () => calls.push(["editor"]),
    });
    element.props.onClick({ detail: 0 });
    assert.deepEqual(calls, [["change", !value]]);
  });
}

test("click de ponteiro preserva alternância única seguida do retorno ao editor", () => {
  for (const detail of [1, 2]) {
    for (const checked of [false, true]) {
      const calls = [];
      control({
        checked,
        onChange: (next) => calls.push(["change", next]),
        restoreEditorFocus: () => calls.push(["editor"]),
      }).props.onClick({ detail });
      assert.deepEqual(calls, [["change", !checked], ["editor"]]);
    }
  }
});

test("mousedown preserva prevenção de blur do editor e não alterna duas vezes", () => {
  const calls = [];
  const element = control({
    onChange: () => calls.push("change"),
    restoreEditorFocus: () => calls.push("editor"),
  });
  const event = new Event("mousedown", { cancelable: true });
  element.props.onMouseDown(event);
  assert.equal(event.defaultPrevented, true);
  assert.deepEqual(calls, []);
});

test("onBlur é delegado intacto para o Controller, sem agendar foco", () => {
  let blurs = 0;
  const onBlur = () => blurs++;
  const element = control({ onBlur });
  assert.equal(element.props.onBlur, onBlur);
  element.props.onBlur();
  assert.equal(blurs, 1);
});

test("schema/payload reais preservam anonimato opcional do paciente e vedação ao psicólogo", () => {
  for (const anonymous of [undefined, false, true]) {
    const values = createCommunityPostSchema.parse({
      community_slug: "comunidade-local",
      title: "  Uma pergunta  ",
      content: "  Conteúdo textual para validação local.  ",
      anonymous,
    });
    assert.deepEqual(toCreateCommunityPostPayload(values, false), {
      title: "Uma pergunta",
      content: "Conteúdo textual para validação local.",
      anonymous: anonymous === true,
    });
    assert.equal(toCreateCommunityPostPayload(values, true).anonymous, false);
  }
});

const replyCopy = (props = {}) =>
  getReplyOwnerActionCopy({ kind: "resposta", isPsychologist: false, hasReplies: false, ...props });

test("copy de resposta profissional concorda artigo, pronome e remoção", () => {
  const copy = replyCopy({ isPsychologist: true });
  assert.equal(copy.deleteTitle, "Excluir resposta?");
  assert.equal(
    copy.deleteDescription,
    "Esta resposta e as respostas encadeadas abaixo dela serão removidas.\n\nEsta ação não poderá ser desfeita.",
  );
});

test("copy de resposta de paciente com descendentes mantém aviso e pronome feminino", () => {
  assert.equal(
    replyCopy({ hasReplies: true }).deleteDescription,
    "Esta resposta já possui respostas de outros membros.\n\nAo excluir, as respostas encadeadas abaixo dela também serão removidas.\n\nEsta ação não poderá ser desfeita.",
  );
});

test("bloqueio e preservação usam resposta no feminino, sem mudar a restrição", () => {
  const copy = replyCopy();
  assert.equal(copy.blockedTitle, "Não é possível excluir esta resposta");
  assert.equal(copy.preservedTitle, "Resposta preservada");
  assert.match(copy.blockedDescription, /^Esta resposta já recebeu contribuições/);
  assert.match(copy.blockedDescription, /não podem ser excluídos por pacientes/);
  assert.match(copy.blockedDescription, /Você pode silenciar a conversa/);
});

test("comentário preserva concordância masculina e avisos de descendentes", () => {
  const professional = replyCopy({ kind: "comentário", isPsychologist: true });
  assert.equal(professional.deleteTitle, "Excluir comentário?");
  assert.equal(professional.blockedTitle, "Não é possível excluir este comentário");
  assert.equal(professional.preservedTitle, "Comentário preservado");
  assert.match(professional.blockedDescription, /^Este comentário já recebeu/);
  assert.match(professional.deleteDescription, /^Este comentário e as respostas/);
  assert.match(professional.deleteDescription, /abaixo dele serão removidos/);
  const patient = replyCopy({ kind: "comentário", hasReplies: true });
  assert.match(patient.deleteDescription, /^Este comentário já possui respostas/);
  assert.match(patient.deleteDescription, /abaixo dele também serão removidas/);
});

test("folha de paciente sem descendentes conserva somente aviso irreversível", () => {
  for (const kind of ["resposta", "comentário"]) {
    assert.equal(replyCopy({ kind }).deleteDescription, "Esta ação não poderá ser desfeita.");
  }
});
