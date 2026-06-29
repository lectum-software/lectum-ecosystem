# ADR-0171: Layout premium em duas telas de boas-vindas do paciente

## Status

Accepted

## Task relacionada

TASK-08 (ajuste incremental de UX/onboarding do paciente)

## Contexto

O onboarding do paciente já estava reduzido para duas telas, com persistência real em `patient_profile.onboarding_completed_at` via `PUT /api/private/patient/onboarding`. O produto solicitou substituir a composição anterior por duas telas mais emocionais e premium, baseadas nas referências anexadas em 26/06/2026: uma tela de acolhimento com o novo símbolo Lectum e paisagem/caminho azul, seguida por uma tela de escolha inicial entre encontrar profissional e participar da comunidade.

Builder/Quick Copy não esteve disponível como ferramenta MCP nesta execução; as referências visuais anexadas pelo usuário e a task/proto existente de TASK-08 foram usadas como norte visual auditável. A alteração não deve mudar contrato de API nem persistência de onboarding.

## Decisão

- Manter a rota `/patient/welcome` e o fluxo real já existente: `GET /api/private/patient/profile` decide se o onboarding deve aparecer; a escolha de objetivo conclui via `PUT /api/private/patient/onboarding`.
- Recriar a interface como experiência mobile-first em duas telas:
  - tela 1: símbolo Lectum SVG, título `Bem-vindo à Lectum`, texto de acolhimento, ilustração vetorial CSS/SVG de caminho e CTA grande `Vamos começar`;
  - tela 2: mesma linguagem visual de paisagem, título `Como você gostaria de começar?` e dois cards de escolha.
- Usar o componente `LectumSymbolIcon` criado no ADR-0170, sem adicionar asset rasterizado nem usar `<img>`.
- Implementar a ilustração de fundo como SVG inline/tokenizado e animações CSS leves (`fade-up`, escala do símbolo, leve flutuação do caminho e seta), respeitando `prefers-reduced-motion`.
- Atualizar a copy dos objetivos para o novo layout: `Encontrar um profissional` e `Participar da comunidade`, mantendo os valores de domínio existentes (`encontrar_psicologo` e `conhecer_comunidade`).

## Consequências

- A primeira experiência do paciente fica mais próxima da nova direção visual da marca, sem alterar backend ou contratos.
- O SVG inline evita dependência de arquivos temporários e permanece escalável em mobile/desktop.
- As animações são decorativas e desativadas para usuários com redução de movimento.
- A tela preserva a arquitetura existente de React Query/caller real e não introduz pacote novo.
- A ilustração vetorial é uma interpretação limpa das referências anexadas, não uma cópia raster pixel-perfect.

## Validação

- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- Browser local/headless em `http://localhost:3000/patient/welcome`, viewport 390x884,
  com usuário paciente temporário criado por endpoint real (`POST /api/public/user/store`):
  validou a tela 1, o avanço pelo CTA `Vamos começar` e a renderização da tela 2.
- O usuário temporário de validação foi removido do banco ao final.

## Pendências

- Aplicar a nova identidade Lectum no restante do site em tarefa futura, caso o produto aprove a direção visual.


## Atualizacao 2026-06-27 - refino de fidelidade visual

Apos revisao do produto, a primeira implementacao premium foi considerada distante das referencias. A decisao foi manter a abordagem vetorial/tokenizada, mas refinar a composicao para se aproximar das imagens anexadas com medidas mobile-first: conteudo e CTA posicionados por proporcao de viewport na tela 1, cards e bloco de decisao posicionados separadamente na tela 2, e paisagem/caminho redesenhados em coordenadas 390x844.

Consequencias adicionais:

- A tela preserva texto HTML acessivel e botoes reais, evitando rasterizar toda a referencia como fundo.
- A fidelidade visual melhora sem alterar contratos de API, query keys, valores de dominio ou persistencia do onboarding.
- A validacao continua dependendo de usuario real temporario em ambiente local, limpo depois da verificacao.

## Atualizacao 2026-06-27 - assets SVG de fundo fornecidos pelo produto

Apos nova iteracao, o produto enviou `tela 1.svg` e `tela 2.svg` com as ilustracoes de fundo sem textos, cards ou botoes. Esses arquivos sao exportacoes SVG com PNGs embutidos e mascara, portanto nao sao vetores editaveis puros; ainda assim, sao a fonte mais fiel para a paisagem/caminho das referencias.

Decisao adicional:

- Normalizar os SVGs enviados para a proporcao mobile das referencias (`853x1844`) e versiona-los em `frontend/public/images/patient-welcome/`.
- Renderizar os fundos com `next/image` (`Image`) em vez de `<img>`, mantendo textos, botoes e cards como UI real/acessivel sobre os assets.
- Remover a recriacao manual da paisagem em SVG inline na tela e preservar somente animacoes leves de entrada/seta, para nao deslocar a ilustracao pixel a pixel.
- Nao adicionar pacote novo nem alterar backend, contratos ou persistencia.

Consequencias adicionais:

- A fidelidade visual da paisagem passa a depender dos assets fornecidos pelo produto, reduzindo divergencias de formas, opacidade e posicionamento.
- O repositorio passa a carregar dois SVGs grandes por conterem imagens base64 embutidas; a escolha e aceita para este onboarding por priorizar fidelidade visual e evitar rasterizar textos/controles.
- Futuramente, se o produto fornecer os fundos como SVG vetorial limpo ou imagens otimizadas separadas, os assets podem ser substituidos sem alterar a logica de onboarding.
- A verificacao visual foi registrada em `design-qa.md` com resultado aprovado para viewport mobile 390x844.

