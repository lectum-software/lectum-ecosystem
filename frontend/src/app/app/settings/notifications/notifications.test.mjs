import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  MutationObserver,
  QueryClient,
  QueryClientProvider,
  QueryObserver,
  useMutation,
} from "@tanstack/react-query";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createFormControl } from "react-hook-form";
import { sourceRoot } from "../../../../../scripts/register-source-modules.mjs";

const {
  NotificationPreferencesForm,
  fromFormValues,
  toFormValues,
  PREFERENCE_FIELDS,
  notificationSettingsSchema,
} = await import("./preferences-form.tsx");
const { default: keys } = await import("@/api/cache/keys");

const preferences = {
  prefs: {
    nova_resposta: { enabled: false },
    upvote: { enabled: false },
    salvamento: { enabled: false },
    novo_post: { enabled: false, post_author_scope: "favorites" },
    admin_campaign: { enabled: false },
  },
};
function client() {
  return new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: Infinity } } });
}
async function failedQuery(cache) {
  const queryClient = client();
  if (cache) queryClient.setQueryData(keys.notification.preferences(), cache);
  const observer = new QueryObserver(queryClient, {
    queryKey: keys.notification.preferences(),
    // Genuine loopback transport rejection.
    queryFn: () => fetch("http://127.0.0.1:0", { signal: AbortSignal.timeout(1_000) }),
    enabled: false,
  });
  const unsubscribe = observer.subscribe(() => {});
  await observer.refetch();
  const result = observer.getCurrentResult();
  assert.equal(result.isError, true);
  assert.equal(result.isLoading, false);
  return {
    queryClient,
    result,
    close() {
      unsubscribe();
      observer.destroy();
      queryClient.clear();
    },
  };
}
function FormWithMutation({ query }) {
  const update = useMutation();
  return createElement(NotificationPreferencesForm, { query, update, sessionRole: "paciente" });
}
function render(query, queryClient) {
  return renderToStaticMarkup(
    createElement(
      QueryClientProvider,
      { client: queryClient },
      createElement(FormWithMutation, { query }),
    ),
  );
}

for (const cached of [false, true]) {
  test(`falha real de leitura ${cached ? "com" : "sem"} cache não exibe formulário editável`, async () => {
    const state = await failedQuery(cached ? preferences : undefined);
    try {
      const html = render(state.result, state.queryClient);
      assert.equal(html.includes("Não foi possível carregar suas preferências"), true);
      assert.equal(html.includes("Tentar novamente"), true);
      assert.equal(/<form|role="switch"|type="submit"/.test(html), false);
      assert.doesNotMatch(html, /fetch failed|ECONN|stack|prisma/i);
    } finally {
      state.close();
    }
  });
}

test("React/RHF renderizam switches persistidos sem reativar opt-outs", () => {
  const queryClient = client();
  queryClient.setQueryData(keys.notification.preferences(), preferences);
  const observer = new QueryObserver(queryClient, {
    queryKey: keys.notification.preferences(),
    enabled: false,
  });
  try {
    const html = render(observer.getCurrentResult(), queryClient);
    assert.match(html, /<form/);
    const replyButton = html.match(/<button\b[^>]*aria-label="Respostas em meus posts"[^>]*>/)?.[0];
    assert.match(replyButton ?? "missing", /aria-checked="false"/);
    assert.equal(html.includes("Desativado"), true);
    assert.doesNotMatch(html, /Tentar novamente|Novas avaliações/);
    assert.match(html, /disabled="" type="submit"/);
  } finally {
    observer.destroy();
    queryClient.clear();
  }
});

test("mudança validada por RHF/Zod preserva categorias não representadas no formulário", async () => {
  const hook = createFormControl({
    defaultValues: toFormValues(preferences.prefs, "paciente"),
    resolver: zodResolver(notificationSettingsSchema),
    mode: "onChange",
  });
  let dirty = false;
  const unsubscribe = hook.subscribe({
    formState: { isDirty: true },
    callback: (state) => {
      dirty = state.isDirty;
    },
  });
  try {
    for (const field of PREFERENCE_FIELDS) hook.register(field.name);
    hook.setValue("upvote__enabled", true, { shouldDirty: true, shouldValidate: true });
    assert.equal(await hook.trigger(), true);
    assert.equal(dirty, true);
    const output = fromFormValues(hook.getValues(), "paciente", preferences.prefs);
    assert.equal(output.upvote.enabled, true);
    assert.equal(output.salvamento.enabled, false);
    assert.equal(output.admin_campaign?.enabled, false);
  } finally {
    unsubscribe();
  }
});

test("guard de configuração lista ambos os aliases antes da exclusão do prompt", () => {
  const source = readFileSync(new URL("hooks/notification/index.tsx", sourceRoot), "utf8");
  assert.match(
    source,
    /const isNotificationsSettingsRoute =\s*pathname === "\/app\/configuracoes\/notificacoes" \|\| pathname === "\/app\/settings\/notifications";/,
  );
  assert.match(source, /if \(\s*!isPrivateAppRoute \|\|\s*isNotificationsSettingsRoute \|\|/);
});

test("mutação pendente desabilita switches e seletor para preservar a edição enviada", async () => {
  const queryClient = client();
  queryClient.setQueryData(keys.notification.preferences(), preferences);
  const query = new QueryObserver(queryClient, {
    queryKey: keys.notification.preferences(),
    enabled: false,
  });
  const mutation = new MutationObserver(queryClient, {
    mutationFn: () => fetch("http://127.0.0.1:0", { signal: AbortSignal.timeout(1_000) }),
  });
  const unsubscribe = mutation.subscribe(() => {});
  const pending = mutation.mutate(preferences.prefs);
  try {
    const update = mutation.getCurrentResult();
    assert.equal(update.isPending, true);
    const html = renderToStaticMarkup(
      createElement(NotificationPreferencesForm, {
        query: query.getCurrentResult(),
        update,
        sessionRole: "paciente",
      }),
    );
    const switches = [...html.matchAll(/<button\b[^>]*role="switch"[^>]*>/g)];
    assert.equal(switches.length, 4);
    for (const [control] of switches) assert.match(control, /disabled=""/);
    const select = html.match(/<button\b[^>]*role="combobox"[^>]*>/)?.[0];
    assert.match(select ?? "missing", /disabled=""/);
    assert.match(html, /disabled="" type="submit"/);
    assert.match(html, /Salvando/);
  } finally {
    await pending.catch(() => undefined);
    unsubscribe();
    query.destroy();
    queryClient.clear();
  }
});
