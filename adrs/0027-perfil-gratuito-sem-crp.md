# ADR-0027: Perfil gratuito sem documentos CRP

## Status

Accepted

## Contexto

A TASK-18 completa permanece bloqueada por depender da TASK-11, que exige storage privado R2 para documentos CRP. Ao mesmo tempo, o fluxo de produto do plano gratuito precisa permitir que o psicólogo configure informações públicas básicas depois de informar o WhatsApp, sem validar CRP pela API.

## Decisão

Criar um recorte separado da TASK-18 chamado TASK-18A, limitado ao perfil gratuito sem documentos CRP.

O recorte permite editar apenas campos seguros: nome, título, bio, modalidade, idiomas, especialidades, serviços, abordagens e publicação. O backend expõe `/api/private/psychologist/free-profile` protegido por `requireRole("psicologo")`.

O recorte não cria nem altera `professional_document`, não faz upload CRP, não altera `crp`, `crp_status`, `cfp_verified_at` ou `whatsapp_verified_at`, e não concede selo de verificado.

## Consequências

- Psicólogos gratuitos conseguem configurar o perfil básico sem desbloquear a TASK-18 completa.
- A TASK-18 continua bloqueada para documentos/CRP e perfil profissional completo.
- O plano gratuito limita especialidades a 3 e mantém `video_url=null`.
- A publicação do perfil gratuito não equivale a validação profissional por CRP.

## Validação

- `pnpm --dir backend check`
- `pnpm --dir frontend check`
- `pnpm --dir backend build`
- `pnpm --dir frontend build`
- `pnpm check`
- Browser local sem sessão em `/app/professional/profile/setup` retornou 307 para login.
