# ADR 0160 — Background uniforme em Comunidades / Feed e visualizacao de post

## Status

Aceito em 2026-06-23.

## Contexto

A tela de Comunidades / Feed usava uma combinacao de fundo hardcoded `#F5F7FA`, headers sticky translucidos com `backdrop-blur` e fades/variacoes que geravam percepcao de faixas, manchas e tons levemente diferentes do padrao visual das telas de Psicologos, Favoritos, Notificacoes e Perfil.

A visualizacao de um post aberto em `/app/community/[slug]/post/[id]` e a arvore de respostas em `/app/community/[slug]/post/[id]/thread/[replyId]` tinham o mesmo risco visual por usar `#F5F7FA` no `PrivateTemplate` e no wrapper estrutural da pagina.

## Decisao

Padronizar as rotas de comunidade voltadas ao feed, detalhe do post e arvore de respostas para usar o token `bg-background` como unica cor solida da area principal.

As decisoes aplicadas foram:

- usar `bg-background` no `PrivateTemplate` de `/app/community/feed` e `/app/community/[slug]`;
- usar `bg-background` no `PrivateTemplate` e no wrapper raiz de `/app/community/[slug]/post/[id]` e `/app/community/[slug]/post/[id]/thread/[replyId]`;
- usar `bg-background` solido nos headers sticky de busca/filtros, sem transparencia ou `backdrop-blur`;
- aplicar `ring-offset-background` no FAB de publicar para estados de foco;
- remover o fade lateral em gradiente do carrossel de comunidades em `/app/community`;
- manter contraste e hierarquia por cards, bordas, chips, campos, superficies e destaques de respostas, nao por variacao do fundo da pagina.

## Consequencias

- Comunidades / Feed, visualizacao do post e arvore de respostas passam a ter a mesma base visual das telas principais privadas.
- Futuras alteracoes de tema ou cor de fundo continuam centralizadas no token global `--background`.
- Superficies de componentes continuam podendo usar `bg-white`, `bg-surface`, bordas e sombras sutis quando forem cards/campos, desde que o fundo de pagina permaneca uniforme.
- O destaque azulado de respostas de psicologos permanece tratado como estado de componente, nao como background estrutural.
- Qualquer nova variacao tonal em rotas de comunidade deve ser deliberada e limitada ao componente, nao ao wrapper principal da tela.
