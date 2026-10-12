# ADR-0593: Dropdown curto por quantidade de publicacoes

## Status

Accepted

## Task relacionada

TASK-23

## Decisao

Reutilizar listagem paginada existente e carregar todas as paginas pelo caller, com cache de um minuto. Ordenar copia dos resultados por posts_count decrescente, nome e slug; mostrar quatro. O backend conta apenas posts publicados nao excluidos. Respostas nao entram. Manter Todas as comunidades no final, com divisor. Comunidade ativa pode ser resolvida na lista completa mesmo fora das quatro.

## Consequencias

Evita selecionar apenas entre as primeiras 50 comunidades (API ordena por membros). Numero de requisicoes proporcional ao catalogo; para catalogos grandes, avaliar ordenacao no servidor futuramente. Preservar erro/vazio honestos sem contagem inventada.

## Producao e rollback

Somente frontend; contrato existente, sem banco, env, package, jobs ou deploy nesta task. Rollback por reversao do frontend.

## Validacao

Cinco testes do cabecalho, check completo e build aprovados. Browser real 390px e 1280px: quatro comunidades, desempate alfabetico, link final abre catalogo completo. Captura do usuario como referencia; Builder indisponivel.
