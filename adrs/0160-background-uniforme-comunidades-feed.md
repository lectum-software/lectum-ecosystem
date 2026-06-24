# ADR 0160 — Background uniforme em Comunidades / Feed

## Status

Aceito em 2026-06-23.

## Contexto

A tela de Comunidades / Feed ainda usava uma combinacao de fundo hardcoded `#F5F7FA`, headers sticky translúcidos com `backdrop-blur` e um fade lateral em gradiente no carrossel de comunidades.

Embora a diferenca fosse sutil, essa combinacao gerava percepcao de faixas, manchas e tons levemente diferentes do padrao visual das telas de Psicologos, Favoritos, Notificacoes e Perfil, que usam o token global de background da aplicacao como base uniforme.

## Decisao

Padronizar as rotas de comunidade voltadas ao feed/listagem para usar o token `bg-background` como unica cor solida da area principal.

As decisoes aplicadas foram:

- usar `bg-background` no `PrivateTemplate` de `/app/community/feed` e `/app/community/[slug]`;
- usar `bg-background` solido nos headers sticky de busca/filtros, sem transparencia ou `backdrop-blur`;
- aplicar `ring-offset-background` no FAB de publicar para estados de foco;
- remover o fade lateral em gradiente do carrossel de comunidades em `/app/community`;
- manter contraste e hierarquia por cards, bordas, chips, campos e superficies, nao por variacao do fundo da pagina.

## Consequencias

- Comunidades / Feed passa a ter a mesma base visual das telas principais privadas.
- Futuras alteracoes de tema ou cor de fundo continuam centralizadas no token global `--background`.
- Superficies de componentes continuam podendo usar `bg-white`, `bg-surface`, bordas e sombras sutis quando forem cards/campos, desde que o fundo de pagina permaneça uniforme.
- Qualquer nova variacao tonal em rotas de comunidade deve ser deliberada e limitada ao componente, nao ao wrapper principal da tela.
