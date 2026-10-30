import "../../../../../../scripts/register-source-modules.mjs";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { registerHooks } from "node:module";
import test from "node:test";
import { Children, createElement, isValidElement } from "react";

const bridges = new Map(
  ["image", "link"].map((name) => {
    const url = import.meta.resolve(`next/${name}.js`);
    return [
      `next/${name}`,
      `data:text/javascript,${encodeURIComponent(`import actual from ${JSON.stringify(url)}; export default actual.default ?? actual;`)}`,
    ];
  }),
);
registerHooks({
  resolve(specifier, context, nextResolve) {
    return nextResolve(
      bridges.get(specifier) ??
        (specifier === "next/navigation" ? "next/navigation.js" : specifier),
      context,
    );
  },
});

const { renderRelations } = await import(
  "../../../../../components/community/community-relations-test-renderer.mjs"
);
const { ProfileHero } = await import("../components/hero.tsx");
const { ProfileHeader, ProfileStickyBar } = await import("../components/profile-header.tsx");
const { ProfileFavoriteButton } = await import("../components/profile-favorite-button.tsx");
const { RelationshipButton } = await import("../../../../../components/ui/relationship-button.tsx");
const { ProfileTabs } = await import("../components/profile-tabs.tsx");
const { WhatsAppCta } = await import("../components/whatsapp-cta.tsx");
const { buildBenefitTags, formatExperienceLabel } = await import("./support.ts");
const { getCurrentInteractionPath } = await import("../../../../../utils/analytics-path.ts");
const profile = {
  id: "profile-header-test",
  name: "Ana Lima",
  crp: "06/123456",
  headline: "Atendimento com escuta e acolhimento.",
  formation_years: 4,
  whatsapp_url: "https://wa.me/5511999999999",
  social_value: true,
  discount_first_session: true,
  accepts_insurance: true,
};
const props = {
  profile,
  canFavorite: true,
  canEditProfile: false,
  favoritePending: false,
  onBack() {},
};
const render = (Component, overrides = {}) =>
  renderRelations({ children: createElement(Component, { ...props, ...overrides }) });

const descendants = (element) =>
  isValidElement(element)
    ? [element, ...Children.toArray(element.props.children).flatMap(descendants)]
    : [];

test("experience uses real years, singular and missing values", () => {
  assert.equal(formatExperienceLabel(4), "4 anos exp.");
  assert.equal(formatExperienceLabel(1), "1 ano exp.");
  for (const years of [null, undefined, 0, -1]) assert.equal(formatExperienceLabel(years), null);
  const html = render(ProfileHero);
  assert.match(html, /4 anos exp\./);
  assert.doesNotMatch(html, /lucide-star|depoimentos|de experiência/);
  assert.doesNotMatch(
    render(ProfileHero, { profile: { ...profile, show_experience_tag: false } }),
    /4 anos exp\./,
  );
});

test("benefits retain original icons and only enabled conditions", () => {
  assert.deepEqual(
    buildBenefitTags(profile).map((tag) => tag.label),
    ["Valor social", "Desconto 1ª sessão", "Aceita convênios"],
  );
  assert.deepEqual(buildBenefitTags({}), []);
  const html = render(ProfileHero);
  assert.match(html, /lucide-heart-handshake/);
  assert.match(html, /lucide-badge-percent/);
  assert.match(html, /lucide-shield-check/);
  assert.match(html, /text-\[13px\] sm:text-\[13px\]/);
});

