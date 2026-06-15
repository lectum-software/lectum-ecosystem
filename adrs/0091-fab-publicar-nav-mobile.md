# ADR-0091: FAB de publicar sincronizado com a Nav Bar mobile

## Status

Aceita em 2026-06-15.

## Contexto

O botão flutuante de publicar das telas de comunidade ficava com `bottom` fixo no mobile. Após a Nav Bar inferior passar a esconder ao rolar para baixo e reaparecer ao rolar para cima, esse posicionamento estático deixava o FAB distante demais da navegação quando ela estava visível e sem movimento coordenado quando a navegação era ocultada.

## Decisão

O `PrivateTemplate` passa a expor variáveis CSS herdáveis com a distância inferior adequada para FABs sensíveis à Nav Bar mobile:

- `--lectum-mobile-nav-aware-fab-bottom`;
- `--lectum-mobile-nav-aware-fab-bottom-sm`.

Quando a Nav Bar mobile está visível, as variáveis posicionam o FAB logo acima dela, respeitando `env(safe-area-inset-bottom)`. Quando a Nav Bar é ocultada pela rolagem, as mesmas variáveis reduzem o afastamento para aproximar o FAB da borda inferior segura.

Os botões flutuantes de publicar do feed geral e da página principal de comunidade passam a usar essas variáveis somente nos breakpoints mobile/tablet pequeno. No desktop, os valores existentes de `lg:bottom-10` e alinhamento lateral são preservados.

## Consequências

- O FAB acompanha visualmente a entrada e saída da Nav Bar mobile.
- A distância entre FAB e Nav Bar fica consistente sem acoplamento direto ao componente de comunidade.
- O comportamento desktop permanece inalterado.
- Outros FABs mobile podem reutilizar a mesma variável quando precisarem respeitar a Nav Bar principal.
