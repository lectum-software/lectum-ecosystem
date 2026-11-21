"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { usePrivacyStatus, useSavePrivacy } from "@/api/callers/privacy";
import { hasCompletedRegistrationForPrompts } from "@/utils/prompt-cooldown";
import { releaseActivePrompt, reserveActivePrompt } from "@/utils/prompt-coordinator";
import { authorizedGuestTransferToken, guestTransferToken } from "./attribution-client";
import { canShowPrivacyNotice, PRIVACY_NOTICE_VERSION, PRIVACY_OPEN } from "./policy";
import { PrivacyPreferences } from "./preferences";
import { persistPrivacyChoice, usePrivacyChoice } from "./use-choice";
import { usePrivacyIdentity } from "./use-identity";

function visible(element: Element) {
  const style = getComputedStyle(element);
  return (
    element.getClientRects().length > 0 && style.display !== "none" && style.visibility !== "hidden"
  );
}
function busySurface() {
  return (
    [
      ...document.querySelectorAll(
        'dialog[open], [aria-modal="true"], [data-create-post-sheet-state="open"], [data-actionable-coach-mark], [data-psychologists-coach-mark], [data-community-publish-onboarding]',
      ),
    ].some(visible) ||
    Boolean(document.activeElement?.matches('input, textarea, select, [contenteditable="true"]'))
  );
}

export function PrivacyNotice() {
  const { user, hasToken, ready } = usePrivacyIdentity();
  const inviteReady = !hasToken || hasCompletedRegistrationForPrompts(user);
  return (
    <NoticeSession
      key={user?.id || "guest"}
      userId={user?.id || null}
      ready={ready}
      inviteReady={inviteReady}
      transferEligible={user?.role === "psicologo"}
    />
  );
}

