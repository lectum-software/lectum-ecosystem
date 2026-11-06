import { z } from "zod";

export const socialCaptionCuesSchema = z
  .array(
    z.object({
      start: z.number().finite().min(0).max(86400),
      end: z.number().finite().positive().max(86400),
      text: z.string().trim().min(1).max(500),
    }),
  )
  .min(1)
  .max(5000)
  .superRefine((cues, context) => {
    for (const [index, cue] of cues.entries()) {
      const previous = cues[index - 1];
      if (cue.end <= cue.start || (previous && cue.start < previous.end)) {
        context.addIssue({ code: "custom", message: "Invalid caption timing" });
      }
    }
  });

const stamp = (seconds: number) => {
  const ticks = Math.round(seconds * 100);
  return `${Math.floor(ticks / 360000)}:${String(Math.floor(ticks / 6000) % 60).padStart(2, "0")}:${String(Math.floor(ticks / 100) % 60).padStart(2, "0")}.${String(ticks % 100).padStart(2, "0")}`;
};

export function buildSocialCaptionAss(input: unknown) {
  const cues = socialCaptionCuesSchema.parse(input);
  const events = cues.flatMap((cue) => {
    // Strip ASS control syntax; split long speech into readable timed segments.
    const text = Array.from(cue.text, (character) =>
      character.charCodeAt(0) < 32 ? " " : character,
    )
      .join("")
      .replace(/[\\{}]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    const chunks = text.match(/.{1,72}(?:\s|$)|.{1,72}/gu) ?? [];
    return chunks.map(
      (chunk, index) =>
        `Dialogue: 0,${stamp(cue.start + ((cue.end - cue.start) * index) / chunks.length)},${stamp(cue.start + ((cue.end - cue.start) * (index + 1)) / chunks.length)},Default,,0,0,0,,${chunk.trim()}`,
    );
  });
  return `[Script Info]\nScriptType: v4.00+\nPlayResX: 1080\nPlayResY: 1920\nWrapStyle: 0\n\n[V4+ Styles]\nFormat: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding\nStyle: Default,Manrope,44,&H00FFFFFF,&H00FFFFFF,&H66000000,&H66000000,-1,0,0,0,100,100,0,0,3,8,0,2,150,150,480,1\n\n[Events]\nFormat: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n${events.join("\n")}\n`;
}
