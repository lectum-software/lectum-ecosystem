# TASK-136 - Ajustes finais da tabela comportamental Admin

## Status

Completed

## Contexto

A tabela comportamental por Conversao do dashboard Admin de Psicologos em `/psicologos` recebeu novos ajustes finos de copy, distribuicao de colunas e leitura do resumo por faixa. O produto pediu que a secao deixe de ser tratada como funil, que o complemento de comportamento fique antes do titulo, que **Tela de favoritos** vire **Favoritos**, que os titulos usem o formato de titulos de tabela do painel Admin, que a coluna **Favoritos** fique menor e mais proxima da borda direita e que a coluna **Conversao** mostre a media de cliques WhatsApp por psicologo da categoria.

A mesma rodada tambem preserva os refinamentos ja solicitados para as tags: `Views/video` deve aparecer como `Views` e `WhatsApp/abertura` nao deve mais aparecer na coluna **Perfil**, e a coluna **Video de apresentacao** deve trocar a tag agregada `Engajamento` por `Acesso ao perfil`, `Favoritado` e `Compartilhado`; o texto `Cliques WhatsApp` deve ser encurtado para `WhatsApp`; a tag de **Favoritos** deve permanecer em uma unica linha; e **Perfil** deve exibir o plano predominante.

Referencias visuais consultadas:

- `_product/tasks/PROTO-INVENTORY.md`;
- `_product/proto/admin/Psicologos/Psicologos - Dashboard.png` como fallback local auditavel;
- screenshots enviados pelo usuario em 2026-08-01 mostrando a tabela em `http://localhost:3002/psicologos`.

Builder/Quick Copy ativo: `vcp://quickcopy/vcp-24aaa2941d814e5b90572bc93ae50e2a`. Nesta execucao, a ferramenta Builder/Quick Copy nao estava callable no ambiente; a implementacao usa imagem local e screenshots do usuario, registrando esta limitacao.

## Objetivo

Ajustar a secao de analise comportamental para que:

- o titulo visivel seja `Analise comportamental por conversao`;
- o texto `comportamento predominante detalhado por conversao` fique antes do titulo e saia da descricao do periodo;
- a coluna `Tela de favoritos` passe a ser `Favoritos`;
- os titulos da coluna **Conversao** e das colunas comportamentais usem o formato de titulo de tabela do painel Admin;
- a coluna **Favoritos** fique menor e mais proxima da borda direita da tabela;
- a coluna **Conversao** exiba, junto da base da faixa, a copy `X perfis considerados · Media Y cliques WhatsApp por psicologo`, com destaque para a base, o valor medio e `por psicologo`;
- `Views/video: X` seja exibido como `Views: X`;
- `WhatsApp/abertura: X%` nao apareca mais como tag da coluna **Perfil**;
- a coluna **Video de apresentacao** nao exiba mais a tag agregada `Engajamento` e passe a exibir `Acesso ao perfil`, `Favoritado` e `Compartilhado`;
- as tags de media de WhatsApp exibam `WhatsApp` em vez de `Cliques WhatsApp`;
- a tag de **Favoritos** (`WhatsApp: X`) nao quebre linha;
- a coluna **Perfil** exiba `Plano predominante`;
- o contrato tecnico continue preservado para consumidores que precisem das metricas completas.

## Dependencias

- TASK-53: dashboard Admin de psicologos.
- TASK-103: funil comportamental por conversao.
- TASK-126: tags na tabela comportamental.
- TASK-132: tags medias, destaque WhatsApp e cores por desempenho.
- TASK-133: tags de Perfil na tabela comportamental.

Todas as dependencias acima estao concluidas.

## Escopo executado

### Backend

- Renomear a label da metrica `presentation_video_views_per_video` para `Views`, preservando ID, source e calculo existentes.
- Renomear a coluna `favorite` da tabela comportamental para `Favoritos`.
- Atualizar descricoes user-facing da coluna de favoritos para nao expor mais `Tela de favoritos`.
- Encurtar labels das metricas de media de WhatsApp da tabela comportamental para `WhatsApp`.
- Adicionar a metrica `profile_dominant_plan`, derivada do plano ativo predominante entre os psicologos da faixa.

### Admin frontend

