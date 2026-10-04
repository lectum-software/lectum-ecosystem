"use client";

import { ActionableCoachMark } from "@/components/onboarding/actionable-coach-mark";
import { PSYCHOLOGIST_REPLY_TIP_SELECTOR } from "@/utils/psychologist-reply-tip";

export const PsychologistReplyOnboarding = ({ onDismiss }: { onDismiss: () => void }) => (
  <ActionableCoachMark
    highlightShape="area"
    onDismiss={onDismiss}
    requireFullyVisibleTarget
    targetSelector={PSYCHOLOGIST_REPLY_TIP_SELECTOR}
    title="Responda dúvidas da comunidade"
    waitForOtherTips
  >
    Toque nesta área do post para abrir a conversa e responder ao paciente.
  </ActionableCoachMark>
);
