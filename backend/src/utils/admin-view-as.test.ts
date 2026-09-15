import assert from "node:assert/strict";
import { after, before, describe, it } from "node:test";
import type { Request } from "express";
import { generateToken } from "@/modules/api/middlewares/_auth/utils/generateToken";
import {
  buildAdminViewAsDeviceId,
  getAdminViewAsPayloadFromRequest,
  isAdminViewAsLogoutRequest,
  resolveUserRequestDeviceId,
  shouldBlockAdminViewAsWrite,
} from "./admin-view-as";

const previousJwtSecret = process.env.JWT_SECRET_KEY;
const TEST_JWT_SECRET = "lectum-admin-view-as-test-secret-2026";

const requestWith = ({ method, token, url }: { method: string; token: string; url: string }) =>
  ({
    headers: { authorization: `Bearer ${token}` },
    method,
    originalUrl: url,
    url,
  }) as Request;

before(() => {
  process.env.JWT_SECRET_KEY = TEST_JWT_SECRET;
});

after(() => {
  if (previousJwtSecret === undefined) delete process.env.JWT_SECRET_KEY;
  else process.env.JWT_SECRET_KEY = previousJwtSecret;
});

describe("admin view-as session", () => {
  const deviceId = buildAdminViewAsDeviceId({
    adminId: "admin_12345678",
    targetId: "user_12345678",
    targetRole: "paciente",
  });
  let token = "";

  before(() => {
    token = generateToken(
      { email: "view-as-test@lectum.invalid", id: "user_12345678" },
      "user",
      deviceId,
      { expiresIn: 60 },
    );
  });

  it("usa o device assinado para hidratar a sessão em vez do fingerprint do navegador", () => {
    const request = requestWith({
      method: "GET",
      token,
      url: "/api/private/auth/hidrate",
    });
    const payload = getAdminViewAsPayloadFromRequest(request);

    assert.equal(payload?.device_id, deviceId);
    assert.equal(resolveUserRequestDeviceId(request, "browser_device_123", payload), deviceId);
    assert.equal(shouldBlockAdminViewAsWrite(request, payload), false);
  });

  it("mantém escrita bloqueada e libera somente o logout exato da própria sessão", () => {
    const blocked = requestWith({ method: "POST", token, url: "/api/private/account/security" });
    assert.equal(shouldBlockAdminViewAsWrite(blocked), true);

    const logout = requestWith({
      method: "POST",
      token,
      url: "/api/private/account/logout",
    });
    assert.equal(isAdminViewAsLogoutRequest(logout), true);
    assert.equal(shouldBlockAdminViewAsWrite(logout), false);

    for (const url of [
      "/api/private/account/logout/extra",
      "/api/private/account/logout%2Fextra",
      "/api/private/account\\logout",
      "/api/private/account/security/../logout",
      "//api/private/account/logout",
      "/api/private/account/security?next=/api/private/account/logout",
    ]) {
      const request = requestWith({ method: "POST", token, url });
      assert.equal(isAdminViewAsLogoutRequest(request), false, url);
      assert.equal(shouldBlockAdminViewAsWrite(request), true, url);
    }
  });
});
