# ADR-0027: Perfil gratuito sem documentos CRP

## Status

Accepted

## Contexto

A TASK-18 completa permanece bloqueada por depender da TASK-11, que exige storage privado R2 para documentos CRP. Ao mesmo tempo, o fluxo de produto do plano gratuito precisa permitir que o psicólogo configure informações públicas básicas depois de informar o WhatsApp, sem validar CRP pela API.

O protótipo `_product/proto/Editar Perfil - Psicólogo.jpg` também mostra CPF, dados de registro e WhatsApp dentro da edição do perfil. Para o plano gratuito, o usuário pediu que estes campos sejam editáveis mesmo sem documento CRP.

## Decisão

Manter o recorte separado da TASK-18 chamado TASK-18A, limitado ao perfil gratuito sem documentos CRP, e ampliar o recorte para permitir edição de CPF, dados de registro livres e WhatsApp.

O backend expõe `/api/private/psychologist/free-profile` protegido por `requireRole("psicologo")`. O CPF é salvo em `psychologist_profile.cpf`; o registro livre é serializado em `psychologist_profile.crp` como `regional/registro`; o WhatsApp é salvo em `psychologist_profile.whatsapp` e a resposta retorna o link `wa.me` derivado do número normalizado.

O recorte não cria nem altera `professional_document`, não faz upload CRP, não altera `crp_status`, `cfp_verified_at` ou `whatsapp_verified_at`, e não concede selo de verificado.

## Consequências

- Psicólogos gratuitos conseguem configurar o perfil básico sem desbloquear a TASK-18 completa.
- CPF, regional, registro e WhatsApp são campos declaratórios no plano gratuito; não representam validação profissional.
- A TASK-18 continua bloqueada para documentos/CRP, validação profissional e perfil profissional completo.
- O plano gratuito limita especialidades a 3 e mantém `video_url=null`.
- A publicação do perfil gratuito não equivale a validação profissional por CRP.

## Validação

- `pnpm --dir backend check`
- `pnpm --dir frontend check`
- `pnpm --dir backend build`
- `pnpm --dir frontend build`
- `pnpm check`
- Browser local sem sessão em `/app/professional/profile/setup` retornou 307 para login.
