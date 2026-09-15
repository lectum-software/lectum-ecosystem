import { POST_REPLY_COMPOSER_INPUT_SELECTOR } from "../modules/reply-support";

export const findReplyComposerInput = (composer: HTMLElement | null) =>
  composer?.querySelector<HTMLElement>(POST_REPLY_COMPOSER_INPUT_SELECTOR) ?? null;
