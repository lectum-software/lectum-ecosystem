export type PublicPsychologistSeoDTO = {
  captions?: Awaited<
    ReturnType<typeof import("@/modules/video-assets/captions/service").readPublicCaptions>
  >;
  canonical_url: string;
  description: string;
  name: string;
  og_description: string;
  og_image_height: number | null;
  og_image_url: string | null;
  og_image_width: number | null;
  og_title: string;
  title: string;
  updated_at: Date | null;
};
