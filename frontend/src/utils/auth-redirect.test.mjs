import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { registerHooks } from "node:module";
import test from "node:test";
import { fileURLToPath } from "node:url";

const sourceRoot = new URL("../", import.meta.url);

registerHooks({
  resolve(specifier, context, nextResolve) {
    const resolveCandidate = (candidates, baseUrl) => {
      for (const candidate of candidates) {
        const url = new URL(candidate, baseUrl);
        if (existsSync(fileURLToPath(url))) return { shortCircuit: true, url: url.href };
      }

      return null;
    };

    if (specifier.startsWith("@/")) {
      const path = specifier.slice(2);
      const resolved = resolveCandidate(
        [`${path}.ts`, `${path}.tsx`, `${path}/index.ts`, `${path}/index.tsx`],
        sourceRoot,
      );
      if (resolved) return resolved;
    }

    if (specifier.startsWith("./") || specifier.startsWith("../")) {
      const resolved = resolveCandidate(
        [`${specifier}.ts`, `${specifier}.tsx`, `${specifier}/index.ts`, `${specifier}/index.tsx`],
        context.parentURL,
      );
      if (resolved) return resolved;
    }

    return nextResolve(specifier, context);
  },
});

const { buildAuthRouteWithRedirect, getUserHomePath, resolveAuthRedirect, resolveAuthReturnTo } =
  await import("./auth-redirect.ts");

test("nao usa mais boas-vindas como gate automatico para paciente", () => {
  const patientWithoutOnboarding = {
    confirmed: true,
    patient_profile: {
      onboarding_completed_at: null,
    },
    role: "paciente",
  };

  assert.equal(getUserHomePath(patientWithoutOnboarding, "/app"), "/psicologos");
  assert.equal(resolveAuthRedirect(patientWithoutOnboarding, null, "/app"), "/psicologos");
});

test("preserva retorno de aba ou modal ao migrar do login para cadastro", () => {
  const target = "/app/comunidades/feed/publicacao/nova";

  assert.equal(
    buildAuthRouteWithRedirect("/auth/profile-selection", target),
    `/auth/profile-selection?redirectTo=${encodeURIComponent(target)}`,
  );
  assert.equal(
    buildAuthRouteWithRedirect("/auth/login?role=psicologo", target),
    `/auth/login?role=psicologo&redirectTo=${encodeURIComponent(target)}`,
  );
  assert.equal(resolveAuthReturnTo("", target), target);
  assert.equal(
    resolveAuthRedirect({ confirmed: false, role: "paciente" }, target, "/auth/verify-email"),
    `/auth/verify-email?redirectTo=${encodeURIComponent(target)}`,
  );
  assert.equal(
    resolveAuthRedirect(
      { confirmed: false, role: "paciente" },
      "https://example.com",
      null,
      target,
    ),
    `/auth/verify-email?redirectTo=${encodeURIComponent(target)}`,
  );
  assert.equal(
    resolveAuthRedirect(
      { confirmed: true, patient_profile: { onboarding_completed_at: null }, role: "paciente" },
      target,
      "/app",
    ),
    target,
  );
});
