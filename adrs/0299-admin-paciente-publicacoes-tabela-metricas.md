# ADR-0299: Publicações do paciente em tabela com métricas e expansão

## Status

Accepted

## Task relacionada

TASK-61

## Contexto

Após a padronização das abas do detalhe administrativo de paciente, a aba **Publicações** ainda usava apenas o recorte de atividades recentes. Isso podia ocultar posts reais mais antigos e não oferecia a leitura operacional pedida: tabela com data, tipo, comunidade, prévia, ações e métricas por publicação.

Builder/Quick Copy não está exposto como ferramenta callable neste ambiente. A referência visual auditável foi a captura enviada pelo usuário, o padrão local de publicações do psicólogo e os PNGs `_product/proto/admin/Pacientes/Pacientes - Detalhes.png` e `_product/proto/admin/Psicólogos/Detalhes do psicólogo/Publicações.png`.

## Decisão

- O contrato `GET /api/admin/private/patients/:id` passa a retornar `publications.items` a partir de `community_post` real do paciente, sem endpoint paralelo.
- Cada item de publicação inclui conteúdo completo, prévia, URL pública, URL de estatísticas Admin e métricas reais de visualizações, upvotes, downvotes, comentários, salvamentos, compartilhamentos e denúncias.
- Visualizações usam `page_view_event.target_type=post/community_post`; as demais métricas usam contadores persistidos e relações reais de `post_reply`, `post_save`, `post_share` e `post_report`.
- A UI da aba **Publicações** passa a renderizar uma tabela mobile-first com rolagem horizontal controlada, linha de métricas abaixo de cada publicação e expansor na própria tabela para exibir o conteúdo completo do post.
- A ação **Ver** abre a publicação pública; a ação **Estatísticas** reutiliza a rota Admin de analytics de conteúdo já existente.

## Consequências

- O Admin passa a ver publicações reais do paciente sem depender do limite de atividades recentes.
- A aba mantém leitura somente operacional e não adiciona moderação, edição, remoção, tracking novo, mock, seed, backfill ou schema Prisma.
- A tabela atende ao pedido de colunas explícitas, mas em mobile exige rolagem horizontal dentro do card por ser uma lista tabular densa.
- Se futuramente o produto quiser incluir comentários/respostas do paciente como publicações, será necessário ampliar o contrato com `post_reply` e revisar a coluna **Tipo**.

## Validação

- `pnpm --dir backend exec biome check --write "src/modules/api/admin/private/patients/detail/DTOs/IAdminPatientDetailDTO.ts" "src/modules/api/admin/private/patients/detail/repositories/AdminPatientDetailRepository.ts" "src/modules/api/admin/private/patients/detail/use-cases/services.ts"`
- `pnpm --dir admin exec biome check --write "src/api/req/patients/index.ts" "src/app/(admin)/pacientes/[id]/client.tsx"`
- `pnpm --dir backend typecheck`
- `pnpm --dir admin typecheck`
- Service local `showAdminPatient({ id: "cmrb6fbrv0002y0uhsqzg306b", period: "all" })` retornou `publications.items.length=2` e métricas reais no primeiro post.
- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm --dir admin check`
- `pnpm --dir admin build`
- `pnpm check`
- Browser local/headless via Chrome/CDP em `/pacientes/cmrb6fbrv0002y0uhsqzg306b?tab=publicacoes` validou desktop `1365x900` e mobile `390x844`: cabeçalhos solicitados, ações **Ver**/**Estatísticas**, linha de métricas, expansor de conteúdo completo e rolagem horizontal controlada sem overflow global no mobile.

## Pendências

- Nenhuma pendência funcional no escopo deste ajuste.
