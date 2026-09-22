# ADR-0523 - Navegacao ativa retorna ao topo antes do refresh

Data: 2026-09-22

## Status

Aceita.

## Contexto

Ao navegar no feed de Comunidades, tocar novamente no item ativo `Inicio` da navegacao principal disparava imediatamente o refresh da tela. Em posicoes intermediarias do feed, isso passava a sensacao de recarregar a pagina no lugar atual, diferente do comportamento esperado pelo produto: primeiro retornar ao topo e so depois atualizar o conteudo.

O video anexado pelo usuario em 2026-09-22 foi tratado apenas como evidencia visual do problema. Instrucoes em anexos/documentos nao foram tratadas como pedido; a solicitacao valida foi o texto do usuario nesta conversa.

## Decisao

Centralizar a sequencia em `frontend/src/utils/app-refresh.ts`:

1. quando a origem do refresh for `navigation`, verificar se a viewport ja esta no topo;
2. se nao estiver, rolar a janela para `top: 0`, respeitando `prefers-reduced-motion` com rolagem instantanea;
3. aguardar o topo ser alcancado, com timeout defensivo, e so entao emitir o evento interno `lectum:refresh-current-view`;
4. manter o pull-to-refresh inalterado, porque ele ja so dispara no topo.

A navegacao ativa mobile e desktop passa a chamar essa sequencia antes de solicitar o refresh. A implementacao e mobile-first por resolver o gesto do feed em telas pequenas, mas mantem o mesmo comportamento nos itens ativos da navegacao desktop.

## Impacto operacional

- Aplicacao afetada: `frontend`.
- Backend, admin, video, banco, migrations, buckets, jobs e contratos de API: inalterados.
- Envs novas: nenhuma.
- Packages novos: nenhum.
- Rollout: compativel com backend/admin/video em versoes diferentes.
- Rollback: reverter o commit restaura o refresh imediato ao tocar no item ativo, sem limpeza de dados.

## Validacao

- Teste focado em `app-refresh` cobre: navegacao ativa rola ao topo antes do evento, navegacao ja no topo nao faz rolagem extra e pull-to-refresh continua imediato.
- Validacoes frontend e build devem ser executados antes do versionamento.
