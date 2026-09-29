export const PROFILE_VIDEO_ACCEPT = "video/mp4,video/webm,video/quicktime";

export const openProfileVideoInput = (input: HTMLInputElement | null) => {
  if (!input) return;
  input.accept = PROFILE_VIDEO_ACCEPT;
  input.value = "";
  input.click();
};
