/**
 * Categorias públicas emitidas pelo backend no lugar de nomes de tabelas,
 * colunas ou expressões internas usados como proveniência.
 */
export type AdminPublicProvenanceSource =
  | "contas"
  | "conteudo"
  | "engajamento"
  | "pagamentos"
  | "plataforma";

/**
 * Fontes de domínio que não descrevem a implementação e permanecem no wire.
 * A lista é central para que novos valores sejam revisados antes de chegar à UI.
 */
export type AdminPreservedDomainSource =
  | "admin_grant"
  | "api_automatica"
  | "automatic"
  | "followed"
  | "free_signup"
  | "general"
  | "google_registration"
  | "ip"
  | "manual"
  | "manual_admin"
  | "mercadopago"
  | "patient_registration"
  | "pendente"
  | "profile"
  | "profile_page"
  | "psychologist_registration"
  | "related"
  | "search_result"
  | "source"
  | "traffic"
  | "visitor_id";

export type AdminPublicSource<T> = T extends string
  ? string extends T
    ? T
    : T extends AdminPreservedDomainSource
      ? T
      : AdminPublicProvenanceSource
  : T;

/**
 * Espelha recursivamente a sanitização feita pelo backend em toda chave `source`.
 * Campos já tipados como `string` continuam extensíveis; literais técnicos não
 * atravessam o boundary como se ainda fossem parte do contrato público.
 */
export type AdminPublicResponseData<T> = T extends object
  ? {
      [K in keyof T]: K extends "source" ? AdminPublicSource<T[K]> : AdminPublicResponseData<T[K]>;
    }
  : T;
