export interface IStoreDTO {
  b: {
    name: string;
    professional_first_name?: string | null;
    professional_last_name?: string | null;
    email: string;
    avatar?: string;
    provider: string;
    role?: "paciente" | "psicologo";
    terms_accepted?: boolean;
    adult_confirmed?: boolean;
    terms_version?: string;
    analytics_visitor_id?: string;
    analytics_session_id?: string;
  };
}
