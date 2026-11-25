export type PushNoticeState =
  | "hidden"
  | "checking"
  | "iphone"
  | "unsupported"
  | "unavailable"
  | "denied"
  | "active"
  | "error"
  | "requesting"
  | "invite";

export const needsHomeScreen = (userAgent: string, touchPoints: number, standalone: boolean) =>
  !standalone &&
  (/iPad|iPhone|iPod/.test(userAgent) || (/Macintosh/.test(userAgent) && touchPoints > 1));

export const isDismissiblePushNotice = (state: PushNoticeState) =>
  state === "unsupported" || state === "unavailable";

export const pushNoticeDismissalKey = (userId: string, state: PushNoticeState) =>
  `lectum.push-notice.dismissed:${encodeURIComponent(userId)}:${state}`;

export const getPushNoticeState = (input: {
  confirmed: boolean;
  mounted: boolean;
  homeScreenRequired: boolean;
  supported: boolean;
  checking: boolean;
  requesting: boolean;
  hasKey: boolean;
  permission: string;
  subscriptionStatus: "checking" | "active" | "error" | "idle";
}): PushNoticeState => {
  if (!input.confirmed) return "hidden";
  if (!input.mounted) return "checking";
  if (input.homeScreenRequired) return "iphone";
  if (!input.supported) return "unsupported";
  if (input.requesting) return "requesting";
  if (input.checking || input.subscriptionStatus === "checking") return "checking";
  if (input.permission === "denied") return "denied";
  if (!input.hasKey) return "unavailable";
  if (input.subscriptionStatus === "error") return "error";
  if (input.permission === "granted")
    return input.subscriptionStatus === "active" ? "active" : "checking";
  return "invite";
};
