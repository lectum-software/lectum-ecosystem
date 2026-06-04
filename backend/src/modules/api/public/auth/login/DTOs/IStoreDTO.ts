export interface IStoreDTO {
  b: {
    name: string;
    email: string;
    avatar?: string;
    provider: string;
    role?: "paciente" | "psicologo";
    terms_accepted?: boolean;
    terms_version?: string;
  };
}
