import "./register-source-modules.mjs";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { registerHooks } from "node:module";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

const bridges = new Map(
  ["image", "link"].map((name) => {
    const moduleUrl = import.meta.resolve(`next/${name}.js`);
    return [
      `next/${name}`,
      `data:text/javascript,${encodeURIComponent(`import actual from ${JSON.stringify(moduleUrl)}; export default actual.default ?? actual;`)}`,
    ];
  }),
);
registerHooks({
  resolve(specifier, context, nextResolve) {
    const resolved =
      bridges.get(specifier) ??
      (specifier === "next/navigation" ? "next/navigation.js" : specifier);
    return nextResolve(resolved, context);
  },
});
const { ProfileHero } = await import("../src/app/app/psychologist/[id]/components/hero.tsx");
const { ProfileHeader, ProfileStickyBar } = await import(
  "../src/app/app/psychologist/[id]/components/profile-header.tsx"
);
const { ProfileTabs } = await import(
  "../src/app/app/psychologist/[id]/components/profile-tabs.tsx"
);
const { CommunityFollowButton } = await import(
  "../src/components/community/community-follow-button.tsx"
);
const { RelationshipButton } = await import("../src/components/ui/relationship-button.tsx");
const { renderRelations } = await import(
  "../src/components/community/community-relations-test-renderer.mjs"
);
const renderContact = (Component, props) =>
  renderRelations({ children: createElement(Component, props) });
const contactProfile = {
  id: "profile-hero-test",
  name: "Amanda Miranda Gomes de Azevedo",
  whatsapp_url: "https://wa.me/5511999999999",
};

export function renderHero(name, verified = true) {
  return renderToStaticMarkup(
    createElement(ProfileHero, {
      canFavorite: false,
      canEditProfile: false,
      favoritePending: false,
      profile: { name, verified, rating_avg: 0 },
    }),
  );
}

for (const [name, ending] of [
  ["Amanda Miranda Gomes de Azevedo", "Azevedo"],
  ["Ana", "Ana"],
  ["Ana Maria Silva-Santos", "Silva-Santos"],
]) {
  test(`verified badge shares an inline group with ${ending}`, () => {
    const html = renderHero(name);
    const heading = html.match(/<h1[^>]*>(.*?)<\/h1>/s)?.[1];
    assert.ok(heading);
    assert.ok(heading.includes(`class="inline-flex max-w-full items-center gap-1.5 align-bottom"`));
    assert.ok(heading.includes(`>${ending}</span><svg`));
    assert.ok(heading.includes('aria-label="Perfil verificado"'));
    assert.ok(!heading.includes("truncate"));
  });
}

test("unverified profiles retain their full name without a badge", () => {
  const html = renderHero("Amanda Miranda Gomes de Azevedo", false);
  assert.match(html, /<h1[^>]*>Amanda Miranda Gomes de Azevedo<\/h1>/);
  assert.ok(!html.includes('aria-label="Perfil verificado"'));
});

