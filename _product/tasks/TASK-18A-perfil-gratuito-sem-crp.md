# TASK-18A: Perfil gratuito sem documento CRP

## Metadata

| Campo | Valor |
|---|---|
| ID | TASK-18A |
| Prioridade | P0 |
| Esforço | M |
| Fase | Psicólogo privado |
| Status | Completed |
| Dependências | TASK-02, TASK-12, TASK-16, TASK-31 |
| ADR alvo | ADR-0027 |

## Contexto

Esta task cria um recorte explícito e limitado para permitir que psicólogos do plano gratuito configurem o perfil profissional depois de informar o WhatsApp, sem upload de documento CRP e sem validação CFP/CRP por API.

A TASK-18 completa permanece bloqueada por TASK-11 porque inclui Documentos / CRP e `professional_document`. Este recorte não altera `professional_document`, `crp_status`, `cfp_verified_at` ou `whatsapp_verified_at`.

## Escopo

- Backend exclusivo para psicólogos em `/api/private/psychologist/free-profile`.
- Frontend em `/app/professional/profile/setup`.
- Tela baseada no protótipo local `_product/proto/Editar Perfil - Psicólogo.jpg`.
- Editar apenas campos seguros:
  - `user.name`;
  - `psychologist_profile.cpf`;
  - dados de registro livres em `psychologist_profile.crp` (`regional/registro`);
  - `psychologist_profile.whatsapp`;
  - `psychologist_profile.headline`;
  - `psychologist_profile.bio`;
  - `psychologist_profile.modality`;
  - `psychologist_profile.languages`;
  - joins `psychologist_specialty`, `psychologist_service`, `psychologist_approach`;
  - `psychologist_profile.published`.
- Plano gratuito limita especialidades a 3.
- Plano gratuito mantém `video_url=null`.
- Publicação gratuita não valida CRP por API e não toca em documento CRP.
- A tela inclui ação para abrir o link `wa.me` gerado a partir do WhatsApp informado.

## Fora do escopo

- Upload/lista/reenvio de documento CRP.
- `professional_document`.
- Alterar `crp_status`, `cfp_verified_at` ou `whatsapp_verified_at`.
- Selo de verificado.
- Perfil profissional pago completo.

## Critérios de aceite

- [x] Recorte documentado como task separada da TASK-18 completa.
- [x] Backend implementado sem criar schema/migration e sem tocar em documentos CRP.
- [x] Endpoint privado exige `requireRole("psicologo")` pelo mount em `/api/private/psychologist/*`.
- [x] Frontend implementado em `/app/professional/profile/setup` com dados reais do backend.
- [x] Tela ajustada a partir de `_product/proto/Editar Perfil - Psicólogo.jpg`.
- [x] CPF, regional, registro e WhatsApp ficam editáveis no plano gratuito sem consulta CFP/CRP por API.
- [x] Tela inclui ação para abrir o link `wa.me` gerado e testar o WhatsApp informado.
- [x] Formulários/campos usam React Hook Form, Zod, `hooks/form` e controllers da TASK-02 para campos principais.
- [x] Catálogos reais de especialidades, serviços e abordagens são lidos do banco.
- [x] Limite de 3 especialidades no plano gratuito é validado no backend.
- [x] Nenhum mock, dado fake permanente, seed artificial ou endpoint simulado foi usado.
- [x] Packages usados conferem com `PACKAGES.md`; nenhum package novo foi instalado.
- [x] ADR criada em `adrs/0027-perfil-gratuito-sem-crp.md`.
- [x] Checks/builds relevantes foram executados sem erros.
- [x] Commit criado com mensagem convencional.

## Validação executada

- `pnpm --dir backend check`
- `pnpm --dir frontend check`
- `pnpm --dir backend build`
- `pnpm --dir frontend build`
- `pnpm check`
- Browser local sem sessão na rota `/app/professional/profile/setup`: redireciona para login com 307, confirmando rota privada.

## Implementação

- Backend:
  - `backend/src/modules/api/private/psychologist/free-profile`
  - rota montada em `backend/src/main/server/imports/write.ts`
- Frontend:
  - `frontend/src/app/app/professional/profile/setup`
  - `frontend/src/api/req/psychologist-free-profile`
  - `frontend/src/api/callers/psychologist-free-profile`
  - `frontend/src/api/generator/types/free-profile.ts`
