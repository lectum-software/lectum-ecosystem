import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  requiresGoogleDeleteReauth,
  requiresPasswordDeleteConfirmation,
} from "./delete-confirmation";

describe("account delete confirmation", () => {
  it("prioriza reautenticação Google quando a conta foi cadastrada via Google, mesmo se existir senha legada", () => {
    const googleWithLegacyPassword = {
      password: "legacy-hash",
      provider: "google",
    };

    assert.equal(requiresGoogleDeleteReauth(googleWithLegacyPassword), true);
    assert.equal(requiresPasswordDeleteConfirmation(googleWithLegacyPassword), false);
  });

  it("exige senha atual somente para conta local com senha cadastrada", () => {
    const manualWithPassword = {
      password: "hash",
      provider: "manual",
    };

    assert.equal(requiresGoogleDeleteReauth(manualWithPassword), false);
    assert.equal(requiresPasswordDeleteConfirmation(manualWithPassword), true);
  });

  it("não considera conta sem senha e sem Google como confirmável automaticamente", () => {
    const accountWithoutIdentity = {
      password: null,
      provider: "manual",
    };

    assert.equal(requiresGoogleDeleteReauth(accountWithoutIdentity), false);
    assert.equal(requiresPasswordDeleteConfirmation(accountWithoutIdentity), false);
  });
});
