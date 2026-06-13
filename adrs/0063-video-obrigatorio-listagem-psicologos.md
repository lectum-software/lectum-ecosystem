# ADR-0063: Vídeo obrigatório para elegibilidade na listagem de psicólogos

## Status

Accepted

## Task relacionada

Alteração de produto solicitada em 2026-06-12 após TASK-23.

## Contexto

A regra anterior reservava o upload de vídeo de apresentação ao Plano Profissional/cortesia. O produto decidiu que todos os psicólogos, inclusive os gratuitos, devem poder enviar vídeo. Ao mesmo tempo, a página `/app/psychologists` deve funcionar como um roll/listagem orientado por vídeo: psicólogos sem `psychologist_profile.video_url` não são elegíveis para aparecer nessa lista.

## Decisão

- Liberar `plan.can_upload_video=true` para todos os psicólogos no contrato de perfil profissional.
- Manter os endpoints reais existentes de upload/remocao de vídeo e capa de vídeo, sem criar mocks ou novo storage.
- Preservar `video_url` e `video_cover_url` ao salvar perfil gratuito; o plano gratuito não deve mais limpar mídia de vídeo.
- Alterar a descoberta `GET /api/private/directory/psychologists` para retornar apenas perfis publicados com `video_url` preenchido.
- Atualizar o catálogo persistido de planos para que `subscription_plan.features.profile_video=true` no plano gratuito.
- Ajustar a UI de configuração de perfil para informar que vídeo está disponível em todos os planos.

## Consequências

- Psicólogos gratuitos podem subir vídeo de apresentação real.
- Psicólogos sem vídeo continuam acessíveis por rotas diretas quando aplicável, mas não aparecem no roll de `/app/psychologists`.
- O vídeo passa a ser pré-requisito operacional de descoberta, além dos campos obrigatórios de publicação já existentes.
- A regra anterior da ADR-0027 sobre bloquear vídeo no gratuito fica supersedida apenas nesse ponto.

## Validação

- `pnpm --dir backend db:migrate` aplicado para `20260613001000_enable_free_profile_video`.
- `pnpm --dir backend check`.
- `pnpm --dir frontend check`.
- `pnpm --dir backend build`.
- `pnpm --dir frontend build`.
- `pnpm check`.
- Validação HTTP local: `/app/psychologists`, `/app/professional/profile/setup`, `/app/professional/billing/plans` e `GET /api/private/directory/psychologists?page=1&limit=1` responderam `200`.

## Pendências

- Se o produto quiser comunicar o requisito de vídeo antes da publicação do perfil, adicionar copy específica no fluxo de setup em uma task de UX dedicada.
