import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildPatientEngagementDigestContent,
  buildPsychologistNewPostsDigestContent,
  canRunTemporalDigest,
  getTemporalDigestSince,
  hasTemporalDigestBaseline,
  TEMPORAL_DIGEST_MIN_INTERVAL_MS,
} from "./temporal-support";

describe("temporal digest support", () => {
  const now = new Date("2026-08-11T15:00:00.000Z");

  it("inicializa sem enviar quando ainda nao ha baseline", () => {
    assert.equal(hasTemporalDigestBaseline(now, undefined), false);
    assert.equal(canRunTemporalDigest(now, undefined), false);
  });

  it("aguarda o intervalo minimo entre checks/envios", () => {
    const recent = new Date(now.getTime() - TEMPORAL_DIGEST_MIN_INTERVAL_MS + 60_000);
    const old = new Date(now.getTime() - TEMPORAL_DIGEST_MIN_INTERVAL_MS - 60_000);

    assert.equal(canRunTemporalDigest(now, { last_checked_at: recent.toISOString() }), false);
    assert.equal(canRunTemporalDigest(now, { last_checked_at: old.toISOString() }), true);
  });

  it("usa a fronteira mais recente entre ultimo check e ultimo envio", () => {
    const sent = new Date(now.getTime() - 4 * 60 * 60 * 1000);
    const checked = new Date(now.getTime() - 2 * 60 * 60 * 1000);

    assert.equal(
      getTemporalDigestSince(now, {
        last_checked_at: checked.toISOString(),
        last_sent_at: sent.toISOString(),
      }).toISOString(),
      checked.toISOString(),
    );
  });

  it("gera copy para digest de engajamento do paciente", () => {
    assert.equal(
      buildPatientEngagementDigestContent(3).title,
      "Seu conteúdo teve novas interações",
    );
  });

  it("gera copy para digest temporal de novos posts do psicologo", () => {
    assert.equal(
      buildPsychologistNewPostsDigestContent(2).body,
      "Há 2 novos posts em comunidades que você acompanha.",
    );
  });
});
