# ADR-0151: Frames padronizados de mídia na comunidade

## Status

Accepted

## Task relacionada

TASK-26

## Contexto

As publicações e respostas da comunidade passaram a aceitar imagens, vídeos e carrosséis. Com uploads reais em formatos diferentes, a experiência ficou inconsistente: algumas mídias ocupavam largura excessiva no desktop, outras alternavam entre formatos sem padrão, e o CTA de WhatsApp podia perder a relação visual com a mídia anexada. O usuário também definiu que a experiência deve se aproximar do Threads no desktop: mídia menor, alinhada à esquerda e sem saltos bruscos entre itens do carrossel.

## Decisão

- Criar uma fundação compartilhada de frame de mídia em `CommunityMediaBlock` e helpers de orientação.
- Padronizar orientações em três famílias: horizontal `16:9`, quadrada `1:1` e vertical `9:16`.
- Definir limites responsivos por contexto:
  - post/feed/detalhe: horizontal até `560px`, quadrado até `480px`, vertical até `380px` no desktop;
  - comentários/respostas: horizontal até `480px`, quadrado até `400px`, vertical até `340px` no desktop.
- Manter largura quase total no mobile e alinhar à esquerda no desktop.
- Para carrossel, usar frame fixo escolhido pelo conjunto de mídias: todas horizontais `16:9`, todas quadradas `1:1`, todas verticais `9:16`; qualquer mistura de formatos diferentes usa frame `1:1`.
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

## Complemento 2026-06-23 - videos em proporcao real sem faixa preta lateral

A padronizacao anterior aplicava os mesmos agrupamentos de orientacao para imagens e videos. Isso fazia videos verticais reais serem exibidos em frame `4:5`, produzindo barras pretas laterais quando o player preservava o conteudo sem corte.

Decisao complementar:

- Separar a regra de orientacao de videos da regra de imagens.
- Imagens continuavam usando as familias visualmente padronizadas `16:9`, `1:1` e `4:5` até o complemento abaixo; vídeos seguem usando `16:9` ou `9:16`.
- Videos passam a usar apenas orientacao horizontal ou vertical: horizontal em `16:9`, vertical em `9:16`.
- O player de video publicado passa a usar `object-contain` em frame correspondente a proporcao real, para preservar o conteudo sem crop automatico.
- Quando os metadados reais do video estiverem disponiveis, o frame recebe `aspect-ratio` exato a partir de `videoWidth/videoHeight`, reduzindo barras pretas causadas por pequenas variacoes de proporcao.

Consequencias:

- Videos verticais gravados em 9:16 deixam de aparecer dentro de um frame 4:5 com margem preta lateral.
- Videos horizontais continuam em 16:9 sem corte.
- Se a faixa preta ja estiver gravada dentro do proprio arquivo, a interface preserva o video original e nao faz crop destrutivo para remove-la.
- A regra permanece centralizada em `CommunityMediaBlock`, afetando feed, comunidade, perfil, salvos e detalhe do post sem mudancas de backend.

Validacao complementar:

- `pnpm --dir frontend biome:fix`: sucesso.
- `pnpm --dir frontend check`: sucesso.
- `pnpm --dir frontend build`: sucesso.
- `pnpm check`: sucesso.
- `git diff --check`: sucesso.

## Complemento 2026-06-23 - imagens verticais em 9:16

O usuario decidiu que imagens verticais publicadas devem seguir o mesmo frame vertical dos videos, usando `9:16` em vez de `4:5`.

Decisao complementar:

- Alterar o frame padronizado de imagens verticais de `4:5` para `9:16`.
- Manter imagens horizontais em `16:9` e imagens quadradas em `1:1`.
- Manter a deteccao por metadados reais da imagem apenas para classificar a orientacao; o frame final continua padronizado.
- Manter os limites responsivos por contexto ja definidos, para que imagens verticais nao ocupem largura excessiva no desktop.

Consequencias:

- Imagens verticais passam a ficar mais proximas do formato real de stories/reels sem usar o tamanho original arbitrario.
- Carrosseis compostos exclusivamente por imagens verticais passam a usar frame vertical `9:16`; carrosseis mistos continuam com frame unico quadrado `1:1`, preservando altura estavel sem transformar todo conjunto em vertical.
- O ajuste e centralizado em `CommunityMediaBlock`/helpers e se propaga para feed, comunidade, detalhe do post, respostas, salvos e publicacoes do perfil que reutilizam a fundacao.

Validacao complementar:

- `pnpm --dir frontend biome:fix`: sucesso.
- `pnpm --dir frontend check`: sucesso.
- `pnpm --dir frontend build`: sucesso.
- `pnpm check`: sucesso.
- `git diff --check`: sucesso.

## Complemento 2026-06-23 - carrossel misto em frame quadrado

O usuario definiu que a situacao simples do carrossel deve preservar o formato quando todas as midias compartilham a mesma orientacao, mas que misturas de formatos devem evitar saltos e excesso de altura.

Decisao complementar:

- Carrossel homogeneo horizontal permanece em `16:9`.
- Carrossel homogeneo vertical permanece em `9:16`.
- Carrossel homogeneo quadrado permanece em `1:1`.
- Qualquer carrossel misto entre horizontal, vertical e/ou quadrado passa a usar frame unico `1:1`.
- As imagens dentro do carrossel continuam com `object-contain`, evitando corte quando o frame escolhido nao coincide com o formato da imagem ativa.

Consequencias:

- Cards com carrossel misto deixam de crescer para `9:16` apenas por conter uma imagem vertical.
- O feed fica mais estavel e previsivel, especialmente no mobile.
- O detalhe/fullscreen futuro pode continuar exibindo cada midia em formato mais especifico, mas o card de feed usa um frame unico para nao deslocar a interface.

Validacao complementar:

- `pnpm --dir frontend biome:fix`: sucesso.
- `pnpm --dir frontend check`: sucesso.
- `pnpm --dir frontend build`: sucesso.
- `pnpm check`: sucesso.
- `git diff --check`: sucesso.

## Complemento 2026-06-23 - carrossel usa formatos canônicos e fallback quadrado

A QA visual mostrou que alguns carrosseis continuavam assumindo frame vertical mesmo quando o conjunto não deveria ocupar a altura de `9:16`. O motivo era a decisão baseada apenas na orientação detectada, sem considerar se a imagem vertical realmente era um formato canônico de mídia vertical.

Decisão complementar:

- O carrossel agora calcula o frame a partir dos metadados completos de cada imagem, não apenas do rótulo `portrait`/`landscape`.
- Enquanto os metadados de todos os itens de um carrossel múltiplo não estiverem disponíveis, o fallback é `1:1`, evitando que uma detecção parcial deixe o card vertical.
- Verticais intermediárias como `4:5` ou `3:4` passam a cair no frame quadrado em carrosséis; somente verticais canônicas próximas de `9:16` mantêm o carrossel em `9:16` quando todos os itens compartilham esse formato.
- Carrosséis horizontais homogêneos continuam em `16:9`; quadrados homogêneos continuam em `1:1`; combinações diferentes continuam em `1:1`.

Consequências:

- O feed mobile deixa de ficar com carrosséis altos quando o conjunto contém imagens verticais não canônicas.
- O carrossel continua estável, sem alternar altura entre slides, e mantém `object-contain` para evitar corte entre imagens de formatos diferentes.
- A regra permanece centralizada em `CommunityMediaBlock`/`PostMediaCarousel`, afetando feed, dentro da comunidade, perfil do psicólogo e demais cards que reutilizam a fundação.

Validação complementar:

- `pnpm --dir frontend biome:fix`
- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- `git diff --check`
