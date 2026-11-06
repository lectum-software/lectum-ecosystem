export type CaptionCue = { start: number; end: number; text: string };
export type VideoCaptions = {
  asset_id: string;
  language: "pt";
  revision: number;
  reviewed: boolean;
  cues: CaptionCue[];
};

export function captionVtt(cues: CaptionCue[]) {
  const stamp = (time: number) => {
    const millis = Math.round(time * 1000);
    return (
      [
        Math.floor(millis / 3600000),
        Math.floor(millis / 60000) % 60,
        Math.floor(millis / 1000) % 60,
      ]
        .map((value) => String(value).padStart(2, "0"))
        .join(":") +
      "." +
      String(millis % 1000).padStart(3, "0")
    );
  };
  const escapeCueText = (text: string) =>
    text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
  return (
    "WEBVTT\n\n" +
    cues
      .map(
        (cue, index) =>
          `${index + 1}\n${stamp(cue.start)} --> ${stamp(cue.end)}\n${escapeCueText(cue.text)}\n`,
      )
      .join("\n")
  );
}