- Remover `profile_whatsapp_rate` do conjunto curado de tags visiveis da coluna **Perfil**.
- Manter a metrica no payload, sem renderiza-la como tag principal.
- Reposicionar o texto de detalhe comportamental para antes do titulo da secao e deixar a descricao com apenas o periodo selecionado.
- Padronizar os titulos das colunas no formato de tabela do painel Admin, com uppercase, tracking e cor muted/subtle.
- Reduzir a coluna **Favoritos** para `12%`, alinhar seu titulo e tags a direita e redistribuir **Video**, **Perfil** e **Comunidade** para `24%` cada, mantendo **Conversao** em `16%`.
- Exibir na coluna **Conversao** a base da faixa e a media de `row.totals.whatsapp_clicks / row.count`, arredondada para uma casa decimal, na mesma linha: `X perfis considerados · Media Y cliques WhatsApp por psicologo`.
- Renderizar a tag de **Favoritos** com `whitespace-nowrap` para manter `WhatsApp: X` em uma unica linha.
- Incluir `profile_dominant_plan` na curadoria visual de **Perfil**, mantendo `WhatsApp` como primeira tag.

## Fora do escopo

- Alterar banco, Prisma schema ou migrations.
- Criar novos trackings, seeds, mocks, backfills ou endpoints simulados.
- Alterar origem, persistencia, eventos ou endpoint das metricas.
- Instalar package novo.

## Criterios de aceite

- [x] O titulo da secao aparece como `Analise comportamental por conversao`.
- [x] O texto `comportamento predominante detalhado por conversao` aparece antes do titulo e nao fica concatenado ao periodo.
- [x] A coluna `Tela de favoritos` aparece como `Favoritos`.
- [x] Os titulos das colunas usam o formato de titulo de tabela do painel Admin.
- [x] A coluna **Favoritos** esta menor, alinhada a direita e visualmente mais proxima da borda direita da tabela.
- [x] A coluna **Conversao** exibe a media de cliques WhatsApp por psicologo da categoria, nao a somatoria.
- [x] A coluna **Conversao** exibe a copy no formato `X perfis considerados · Media Y cliques WhatsApp por psicologo`, por exemplo `15 perfis considerados · Media 0 cliques WhatsApp por psicologo`.
- [x] A tag `Views/video: X` aparece como `Views: X` na tabela comportamental.
- [x] A coluna **Perfil** nao exibe mais `WhatsApp/abertura: X%`.
- [x] A coluna **Video de apresentacao** nao exibe mais a tag agregada `Engajamento`.
- [x] A coluna **Video de apresentacao** exibe as tags `Acesso ao perfil`, `Favoritado` e `Compartilhado` quando ha base real de video.
- [x] `WhatsApp` substitui `Cliques WhatsApp` como label das tags de media de WhatsApp.
- [x] `WhatsApp` continua sendo a primeira tag visivel da coluna **Perfil**.
- [x] Na coluna **Favoritos**, a tag `WhatsApp: X` aparece em uma unica linha.
- [x] A coluna **Perfil** exibe a tag `Plano predominante`.
- [x] O backend preserva as metricas tecnicas e altera apenas labels/copy visiveis solicitados.
- [x] UI mobile-first preservada e nenhum `<img>` cru foi adicionado.
- [x] Nenhum mock, dado fake permanente, seed ou endpoint simulado foi usado.
- [x] Builder/Quick Copy nao estava callable; imagem local e screenshots do usuario foram usados como referencia.
- [x] Nao houve alteracao de banco/schema/migrations; `db:migrate` nao se aplica.
- [x] Checks/builds relevantes foram executados.
- [x] Browser local validou a rota Admin.
- [x] ADR criado em `adrs/0400-copy-tags-video-perfil-tabela-comportamental-admin.md`.
- [x] Commit proprio criado e push executado.

## Validacao executada

- `pnpm --dir backend typecheck`
- `pnpm --dir admin typecheck`
- `pnpm --dir backend check`
- `pnpm --dir admin check`
- `pnpm --dir backend build`
- `NODE_OPTIONS=--max-old-space-size=8192 pnpm --dir admin build`
- `pnpm check`
- Browser local em `http://localhost:3002/psicologos` via Chrome/CDP desktop `1440x1000` e mobile `390x900`.

## Observacoes

- A mudanca e de copy, curadoria visual e calculo de exibicao na coluna **Conversao**; nao altera persistencia.
- `profile_whatsapp_rate` segue disponivel no payload para auditoria e consumidores tecnicos, mas fora da tabela visual.
- A media de cliques WhatsApp na coluna **Conversao** usa os totais reais retornados pela API e a base real de psicologos da propria faixa, exibindo a base e a media na copy solicitada pelo produto.
- O admin temporario `codex-task136-copy-20260801@lectum.local`, criado via bootstrap para validacao local, foi removido apos a validacao para nao manter dado de teste permanente.