## Atualizacao 2026-06-27 - simbolo de marca no onboarding

O produto solicitou que a primeira tela do onboarding use o SVG oficial `Logo icon.svg` enviado como anexo, mantendo o tamanho do icone atual da tela.

Decisao adicional:

- Versionar o SVG anexado em `frontend/public/images/brand/lectum-logo-icon.svg`.
- Renderizar o simbolo via `next/image` na tela de boas-vindas, sem alterar o componente global `LectumSymbolIcon`, pois a troca global da marca sera tratada em uma iteracao futura.
- Ajustar somente o tamanho visual do texto do CTA e o copy do badge da comunidade, sem alterar fluxo de dados, APIs ou contratos.

Consequencias adicionais:

- A tela passa a refletir a marca nova apenas neste ponto do onboarding.
- A troca global da logo continua isolada para uma tarefa futura.

## Atualizacao 2026-06-27 - responsividade do shell premium

Durante validacao em desktop, o container das telas de boas-vindas ficava grande demais em altura e largura, causando corte visual especialmente na segunda tela. A decisao adicional foi transformar o shell do onboarding em um quadro proporcional ao canvas mobile de referencia (`390x844`) quando a viewport for desktop/tablet, limitando a altura por `100dvh - 3rem` e calculando a largura pela mesma proporcao.

Decisao adicional:

- Manter `100dvh` em mobile para preservar a referencia original.
- Em `sm+`, usar uma classe dedicada (`lectum-welcome-shell`) para altura/ largura proporcionais e cantos/sombra de preview premium.
- Trocar posicionamentos principais de `vh` para porcentagens do container, garantindo que titulos, CTA e cards acompanhem o redimensionamento do shell.
- Ajustar somente a posicao desktop dos cards da segunda tela para evitar corte em viewports com pouca altura, sem mudar copy, APIs, assets ou valores de dominio.

Consequencias adicionais:

- O layout fica consistente em desktop, mobile e no emulador do DevTools, sem scroll/corte interno indevido no card visual.
- A implementacao continua mobile-first e baseada nos SVGs fornecidos pelo produto.
- Nao houve alteracao de backend, schema, endpoint ou pacote.

## Atualizacao 2026-06-27 - desktop full screen com arte original expandida

Apos revisao do produto, o shell proporcional em desktop foi substituido por uma experiencia full screen. A restricao principal foi preservar o mobile exatamente como estava e, no desktop, manter a ilustracao original dos SVGs fornecidos, apenas expandindo-a horizontalmente para ocupar a tela.

Decisao adicional:

- Separar os assets por breakpoint no componente `WelcomeBackground`: mobile continua usando os SVGs originais normalizados e desktop usa variantes `*-desktop.svg`.
- Gerar as variantes desktop a partir dos mesmos PNGs embutidos e das mesmas mascaras dos SVGs mobile, preenchendo um canvas `3840x2160` com expansao horizontal do layer de paisagem.
- Remover borda, sombra, raio e largura maxima em `sm+`, deixando o onboarding ocupar `100dvh` e `100%` da largura; manter as classes base mobile sem alteracao.
- Continuar renderizando tudo via `next/image`, sem `<img>`, sem pacote novo e sem alterar contratos de API.

Consequencias adicionais:

- O desktop passa a ter uma composicao horizontal premium sem trocar a fonte visual da paisagem.
- Os assets desktop ficam maiores por duplicarem as camadas base64, mas a escolha preserva fidelidade e isola a mudanca do mobile.
- Se o produto fornecer futuramente uma imagem desktop gerada externamente/otimizada, ela pode substituir os assets `*-desktop.svg` sem mudar a logica de onboarding.

## Atualizacao 2026-06-29 - desktop centralizado em paisagem

Apos nova revisao do produto, a experiencia desktop full screen das duas telas de
`/patient/welcome` foi considerada grande demais. A orientacao atual e preservar o mobile
sem alteracao e, somente em `sm+`, exibir a composicao como um quadro SVG horizontal
centralizado, sem ocupar a tela inteira.

Decisao adicional:

- Substituir as variantes desktop dos fundos pelos SVGs vetoriais enviados pelo produto
  (`Tela 1 - background.svg` e `tela 2 - background.svg`), mantendo as variantes mobile
  originais intactas.
- Dimensionar o shell desktop como quadro 16:9 centralizado, limitado a `1280x720` e
  tambem limitado por `100vw - 48px` e `100dvh - 48px`, evitando full screen e cortes.
- Preservar textos, botoes e cards como UI real/acessivel sobre os fundos, via `next/image`,
  sem `<img>`, sem pacote novo e sem alterar chamadas, contratos ou persistencia.

Consequencias adicionais:

- Desktop passa a ter aparencia de imagem SVG em paisagem, centralizada no viewport.
- Mobile continua usando `100dvh` e os assets mobile anteriores, sem mudanca visual
  intencional.
- A decisao reverte apenas a parte full screen da atualizacao anterior; o fluxo real de
  onboarding permanece inalterado.

Validacao adicional:

- Browser local com usuario paciente temporario real validou desktop `1920x879` com shell
  `1280x720` centralizado e mobile `390x844` sem aplicar as regras desktop.
- Checks completos de frontend foram tentados, mas ficaram bloqueados por erros
  preexistentes em arquivos fora desta decisao (`app/psychologists` e `community/[slug]`).