test("favorite is blue plus and text before selection, only an accessible red heart after", () => {
  const idle = render(ProfileFavoriteButton);
  assert.match(idle, /lucide-plus/);
  assert.match(idle, /h-\[44px\]/);
  assert.match(idle, />Favoritar<\/span>/);
  assert.doesNotMatch(idle, /lucide-heart/);
  const selected = render(ProfileFavoriteButton, { profile: { ...profile, favorited: true } });
  assert.match(selected, /aria-label="Remover Ana Lima dos favoritos"/);
  assert.match(selected, /aria-pressed="true"/);
  assert.match(selected, /lucide-heart/);
  assert.match(selected, /fill-current text-favorite/);
  assert.doesNotMatch(idle, /text-favorite/);
  assert.match(selected, /h-\[44px\]/);
  assert.match(selected, /w-\[44px\]/);
  assert.match(selected, /text-primary/);
  assert.doesNotMatch(selected, /<span|lucide-plus|bg-favorite-soft|border-favorite/);
  for (const overrides of [{ favoritePending: true }, { canFavorite: false }]) {
    assert.match(render(ProfileFavoriteButton, overrides), /disabled=""/);
  }
});

test("profile favorite delegates compact typography and the real action to RelationshipButton", () => {
  let calls = 0;
  const onToggleFavorite = () => {
    calls += 1;
  };
  for (const favorited of [false, true]) {
    const element = ProfileFavoriteButton({
      ...props,
      profile: { ...profile, favorited },
      onToggleFavorite,
    });
    assert.equal(element.type, RelationshipButton);
    assert.equal(element.props.size, "compact");
    assert.equal(element.props.onClick, onToggleFavorite);
    assert.equal(element.props["aria-pressed"], favorited);
    const button = RelationshipButton(element.props);
    assert.equal(button.props.style.fontSize, 11);
    assert.equal(button.props.style.fontWeight, 600);
    assert.match(button.props.className, /h-\[44px\]/);
    assert.doesNotMatch(button.props.className, /(?:^| )h-5(?: |$)/);
    button.props.onClick();
  }
  assert.equal(calls, 2);
  for (const overrides of [{ favoritePending: true }, { canFavorite: false }]) {
    const element = ProfileFavoriteButton({ ...props, ...overrides, onToggleFavorite });
    assert.equal(RelationshipButton(element.props).props.disabled, true);
  }
});

test("sticky back button invokes the supplied handler and header forwards it", () => {
  let calls = 0;
  const onBack = () => {
    calls += 1;
  };
  const sticky = ProfileStickyBar({ profile, visible: true, onBack });
  const back = descendants(sticky).find((element) => element.props["aria-label"] === "Voltar");
  assert.ok(back);
  assert.equal(back.type, "button");
  assert.equal(back.props.type, "button");
  assert.equal(back.props.onClick, onBack);
  assert.match(back.props.className, /h-\[44px\] w-\[44px\]/);
  back.props.onClick();
  assert.equal(calls, 1);
  const source = readFileSync(new URL("../components/profile-header.tsx", import.meta.url), "utf8");
  assert.match(source, /<ProfileStickyBar onBack=\{props.onBack\}/);
});

test("header contains full width contact and sticky has name plus WhatsApp icon and text", () => {
  const hero = render(ProfileHero);
  assert.match(hero, /data-profile-contact-anchor/);
  assert.match(hero, /data-profile-whatsapp-cta="hero"/);
  assert.match(hero, /Chamar no WhatsApp/);
  assert.match(hero, /w-full min-w-0 gap-2/);
  const sticky = render(ProfileStickyBar, { visible: true });
  assert.match(sticky, /aria-label="Chamar Ana no WhatsApp"/);
  assert.match(sticky, /data-profile-whatsapp-cta="sticky"/);
  assert.match(sticky, /aria-hidden="false"/);
  assert.match(sticky, /Ana Lima/);
  assert.equal((sticky.match(/<button/g) ?? []).length, 2);
  assert.doesNotMatch(sticky, /Favoritar|data-profile-avatar|Chamar no WhatsApp</);
  assert.match(sticky, /<span[^>]*>WhatsApp<\/span>/);
  assert.match(sticky, /lucide-chevron-left/);
  const initial = render(ProfileHeader);
  assert.match(initial, /aria-hidden="true" inert=""/);
  assert.doesNotMatch(initial, /fixed inset-x|fixed right/);
});

