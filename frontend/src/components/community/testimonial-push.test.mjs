import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import vm from "node:vm";

const read = (file) => readFileSync(new URL(file, import.meta.url), "utf8");
const source = read("../../../public/sw.js");

test("testimonial push exposes only the approved action and retains the batch deep link", async () => {
  const handlers = {},
    shown = [],
    opened = [];
  const self = {
    location: { origin: "https://lectum.example" },
    addEventListener: (name, callback) => {
      handlers[name] = callback;
    },
    registration: {
      showNotification: async (title, options) => {
        shown.push({ title, options });
      },
    },
    clients: {
      matchAll: async () => [],
      openWindow: async (redirect) => {
        opened.push(redirect);
      },
    },
  };
  vm.runInNewContext(source, { self, URL, console });
  let promise;
  const push = async (actions) => {
    handlers.push({
      data: {
        json: () => ({
          notification: {
            title: "Recebeu acolhimento? Retribua com um relato",
            body: "Compartilhe sua experiência.",
            actions,
          },
          data: { redirect: "/app/depoimentos/pendentes?batch=owned-batch" },
        }),
      },
      waitUntil: (p) => {
        promise = p;
      },
    });
    await promise;
  };
  await push([
    { action: "leave_testimonial", title: "untrusted" },
    { action: "external", title: "untrusted" },
  ]);
  assert.equal(shown[0].options.actions.length, 1);
  assert.equal(shown[0].options.actions[0].title, "Deixar depoimento");
  for (const action of ["leave_testimonial", ""]) {
    handlers.notificationclick({
      action,
      notification: { close() {}, data: shown[0].options.data },
      waitUntil: (p) => {
        promise = p;
      },
    });
    await promise;
  }
  assert.deepEqual(opened, Array(2).fill("/app/depoimentos/pendentes?batch=owned-batch"));
  await push([{ action: "external" }]);
  assert.equal(shown[1].options.actions, undefined);
});

test("batch identity scopes both the API and query cache without changing legacy URLs", () => {
  assert.match(read("../../api/req/pending-testimonials/index.ts"), /batch \? \{ batch \} : \{\}/);
  assert.match(
    read("../../app/app/depoimentos/pendentes/logic.tsx"),
    /\["testimonial-pending", user\?\.id, batch\]/,
  );
});

test("patient and professional share title-cased profile menu labels", () => {
  const source = read("../../app/app/profile/logic.tsx");
  for (const label of [
    "Minhas Publicações",
    "Comunidades Seguidas",
    "Explorar Comunidades",
    "Editar Perfil",
    "E-mail e Senha",
    "Ajuda e Feedback",
    "Ativar Modo Escuro",
  ])
    assert.ok(source.includes(`label: "${label}"`), label);
  assert.equal((source.match(/label: "Meus Depoimentos"/g) ?? []).length, 2);
  assert.ok(source.includes("Sair da Conta"));
});
