# ADR-0716 - Posicao visual do reels e audio persistente

## Decisao

Congelar somente dimensoes durante edicao, acompanhando a origem do visualViewport. O offset do compositor passa a ser a diferenca de alturas: congelar a origem fazia o Safari deslocar o player acima da tela. Referencia: https://developer.mozilla.org/en-US/docs/Web/API/VisualViewport.

Persistir apenas escolha de som/silencio em localStorage com fallback em memoria. Entrada por toque sem escolha previa prefere som; abrir URL diretamente nao simula gesto. Negacao de autoplay nao grava silencio. Manter o player persistente e a politica existente de fallback.

Placeholder 14px; editor 16px para nao introduzir zoom de foco. Testes automatizados de deslocamento nao substituem teclado nativo iOS.