test("read-only and missing contact profiles expose no contact button", () => {
  for (const overrides of [{ read_only: true }, { whatsapp_url: null }]) {
    const restrictedProfile = { ...profile, ...overrides };
    assert.equal(render(WhatsAppCta, { profile: restrictedProfile }), "");
    assert.doesNotMatch(
      render(ProfileHero, { profile: restrictedProfile }),
      /data-profile-contact-anchor/,
    );
    const sticky = render(ProfileStickyBar, { profile: restrictedProfile, visible: true });
    assert.match(sticky, /aria-hidden="true" inert=""/);
    assert.doesNotMatch(sticky, /data-profile-whatsapp-cta/);
    assert.match(sticky, /aria-label="Voltar"/);
  }
});

test("hero contact label has 14px text, 22px line height and 2px vertical padding", () => {
  const hero = render(WhatsAppCta);
  const labelClasses = hero.match(/<span class="([^"]+)">Chamar no WhatsApp<\/span>/)?.[1];
  assert.ok(labelClasses);
  assert.match(labelClasses, /text-\[14px\] font-semibold leading-\[22px\]/);
  assert.match(labelClasses, /py-\[2px\]/);
});

test("sticky contact retains 44px touch, a 34px green background and an 18px icon", () => {
  const sticky = render(WhatsAppCta, { compact: true });
  assert.match(sticky, /h-\[44px\]/);
  assert.match(sticky, /before:inset-y-\[5px\]/);
  assert.match(sticky, /before:bg-whatsapp-contact/);
  assert.match(sticky, /h-\[18px\] w-\[18px\]/);
});

test("sticky WhatsApp label has 13px text and 20px line height", () => {
  const sticky = render(WhatsAppCta, { compact: true });
  const labelClasses = sticky.match(/<span class="([^"]+)">WhatsApp<\/span>/)?.[1];
  assert.ok(labelClasses);
  assert.match(labelClasses, /text-\[13px\] font-semibold leading-\[20px\]/);
});

test("sticky name truncates at 15px while the verified badge stays outside the truncation", () => {
  const bar = render(ProfileStickyBar, { visible: true });
  const nameClasses = bar.match(/<span class="([^"]+)" data-profile-sticky-name/)?.[1];
  assert.ok(nameClasses);
  assert.match(nameClasses, /min-w-0 truncate text-\[15px\] font-semibold leading-\[20px\]/);
  assert.doesNotMatch(bar, /Perfil verificado/);
  const verified = render(ProfileStickyBar, {
    visible: true,
    profile: { ...profile, verified: true },
  });
  assert.match(verified, /Ana Lima<\/span><svg[^>]*aria-label="Perfil verificado"/);
  assert.match(verified, /h-4 w-4 shrink-0/);
  assert.match(verified, /-ml-1 flex min-w-0 flex-1 items-center gap-1/);
});

test("hero and sticky share the configured WhatsApp name and normalized fallback", () => {
  for (const [whatsappName, expected] of [
    ["Dra. Ana Maria", "Ana Maria"],
    ["   ", "Ana"],
    [null, "Ana"],
  ]) {
    const namedProfile = {
      ...profile,
      name: "Dra. Ana Lima",
      whatsapp_name: whatsappName,
    };
    for (const compact of [false, true]) {
      const html = render(WhatsAppCta, { profile: namedProfile, compact });
      assert.match(html, /h-\[44px\]/);
      assert.ok(html.includes(`aria-label="Chamar ${expected} no WhatsApp"`));
    }
    const sticky = render(ProfileStickyBar, { profile: namedProfile, visible: true });
    assert.match(sticky, /title="Ana Lima">Ana Lima<\/span>/);
  }
});