test("profile hero shares the community rounded soft shadow without a square wrapper shadow", () => {
  const html = renderHero("Ana Lima");
  assert.match(html, /<header[^>]*rounded-b-\[28px\][^>]*shadow-lectum-soft/);
  const header = html.match(/<header[^>]*>/)?.[0] ?? "";
  assert.doesNotMatch(header, /shadow-none| border(?: |")/);
  const community = readFileSync(
    new URL("../src/app/app/community/[slug]/components/community-header.tsx", import.meta.url),
    "utf8",
  );
  assert.match(community, /rounded-b-\[28px\] bg-surface pb-5 shadow-lectum-soft dark:bg-surface/);
});

test("profile shows inline blue plus Favoritar until selected, then only an accessible heart", () => {
  for (const active of [false, true]) {
    const favorite = renderToStaticMarkup(
      createElement(ProfileHero, {
        canFavorite: true,
        canEditProfile: false,
        favoritePending: false,
        profile: { name: "Ana Lima", verified: true, rating_avg: 0, favorited: active },
      }),
    ).match(
      /<button[^>]*aria-label="(?:Favoritar Ana Lima|Remover Ana Lima dos favoritos)".*?<\/button>/s,
    )?.[0];
    assert.ok(favorite);
    const follow = renderToStaticMarkup(
      createElement(CommunityFollowButton, { following: active, size: "hero" }),
    );
    assert.match(favorite, /h-\[44px\]/);
    assert.match(favorite, /bg-transparent/);
    assert.match(favorite, /text-primary/);
    assert.doesNotMatch(favorite, /rounded-full|shadow-sm|border-favorite|bg-favorite/);
    assert.match(favorite, /stroke-width="2"/);
    assert.match(favorite, /style="font-size:13px;font-weight:600"/);
    if (active) {
      assert.match(favorite, /fill-current text-favorite/);
    } else {
      assert.doesNotMatch(favorite, /text-favorite/);
    }
    assert.match(follow, /h-\[44px\]/);
    assert.match(follow, /border-0/);
    assert.match(follow, /shadow-none/);
    assert.doesNotMatch(follow, /rounded-full|shadow-sm|bg-primary-soft/);
    assert.match(follow, /motion-reduce:transition-none/);
    assert.match(follow, /style="font-size:13px;font-weight:600"/);
    for (const html of [favorite, follow])
      assert.match(html, new RegExp(`aria-pressed="${active}"`));
    if (active) {
      assert.match(favorite, /w-\[44px\]/);
      assert.match(favorite, /lucide-heart/);
      assert.match(favorite, /fill-current/);
      assert.match(favorite, /aria-label="Remover Ana Lima dos favoritos"/);
      assert.doesNotMatch(favorite, /<span|lucide-plus/);
      assert.match(follow, /w-\[44px\] gap-0/);
      assert.match(follow, /lucide-check[^>]*scale-100 opacity-100/);
      assert.match(follow, /w-0 opacity-0/);
    } else {
      assert.match(favorite, /lucide-plus/);
      assert.match(favorite, />Favoritar<\/span>/);
      assert.doesNotMatch(favorite, /lucide-heart/);
      assert.match(follow, /gap-\[8px\]/);
      assert.match(favorite, /gap-\[8px\]/);
      assert.match(follow, /lucide-plus[^>]*scale-100 opacity-100/);
      assert.match(follow, />Seguir<\/span>/);
    }
  }
});

test("pending and own-profile favorite states remain disabled", () => {
  for (const props of [
    { canFavorite: true, favoritePending: true },
    { canFavorite: false, favoritePending: false },
  ]) {
    const html = renderToStaticMarkup(
      createElement(ProfileHero, {
        ...props,
        canEditProfile: false,
        profile: { name: "Ana Lima", rating_avg: 0 },
      }),
    );
    const button = html.match(/<button[^>]*aria-label="Favoritar Ana Lima"[^>]*>/)?.[0];
    assert.ok(button);
    assert.match(button, /disabled=""/);
  }
  const following = renderToStaticMarkup(
    createElement(CommunityFollowButton, { following: true, size: "hero", pending: true }),
  );
  assert.match(following, /disabled=""/);
  assert.match(following, /aria-busy="true"/);
  assert.match(following, /Seguindo/);
});

test("community hero keeps both pending states stable and blocks repeated requests", () => {
  for (const following of [false, true]) {
    const html = renderToStaticMarkup(
      createElement(CommunityFollowButton, { following, size: "hero", pending: true }),
    );
    assert.match(html, /disabled=""/);
    assert.match(html, /aria-busy="true"/);
    assert.match(html, /type="button"/);
    assert.match(html, /lucide-loader/);
    assert.match(html, /motion-reduce:animate-none/);
    assert.match(html, /lucide-check[^>]*opacity-0/);
    assert.match(html, /lucide-plus[^>]*opacity-0/);
    assert.match(html, following ? /w-\[44px\] gap-0/ : /gap-\[8px\]/);
  }
});

test("header relationship variant preserves legacy sizes and delegates the community action", () => {
  for (const [size, fontSize, height] of [
    ["compact", 11, "h-5"],
    ["hero", 13, "h-10"],
    ["header", 13, "h-[44px]"],
  ]) {
    const element = RelationshipButton({ size });
    assert.equal(element.props.style.fontSize, fontSize);
    assert.ok(element.props.className.includes(height));
  }
  let calls = 0;
  const onClick = () => {
    calls += 1;
  };
  for (const following of [false, true]) {
    const wrapper = CommunityFollowButton({ size: "hero", following, onClick });
    const control = wrapper.props.children[0];
    assert.equal(control.type, RelationshipButton);
    assert.equal(control.props.size, "header");
    assert.equal(control.props.onClick, onClick);
    control.props.onClick();
    const html = renderToStaticMarkup(wrapper);
    assert.match(html, /h-\[20px\] w-\[20px\]/);
    assert.match(html, /bg-transparent/);
    assert.match(html, /text-primary/);
  }
  assert.equal(calls, 2);
});

test("sticky contact preserves the hero accessible name independently of favorite state", () => {
  for (const favorited of [false, true]) {
    const props = {
      canFavorite: true,
      favoritePending: false,
      profile: { ...contactProfile, verified: true, favorited },
    };
    const sticky = renderContact(ProfileStickyBar, { ...props, visible: true });
    const hero = renderContact(ProfileHero, props);
    const label = /aria-label="(Chamar [^"]+ no WhatsApp)"/;
    assert.equal(sticky.match(label)?.[1], "Chamar Amanda no WhatsApp");
    assert.equal(sticky.match(label)?.[1], hero.match(label)?.[1]);
    assert.match(sticky, /aria-hidden="false"/);
    assert.doesNotMatch(sticky, /inert=""/);
    assert.match(sticky, /min-w-0 truncate text-\[15px\]/);
    assert.match(sticky, /Amanda Miranda Gomes de Azevedo/);
    assert.match(sticky, /data-profile-whatsapp-cta="sticky"/);
    assert.match(sticky, /<span[^>]*>WhatsApp<\/span>/);
    assert.match(sticky, /aria-label="Voltar"/);
    assert.match(sticky, /lucide-chevron-left/);
    assert.equal((sticky.match(/<button/g) ?? []).length, 2);
    assert.doesNotMatch(sticky, /Favoritar|data-profile-avatar/);
    assert.match(sticky, /aria-label="Perfil verificado"/);
  }
});

