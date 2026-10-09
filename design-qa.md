# Comunidades seguidas - Design QA - 2026-10-09

## Evidencias

- Verdade visual:
  - `C:/Users/tulio/Downloads/WhatsApp Image 2026-10-09 at 19.38.57.jpeg` (590 x 1280).
  - `C:/Users/tulio/Downloads/WhatsApp Image 2026-10-09 at 19.38.20.jpeg` (590 x 1280).
  - `C:/Users/tulio/Downloads/WhatsApp Image 2026-10-09 at 19.36.49.jpeg` (590 x 1280).
- Implementacao mobile: `.tmp/qa-task-239/implementation-mobile-fixed.png` (390 x 844).
- Implementacao desktop: `.tmp/qa-task-239/implementation-desktop.png` (1280 x 900).
- Comparacao conjunta: `.tmp/qa-task-239/comparison-mobile.png` (1560 x 846).
- Viewports CSS: 390 x 844 e 1280 x 900; `deviceScaleFactor: 1`.
- Normalizacao: as referencias de 590 px foram reduzidas para 390 x 846 na comparacao conjunta; a implementacao foi capturada em 390 x 844 sem escala adicional.
- Estado: componentes reais do frontend e dados publicos reais do backend local. A rota e tres itens foram expostos apenas no harness temporario de captura; esse acesso foi removido antes da validacao final e nao integra o diff.

## Comparacao

- Tipografia: Manrope, pesos, hierarquia em frase e tamanhos compactos seguem Inicio, Salvos e Favoritos. Nao ha titulos promocionais em caixa alta ou display type.
- Ritmo e layout: `AppPageHeader`, margens de 20 px, superficies brancas, bordas, raios de 22 px e sombras leves acompanham as demais telas. A lista reduz altura e evita a repeticao de uma comunidade em destaque.
- Cores e tokens: fundo, superficie, borda, texto secundario e azul de acao usam tokens existentes. Os avatares preservam as cores reais das comunidades.
- Imagens: avatares reais usam o recorte quadrado existente. URLs ausentes ou com falha agora caem para iniciais sem texto alternativo quebrado.
- Conteudo: titulo, contagem, atividade, nomes completos, `Comunidades sugeridas`, `Ver todas` e `Seguir` permanecem claros e alinhados ao vocabulario do produto.
- Responsividade: uma coluna no mobile, duas colunas na lista em telas maiores e carrossel responsivo compartilhado. Nenhum texto ou controle fica sobreposto nas capturas.
- Interacao: destinos das comunidades, paginacao, estados de erro/vazio e controles de seguir foram preservados. A captura nao acionou mutacoes.

## Historico de iteracoes

1. Primeira captura em 390 x 844: [P2] uma URL de avatar invalida mostrava texto alternativo quebrado no card de recomendacao.
2. Correcao: criado `CommunityAvatar`, com fallback de iniciais no erro, e adotado tanto na lista seguida quanto no carrossel compartilhado.
3. Segunda captura em 390 x 844 e captura em 1280 x 900: fallback `LF` visivel, sem imagem quebrada e sem novos P0/P1/P2.

## Regiao focada

O carrossel de recomendacoes foi comparado diretamente com a primeira referencia na composicao conjunta. Avatar, nome em ate tres linhas, botao azul de largura estavel, espacamento entre cards e indicio do proximo card seguem o componente oficial da Home.

## Findings

Nenhuma diferenca P0, P1 ou P2 permanece. O indicador preto `N` nas capturas e o controle de desenvolvimento do Next.js e nao aparece no build publicado.

## Checklist

- [x] Cabecalho compartilhado e hierarquia textual.
- [x] Lista compacta com nomes completos.
- [x] Carrossel oficial da Home.
- [x] Fallback de avatar com iniciais.
- [x] Mobile 390 px e desktop 1280 px.
- [x] Sem alteracao persistente de autenticacao no harness.

final result: passed
