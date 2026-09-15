import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

// Source-contract regressions only. Real keyboard, focus and scroll require Browser validation.
// Never import the shell's auth/API providers or simulate a DOM to claim that validation.
const shell = readFileSync(new URL("./shell.tsx", import.meta.url), "utf8");
const lifecycle = readFileSync(
  new URL("../../hooks/use-admin-dialog-lifecycle.ts", import.meta.url),
  "utf8",
);
const shellBody = shell.slice(shell.indexOf("export const AdminShell"));

test("menu usa o lifecycle existente, sem lock ou Escape paralelo", () => {
  assert.match(
    shell,
    /import \{ useAdminDialogLifecycle \} from "@\/hooks\/use-admin-dialog-lifecycle"/,
  );
  assert.match(
    shellBody,
    /const drawerRef = useAdminDialogLifecycle\(closeDrawer, \{\s*enabled: drawerOpen,/,
  );
  assert.doesNotMatch(
    shellBody,
    /style\.(?:overflow|overscrollBehavior)|["']keydown["']|["']Escape["']/,
  );
  assert.match(
    lifecycle,
    /event\.key !== "Escape"[\s\S]*?event\.preventDefault\(\);\s*activeDialog\.close\(\)/,
  );
});

test("dialog delimita o drawer e exclui backdrop da ordem Tab", () => {
  assert.match(
    shellBody,
    /<div\s+aria-label="Menu administrativo"\s+aria-modal="true"\s+className="fixed inset-0 z-50 lg:hidden"\s+id="admin-mobile-navigation"\s+ref=\{drawerRef\}\s+role="dialog"\s+tabIndex=\{-1\}/,
  );
  assert.match(
    shellBody,
    /className="absolute inset-0 bg-overlay"\s+onClick=\{closeDrawer\}\s+tabIndex=\{-1\}/,
  );
  assert.equal((shellBody.match(/inert=\{drawerOpen\}/g) ?? []).length, 2);
  assert.match(shellBody, /onNavigate=\{closeDrawer\}/);
  assert.equal((shellBody.match(/onClick=\{closeDrawer\}/g) ?? []).length, 2);
});

test("trap compartilhado mantém os dois limites Tab e a inicialização de foco", () => {
  assert.match(lifecycle, /element\.tabIndex >= 0/);
  assert.match(
    lifecycle,
    /event\.shiftKey && document\.activeElement === firstFocusable[\s\S]*?event\.preventDefault\(\);\s*lastFocusable\.focus\(\)/,
  );
  assert.match(
    lifecycle,
    /!event\.shiftKey && document\.activeElement === lastFocusable[\s\S]*?event\.preventDefault\(\);\s*firstFocusable\.focus\(\)/,
  );
  assert.match(
    lifecycle,
    /!dialogElement\.contains\(document\.activeElement\)[\s\S]*?event\.preventDefault\(\);\s*firstFocusable\.focus\(\)/,
  );
  assert.match(
    lifecycle,
    /\(getFocusableElements\(dialogElement\)\[0\] \?\? dialogElement\)\.focus\(\)/,
  );
});

test("resize desktop fecha e remove inscrição/frame no cleanup", () => {
  assert.match(shellBody, /window\.matchMedia\("\(min-width: 64rem\)"\)/);
  assert.match(shellBody, /if \(desktopMedia\.matches\) setDrawerPathname\(null\)/);
  assert.match(shellBody, /const frame = window\.requestAnimationFrame\(closeOnDesktop\)/);
  assert.match(shellBody, /window\.cancelAnimationFrame\(frame\)/);
  assert.match(shellBody, /desktopMedia\.addEventListener\("change", closeOnDesktop\)/);
  assert.match(shellBody, /desktopMedia\.removeEventListener\("change", closeOnDesktop\)/);
  assert.match(shellBody, /lg:block/);
  assert.match(shellBody, /collapsed \? "w-20" : "w-64"/);
  assert.match(shellBody, /onClick=\{toggleCollapsed\}\s+ref=\{desktopTriggerRef\}/);
});

test("drawer pertence à rota atual e não ressurge ao voltar", () => {
  assert.match(
    shellBody,
    /const drawerOpen = drawerPathname !== null && drawerPathname === pathname/,
  );
  assert.match(
    shellBody,
    /if \(drawerPathname !== null && drawerPathname !== pathname\) setDrawerPathname\(null\)/,
  );
  assert.match(shellBody, /onClick=\{\(\) => setDrawerPathname\(pathname\)\}/);
  assert.match(shellBody, /const closeOnHistory = \(\) => setDrawerPathname\(null\)/);
  for (const event of ["popstate", "hashchange"]) {
    assert.ok(shellBody.includes(`window.addEventListener("${event}", closeOnHistory)`));
    assert.ok(shellBody.includes(`window.removeEventListener("${event}", closeOnHistory)`));
  }
});

test("retorno opt-in escolhe gatilho visível sem rolar e preserva consumidores padrão", () => {
  assert.match(
    shellBody,
    /trigger\?\.getClientRects\(\)\.length \? trigger : desktopTriggerRef\.current/,
  );
  assert.match(
    shellBody,
    /if \(target\?\.isConnected\) target\.focus\(\{ preventScroll: true \}\)/,
  );
  assert.match(lifecycle, /closeEnabled = true,\s*enabled = true,/);
  assert.match(lifecycle, /onRestoreFocus\?: \(\) => void/);
  assert.match(lifecycle, /restoreFocusRef\.current = onRestoreFocus;\s*\}, \[onRestoreFocus\]\)/);
  const stacked = lifecycle.indexOf("if (activeDialogElement)");
  const override = lifecycle.indexOf("else if (restoreFocusRef.current)");
  const previous = lifecycle.indexOf("else if (previouslyFocused?.isConnected)");
  assert.ok(stacked >= 0 && override > stacked && previous > override);
  assert.match(
    lifecycle,
    /previouslyFocused\?\.isConnected && activeDialogElement\.contains\(previouslyFocused\)/,
  );
  assert.match(lifecycle, /previouslyFocused\.focus\(\)/);
});

test("scroll permanece coordenado pela pilha e restaura body e documento", () => {
  assert.match(lifecycle, /if \(dialogStack\.length !== 1\) return/);
  assert.match(lifecycle, /if \(dialogStack\.length !== 0\) return/);
  for (const element of ["body", "documentElement"]) {
    assert.ok(lifecycle.includes(`document.${element}.style.overflow = "hidden"`));
    assert.ok(lifecycle.includes(`document.${element}.style.overscrollBehavior = "none"`));
    assert.ok(lifecycle.includes(`document.${element}.style.overflow = previous`));
    assert.ok(lifecycle.includes(`document.${element}.style.overscrollBehavior = previous`));
  }
});
