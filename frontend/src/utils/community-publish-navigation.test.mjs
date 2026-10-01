import "../../scripts/register-source-modules.mjs";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const { hasSeenCommunityPublishTip, markCommunityPublishTipSeen } = await import(
  "./community-publish-tip.ts"
);
const { getNavigation, getMobileNavigationActiveHref, shouldShowMobileNavigationForPath } =
  await import("../templates/private/navigation.tsx");
const readSource = (path) => readFileSync(new URL(path, import.meta.url), "utf8");

test("publication tip persists across surfaces, reloads and login without mixing account history", () => {
  const previousWindow = globalThis.window;
  const storage = new Map();
  try {
    delete globalThis.window;
    assert.equal(hasSeenCommunityPublishTip(), false);
    markCommunityPublishTipSeen();
    globalThis.window = {
      localStorage: {
        getItem: (key) => storage.get(key) ?? null,
        setItem: (key, value) => storage.set(key, value),
      },
    };
    assert.equal(hasSeenCommunityPublishTip(), false);
    markCommunityPublishTipSeen("account-a");
    assert.equal(hasSeenCommunityPublishTip("account-a"), true);
    assert.equal(hasSeenCommunityPublishTip("account-b"), false);
    assert.equal(hasSeenCommunityPublishTip(), false);
    assert.equal(storage.get("lectum:community-publish-tip:v1:user:account-a"), "1");

    // Persisted history is read even when it was not written by this module instance.
    storage.set("lectum:community-publish-tip:v1:user:returning", "1");
    assert.equal(hasSeenCommunityPublishTip("returning"), true);
    storage.set("lectum:community-publish-tip:v1:user:invalid", "0");
    assert.equal(hasSeenCommunityPublishTip("invalid"), false);

    const localStorage = window.localStorage;
    window.localStorage = {
      getItem() {
        throw new Error("Storage unavailable");
      },
      setItem() {
        throw new Error("Storage unavailable");
      },
    };
    assert.equal(hasSeenCommunityPublishTip("blocked-storage"), false);
    markCommunityPublishTipSeen("blocked-storage");
    assert.equal(hasSeenCommunityPublishTip("blocked-storage"), true);
    window.localStorage = localStorage;

    markCommunityPublishTipSeen();
    assert.equal(hasSeenCommunityPublishTip(), true);
    assert.equal(hasSeenCommunityPublishTip("new-login"), true);
    assert.equal(storage.get("lectum:community-publish-tip:v1:anonymous"), "1");
  } finally {
    if (previousWindow === undefined) delete globalThis.window;
    else globalThis.window = previousWindow;
  }
});

test("mobile navigation remains available on feed, community and favorites with profile selected", () => {
  for (const path of [
    "/",
    "/comunidades/ansiedade-em-equilibrio",
    "/app/favoritos",
    "/psicologos",
  ]) {
    assert.equal(shouldShowMobileNavigationForPath(path), true, path);
  }
  assert.equal(getMobileNavigationActiveHref("/app/favoritos"), "/app/perfil");
  for (const role of [null, "paciente", "psicologo"]) {
    assert.deepEqual(
      getNavigation(role).map((item) => item.href),
      ["/", "/psicologos", "/app/favoritos", "/app/notificacoes", "/app/perfil"],
    );
  }
});

test("mobile create action replaces favorites without changing the desktop sidebar or immersive exception", () => {
  const template = readSource("../templates/private/index.tsx");
  assert.match(template, /if \(index === 2\)/);
  assert.match(template, /data-community-create-post="mobile-navigation"/);
  assert.match(template, /const isMobileNavigationRenderedVisible = !navigationHidden/);
  assert.doesNotMatch(template, /autoHideNavigation|setIsNavigationVisible|-top-3/);
  assert.match(template, /intent: \{ returnTo: centerAction.href, type: "create_post" \}/);
  const profile = readSource("../app/app/profile/logic.tsx");
  assert.match(profile, /Meus posts e respostas[\s\S]*label: "Favoritos"[\s\S]*label: "Salvos"/);
  const psychologists = readSource("../app/app/psychologists/view/index.tsx");
  assert.match(psychologists, /navigationHidden=\{metrics.isDesktopLayout \? false : isUiHidden\}/);
});

test("feed and community share the original copy, onboarding history and contextual create handler", () => {
  const base = "../app/app/community/[slug]/";
  for (const view of ["community-feed", "community-detail"]) {
    const source = readSource(`${base}views/${view}.tsx`);
    assert.match(source, /bottomNavigationCenterAction=/);
    assert.match(source, /variant="bottomNavigation"/);
    assert.doesNotMatch(source, /autoHideNavigation/);
    assert.match(source, /type: "create_post"/);
  }
  const onboarding = readSource(`${base}components/publish-onboarding.tsx`);
  assert.match(onboarding, /Publique sua dúvida ou relato/);
  assert.match(
    onboarding,
    /Toque no botão \+ para conversar gratuitamente na comunidade e receber acolhimento dos psicólogos mediadores\./,
  );
  assert.match(onboarding, /useCommunityPublishTip\(\)/);
  assert.match(onboarding, /hidden h-14[\s\S]*lg:grid/);
  const hook = readSource(`${base}hooks/use-community-publish-tip.ts`);
  assert.match(hook, /has_seen_community_post_tip: true/);
  assert.match(hook, /document.visibilityState !== "visible"/);
  assert.match(hook, /hasToken && currentUser\?\.role === "psicologo"/);
});
