import type { AdminPsychologistDetailRecord } from "../AdminPsychologistDetailRepository";

export type AdminPsychologistCount = number;

export type AdminPsychologistRecentPost = {
  community: {
    name: string;
  };
  createdAt: Date;
  id: string;
  title: string;
};

export type AdminPsychologistRecentReply = {
  createdAt: Date;
  id: string;
  post: {
    title: string;
  };
};

export type AdminPsychologistRecentReview = {
  createdAt: Date;
  id: string;
  rating: number;
};

export type AdminPsychologistRecentContact = {
  createdAt: Date;
  id: string;
};

export interface IAdminPsychologistDetailRepository {
  countFavorites(psychologistId: string): Promise<AdminPsychologistCount>;
  countProfileViews(psychologistId: string): Promise<AdminPsychologistCount>;
  countWhatsappClicks(psychologistId: string): Promise<AdminPsychologistCount>;
  findPsychologist(id: string): Promise<AdminPsychologistDetailRecord | null>;
  listPublicRankingCandidates(): Promise<unknown[]>;
  listRecentContacts(psychologistId: string): Promise<AdminPsychologistRecentContact[]>;
  listRecentPosts(psychologistId: string): Promise<AdminPsychologistRecentPost[]>;
  listRecentReplies(psychologistId: string): Promise<AdminPsychologistRecentReply[]>;
  listRecentReviews(psychologistId: string): Promise<AdminPsychologistRecentReview[]>;
}
