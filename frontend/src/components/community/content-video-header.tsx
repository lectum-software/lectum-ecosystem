"use client";

import { ChevronDown, ChevronLeft, ChevronUp, Plus } from "lucide-react";
import type { RefObject } from "react";
import controls from "./content-video-controls.module.css";
import styles from "./content-video-viewer.module.css";

export const ContentVideoHeader = ({
  backRef,
  disabled,
  contextAvailable,
  contextOpen,
  contextChanged,
  onBack,
  onToggleContext,
  onCreate,
}: {
  backRef?: RefObject<HTMLButtonElement | null>;
  disabled: boolean;
  contextAvailable: boolean;
  contextOpen: boolean;
  contextChanged: boolean;
  onBack: () => void;
  onToggleContext: () => void;
  onCreate: () => void;
}) => (
  <div className={styles.top}>
    <button
      ref={backRef}
      className={controls.back}
      aria-label="Voltar"
      disabled={disabled}
      onClick={onBack}
      type="button"
    >
      <ChevronLeft aria-hidden />
    </button>
    {contextAvailable ? (
      <button
        className={`${styles.contextButton} ${contextChanged ? styles.contextChanged : ""}`}
        aria-expanded={contextOpen}
        onClick={onToggleContext}
        type="button"
      >
        Respondendo a {contextOpen ? <ChevronUp aria-hidden /> : <ChevronDown aria-hidden />}
      </button>
    ) : (
      <span />
    )}
    <button
      className={controls.create}
      aria-label="Criar publicação"
      title="Criar publicação"
      data-reels-create-post
      disabled={disabled}
      onClick={onCreate}
      type="button"
    >
      <Plus aria-hidden />
    </button>
  </div>
);
