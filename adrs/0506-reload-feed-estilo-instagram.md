# ADR-0506 - Reload do feed estilo Instagram

Data: 2026-09-16

## Status

Aceita - ajuste de produto solicitado pelo usuário.

## Contexto

O reload mobile da Lectum usava um chip textual no topo com estados como "Solte para atualizar", "Atualizando..." e "Atualizado". Em comparação com o Instagram, esse feedback ficava mais pesado, chamava atenção demais e reforçava a percepção de recarregamento técnico.

O usuário também pediu que tocar novamente no ícone ativo da navegação recarregue a tela, e levantou uma percepção de produto: a ordem sempre fixa dos posts pode sugerir que existem poucas publicações.

O Builder/Quick Copy ativo não ficou acessível neste ambiente: `npx "@builder.io/dev-tools@1.79.0" auth status` em `frontend/` falhou com `ENOENT` no cache local do `npx`. A referência visual usada foi `_product/proto/Feed Comunidade.jpg` junto das gravações enviadas pelo usuário em 2026-09-15.

## Decisão

- Substituir o chip textual do pull-to-refresh por um ícone circular discreto no topo da tela.
- Remover textos visíveis de estado durante o reload. A acessibilidade mantém rótulo não visual de status para leitores de tela.
- Reduzir distância de acionamento, distância máxima e deslocamento visual do pull-to-refresh para diminuir a sensação elástica.
- Centralizar pedidos de refresh em um evento client-side interno `lectum:refresh-current-view`.
- Fazer o item ativo da navegação principal disparar esse evento em vez de navegar para a mesma rota.
- Preservar o refresh atual via invalidação de queries ativas, atualização do service worker e `router.refresh()`, sem hard reload do browser.
- Aplicar variação leve apenas na apresentação do feed geral de Comunidades: posts são rotacionados dentro de janelas pequenas no frontend a cada refresh.
- Não alterar backend, ranking persistido, schema, migrations, buckets, jobs, envs ou contratos de API.

## Consequências

- A experiência fica mais próxima do Instagram: feedback discreto, sem copy de loading visível e com gesto menos exagerado.
- Tocar na aba ativa passa a ter efeito útil de refresh e reaproveita o mesmo indicador visual.
- A variação do feed melhora a sensação de frescor sem esconder posts nem trocar dados vindos da API.
- Como a variação é client-side e limitada a janelas pequenas, o ranking base do backend continua sendo a fonte de verdade.
- A variação não é aplicada às telas com ordenação explícita da comunidade, onde o usuário escolhe "Novos", "Mais comentados" ou "Mais úteis".

## Rollback

Reverter o commit restaura o chip textual, remove o refresh por item ativo da navegação e volta a apresentar o feed na ordem exata recebida da API. Não há dado servidor, schema, bucket, cache obrigatório ou provider externo para desfazer.

## Validação

Executada na branch `homolog`:

- Testes focados de `pull-to-refresh` e variação do feed.
- `pnpm --dir frontend check`.
- `pnpm --dir frontend build`.
- `pnpm version:bump` para `0.1.394`.
- `pnpm check:version`.
- Smoke local do build final com `pnpm --dir frontend start`: `/version` respondeu `{"application":"frontend","version":"0.1.394"}` e `/` respondeu HTTP 200.
- Validação visual mobile-first via Chrome headless/DevTools: toque no item ativo "Início" da navegação disparou o refresh; o elemento `role="status"` ficou no topo, sem texto visível (`textContent` vazio) e com rótulo acessível "Recarregando conteúdo".
