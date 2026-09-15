import type { AdminPublicSource } from "@/api/public-response";
import type {
  AdminPsychologistStatisticsPoint,
  AdminPsychologistVisibilityCounter,
  AdminPsychologistVisibilityPoint,
} from "./content";
import type {
  PsychologistsDashboardOperatingSystem,
  PsychologistsDashboardTrafficSources,
  PsychologistsDashboardTrend,
} from "./dashboard-core";
import type {
  PsychologistsProfileConversionBenchmark,
  PsychologistsProfileConversionSource,
  PsychologistsProfileConversionThresholds,
  PsychologistsProfileExposureAggregateCategoryId,
  PsychologistsProfileExposureBenchmark,
  PsychologistsProfileExposureThresholds,
} from "./dashboard-profile";

export type AdminPsychologistEngagementMetric = {
  available: boolean;
  comparison?: {
    change_percent: number | null;
    previous_from: string;
    previous_to: string;
    previous_value: number;
    trend: PsychologistsDashboardTrend;
  } | null;
  id: string;
  label: string;
  source: string;
  unit: "count" | "percentage" | "position" | "seconds";
  unavailable_reason: string | null;
  value: number | null;
};

export type AdminCommunityEngagementDiagnosis = {
  id: "ativo" | "muito_ativo" | "pouco_ativo" | "sem_base";
  label: "Alto engajamento" | "Baixo engajamento" | "Engajamento padrão" | "Sem engajamento";
  source: string;
};

export type AdminPsychologistBusinessProfileConversionCategoryId =
  | "insufficient_data"
  | "low_conversion"
  | "no_conversion"
  | "standard_conversion"
  | "strong_conversion";

export type AdminPsychologistBusinessProfileConversionQualityId =
  | "excellent_conversion"
  | "good_conversion"
  | "insufficient_data"
  | "low_conversion"
  | "no_conversion";

export type AdminPsychologistBusinessProfileConversionPlatformPositionId =
  | "above_reference"
  | "at_reference"
  | "below_reference"
  | "insufficient_data"
  | "unavailable";

export type AdminPsychologistContentFormatId = "image" | "image_carousel" | "text" | "video";

export type AdminPsychologistContentFormatDistribution = {
  items: {
    count: number;
    id: AdminPsychologistContentFormatId;
    label: "Apenas texto" | "Carrossel de imagens" | "Imagem" | "Vídeo";
    percentage: number;
    whatsapp_clicks: number;
  }[];
  total: number;
  total_whatsapp_clicks: number;
};

export type AdminPsychologistCommunityVideoRate = {
  source: AdminPublicSource<"community_post.media_type+community_post_media+post_reply.media_type">;
  with_video: {
    count: number;
    rate_percent: number;
  };
  without_video: {
    count: number;
    rate_percent: number;
  };
};

export type AdminPsychologistVisibilityDiagnosis = {
  benchmark: PsychologistsProfileExposureBenchmark;
  description: string;
  id: PsychologistsProfileExposureAggregateCategoryId;
  label: string;
  signals: {
    community_content_seconds: number;
    presentation_video_seconds: number;
    profile_age_days: number;
    profile_seconds: number;
    visibility_seconds: number;
  };
  source: AdminPublicSource<"page_view_event.duration_seconds+content_attention_session.attention_seconds+profile_video_watch_session.watched_seconds">;
  thresholds: PsychologistsProfileExposureThresholds;
};

