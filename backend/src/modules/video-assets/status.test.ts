import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { mutableVideoAssetStatusesFor } from "./status";

describe("video asset status transitions", () => {
  it("não permite que webhook atrasado regrida ready nem ressuscite canceled", () => {
    assert.equal(mutableVideoAssetStatusesFor("processing").includes("ready"), false);
    assert.equal(mutableVideoAssetStatusesFor("error").includes("ready"), false);
    assert.equal(mutableVideoAssetStatusesFor("ready").includes("canceled"), false);
  });

  it("permite que processamento concluído e erro transitório recuperem para ready", () => {
    assert.equal(mutableVideoAssetStatusesFor("ready").includes("uploading"), true);
    assert.equal(mutableVideoAssetStatusesFor("ready").includes("processing"), true);
    assert.equal(mutableVideoAssetStatusesFor("ready").includes("error"), true);
  });
});
