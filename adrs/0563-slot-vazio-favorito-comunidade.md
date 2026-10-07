# ADR-0563 - Slot vazio de favorito antes da comunidade

## Status

Aceito.

## Contexto

FeedFavoriteButton retorna null para o proprio perfil ou enquanto a consulta
de favoritos esta indefinida. Os consumidores ainda reservavam 66px e margem
antes do tema da comunidade, afastando o chevron do selo.

## Decisao

- Reutilizar os seletores estruturais existentes do slot de favorito.
- Ocultar apenas span vazio imediatamente anterior a data-original-post-community.
- Restaurar max-width de 48% para esse link, como na identidade sem acao.
- Preservar regras de autorizacao, estado de favorito e respostas sem comunidade.
- Testar renderizacao real de autor proprio, visitante e favoritos carregados.

## Consequencias

Correcao compartilhada entre feed, detalhe e publicacoes do perfil, sem duplicar
estado de autenticacao nos consumidores. Depende da adjacencia ja utilizada
pelas animacoes do coracao; testes protegem esse contrato. Nenhuma nova
dependencia ou alteracao de dados.