function NoticeSession({
  userId,
  ready,
  inviteReady,
  transferEligible,
}: {
  userId: string | null;
  ready: boolean;
  inviteReady: boolean;
  transferEligible: boolean;
}) {
  const path = usePathname();
  const choice = usePrivacyChoice(userId);
  const [panel, setPanel] = useState(false);
  const [shown, setShown] = useState(false);
  const [bottom, setBottom] = useState(12);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const lock = useRef(false);
  const status = usePrivacyStatus(userId || "", ready);
  const saveMutation = useSavePrivacy(userId || "", status.data?.revision);
  const recoveryAttempted = useRef(false);
  const transferAttempted = useRef(false);
  const { mutateAsync: recoverRevocation } = saveMutation;
  useEffect(() => {
    // Restore only an existing account grant; never overwrite a local denial.
    const confirmed = status.data;
    const expiresAt = Date.parse(confirmed?.expires_at ?? "");
    if (
      !userId ||
      !ready ||
      saving ||
      choice !== null ||
      !status.isSuccess ||
      !confirmed?.granted ||
      !confirmed.collection_available ||
      confirmed.document_version !== PRIVACY_NOTICE_VERSION ||
      !Number.isFinite(expiresAt) ||
      expiresAt <= Date.now()
    )
      return;
    persistPrivacyChoice(userId, true, false, expiresAt);
  }, [userId, ready, saving, choice, status.isSuccess, status.data]);

  useEffect(() => {
    if (
      !userId ||
      !ready ||
      !transferEligible ||
      choice !== null ||
      !status.isSuccess ||
      status.data.decided ||
      status.data.revision !== 0 ||
      !status.data.collection_available ||
      saving ||
      transferAttempted.current ||
      !authorizedGuestTransferToken()
    )
      return;
    transferAttempted.current = true;
    lock.current = true;
    setSaving(true);
    void recoverRevocation({ campaigns: true, authorizeTransfer: true, fromGuestChoice: true })
      .then((confirmed) => {
        persistPrivacyChoice(userId, true, false, Date.parse(confirmed.expires_at ?? ""), true);
      })
      .catch(() => {
        // No new prompt or assumed account consent on failure; explicit preferences remain available.
      })
      .finally(() => {
        lock.current = false;
        setSaving(false);
      });
  }, [
    userId,
    ready,
    transferEligible,
    choice,
    status.isSuccess,
    status.data,
    saving,
    recoverRevocation,
  ]);
  useEffect(() => {
    if (!userId || !ready || saving || !choice?.pendingRevocation || recoveryAttempted.current)
      return;
    recoveryAttempted.current = true;
    void recoverRevocation(false)
      .then(() => persistPrivacyChoice(userId, false))
      .catch(() => {
        // The local denial stays in place; retry on the next visit or explicit save.
      });
  }, [userId, ready, saving, choice?.pendingRevocation, recoverRevocation]);
  const decided = choice !== null || status.data?.decided === true;
  const canInvite = ready && inviteReady && canShowPrivacyNotice(path) && !decided;

  useEffect(() => {
    const open = () => {
      if (!ready || busySurface()) return;
      if (!reserveActivePrompt("privacy")) return;
      setPanel(true);
      setError(null);
    };
    window.addEventListener(PRIVACY_OPEN, open);
    return () => window.removeEventListener(PRIVACY_OPEN, open);
  }, [ready]);

  useEffect(() => {
    if (panel) {
      reserveActivePrompt("privacy");
      return () => releaseActivePrompt("privacy");
    }
    if (!canInvite) {
      releaseActivePrompt("privacy");
      return;
    }
    let disposed = false;
    let idleAt = Date.now() + 1800;
    const sync = () => {
      if (disposed || panel) return;
      const navigation = document.querySelector("nav[data-fixed-bottom-recovery]");
      setBottom(
        navigation && visible(navigation)
          ? Math.max(12, window.innerHeight - navigation.getBoundingClientRect().top + 12)
          : 12,
      );
      if (
        !canInvite ||
        document.visibilityState !== "visible" ||
        busySurface() ||
        Date.now() < idleAt
      ) {
        setShown(false);
        releaseActivePrompt("privacy");
        return;
      }
      setShown(reserveActivePrompt("privacy"));
    };
    const interact = (event: Event) => {
      if ((event.target as Element | null)?.closest?.("[data-privacy-notice]")) return;
      idleAt = Date.now() + 1800;
      sync();
    };
    const observer = new MutationObserver(sync);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["open", "aria-modal", "data-create-post-sheet-state"],
    });
    const timer = window.setInterval(sync, 500);
    document.addEventListener("focusin", sync);
    document.addEventListener("pointerdown", interact, true);
    document.addEventListener("scroll", interact, true);
    document.addEventListener("visibilitychange", sync);
    sync();
    return () => {
      disposed = true;
      observer.disconnect();
      clearInterval(timer);
      document.removeEventListener("focusin", sync);
      document.removeEventListener("pointerdown", interact, true);
      document.removeEventListener("scroll", interact, true);
      document.removeEventListener("visibilitychange", sync);
      releaseActivePrompt("privacy");
    };
  }, [canInvite, panel]);

  const previousPath = useRef(path);
  useEffect(() => {
    if (previousPath.current !== path) {
      previousPath.current = path;
      setPanel(false);
      setShown(false);
      releaseActivePrompt("privacy");
    }
  }, [path]);

  async function save(campaigns: boolean, authorizeTransfer = false) {
    if (lock.current) return;
    lock.current = true;
    setSaving(true);
    setError(null);
    try {
      // A refusal closes local permission before attempting a network revocation.
      if (!campaigns) {
        recoveryAttempted.current = true;
        persistPrivacyChoice(userId, false, Boolean(userId));
      }
      const confirmed = userId
        ? await saveMutation.mutateAsync({
            campaigns,
            authorizeTransfer:
              campaigns && authorizeTransfer && transferEligible && Boolean(guestTransferToken()),
          })
        : null;
      const expiresAt = campaigns && confirmed ? Date.parse(confirmed.expires_at ?? "") : undefined;
      if (!persistPrivacyChoice(userId, campaigns, false, expiresAt, authorizeTransfer))
        throw new Error("storage_unavailable");
      setPanel(false);
      setShown(false);
      releaseActivePrompt("privacy");
    } catch {
      if (campaigns) persistPrivacyChoice(userId, false, Boolean(userId));
      setPanel(true);
      setError(
        "Não foi possível salvar sua preferência. As tecnologias opcionais permanecem bloqueadas. Tente novamente.",
      );
    } finally {
      lock.current = false;
      setSaving(false);
    }
  }

  return (
    <>
      {canInvite && shown && !panel && (
        <aside
          aria-label="Privacidade e cookies"
          data-privacy-notice
          className="fixed inset-x-3 z-50 mx-auto max-w-[440px] rounded-[var(--lectum-auth-radius)] border border-primary-foreground/15 bg-cookie-surface p-4 text-primary-foreground shadow-xl sm:inset-x-auto sm:right-6 sm:p-6"
          style={{
            bottom: `max(${bottom}px, calc(12px + env(safe-area-inset-bottom, 0px)))`,
            maxHeight: `calc(100dvh - ${bottom + 24}px)`,
            overflowY: "auto",
          }}
        >
          <p className="text-[15px] leading-6 sm:text-base sm:leading-7">
            Usamos cookies para medir audiência e campanhas. Saiba mais em Preferências.
          </p>
          {error && (
            <p role="alert" className="mt-3 text-sm text-primary-foreground">
              {error}
            </p>
          )}
          <div className="mt-4 grid gap-2">
            <button
              className="min-h-12 rounded-full bg-primary px-4 py-3 text-sm! font-extrabold! text-primary-foreground hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-foreground disabled:opacity-60"
              disabled={saving}
              onClick={() => void save(true, !userId || transferEligible)}
              type="button"
            >
              ACEITAR COOKIES
            </button>
            <button
              className="min-h-11 text-sm text-primary-foreground/80 underline underline-offset-4 hover:text-primary-foreground"
              disabled={saving}
              onClick={() => {
                setPanel(true);
                setError(null);
              }}
              type="button"
            >
              Preferências
            </button>
          </div>
        </aside>
      )}
      {panel && (
        <PrivacyPreferences
          canTransfer={!userId || transferEligible}
          transfer={choice?.authorizeTransfer ?? !status.data?.decided}
          campaigns={choice?.campaigns ?? (status.data?.decided ? status.data.granted : true)}
          busy={saving}
          error={error}
          onSave={save}
          onClose={() => {
            setPanel(false);
            releaseActivePrompt("privacy");
          }}
        />
      )}
    </>
  );
}
