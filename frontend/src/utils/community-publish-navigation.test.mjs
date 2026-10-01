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

test("mobile route eligibility preserves profile grouping for favorites", () => {
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

test("favorites opts out of the bottom bar and adds only an icon back to profile above the existing title", () => {
  const source = readSource("../components/psychologists/psychologist-relation-list.tsx");
  assert.match(source, /showMobileNavigation=\{false\}/);
  assert.match(
    source,
    /restrictedAreaBackLink=\{\{ href: "\/app\/perfil", label: "Voltar ao perfil" \}\}/,
  );
  const header = source.slice(
    source.indexOf("const FavoritePageHeader ="),
    source.indexOf("const FavoriteFilterChips ="),
  );
  assert.match(header, /aria-label="Voltar ao perfil"/);
  assert.match(header, /absolute left-4 top-4[\s\S]*rounded-full/);
  assert.match(header, /href="\/app\/perfil"/);
  assert.match(header, /<ArrowLeft className="h-5 w-5" aria-hidden="true" \/>/);
  assert.match(
    header,
    /<h1 className="text-2xl font-bold leading-7 text-foreground">Favoritos<\/h1>/,
  );
  assert.equal((header.match(/<h1\b/g) ?? []).length, 1);
  assert.match(header, /\{FAVORITES_HEADER_DESCRIPTION\}/);
  assert.doesNotMatch(header, /router\.back|history\.back|AppPageHeader|SecondaryPageHeader/);
});

test("favorites and my posts reuse the blue saved-page back-arrow appearance", () => {
  const sources = [
    readSource("../components/ui/app-page-header.tsx"),
    readSource("../components/psychologists/psychologist-relation-list.tsx").split(
      "const FavoritePageHeader =",
    )[1],
    readSource("../app/app/posts/mine/components/header.tsx").split(
      "export const MyPostsHeader =",
    )[1],
  ];
  for (const source of sources) {
    const backLink = source.match(/<Link\b[\s\S]*?<\/Link>/)?.[0] ?? "";
    const classes = new Set(backLink.match(/className="([^"]+)"/)?.[1].split(/\s+/));
    for (const token of [
      "grid",
      "h-10",
      "w-10",
      "place-items-center",
      "rounded-full",
      "bg-primary-soft",
      "text-primary",
      "transition",
      "hover:bg-primary-soft/80",
    ]) {
      assert.ok(classes.has(token), `Back arrow must retain ${token}`);
    }
    assert.match(backLink, /<ArrowLeft className="h-5 w-5"/);
    assert.doesNotMatch(
      backLink,
      /ChevronLeft|bg-foreground\/10|border-border|bg-surface|text-muted/,
    );
  }
  assert.match(sources[2], /href="\/app\/perfil"/);
  assert.match(sources[2], /\{interactionCopy.screenTitle\}/);
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

test("a highlighted parent tab still navigates from favorites and psychologist profiles", () => {
  const template = readSource("../templates/private/index.tsx");
  const mobileNavigation = template.slice(
    template.indexOf("const bottomNavigationMarkup ="),
    template.indexOf("const desktopSidebarMarkup ="),
  );
  assert.match(
    mobileNavigation,
    /handleNavigationItemClick\(\s*event,\s*isActive && navigationContextPathname === item\.href,?\s*\)/,
  );
  assert.equal(getMobileNavigationActiveHref("/app/favoritos"), "/app/perfil");
  assert.equal(getMobileNavigationActiveHref("/psicologos/profissional"), "/psicologos");
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

test("default publish action opens the existing composer over the current page without navigating", () => {
  const template = readSource("../templates/private/index.tsx");
  const handler = template.slice(
    template.indexOf("const handleCreatePostClick ="),
    template.indexOf("const bottomNavigationMarkup ="),
  );
  assert.match(handler, /centerAction\.onClick\(event\);\s+return;/);
  assert.match(handler, /event\.preventDefault\(\);\s+if \(!conversion\.isAuthenticated\)/);
  assert.match(handler, /type: "create_post"[\s\S]*return;\s+}\s+setCreatePostModalOpen\(true\)/);
  assert.doesNotMatch(handler, /router\.(push|replace)|window\.location/);
  assert.match(
    template,
    /const \[createPostModalOpen, setCreatePostModalOpen\] = useState\(false\)/,
  );
  assert.match(
    template,
    /createPostModalOpen \? \(\s+<CreateCommunityPostLogic\s+asModalSlot\s+onCloseComplete=\{\(\) => setCreatePostModalOpen\(false\)\}/,
  );
  const controller = readSource(
    "../app/app/community/[slug]/post/new/hooks/use-create-community-post-controller.ts",
  );
  assert.match(controller, /if \(onCloseComplete\) \{\s+onCloseComplete\(\);\s+return;/);
  const composer = readSource(
    "../app/app/community/[slug]/post/new/views/create-community-post.tsx",
  );
  assert.match(composer, /useModalMediaSuspension\(asModalSlot\)/);
});
