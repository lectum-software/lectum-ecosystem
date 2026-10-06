# ADR-0554 - Listas continuas no frontend

## Status

Aceita em 2026-10-05. TASK-214.

## Contexto

Favoritos, Salvos e Explorar comunidades ainda usavam navegacao numerada.
Avaliacoes feitas/recebidas e notificacoes dependiam de carregar mais manualmente;
comunidades seguidas estavam limitadas ao primeiro lote de 24 registros.
O usuario solicitou continuidade na mesma tela ate o ultimo resultado.

## Decisao

Usar TanStack useInfiniteQuery, com inicio na pagina 1 e os mesmos endpoints
paginados. As chaves incluem mode=infinite, separadas das consultas simples e
contadores. Cada filtro possui cache independente. Nao carregar todo o catalogo
de uma vez, nem alterar backend ou banco.

InfiniteListLoader observa o fim da lista, bloqueia requisicoes durante fetching
e erros, e oferece tentativa manual somente para recuperacao. No explorar mobile,
o observador fica no fim do carrossel horizontal; no desktop, no fim do grid.
As listas acumuladas deduplicam IDs, preservam ordem e permanecem visiveis em
falhas de lotes seguintes. Ao esgotar, o indicador desaparece.

Os caches de favoritos passam a aceitar respostas simples e InfiniteData para
preservar atualizacao otimista, snapshots/rollback e invalidacao. Remocoes e
respostas a avaliacoes invalidam as chaves existentes, refazendo os lotes na
ordem para reconciliar deslocamentos da paginacao por offset.

## Consequencias

O frontend publico/restrito deixa de expor barras Anterior/Proxima e botoes
manuais de proximo lote. Admin e controles de carrossel/onboarding nao sao
paginacao de listas e permanecem intactos. Recomendacoes resumidas com Ver todos
permanecem selecoes, nao se transformam em catalogos completos.
Sem pacote, env, migration ou contrato novo. Rollback por reversao revisada em
homolog. Promocao a producao exige pedido explicito posterior.
