# ADR-0027: Perfil gratuito sem documentos CRP

## Status

Accepted

## Contexto

A TASK-18 completa permanece bloqueada por depender da TASK-11, que exige storage privado R2 para documentos CRP. Ao mesmo tempo, o fluxo de produto do plano gratuito precisa permitir que o psicólogo configure informações públicas básicas depois de informar o WhatsApp, sem validar CRP pela API.

O protótipo `_product/proto/Editar Perfil - Psicólogo.jpg` e o ajuste visual enviado pelo usuário (`Html → Body.png`) mostram uma edição mais completa do perfil. O usuário pediu que, no plano gratuito, CPF, dados de registro e WhatsApp sejam editáveis, que a regional venha de dropdown no formato do CFP, e que sejam adicionados campos declaratórios de apresentação, filtros, benefícios, formação, atendimento e endereço.

## Decisão

Manter o recorte separado da TASK-18 chamado TASK-18A, limitado ao perfil gratuito sem documentos CRP, e ampliar o recorte para persistir dados declaratórios do perfil gratuito.

O backend expõe `/api/private/psychologist/free-profile` protegido por `requireRole("psicologo")`. CPF é salvo em `psychologist_profile.cpf`; o registro livre é serializado em `psychologist_profile.crp` como `regional/registro`; WhatsApp é salvo em `psychologist_profile.whatsapp`; foto profissional é enviada por upload real para o R2 usando a infraestrutura existente em `backend/src/config/multer` e a URL pública streamada por `/public/files/psychologist/avatar/*` é persistida em `user.avatar`.

O avatar do perfil gratuito também pode ser removido por `DELETE /api/private/psychologist/free-profile/avatar`. A remoção limpa `user.avatar` e tenta apagar o objeto anterior do bucket público quando a URL pertence ao prefixo interno `psychologist/avatar/*`. No frontend, URLs relativas ou absolutas de `/public/files/*` são normalizadas contra `NEXT_PUBLIC_API_URL`, e o componente `Image` usa `unoptimized` nesses arquivos para evitar falha de exibição causada pelo otimizador do Next ao buscar mídia servida pelo backend.

Foram adicionados campos opcionais em `psychologist_profile` para gênero, raça/cor, religião, público atendido, benefícios comerciais, formações acadêmicas, dias disponíveis e endereço profissional. A lista de regionais do dropdown segue a lista oficial do CFP em `https://site.cfp.org.br/cfp/sistema-conselhos/conselhos-pelo-brasil/`.

No plano gratuito, vídeo de apresentação permanece bloqueado: a UI exibe CTA de upgrade e o backend mantém `psychologist_profile.video_url=null` nesse recorte. Upload de vídeo fica reservado para o plano profissional.

O recorte não cria nem altera `professional_document`, não faz upload CRP, não altera `crp_status`, `cfp_verified_at` ou `whatsapp_verified_at`, e não concede selo de verificado.

## Consequências

- Psicólogos gratuitos conseguem configurar um perfil mais próximo do protótipo sem desbloquear a TASK-18 completa.
- CPF, regional, registro e WhatsApp são campos declaratórios no plano gratuito; não representam validação profissional.
- Foto profissional usa upload real no R2 público; o endpoint público de leitura limita exposição aos avatares em `psychologist/avatar/*`.
- Psicólogos gratuitos podem excluir a foto profissional; a limpeza do objeto R2 é best-effort e não bloqueia a atualização de perfil.
- A exibição do avatar não depende mais da origem persistida em `BASE`; a UI resolve mídia pública pelo `NEXT_PUBLIC_API_URL` ativo.
- Vídeo não é permitido no plano gratuito; qualquer entrada anterior é limpa para `null` ao atualizar o perfil gratuito.
- Religião e múltiplas formações acadêmicas passam a compor o perfil gratuito como dados declaratórios.
- A bio curta do card do perfil gratuito fica limitada a 120 caracteres no frontend e no backend.
- A TASK-18 continua bloqueada para documentos/CRP, validação profissional e perfil profissional completo.
- O plano gratuito limita especialidades a 3 e serviços a 1.
- A publicação do perfil gratuito não equivale a validação profissional por CRP.

## Validação

- `pnpm --dir backend exec prisma migrate dev --name add_free_profile_details`
- `pnpm --dir backend exec prisma migrate dev --name add_free_profile_media_religion`
- `pnpm --dir backend db:migrate`
- `pnpm --dir backend check`
- `pnpm --dir frontend check`
- `pnpm --dir backend build`
- `pnpm --dir frontend build`
- `pnpm check`
- Browser local/HTTP sem sessão em `/app/professional/profile/setup` retornou 307 para login.
- Backend local em `/health` respondeu `200` com status `ok`.
