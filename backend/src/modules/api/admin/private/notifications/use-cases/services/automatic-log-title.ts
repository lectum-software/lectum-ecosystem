import { messages } from "@/main/notification/constants";

type AutomaticLogTitleInput = {
  metadata: unknown;
  notification: {
    message_key: string;
    message_props: unknown;
  } | null;
  trigger_key: string | null;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value && typeof value === "object" && !Array.isArray(value));

const getStringProp = (value: unknown, key: string) => {
  if (!isRecord(value)) return null;

  const prop = value[key];
  return typeof prop === "string" && prop.trim().length > 0 ? prop.trim() : null;
};

const getRecordProp = (value: unknown, key: string) => {
  if (!isRecord(value)) return null;

  const prop = value[key];
  return isRecord(prop) ? prop : null;
};

const resolveTitleFromMessage = (messageKey: null | string | undefined, messageProps: unknown) => {
  const explicitTitle = getStringProp(messageProps, "title");
  if (explicitTitle) return explicitTitle.slice(0, 120);

  if (!messageKey || !Object.hasOwn(messages, messageKey)) return null;

  const build = messages[messageKey as keyof typeof messages];

  const props = isRecord(messageProps) ? messageProps : {};
  const title = build(props).title.trim();

  return title.length > 0 ? title.slice(0, 120) : null;
};

export const resolveAutomaticLogTitle = (item: AutomaticLogTitleInput) => {
  const metadataTitle =
    getStringProp(item.metadata, "notification_title") ?? getStringProp(item.metadata, "title");
  if (metadataTitle) return metadataTitle.slice(0, 120);

  const notificationTitle = resolveTitleFromMessage(
    item.notification?.message_key,
    item.notification?.message_props,
  );
  if (notificationTitle) return notificationTitle;

  const metadataMessageProps =
    getRecordProp(item.metadata, "message_props") ??
    getRecordProp(item.metadata, "notification_props");
  const metadataMessageKey =
    getStringProp(item.metadata, "message_key") ??
    item.trigger_key ??
    item.notification?.message_key;
  const resolvedMetadataTitle = resolveTitleFromMessage(metadataMessageKey, metadataMessageProps);

  return resolvedMetadataTitle ?? "Título não disponível";
};
