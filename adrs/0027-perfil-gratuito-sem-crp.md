# ADR-0027: Perfil gratuito sem documentos CRP

## Status

Accepted

## Contexto

A TASK-18 completa permanece bloqueada por depender da TASK-11, que exige storage privado R2 para documentos CRP. Ao mesmo tempo, o fluxo de produto do plano gratuito precisa permitir que o psicólogo configure informações públicas básicas depois de informar o WhatsApp, sem validar CRP pela API.

O protótipo `_product/proto/Editar Perfil - Psicólogo.jpg` e o ajuste visual enviado pelo usuário (`Html → Body.png`) mostram uma edição mais completa do perfil. O usuário pediu que, no plano gratuito, CPF, dados de registro e WhatsApp sejam editáveis, que a regional venha de dropdown no formato do CFP, e que sejam adicionados campos declaratórios de apresentação, filtros, benefícios, formação, atendimento e endereço.

## Decisão

Manter o recorte separado da TASK-18 chamado TASK-18A, limitado ao perfil gratuito sem documentos CRP, e ampliar o recorte para persistir dados declaratórios do perfil gratuito.

O backend expõe `/api/private/psychologist/free-profile` protegido por `requireRole("psicologo")`. CPF é salvo em `psychologist_profile.cpf`; o registro livre é serializado em `psychologist_profile.crp` como `regional/registro`; WhatsApp é salvo em `psychologist_profile.whatsapp`; foto profissional é uma URL pública em `user.avatar`; vídeo de apresentação é uma URL pública em `psychologist_profile.video_url`.

Foram adicionados campos opcionais em `psychologist_profile` para gênero, raça/cor, público atendido, benefícios comerciais, formação acadêmica, dias disponíveis e endereço profissional. A lista de regionais do dropdown segue a lista oficial do CFP em `https://site.cfp.org.br/cfp/sistema-conselhos/conselhos-pelo-brasil/`.

O recorte não cria nem altera `professional_document`, não faz upload CRP, não altera `crp_status`, `cfp_verified_at` ou `whatsapp_verified_at`, e não concede selo de verificado.

## Consequências

- Psicólogos gratuitos conseguem configurar um perfil mais próximo do protótipo sem desbloquear a TASK-18 completa.
- CPF, regional, registro e WhatsApp são campos declaratórios no plano gratuito; não representam validação profissional.
- Foto e vídeo aceitam somente URL pública neste recorte; upload binário depende de storage real e permanece fora do escopo.
- A TASK-18 continua bloqueada para documentos/CRP, validação profissional e perfil profissional completo.
- O plano gratuito limita especialidades a 3 e serviços a 1.
- A publicação do perfil gratuito não equivale a validação profissional por CRP.

## Validação

- `pnpm --dir backend exec prisma migrate dev --name add_free_profile_details`
- `pnpm --dir backend db:migrate`
- `pnpm --dir backend check`
- `pnpm --dir frontend check`
- `pnpm --dir backend build`
- `pnpm --dir frontend build`
- `pnpm check`
- Browser local sem sessão em `/app/professional/profile/setup` retornou 307 para login.