test("hidden sticky contact is inert; unavailable and read-only profiles omit contact", () => {
  const props = {
    canFavorite: true,
    favoritePending: true,
    profile: { ...contactProfile, name: "Ana Lima" },
  };
  const hidden = renderContact(ProfileStickyBar, { ...props, visible: false });
  assert.match(hidden, /aria-hidden="true" inert=""/);
  assert.match(hidden, /invisible/);
  assert.match(hidden, /data-profile-whatsapp-cta="sticky"/);
  for (const override of [{ whatsapp_url: null }, { read_only: true }]) {
    const unavailable = renderContact(ProfileStickyBar, {
      ...props,
      profile: { ...props.profile, ...override },
      visible: true,
    });
    assert.doesNotMatch(unavailable, /data-profile-whatsapp-cta/);
    assert.match(unavailable, /aria-label="Voltar"/);
    assert.match(unavailable, /aria-hidden="true" inert=""/);
  }
  const own = renderContact(ProfileStickyBar, { ...props, canFavorite: false, visible: true });
  assert.match(own, /data-profile-whatsapp-cta="sticky"/);
  assert.match(own, /Ana Lima/);
});

test("profile header starts hidden, observes header contact and cleans up", () => {
  const html = renderContact(ProfileHeader, {
    canFavorite: true,
    favoritePending: false,
    profile: { ...contactProfile, name: "Ana Lima", favorited: false },
  });
  assert.match(html, /data-profile-contact-anchor/);
  assert.doesNotMatch(html, /data-profile-favorite-anchor/);
  assert.match(html, /aria-hidden="true" inert=""/);
  const source = readFileSync(
    new URL("../src/app/app/psychologist/[id]/components/profile-header.tsx", import.meta.url),
    "utf8",
  );
  assert.match(source, /anchor.getBoundingClientRect\(\).bottom <= 0/);
  assert.match(source, /observer.observe\(anchor\)/);
  assert.match(source, /observer.disconnect\(\)/);
  assert.match(source, /contactAnchorRef=\{anchorRef\}/);
  assert.match(source, /removeEventListener\("scroll", update, true\)/);
  assert.match(source, /removeEventListener\("resize", update\)/);
  assert.match(source, /<ProfileStickyBar onBack=\{props.onBack\}/);
});

test("profile tabs keep navigation but no longer stick on scroll", () => {
  const html = renderToStaticMarkup(
    createElement(ProfileTabs, { activeTab: "publicacoes", publicationCount: 3, reviewCount: 0 }),
  );
  assert.match(html, /role="tablist"/);
  assert.match(html, /aria-selected="true"[^>]*id="profile-tab-publicacoes"/);
  assert.match(html, /h-\[44px\]/);
  assert.match(html, /min-w-0 flex-1/);
  assert.match(html, /items-center justify-center/);
  assert.match(html, /before:bottom-0 before:h-\[2px\]/);
  assert.equal((html.match(/before:bg-foreground/g) ?? []).length, 1);
  assert.doesNotMatch(html, /shadow-|before:bg-surface|rounded-\[12px\]/);
  assert.doesNotMatch(html, /sticky|top-0/);
});