export type AdminPsychologistStatistics = {
  business: {
    cards: AdminPsychologistEngagementMetric[];
    series: AdminPsychologistStatisticsPoint[];
    profile_conversion: {
      benchmark: PsychologistsProfileConversionBenchmark;
      description: string;
      headline: string;
      id: AdminPsychologistBusinessProfileConversionCategoryId;
      label: string;
      platform_position: {
        description: string;
        id: AdminPsychologistBusinessProfileConversionPlatformPositionId;
        label: string;
        reference_whatsapp_clicks: number | null;
      };
      quality: {
        description: string;
        id: AdminPsychologistBusinessProfileConversionQualityId;
        label: string;
        normalized_whatsapp_clicks_30d: number;
        thresholds: {
          excellent_whatsapp_clicks_30d: number;
          good_whatsapp_clicks_30d: number;
        };
      };
      signals: {
        active_days: number;
        normalized_whatsapp_clicks_30d: number;
        profile_age_days: number;
        whatsapp_clicks: number;
      };
      source: PsychologistsProfileConversionSource;
      thresholds: PsychologistsProfileConversionThresholds;
    };
    visibility: {
      cards: AdminPsychologistEngagementMetric[];
      counters: AdminPsychologistVisibilityCounter[];
      diagnosis: AdminPsychologistVisibilityDiagnosis;
      series: AdminPsychologistVisibilityPoint[];
      source: AdminPublicSource<"page_view_event.duration_seconds+content_attention_session.attention_seconds+profile_video_watch_session.watched_seconds+profile_view_event+page_view_event.target_type">;
      total_seconds: number;
    };
  };
  community: {
    cards: AdminPsychologistEngagementMetric[];
    communities: {
      avatar_url: string | null;
      color: string | null;
      coverage: {
        covered_patient_posts: number;
        patient_posts: number;
        rate_percent: number | null;
        source: AdminPublicSource<"community_post.author.role=paciente+post_reply.author_id">;
      };
      downvotes: number;
      engagement_diagnosis?: AdminCommunityEngagementDiagnosis;
      following: boolean;
      id: string;
      interactions: number;
      member_since: string | null;
      name: string;
      posts: number;
      posts_video_rate: AdminPsychologistCommunityVideoRate;
      ranking: {
        position: number;
        score: number;
      } | null;
      replies: number;
      replies_video_rate: AdminPsychologistCommunityVideoRate;
      slug: string;
      upvotes: number;
    }[];
    content_distribution: {
      posts: AdminPsychologistContentFormatDistribution;
      replies: AdminPsychologistContentFormatDistribution;
      source: AdminPublicSource<"community_post.media_type+community_post_media+post_reply.media_type+important_action_event.action_type=whatsapp_click">;
    };
    engagement_diagnosis: AdminCommunityEngagementDiagnosis;
    series: AdminPsychologistStatisticsPoint[];
  };
  period: {
    days: number;
    from: string;
    label: string;
    max_days: number;
    previous_from: string;
    previous_to: string;
    timezone: "server-local";
    to: string;
  };
  platform_usage: {
    access_days_count: number;
    average_duration_seconds: number | null;
    device_usage: {
      items: {
        count: number;
        device_type: "desktop" | "mobile" | "tablet" | "unknown";
        id: "desktop" | "mobile" | "tablet" | "unknown";
        label: string;
        operating_systems: {
          count: number;
          id: PsychologistsDashboardOperatingSystem;
          label: string;
          operating_system: PsychologistsDashboardOperatingSystem;
          percentage: number;
        }[];
        percentage: number;
      }[];
      source: AdminPublicSource<"visitor_session.device_type+visitor_session.os+user_id">;
      total_sessions: number;
      unavailable_reason: string | null;
    };
    duration_unavailable_reason: string | null;
    hourly_activity?: {
      accesses: number;
      count: number;
      engagement: number;
      hour: number;
      label: string;
      percentage: number;
      posts: number;
      replies: number;
      reports: number;
      total: number;
    }[];
    hourly_activity_by_weekday?: {
      day: number;
      hours: {
        accesses: number;
        count: number;
        engagement: number;
        hour: number;
        label: string;
        percentage: number;
        posts: number;
        replies: number;
        reports: number;
        total: number;
      }[];
      label: string;
    }[];
    last_access_at: string | null;
    period_from: string;
    period_to: string;
    peak_activity_hours: {
      count: number;
      hour: number;
      label: string;
      percentage: number;
    }[];
    pwa_installation_recorded: boolean;
    pwa_installed_at: string | null;
    sessions_count: number;
    source: AdminPublicSource<"page_view_event+visitor_session+important_action_event+community_post+post_reply+post_vote+post_save+post_reply_save+post_share+post_report">;
    top_pages: {
      count: number;
      label: string;
      percentage: number;
    }[];
    unavailable_reason: string | null;
  };
  source: AdminPublicSource<"profile_events+community_activity+video_sessions+search_impressions+professional_review+page_view_event+important_action_event+content_attention_session">;
  traffic_quality: {
    absorption_rate: number | null;
    attributed_whatsapp_clicks: number;
    attribution_note: string;
    flows: {
      count: number;
      id: `${string}_${"interested" | "qualified" | "unidentified" | "visited"}`;
      origin_id: string;
      origin_label: string;
      percentage: number;
      quality_id: "interested" | "qualified" | "unidentified" | "visited";
      quality_label: string;
    }[];
    origins: {
      actors: number;
      id: string;
      label: string;
      percentage: number;
      profile_views: number;
      qualified_actors: number;
    }[];
    predominant_quality: {
      count: number;
      description: string;
      id: "interested" | "qualified" | "unidentified" | "visited";
      label: string;
      percentage: number;
    } | null;
    primary_qualified_origin: {
      actors: number;
      id: string;
      label: string;
      percentage: number;
      profile_views: number;
      qualified_actors: number;
    } | null;
    quality_levels: {
      count: number;
      description: string;
      id: "interested" | "qualified" | "unidentified" | "visited";
      label: string;
      percentage: number;
    }[];
    source: AdminPublicSource<"page_view_event+psychologist_favorite+contact_request+important_action_event">;
    total_actors: number;
    total_profile_views: number;
    total_whatsapp_clicks: number;
    unattributed_whatsapp_clicks: number;
    unavailable_reason: string | null;
  };
  traffic_sources: PsychologistsDashboardTrafficSources;
  unavailable: AdminPsychologistEngagementMetric[];
  video: {
    available: boolean;
    comparisons: {
      average_retention_percent: NonNullable<AdminPsychologistEngagementMetric["comparison"]>;
      favorites_from_video: NonNullable<AdminPsychologistEngagementMetric["comparison"]>;
      profile_accesses_from_video: NonNullable<AdminPsychologistEngagementMetric["comparison"]>;
      replay_rate_percent: NonNullable<AdminPsychologistEngagementMetric["comparison"]>;
      shares_from_video: NonNullable<AdminPsychologistEngagementMetric["comparison"]>;
      sessions: NonNullable<AdminPsychologistEngagementMetric["comparison"]>;
      whatsapp_clicks_from_video: NonNullable<AdminPsychologistEngagementMetric["comparison"]>;
    };
    cover_url: string | null;
    duration_seconds: number | null;
    explore_position: AdminPsychologistEngagementMetric;
    retention_dropoff: {
      from_milestone: number;
      to_milestone: number;
      rate_drop: number;
      from_seconds: number;
      to_seconds: number;
    } | null;
    metrics: {
      average_watch_seconds: number;
      average_retention_percent: number;
      completions: number;
      favorites_from_video: number;
      profile_accesses_from_video: number;
      replay_rate_percent: number;
      sessions: number;
      shares_from_video: number;
      whatsapp_clicks_from_video: number;
    };
    retention: { label: string; percentage: number; position_percent: number }[];
    source: AdminPublicSource<"profile_video_watch_session+important_action_event+profile_view_event.search_result_position">;
    unavailable_reason: string | null;
    video_url: string | null;
  };
};
