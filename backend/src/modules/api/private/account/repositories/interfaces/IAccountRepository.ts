import type { Prisma } from "@/external/generated/prisma/client";
import type { professional_subscription, user } from "@/interfaces/objects";

export interface IAccountRepository {
  deleteTokens: (userId: string) => Promise<void>;
  deleteOwnAccount: (user: user) => Promise<void>;
  findBlockingSubscription: (userId: string) => Promise<professional_subscription | null>;
  findByEmail: (email: string) => Promise<user | null>;
  findById: (id: string) => Promise<user | null>;
  hasRecentGoogleDeleteReauth: (userId: string, deviceId: string) => Promise<boolean>;
  findOnboardingTips: (userId: string) => Promise<{
    has_seen_community_post_tip: boolean;
    has_seen_discover_psychologists_tip: boolean;
    has_seen_psychologist_reply_tip: boolean;
    has_seen_psychologist_whatsapp_tip: boolean;
    has_seen_psychologists_my_search_tip: boolean;
  } | null>;
  updateOnboardingTips: (
    userId: string,
    data: {
      has_seen_community_post_tip?: boolean;
      has_seen_discover_psychologists_tip?: boolean;
      has_seen_psychologist_reply_tip?: boolean;
      has_seen_psychologist_whatsapp_tip?: boolean;
      has_seen_psychologists_my_search_tip?: boolean;
    },
  ) => Promise<{
    has_seen_community_post_tip: boolean;
    has_seen_discover_psychologists_tip: boolean;
    has_seen_psychologist_reply_tip: boolean;
    has_seen_psychologist_whatsapp_tip: boolean;
    has_seen_psychologists_my_search_tip: boolean;
  }>;
  updateUserAndClearTokens: (userId: string, data: Prisma.userUpdateInput) => Promise<user>;
}
