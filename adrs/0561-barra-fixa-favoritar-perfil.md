# ADR-0561 - Barra fixa de favorito no perfil

## Status

Accepted

## Contexto

As abas fixas ocupavam o topo do perfil durante a leitura. O usuario optou por
uma identidade compacta com favorito no estilo do header, distinta do CTA azul
dos posts. A acao original e sua substituta nao devem coexistir visualmente.

## Decisao

- Extrair ProfileFavoriteButton sem alterar seu contrato visual ou estado.
- ProfileHeader observa a ancora do botao original com IntersectionObserver.
  A barra sticky de altura de fluxo zero aparece apenas quando a ancora sai
  pelo topo; nao move o conteudo nem depende do tamanho da biografia.
- Barra oculta usa inert e aria-hidden. Nome truncado, selo sem encolhimento,
  avatar compacto e altura fixa de 4rem mantem previsibilidade em mobile.
- Reutilizar dados, mutation e conversao do perfil, sem estado favorito paralelo.
- Omitir favorito na barra do proprio perfil, preservando guards de autoria.
- Abas permanecem no fluxo; offset de navegacao usa a altura da nova barra.

## Consequencias

Trocar de aba exige retornar a navegacao original. O botao fica disponivel ao
longo das tres abas, sem competir com o WhatsApp inferior. Nenhuma dependencia,
migration, variavel ou mudanca de API. Deploy e rollback seguem homolog/main.
