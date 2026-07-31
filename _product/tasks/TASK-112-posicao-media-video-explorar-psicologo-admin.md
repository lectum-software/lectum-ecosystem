# TASK-112: Posição média do vídeo no Explorar no psicólogo Admin

## Metadata

| Campo | Valor |
|---|---|
| ID | TASK-112 |
| Prioridade | P1 |
| Esforço | M |
| Fase | Admin - Psicólogos |
| Status | Completed |
| Dependências | TASK-57, TASK-104, TASK-105, TASK-111 |
| ADR alvo | ADR-0376 |

## Contexto

Na aba **Estatísticas** do detalhe administrativo do psicólogo, o bloco **Análises do vídeo de apresentação** aparece depois de
blocos posteriores de comunidade. O usuário solicitou reposicionar esse bloco imediatamente depois de **Atividade e
engajamento** e exibir, na mesma linha do título, a posição média em que o vídeo/card do psicólogo aparece na página de
Explorar, com indicação de subida ou descida em relação ao período anterior.

A referência visual ativa para esta área é `_product/tasks/PROTO-INVENTORY.md`, especialmente
`_product/proto/admin/Psicólogos/Detalhes do psicólogo/Estatísticas.png`, além do screenshot local enviado pelo usuário em
2026-07-31. O Builder/Quick Copy ativo (`vcp://quickcopy/vcp-24aaa2941d814e5b90572bc93ae50e2a`) foi verificado via
descoberta de ferramentas, mas não há ferramenta Builder/Quick Copy callable neste ambiente; por isso a execução usa as
imagens locais/proto e registra esta limitação.

## Objetivo

Permitir que o Admin veja, junto ao título do bloco de vídeo, a posição média real do psicólogo no Explorar e se essa
posição melhorou ou piorou contra a janela anterior, sem backfill, estimativas ou mocks.

## Pré-requisitos e bloqueios

- Dependências TASK-57, TASK-104, TASK-105 e TASK-111 concluídas.
- Usar arquitetura vigente de backend em `modules/api` e frontend/admin em `api/req`, callers e componentes existentes.
- Atualizar `DATA-MODEL.md` antes de alterar schema/contrato de analytics.
- Migration obrigatória porque `profile_view_event` passa a armazenar posição real do resultado.
- Não há requisito externo novo; a métrica depende apenas de eventos first-party reais gravados após esta task.

## Escopo frontend

- Em `frontend/src/app/app/psychologists/logic.tsx`, enviar a posição absoluta do psicólogo exibido no Explorar ao registrar
  `search-impression`.
- Em `admin/src/app/(admin)/psicologos/[id]/client.tsx`, mover `StatisticsVideoCard` para logo após o bloco
  **Atividade e engajamento**.
- No mesmo alinhamento do título de `StatisticsVideoCard`, exibir indicador mobile-first da **Posição média no Explorar**,
  com estado de sem base e movimento `Subiu`, `Desceu` ou `Estável`.

## Escopo backend

- Adicionar `profile_view_event.search_result_position Int?` e índice por `psychologist_id + source + createdAt`.
- Aceitar `position` opcional no endpoint real
  `POST /api/private/directory/psychologists/:id/search-impression`.
- Persistir a posição somente em novas impressões `source="search_result"`.
- Calcular `video.explore_position` no endpoint
  `GET /api/admin/private/psychologists/:id/statistics`, usando média de eventos reais com posição preenchida.
- Comparar com o período anterior invertendo a semântica de ranking: posição menor é `trend="up"`/subiu; posição maior é
  `trend="down"`/desceu.

## Fora do escopo

- Backfill de impressões antigas sem posição.
- Alterar a fórmula de ranking público do Explorar.
- Criar métrica estimada quando não houver posição real.
- Reorganizar outros blocos da aba Estatísticas além da posição solicitada.

## Contrato técnico detalhado

Backend:

