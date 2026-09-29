import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildTopMentorPodiumRedirect, shouldNotifyTopMentorPodium } from "./community-top-mentors";

describe("community top mentor podium notifications", () => {
  it("notifica entrada nova no podio e melhora de posicao", () => {
    assert.equal(shouldNotifyTopMentorPodium([], 3), true);
    assert.equal(shouldNotifyTopMentorPodium([3], 2), true);
    assert.equal(shouldNotifyTopMentorPodium([3, 2], 1), true);
  });

  it("nao notifica recalculo igual, queda ou posicao fora do podio", () => {
    assert.equal(shouldNotifyTopMentorPodium([2], 2), false);
    assert.equal(shouldNotifyTopMentorPodium([1], 2), false);
    assert.equal(shouldNotifyTopMentorPodium([], 4), false);
  });

  it("direciona direto para o ranking filtrado da comunidade", () => {
    assert.equal(
      buildTopMentorPodiumRedirect({
        communitySlug: "ansiedade-em-equilibrio",
        periodKey: "30d",
      }),
      "/comunidades/top-mentores?community=ansiedade-em-equilibrio&period=30d#ranking",
    );
  });
});
