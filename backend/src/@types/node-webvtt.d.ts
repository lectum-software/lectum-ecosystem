declare module "node-webvtt" {
  export function parse(
    input: string,
    options?: { strict?: boolean },
  ): {
    valid: boolean;
    cues: { start: number; end: number; text: string }[];
  };
}
