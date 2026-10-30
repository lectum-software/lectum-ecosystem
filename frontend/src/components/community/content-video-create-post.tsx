"use client";

import dynamic from "next/dynamic";
import { useRef } from "react";
import { Modal } from "@/components/ui/modal";

const CreateCommunityPostLogic = dynamic(
  () =>
    import("@/app/app/community/[slug]/post/new/logic").then(
      (module) => module.CreateCommunityPostLogic,
    ),
  { ssr: false },
);

/** The existing composer owns draft confirmation, uploads and publication. */
export const ContentVideoCreatePost = ({ onClose }: { onClose: () => void }) => {
  const focusRef = useRef<HTMLElement | null>(null);
  return (
    <Modal
      open
      dismissible={false}
      className="z-[1200] overflow-hidden p-0 backdrop:bg-transparent backdrop:backdrop-blur-none"
      initialFocusRef={focusRef}
      returnFocusRef={focusRef}
      labelledBy="create-post-title-heading"
      onClose={onClose}
    >
      <CreateCommunityPostLogic onCloseComplete={onClose} scrollManagedExternally />
    </Modal>
  );
};
