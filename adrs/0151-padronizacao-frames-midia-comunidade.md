# ADR-0151: Frames padronizados de mídia na comunidade

## Status

Accepted

## Task relacionada

TASK-26

## Contexto

As publicações e respostas da comunidade passaram a aceitar imagens, vídeos e carrosséis. Com uploads reais em formatos diferentes, a experiência ficou inconsistente: algumas mídias ocupavam largura excessiva no desktop, outras alternavam entre formatos sem padrão, e o CTA de WhatsApp podia perder a relação visual com a mídia anexada. O usuário também definiu que a experiência deve se aproximar do Threads no desktop: mídia menor, alinhada à esquerda e sem saltos bruscos entre itens do carrossel.

## Decisão

- Criar uma fundação compartilhada de frame de mídia em `CommunityMediaBlock` e helpers de orientação.
- Padronizar orientações em três famílias: horizontal `16:9`, quadrada `1:1` e vertical `4:5`.
- Definir limites responsivos por contexto:
  - post/feed/detalhe: horizontal até `560px`, quadrado até `480px`, vertical até `380px` no desktop;
  - comentários/respostas: horizontal até `480px`, quadrado até `400px`, vertical até `340px` no desktop.
- Manter largura quase total no mobile e alinhar à esquerda no desktop.
- Para carrossel, usar frame fixo escolhido pelo conjunto de mídias: todas horizontais `16:9`, todas quadradas `1:1`, todas verticais `4:5`, horizontal+quadrada `1:1`, qualquer mistura com vertical `4:5`.
- Em carrossel, renderizar cada imagem com `object-contain` dentro do frame, evitando corte quando houver formatos diferentes.
- Em mídia única, renderizar dentro do frame padronizado com preenchimento do espaço visual.
- Permitir que o CTA de WhatsApp fique como footer do mesmo frame de mídia/carrossel para acompanhar sua largura.

## Consequências

- Feed, comunidade, detalhe do post, respostas salvas, meus posts/respostas e publicações no perfil do psicólogo passam a compartilhar a mesma regra visual.
- O desktop fica mais próximo do Threads, com mídia menor e alinhada à esquerda.
- Carrosséis deixam de alternar altura entre slides e evitam cortes de imagens em formatos mistos.
- A primeira renderização pode usar orientação horizontal até os metadados reais da mídia serem carregados; depois o frame converge para a orientação correta.
- A regra centralizada reduz duplicação, mas novos pontos de renderização de mídia devem reutilizar `CommunityMediaBlock` ou `PostMediaCarousel`.

## Validação

- `pnpm --dir frontend biome:fix`
- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- `git diff --check`

Builder/Quick Copy não está exposto como ferramenta callable neste ambiente; a validação visual foi orientada pelos screenshots e decisões do usuário neste thread.

## Pendências

- Reavaliar com dados reais após novo ciclo de QA visual no navegador do usuário, especialmente carrosséis mistos com imagens verticais, quadradas e horizontais em perfil público de psicólogo.