test("compact contact keeps profile attribution and the shared click-time route", () => {
  const hero = WhatsAppCta({ profile });
  const sticky = WhatsAppCta({ profile, compact: true });
  assert.equal(sticky.type, hero.type);
  assert.deepEqual(sticky.props.psychologist, hero.props.psychologist);
  assert.deepEqual(sticky.props.trackingContext, {
    pageKind: "psychologist_profile",
    targetId: profile.id,
    targetType: "psychologist",
  });
  const previousWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  try {
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: {
        location: {
          pathname: "/psicologos/profile-header-test",
          search: "?tab=depoimentos&token=private-test-value",
        },
      },
    });
    assert.equal(getCurrentInteractionPath(), "/psicologos/profile-header-test");
  } finally {
    if (previousWindow) Object.defineProperty(globalThis, "window", previousWindow);
    else delete globalThis.window;
  }
  const redirectSource = readFileSync(
    new URL(
      "../../../../../components/psychologists/psychologist-whatsapp-redirect-button.tsx",
      import.meta.url,
    ),
    "utf8",
  );
  assert.match(
    redirectSource,
    /getCurrentInteractionPath\(\) \?\? trackingContext\?\.path \?\? "\/"/,
  );
});

test("tabs retain roving focus with matching publication and testimonial counters", () => {
  const html = render(ProfileTabs, {
    activeTab: "avaliacoes",
    publicationCount: 7,
    reviewCount: 2,
  });
  assert.match(html, /aria-selected="true"[^>]*id="profile-tab-avaliacoes"/);
  assert.equal((html.match(/tabindex="0"/g) ?? []).length, 1);
  const counters = [...html.matchAll(/<span class="([^"]+)" title="(?:7|2)">/g)];
  assert.equal(counters.length, 2);
  assert.equal(counters[0][1], counters[1][1]);
  assert.match(html, /h-\[44px\]/);
  const buttons = [...html.matchAll(/<button[^>]*class="([^"]+)"[^>]*>/g)];
  assert.equal(buttons.length, 3);
  for (const [, classes] of buttons) {
    assert.match(classes, /h-\[44px\] min-w-0 flex-1/);
    assert.match(classes, /items-center justify-center/);
    assert.match(classes, /before:bottom-0 before:h-\[2px\]/);
    assert.doesNotMatch(classes, /shadow-|before:bg-surface|(?:^| )rounded-/);
  }
  assert.equal((html.match(/before:bg-foreground/g) ?? []).length, 1);
  assert.equal((html.match(/<span[^>]*text-\[13px\] font-semibold/g) ?? []).length, 3);
  assert.match(counters[0][1], /text-\[11px\]/);
  assert.match(counters[0][1], /bg-primary-soft/);
  assert.match(counters[0][1], /font-semibold/);
  assert.match(counters[0][1], /h-\[18px\] min-w-\[18px\]/);
});

test("sticky observes contact rather than favorite and cleans up scrolling observers", () => {
  const source = readFileSync(new URL("../components/profile-header.tsx", import.meta.url), "utf8");
  assert.match(source, /contactAnchorRef=\{anchorRef\}/);
  assert.match(source, /anchor.getBoundingClientRect\(\).bottom <= 0/);
  assert.match(source, /observer.disconnect\(\)/);
  assert.match(source, /removeEventListener\("scroll", update, true\)/);
  assert.doesNotMatch(source, /favoriteAnchorRef/);
});

test("presentation contact reveal retains playback analytics and expanded-only contact", () => {
  const source = readFileSync(
    new URL("../components/presentation-video.tsx", import.meta.url),
    "utf8",
  );
  assert.match(source, /useVideoContactReveal\(/);
  assert.match(source, /videoSrc && !profile.read_only && profile.whatsapp_url/);
  assert.match(source, /handleContactVideoReady\(video\)/);
  assert.match(source, /handleVideoReady\(video\)/);
  assert.match(source, /handleAutoplayVideoReady\(video\)/);
  assert.match(source, /videoLabelExpanded=\{contactExpanded\}/);
  assert.match(source, /onVideoElementReady=\{handlePlayerReady\}/);
  assert.match(source, /bottomOverlayExpandedOnly/);
});
