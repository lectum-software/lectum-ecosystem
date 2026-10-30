export type PendingTestimonialProfessional = {
  id: string;
  psychologist_id: string;
  name: string;
  avatar: string | null;
  headline: string | null;
  verified: boolean;
};

export type PendingTestimonialsResponse = {
  data: PendingTestimonialProfessional[];
  page: number;
  pages: number;
  count: number;
};
