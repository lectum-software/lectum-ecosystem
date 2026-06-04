export interface IStoreDTO {
  b: {
    name: string;
    email: string;
    avatar?: string;
    provider: string;
    role?: "paciente" | "psicologo";
  };
}
