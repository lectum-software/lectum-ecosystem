export type PublicCommunityPostSeoSource = "community_post" | "post_reply";

export type PublicCommunityPostSeoDTO = {
  canonical_url: string;
  community: {
    name: string;
    slug: string;
  };
  description: string;
  media_type: string | null;
  og_description: string;
  og_image_height: number | null;
  og_image_url: string | null;
  og_image_width: number | null;
  og_title: string;
  og_video_url: string | null;
  published_at: Date;
  source: PublicCommunityPostSeoSource;
  title: string;
  updated_at: Date | null;
};
