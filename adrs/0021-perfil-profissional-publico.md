# ADR-0021: Perfil profissional público com dados public-safe

## Status

Accepted

## Task relacionada

TASK-15: Perfil profissional público.

## Contexto

A vitrine pública do psicólogo em `/app/psychologist/[id]` precisa reutilizar a descoberta da
TASK-13, mas sem expor dados privados. O `DATA-MODEL.md` define que leituras de descoberta/perfil
profissional ficam sob `/api/private/directory/*`, protegidas apenas por `_auth`, porque pacientes e
psicólogos autenticados podem visualizar perfis publicados.

As referências visuais consultadas foram as imagens locais:

- `_product/proto/Perfil Profissional - Sobre.jpg`;
- `_product/proto/Perfil Profissional - Publicações.jpg`;
- `_product/proto/Perfil Profissional - Avaliações.jpg`.

Builder/Quick Copy foi revalidado com `npx "@builder.io/dev-tools@latest" auth status`, mas o CLI
retornou não autenticado nesta sessão. A execução usou o fallback auditável das imagens locais.

## Decisão

- Criar os endpoints neutros, todos sob o módulo existente `directory/psychologists`:
  - `GET /api/private/directory/psychologists/:id`;
  - `GET /api/private/directory/psychologists/:id/posts`;
  - `GET /api/private/directory/psychologists/:id/reviews`.
- Manter a guarda somente com `_auth` via `routes.use(middlewares)`, sem `requireRole`, conforme
  ADR-0002 e `DATA-MODEL.md`.
- Retornar 404 para perfil inexistente, deletado, inativo ou não publicado
  (`psychologist_profile.published = false`), sem diferenciar o motivo.
- Expor apenas dados public-safe do perfil:
  `id`, `name`, `avatar`, `headline`, `bio`, `video_url`, `crp`, `languages`, `modality`,
  `rating_avg`, `rating_count`, `verified`, taxonomias públicas e flags contextuais
  `favorited`/`followed`.
- Não retornar `cpf`, e-mail, documentos, tokens, `whatsapp` ou `whatsapp_verified_at`.
- Retornar somente a flag `whatsapp_available`, derivada no backend de
  `whatsapp` + `whatsapp_verified_at`, para permitir o CTA visual sem revelar o número antes da
  TASK-16.
- Criar as tabelas persistentes previstas no `DATA-MODEL.md` para leitura honesta das abas:
  `professional_review`, `community` e `community_post`. Nenhuma seed ou dado fake permanente foi
  criado; abas sem registros reais exibem estado vazio.
- Nas avaliações, anonimizar o autor para primeiro nome + inicial do sobrenome e iniciais, sem
  retornar e-mail, avatar ou qualquer dado de conta do paciente.
- Implementar `/app/psychologist/[id]` mobile-first com abas Sobre, Publicações e Avaliações, React
  Query, query keys dedicadas e componentes existentes de UI. A rota não possui formulário; portanto
  a fundação da TASK-02 não é aplicável diretamente.

## Consequências

- TASK-15 entrega o contrato que TASK-16, TASK-17 e tasks de comunidade poderão reutilizar, sem
  endpoint paralelo nem mock.
- A existência de `community`/`community_post` antes das tasks completas de comunidade permite
  leitura/paginação vazia agora e preenchimento real nas tasks futuras.
- `whatsapp_available` revela apenas disponibilidade de contato verificado, não o número. A liberação
  do número permanece exclusivamente para o fluxo de contato da TASK-16.
- Perfis não publicados ficam indistinguíveis de inexistentes na API pública privada, reduzindo vazão
  de informação sobre profissionais ainda não aprovados.

## Validação

- `npx "@builder.io/dev-tools@latest" auth status`
- `pnpm --dir backend db:migrate --name add_public_profile_posts_reviews`
- `pnpm --dir backend db:generate`
- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- Smoke real de API com usuário paciente temporário e psicólogo publicado temporário, removidos ao
  final: detalhe não retornou `cpf`, `whatsapp`, e-mail, tokens nem documentos; posts e avaliações
  responderam com paginação real.
- Browser local headless em Chrome, com cookie real e backend/frontend locais: validação mobile
  (~390px) das abas Sobre/Publicações/Avaliações e validação desktop (`1440x1000`,
  `sectionWidth=1112`) com CTA WhatsApp condicionado a número verificado.

## Pendências

- TASK-16 implementará o fluxo real de contato por WhatsApp.
- TASK-17 implementará criação de avaliações pelo paciente.
- TASK-22 a TASK-24 alimentarão comunidades e publicações reais.
