"use client";

import { useEffect, useId, useRef, useState } from "react";
import { followCommunity, getCommunityDetail } from "@/api/req/community";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/registry/new-york-v4/ui/button";

type FollowRequest = {
  name: string;
  reply: boolean;
  resolve: (confirmed: boolean) => void;
};
const eventName = "lectum:confirm-community-publication";

export async function ensurePublicationFollowing(slug: string, reply = false) {
  const detail = await getCommunityDetail(slug);
  if (detail.participation.following) return;
  const confirmed = await new Promise<boolean>((resolve) => {
    const event = new CustomEvent<FollowRequest>(eventName, {
      cancelable: true,
      detail: { name: detail.community.name, reply, resolve },
    });
    window.dispatchEvent(event);
    if (!event.defaultPrevented) resolve(false);
  });
  if (!confirmed) throw new Error("Envio cancelado. Seu conteúdo foi mantido.");
  const membership = await followCommunity(slug);
  if (!membership.following)
    throw new Error("Não foi possível seguir a comunidade. Tente novamente.");
}

export function FollowBeforePublishDialog() {
  const [request, setRequest] = useState<FollowRequest | null>(null);
  const active = useRef<FollowRequest | null>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const cancel = useRef<HTMLButtonElement | null>(null);
  const titleId = useId();
  useEffect(() => {
    const receive = (event: Event) => {
      event.preventDefault();
      const next = (event as CustomEvent<FollowRequest>).detail;
      if (active.current) {
        next.resolve(false);
        return;
      }
      returnFocus.current = document.activeElement as HTMLElement | null;
      active.current = next;
      setRequest(next);
    };
    window.addEventListener(eventName, receive);
    return () => {
      window.removeEventListener(eventName, receive);
      active.current?.resolve(false);
      active.current = null;
    };
  }, []);
  const finish = (confirmed: boolean) => {
    active.current?.resolve(confirmed);
    active.current = null;
    setRequest(null);
  };
  return (
    <Modal
      open={Boolean(request)}
      onClose={() => finish(false)}
      labelledBy={titleId}
      initialFocusRef={cancel}
      returnFocusRef={returnFocus}
    >
      <section className="w-full max-w-md rounded-lg border border-border bg-surface p-5 shadow-lg">
        <h2 id={titleId} className="text-lg font-bold">
          Siga a comunidade para {request?.reply ? "responder" : "publicar"}
        </h2>
        <p className="mt-3 text-sm text-muted">
          Para participar de {request?.name}, é necessário seguir a comunidade.
        </p>
        <div className="mt-5 flex flex-wrap justify-end gap-3">
          <Button asChild variant="outline">
            <button ref={cancel} type="button" onClick={() => finish(false)}>
              Voltar
            </button>
          </Button>
          <Button onClick={() => finish(true)}>
            Seguir e {request?.reply ? "responder" : "publicar"}
          </Button>
        </div>
      </section>
    </Modal>
  );
}