- `DATA-MODEL.md`: `profile_view_event.search_result_position` documentado como posição absoluta do card/vídeo no Explorar.
- Prisma: migration `20260731035008_add_search_result_position`.
- Validator: `position` opcional, inteiro, positivo e limitado a `10000`.
- Repository de diretório: persistir posição normalizada apenas em `trackSearchResultImpression`.
- Repository/Service Admin: selecionar posições reais e retornar `AdminPsychologistAvailabilityMetric` com:
  - `id="average_explore_position"`;
  - `unit="position"`;
  - `source="profile_view_event.source=search_result.search_result_position"`;
  - `available=false` quando não houver posição preenchida no período.

Frontend/Admin:

- `api/generator/types/directory`, `api/req/directory` e `api/callers/directory` aceitam payload de posição.
- Explorar calcula posição absoluta por `(page - 1) * limit + índice ativo + 1`.
- Admin mantém UI mobile-first: em telas estreitas o indicador empilha abaixo do título; em telas maiores fica alinhado à
  direita na mesma linha do título.
- Não há formulário/campo de produto novo; TASK-02 não se aplica.
- Nenhum `<img>` cru é adicionado.

Packages usados:

- Nenhum package novo.

## Critérios de aceite

- [x] O bloco **Análises do vídeo de apresentação** aparece imediatamente depois do bloco **Atividade e engajamento**.
- [x] Na linha do título do bloco de vídeo há indicador à direita com a posição média no Explorar.
- [x] O indicador mostra `Subiu`, `Desceu`, `Estável` ou `Sem base anterior` comparando com a janela anterior.
- [x] A posição média usa somente `profile_view_event.source="search_result"` com `search_result_position` real preenchido.
- [x] Eventos antigos ou sem posição aparecem como **Sem base**, sem backfill ou estimativa.
- [x] UI mobile-first; nenhum `<img>` cru (somente `next/image` quando houver imagem).
- [x] Nenhum mock, dado fake permanente ou endpoint simulado foi usado.
- [x] `pnpm --dir backend db:migrate --name add-search-result-position` foi executado sem erro.
- [x] Formulários/campos usam React Hook Form, Zod e controllers da TASK-02 quando aplicável.
- [x] Builder/Quick Copy foi usado quando disponível, ou as imagens locais de `_product/proto` foram citadas quando houver UI.
- [x] Checks/builds relevantes foram executados sem erros.
- [x] ADR criado ou atualizado em `adrs/`.
- [x] Commit criado com mensagem convencional.
- [x] Push executado para publicar o commit.

## Validação mínima

- `pnpm --dir backend db:migrate --name add-search-result-position`.
- `pnpm --dir backend check`.
- `pnpm --dir backend build`.
- `pnpm --dir frontend check`.
- `pnpm --dir frontend build`.
- `pnpm --dir admin check`.
- `pnpm --dir admin build`.
- `pnpm check`.
- Validação local da rota Admin de estatísticas no browser/HTTP quando o servidor local estiver disponível.

## Notas de execução

- Não fazer reset de banco em caso de conflito; perguntar ao usuário antes de qualquer comando destrutivo.
- Eventos anteriores à migration continuam válidos para contagem de resultados, mas não entram no cálculo de posição média.

## Evidências de validação

- `pnpm --dir backend db:migrate --name add-search-result-position` executado em 2026-07-31 sem erro; banco já estava sincronizado.
- `pnpm --dir backend exec prisma migrate status` confirmou schema atualizado.
- `pnpm --dir backend check` e `pnpm --dir backend build` executados sem erro.
- `pnpm --dir frontend check` e `pnpm --dir frontend build` executados sem erro.
- `pnpm --dir admin check` e `pnpm --dir admin build` executados sem erro.
- `pnpm check` executado sem erro.
- Rota Admin local `http://localhost:3002/psicologos/cmrgztri7000tn0uh1q4n8vxf?tab=estatisticas` respondeu HTTP 200 no servidor `pnpm --dir admin dev`.
