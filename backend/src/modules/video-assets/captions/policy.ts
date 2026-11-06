import { z } from "zod";

export const captionCueSchema = z
  .object({
    start: z.number().finite().min(0).max(86400),
    end: z.number().finite().positive().max(86400),
    text: z
      .string()
      .trim()
      .min(1)
      .max(500)
      .refine(
        (text) =>
          !/[<>]/.test(text) &&
          Array.from(text).every((character) => {
            const code = character.charCodeAt(0);
            return code >= 32 || code === 9 || code === 10;
          }),
      ),
  })
  .strict()
  .refine((cue) => cue.end > cue.start);

export const captionCuesSchema = z
  .array(captionCueSchema)
  .max(5000)
  .refine((cues) => cues.every((cue, index) => index === 0 || cue.start >= cues[index - 1].end));
export type CaptionCue = z.infer<typeof captionCueSchema>;
export const captionEditSchema = z
  .object({
    revision: z.number().int().min(0),
    cues: captionCuesSchema,
  })
  .strict();

// An explicit per-video allowlist prevents a deploy from activating captions globally.
export const captionsEnabledFor = (id: string, env = process.env) =>
  (env.VIDEO_CAPTIONS_ASSET_IDS ?? "")
    .split(",")
    .map((value) => value.trim())
    .includes(id) && /^[a-z0-9_-]{8,64}$/i.test(id);

export const captionsFitDuration = (cues: CaptionCue[], duration: number | null) =>
  duration !== null && Number.isFinite(duration) && cues.every((cue) => cue.end <= duration + 0.1);

export const transcriptText = (cues: CaptionCue[]) => cues.map((cue) => cue.text).join(" ");
