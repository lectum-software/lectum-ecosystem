import assert from "node:assert/strict";
import test from "node:test";
import type {
  TrafficActionRecord,
  TrafficPageViewRecord,
} from "../../repositories/interfaces/IAdminTrafficRepository";
import {
  actionSessionKeys,
  bounceRate,
  importantActionRate,
  pagesPerSession,
  type TrafficStats,
} from "./overview";
import { buildQuality } from "./quality-ranking";

const occurredAt = new Date("2026-09-10T12:00:00Z");
type Session = readonly [visitor: string, session: string];

const pageView = ([visitor_id, session_id]: Session): TrafficPageViewRecord => ({
  display_mode: "browser",
  duration_seconds: null,
  entry_path: null,
  is_entry: true,
  normalized_path: "/",
  occurred_at: occurredAt,
  page_kind: "home",
  path: "/",
  referrer_host: null,
  session_id,
  target_id: null,
  target_type: null,
  traffic_medium: null,
  traffic_source: "direct",
  user_id: null,
  utm_campaign: null,
  utm_content: null,
  utm_medium: null,
  utm_source: null,
  utm_term: null,
  visitor_id,
});

const action = ([visitor_id, session_id]: Session): TrafficActionRecord => ({
  action_type: "pwa_installed",
  occurred_at: occurredAt,
  page_kind: "home",
  session_id,
  target_id: null,
  target_type: null,
  user_id: null,
  visitor_id,
});

// Entradas unitárias em memória, sem repository, persistência, rede ou API substituída.
const stats = (views: readonly Session[] = [], actions: readonly Session[] = []): TrafficStats => ({
  actions: actions.map(action),
  contactRequests: 0,
  domainConversions: [],
  locations: [],
  pageViews: views.map(pageView),
  patientSignups: 0,
  postReplies: 0,
  priorVisitorIds: new Set(),
  psychologistSignups: 0,
  publishedCommunityPosts: 0,
  sessions: [],
  subscriptionsStarted: 0,
  users: [],
  usersCreated: [],
});

const a: Session = ["visitante-a", "sessao-a"];
const b: Session = ["visitante-b", "sessao-b"];
const c: Session = ["visitante-c", "sessao-c"];

test("sem visualizações a taxa permanece indisponível, não zero observado", () => {
  assert.deepEqual(importantActionRate(stats()), {
    unavailable: true,
    unavailableReason: "Sem sessões com visualizações para calcular a taxa.",
    value: 0,
  });
});

test("ações sem qualquer visualização não criam uma base de cálculo", () => {
  assert.equal(importantActionRate(stats([], [a, b])).unavailable, true);
});

test("sessões com visualização e sem ação têm zero disponível", () => {
  assert.deepEqual(importantActionRate(stats([a, b])), { unavailable: false, value: 0 });
});

test("ações de outras sessões não entram no numerador", () => {
  assert.deepEqual(importantActionRate(stats([a], [b, c])), { unavailable: false, value: 0 });
});

test("a interseção preserva 50 por cento apesar de ações fora da base", () => {
  assert.equal(importantActionRate(stats([a, b], [a, c])).value, 50);
});

test("uma ação na única sessão elegível resulta em 100, sem clamp", () => {
  assert.equal(importantActionRate(stats([a], [a, b, c])).value, 100);
});

test("múltiplos eventos da mesma sessão são contados uma única vez", () => {
  assert.equal(importantActionRate(stats([a, a, b, b], [a, a, a, c, c])).value, 50);
});

test("a mesma session_id em visitantes distintos não associa eventos", () => {
  const otherVisitor: Session = ["outro-visitante", a[1]];
  assert.equal(importantActionRate(stats([a, b], [otherVisitor])).value, 0);
});

test("duas sessões distintas do mesmo visitante mantêm pesos separados", () => {
  const otherSession: Session = [a[0], "outra-sessao"];
  assert.equal(importantActionRate(stats([a, otherSession], [otherSession])).value, 50);
});

test("arredondamento existente de uma casa decimal é mantido", () => {
  assert.equal(importantActionRate(stats([a, b, c], [a])).value, 33.3);
});

test("todas as combinações de três sessões respeitam a interseção, não apenas o teto", () => {
  const sessions = [a, b, c];
  for (let viewsMask = 1; viewsMask < 8; viewsMask += 1) {
    for (let actionsMask = 0; actionsMask < 8; actionsMask += 1) {
      const views = sessions.filter((_, i) => viewsMask & (1 << i));
      const actions = sessions.filter((_, i) => actionsMask & (1 << i));
      const shared = sessions.filter((_, i) => viewsMask & actionsMask & (1 << i)).length;
      const expected = Math.round((shared / views.length) * 1000) / 10;
      assert.equal(importantActionRate(stats(views, actions)).value, expected);
    }
  }
});

test("o cálculo não altera entradas nem remove eventos usados por outros indicadores", () => {
  const input = stats([a, b], [a, c]);
  const snapshot = structuredClone(input);
  for (const event of [...input.pageViews, ...input.actions]) Object.freeze(event);
  Object.freeze(input.pageViews);
  Object.freeze(input.actions);
  Object.freeze(input);
  importantActionRate(input);
  assert.deepEqual(input, snapshot);
  assert.equal(actionSessionKeys(input).size, 2);
  assert.equal(pagesPerSession(input).value, 1);
  assert.equal(bounceRate(input).value, 50);
});

test("buildQuality usa o mesmo universo corrigido nos dois períodos", () => {
  const result = buildQuality(stats([a, b], [a, c]), stats([a], [a, b]));
  const metric = result.items.find((item) => item.id === "important_action_sessions");
  assert.ok(metric);
  assert.equal(metric.value, 50);
  assert.equal(metric.previous_value, 100);
  assert.equal(metric.change_percent, -50);
  assert.equal(metric.trend, "down");
  assert.equal(metric.unavailable, false);
  assert.equal(metric.unit, "percentage");
  assert.equal(result.items.length, 6);
});

test("buildQuality mantém indisponibilidade e tendência sem base atual", () => {
  const result = buildQuality(stats([], [a]), stats([a], [a]));
  const metric = result.items.find((item) => item.id === "important_action_sessions");
  assert.ok(metric);
  assert.equal(metric.unavailable, true);
  assert.equal(metric.value, 0);
  assert.equal(metric.change_percent, null);
  assert.equal(metric.trend, "unavailable");
});
