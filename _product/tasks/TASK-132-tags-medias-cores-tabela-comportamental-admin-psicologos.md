# TASK-132 - Tags medias e cores na tabela comportamental Admin

## Status

Completed

## Contexto

Na tabela comportamental por Conversao do dashboard Admin de Psicologos em `/psicologos`, as celulas exibiam muitas tags com totais agregados. O usuario pediu que as tags passassem a resumir valores medios/padrao por categoria, com destaque consistente para a media de cliques WhatsApp recebida pelos psicologos daquela faixa em cada pagina.

Referencias visuais consultadas:

- `_product/tasks/PROTO-INVENTORY.md`;
- `_product/proto/admin/Psicologos/Psicologos - Dashboard.png` como fallback local auditavel;
- screenshot enviado pelo usuario em 2026-08-01 mostrando a tabela em `http://localhost:3002/psicologos`.

Builder/Quick Copy ativo: `vcp://quickcopy/vcp-24aaa2941d814e5b90572bc93ae50e2a`. Nesta execucao, a ferramenta Builder/Quick Copy nao estava callable no ambiente; a implementacao usa imagem local e screenshot do usuario, registrando esta limitacao.

## Objetivo

Ajustar as tags da tabela comportamental para que:

- todas as colunas tenham `Cliques WhatsApp` como primeira tag, em negrito, mostrando media por psicologo da faixa naquela pagina;
- as tags exibidas resumam media, predominancia ou classificacao padrao, e nao somatorias;
- `Comunidade` mostre apenas: Cliques WhatsApp, atividade, engajamento, formato predominante de posts, formato predominante de respostas e permanencia;
- as tags usem cores por desempenho: padrao azul, acima do padrao verde, abaixo do padrao amarelo e zero vermelho;
- os textos sigam a copy pedida: sem prefixos em Atividade/Engajamento, sem `/ psicologo` em WhatsApp, `Permanencia`, `Favoritado`, `90 aberturas`, `X% posts de texto` e `X% respostas de texto`.

## Dependencias

- TASK-53: dashboard Admin de psicologos.
- TASK-103: funil comportamental por conversao.
- TASK-126: tags na tabela comportamental.
- TASK-128: largura/copy da tabela.
- TASK-130: matriz de dados atual do Admin de psicologos.

Todas as dependencias acima estao concluidas.

## Escopo executado

### Backend

- Adicionar `display_value` e `tone` ao contrato das metricas de `profile_conversion_behavior`.
- Calcular medias de `Cliques WhatsApp` por psicologo para Video de apresentacao, Perfil, Comunidade e Tela de favoritos.
- Adicionar metricas semanticas para atividade, engajamento, formato predominante de posts/respostas e aba predominante do perfil.
- Manter metricas detalhadas antigas no payload para auditoria, mas deixar o frontend renderizar somente o conjunto curado.

### Admin frontend

- Renderizar somente as metricas priorizadas por coluna.
- Colocar `Cliques WhatsApp` em primeiro lugar e em negrito.
- Usar `display_value` para copys especificas como `90 aberturas`, `X% posts de texto` e `X% respostas de texto`.
- Aplicar classes visuais por `tone` sem inferencia local de negocio.

## Fora do escopo

- Alterar banco, Prisma schema ou migrations.
- Criar novos trackings, seeds, mocks, backfills ou endpoints simulados.
- Alterar os calculos de conversao, ranking publico ou origem de WhatsApp.
- Instalar package novo.

## Criterios de aceite

- [x] `Comunidade` exibe tags curadas: Cliques WhatsApp, atividade, engajamento, formato predominante de posts, formato predominante de respostas e permanencia.
- [x] As tags renderizadas em todas as colunas resumem media, padrao ou predominancia, nao somatoria.
- [x] Todas as colunas exibem `Cliques WhatsApp` na primeira posicao e em negrito, sem `/ psicologo`.
- [x] Tags no padrao aparecem em azul, acima do padrao em verde, abaixo do padrao em amarelo e zero em vermelho.
- [x] Atividade/Engajamento aparecem sem prefixos `Atividade:` e `Engajamento:`.
- [x] `Tempo medio` foi substituido por `Permanencia` nas tags visiveis.
- [x] `Favoritos/perfil` foi substituido por `Favoritado`.
- [x] Aberturas por psicologo aparecem como `X aberturas`.
- [x] Formatos aparecem como `X% posts de texto` e `X% respostas de texto` quando texto predomina.
- [x] UI mobile-first preservada e nenhum `<img>` cru foi adicionado.
- [x] Nenhum mock, dado fake permanente, seed ou endpoint simulado foi usado.
- [x] Builder/Quick Copy nao estava callable; imagem local e screenshot do usuario foram usados como referencia.
- [x] Nao houve alteracao de banco/schema/migrations; `db:migrate` nao se aplica.
- [x] Checks/builds relevantes foram executados.
- [x] Browser local validou a rota Admin.
- [x] ADR criado em `adrs/0396-tags-medias-cores-tabela-comportamental-admin.md`.
- [x] Commit proprio criado e push executado.

## Validacao executada

- `pnpm --dir backend exec biome check --write "src/modules/api/admin/private/psychologists/dashboard/DTOs/IAdminPsychologistsDashboardDTO.ts" "src/modules/api/admin/private/psychologists/dashboard/use-cases/services.ts"`
- `pnpm --dir admin exec biome check --write "src/api/req/psychologists/index.ts" "src/app/(admin)/psicologos/client.tsx"`
- `pnpm --dir backend typecheck`
- `pnpm --dir admin typecheck`
- `pnpm --dir backend check`
- `pnpm --dir admin check`
- `pnpm --dir backend build`
- `NODE_OPTIONS=--max-old-space-size=8192 pnpm --dir admin build`
- `pnpm check`
- Browser local em `http://localhost:3002/psicologos`.

## Observacoes

- A mudanca e de contrato agregado/API e composicao visual; nao altera persistencia.
- `tone` fica sob responsabilidade do backend para evitar divergencia visual entre clientes.
