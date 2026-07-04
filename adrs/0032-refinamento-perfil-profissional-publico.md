# ADR-0032: Refinamento mobile-first do perfil profissional público

## Status

Accepted

## Task relacionada

TASK-15 (ajuste complementar solicitado sobre a tela pública do psicólogo)

## Contexto

A tela `/app/psychologist/[id]` precisava se aproximar da referência `Perfil Profissional - Sobre.jpg` e do ajuste visual solicitado: remover elementos administrativos/duplicados, reduzir ruído de navegação dentro do perfil e deixar o vídeo de apresentação reproduzível no próprio card.

O endpoint de detalhe já era leitura pública-safe e havia campos persistidos em `psychologist_profile` para cidade/UF de atendimento, `target_audience` e formações acadêmicas, mas esses dados ainda não eram expostos no contrato do perfil público.

## Decisão

- O perfil profissional público continua usando `PrivateTemplate`, mas a rota agora passa `allowAnonymous` e `showNavigation={false}` para não renderizar a navegação inferior dentro da vitrine.
- O card lateral desktop de contato/agenda foi removido; o CTA principal permanece como botão de WhatsApp condicionado ao dado real.
- O vídeo de apresentação passou a ter prévia visual com `next/image` e botão de play; ao acionar, o `<video>` substitui a prévia e reproduz no mesmo local, sem nova aba.
- `target_audience`, `professional_address_city` e `professional_address_state` foram promovidos ao contrato public-safe do perfil público. CPF, e-mail, telefone bruto, tokens e documentos seguem fora da resposta.
- `academic_formations` também foi promovido ao contrato public-safe do perfil público, mantendo fallback nos campos legados `academic_title`, `academic_institution` e `academic_graduation_year`.
- A modalidade presencial/híbrida passa a exibir `Online e Presencial em CIDADE/UF` quando cidade/UF reais existirem.
- A aba Sobre exibe a seção `Formação e Títulos` entre `Sobre` e `Atendimento`, usando apenas formações persistidas ou estado vazio em PT-BR.

- A faixa promocional superior passou a ser derivada dos selos reais do perfil (`discount_first_session`, `accepts_insurance` e `social_value`), fica oculta quando não há selo marcado e usa `position: sticky` para permanecer no topo durante a rolagem.
- O chip de avaliação abaixo do nome só aparece quando há reviews reais; perfis sem avaliação deixam de exibir a cópia "Sem avaliações" nessa região.
- O vídeo da aba Sobre foi normalizado para proporção 16:9, e o bloco hero/abas passou a ser uma superfície branca contínua com bordas e sombras mais discretas, em linguagem mais sóbria inspirada em feeds sociais/profissionais.
- O hero do perfil passou a espelhar as tags de benefício do card da listagem de psicólogos, exibindo experiência e selos reais abaixo da bio, mantendo a faixa sticky como destaque superior.
- A disponibilidade no hero deixa de usar fundo verde; o avatar fica redondo; o header ganha uma separação inferior fina; e a aba Sobre/Publicações/Avaliações perde a borda superior para reduzir ruído visual.
- A capa do vídeo de apresentação passa a ser o próprio vídeo pausado, sem `poster` derivado de avatar/foto de perfil, para evitar divergência entre imagem de capa e conteúdo do vídeo.
- A faixa promocional azul foi retirada do perfil; a comunicação de selos fica concentrada nas tags abaixo da bio para evitar duplicidade visual.
- A linha de profissão/CRP do hero passa a reutilizar a tipografia do rótulo `Psicólogo` do card de listagem (`text-[0.66rem]`, `font-extrabold`, `uppercase`, `tracking-[0.16em]`, `text-subtle`) e fica mais próxima do indicador de disponibilidade.

## Consequências

- A vitrine do psicólogo fica mais fiel ao protótipo mobile-first e sem navegação concorrendo com o conteúdo.
- A API expõe novos campos public-safe já persistidos, sem migration e sem dados fictícios.
- Formações aparecem na vitrine pública sem criar seeds ou conteúdo artificial; perfis sem formação mantêm mensagem vazia controlada.
- A prévia do vídeo depende de avatar público real; quando não existir avatar, a UI usa iniciais do profissional como fallback visual, sem mock externo.
- A tela fica acessível também sem sessão, coerente com a leitura caller-neutral do diretório.

## Validação

- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm --dir backend check`
- `pnpm --dir backend build`
- `pnpm check`
- Browser local via Chrome headless/CDP em `390x1200` e desktop `1366x1000` na rota `/app/psychologist/cmq5m0vse000ftkuhybmagcn6`:
  - sem navegação inferior;
  - sem card lateral de contato/agenda;
  - banner com `VALOR SOCIAL`;
  - vídeo com prévia e play local;
  - atendimento, formação/títulos e público atendido vindos da API real.

Ajuste complementar de 2026-06-09:

- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- Browser local via Chrome headless/CDP em 390px e desktop 1440px na rota `/app/psychologist/cmq5m0vse000ftkuhybmagcn6`:
  - vídeo renderizado em proporção 16:9 (`videoRatio=1.78`);
  - texto "Sem avaliações" ausente abaixo do nome;
  - espaço entre hero e menu removido (`heroBottom` igual ao topo do menu em mobile);
  - strip promocional oculto corretamente porque o perfil local persistido está com os três selos desmarcados (`discount_first_session=false`, `accepts_insurance=false`, `social_value=false`).

Ajuste complementar de header/tags:

- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- Browser local via Chrome headless/CDP em 390px na rota `/app/psychologist/cmq5m0vse000ftkuhybmagcn6`:
  - header com `border-bottom: 1px`;
  - avatar redondo no hero;
  - disponibilidade com fundo transparente;
  - tags de experiência, convênio, valor social e desconto abaixo da bio;
  - menu de abas com `border-top: 0px`.

Ajuste complementar de capa do vídeo:

- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- Browser local via Chrome headless/CDP em 390px na rota `/app/psychologist/cmq5m0vse000ftkuhybmagcn6`:
  - nenhum `<img>` dentro do card de vídeo (`imageCountInsideVideo=0`);
  - preview usa `<video aria-hidden="true">` com `src` igual ao `video_url` real;
  - preview sem `poster` de avatar;
  - proporção 16:9 preservada (`ratio=1.78`).

Ajuste complementar de tipografia e faixa:

- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- Browser local via Chrome headless/CDP em 390px na rota `/app/psychologist/cmq5m0vse000ftkuhybmagcn6`:
  - faixa azul superior ausente (`promoStripExists=false`);
  - texto `PSICÓLOGO • CRP 04/123456` com `font-size=10.56px`, `font-weight=800`, `text-transform=uppercase` e cor `rgb(148, 163, 184)`;
  - gap entre linha CRP e disponibilidade reduzido para `4px`.

## Pendências

- Nenhuma pendência externa nova. Legendas/transcrições para vídeos de profissionais continuam fora deste recorte e devem ser tratadas em task futura de acessibilidade/conteúdo.

Ajuste complementar de alinhamento ao PDF em 2026-06-12:

- O perfil público `/app/psychologist/[id]` foi refinado a partir do PDF `Perfil psicólogo (1).pdf` e do texto anexado pelo usuário como referência visual, mantendo a arquitetura e os dados reais existentes.
- A mídia do topo passou a ter altura maior e overlay suave; o card principal se sobrepõe à mídia com avatar maior, nome mais forte, selo verificado preso à última palavra e metadados compactos.
- Especialidades foram separadas em seção própria com chips derivados de `profile.specialties`, sem fallback fictício; a seção Atendimento concentra Modalidade, Abordagens, Serviços, Público atendido e Idiomas.
- O refinamento ficou restrito ao frontend da rota pública; não houve migration, alteração de contrato, novo pacote ou dado artificial.

Validação complementar:

- `pnpm --dir frontend biome:fix`
- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- HTTP 200 em `http://localhost:3000/app/psychologist/cmq5m0vse000ftkuhybmagcn6`
- Chrome headless em 390px confirmando hero maior, card sobreposto, abas e CTA fixo renderizados.

Ajuste complementar de navegação sticky em 2026-06-12:

- O menu de seções do perfil público deixou de usar abas tradicionais em barra plana e passou a ser um container `sticky` mobile-first com duas linhas: identificação compacta do psicólogo e chips de navegação.
- A primeira linha exibe nome em uma única linha com `truncate`, preservando o selo verificado como elemento `shrink-0` para não quebrar nem desaparecer em nomes longos.
- A segunda linha mantém a mesma lógica de abas existente, sem recarregar a rota e sem alterar dados, mas troca o rótulo visual `Geral` por `Sobre` e usa chips translúcidos com fundo glass, borda sutil e destaque azul Lectum na seção ativa.
- O sticky fica abaixo do card principal no estado inicial e usa `top: env(safe-area-inset-top, 0px)` ao fixar, com `z-index` abaixo do CTA fixo de WhatsApp para não cobrir o botão inferior.
- Não houve alteração de backend, contrato, banco, packages, conteúdo das seções ou lógica de WhatsApp.

Validação complementar:

- `pnpm --dir frontend biome:fix`
- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- Chrome headless/CDP em 390px na rota `/app/psychologist/cmq5m0vse000ftkuhybmagcn6`:
  - menu existente abaixo do card principal (`top=468` antes do scroll);
  - após rolagem, menu fixado no topo (`top=0`, `position=sticky`, `z-index=20`);
  - chips `Sobre`, `Publicações` e `Avaliações` renderizados, com `Sobre` ativo;
  - selo verificado visível na linha do nome.

Ajuste complementar de hierarquia e previews em 2026-06-12:

- A capa do perfil público foi reduzida para preservar espaço na primeira dobra, mantendo-a como mídia independente de identidade visual.
- A ação `Editar perfil` foi adicionada sobre a capa apenas quando o usuário autenticado é o próprio psicólogo (`role=psicologo` e `user.id` igual ao perfil exibido), sem expor a ação a pacientes ou visitantes.
- A experiência deixou de aparecer como texto na linha de metadados do hero; permanece somente como chip de benefício, respeitando a preferência persistida `show_experience_tag`.
- A avaliação do hero passa a exibir apenas `⭐ N,N`, sem quantidade de reviews; a contagem fica concentrada nas áreas de avaliação.
- A bio curta no card principal e a apresentação textual da aba Sobre são renderizadas completas, sem mecanismo de expansão/truncamento, e com peso visual menor.
- O vídeo de apresentação do perfil passou para proporção vertical 9:16, evitando mídia achatada/horizontal quando o profissional usa vídeos verticais.
- O CTA inferior foi simplificado para apenas o botão fixo de WhatsApp; a caixa explicativa anterior foi removida para reduzir ruído.
- A aba Geral ganhou previews com dados reais de avaliações e publicações: avaliações antes de Atendimento e publicações após Formação & Títulos, reutilizando os endpoints paginados existentes também quando a aba ativa é `geral`.

Validação complementar do ajuste de hierarquia/previews:

- `pnpm --dir frontend biome:fix`
- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- HTTP 200 em `/app/psychologist/cmq5m0vse000ftkuhybmagcn6`.
- Chrome headless/CDP em 360px, 375px e 390px:
  - sem `Ver mais`/`Ver menos` e sem caixa `Para consultar agenda...`;
  - CTA fixo de WhatsApp presente;
  - capa mobile com 196px;
  - linha de metadados sem experiência solta e sem quantidade de reviews entre parênteses;
  - vídeo de apresentação renderizado em 9:16 (`214x379`);
  - sem overflow horizontal;
  - seções da aba Geral em ordem: `Sobre`, `Especialidades`, `Avaliações`, `Atendimento`, `Formação & Títulos`, `Publicações`.

Ajuste complementar de menu sticky leve em 2026-06-12:

- A identificacao compacta do psicologo no menu sticky passa a aparecer somente quando o container realmente esta preso ao topo (`isStuck=true`).
- O estado inicial abaixo do card principal exibe apenas os chips de navegacao, evitando uma linha extra com nome antes do scroll.
- O fundo solido do container foi removido no estado inicial; os chips usam fundo branco/translucido, borda sutil e sombra minima para parecerem elementos flutuantes conectados ao card.
- Quando sticky, o container aplica apenas uma camada glass leve com `rgba(255,255,255,0.72)`, `backdrop-blur` e borda inferior sutil.
- A logica das abas, query params, conteudo das secoes e dados do perfil nao foram alterados.

Validacao complementar do menu sticky leve:

- `pnpm --dir frontend biome:fix`
- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- HTTP 200 em `/app/psychologist/cmq5m0vse000ftkuhybmagcn6`.
- Chrome headless/CDP em 390px:
  - estado inicial com apenas 3 chips, `hasName=false`, fundo transparente e sem barra branca solida;
  - apos scroll, menu fixado em `top=0`, `hasName=true`, selo verificado presente, fundo `rgba(255,255,255,0.72)` e `backdrop-filter: blur(12px)`.

Ajuste complementar de capa compacta e navegacao segmentada em 2026-06-12:

- A capa do perfil publico foi compactada para reduzir o peso visual da primeira dobra, mantendo a sobreposicao do card principal e a identidade visual independente.
- A acao `Editar perfil` permanece condicionada ao proprio psicologo autenticado, mas agora usa apenas botao circular com icone de lapis para reduzir ruido visual no topo.
- O card principal continua exibindo a bio completa, sem clamp ou expansao.
- A secao `Sobre` concentra o comportamento expansivel para textos longos, com `line-clamp-3` inicial e acao `Ver mais`/`Ver menos` quando necessario.
- A navegacao das secoes foi alterada de chips independentes para um controle segmentado unico, inspirado em segmented controls modernos, com container translucido e aba ativa em destaque suave.
- Nao houve alteracao de backend, Prisma, contrato, dados, rotas ou logica de navegacao.

Validacao complementar da capa compacta e navegacao segmentada:

- `pnpm --dir frontend biome:fix`
- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- HTTP 200 em `/app/psychologist/cmq5m0vse000ftkuhybmagcn6`.
- Chrome headless/CDP em 390px:
  - capa renderizada com 118px e card principal sobreposto;
  - hero sem `Ver mais`/`Ver menos`;
  - secao `Sobre` com `line-clamp: 3` e botao `Ver mais`;
  - navegacao segmentada unica com 3 botoes e fundo translucido;
  - estado inicial sem nome no menu sticky e sem barra branca solida;
  - apos scroll, menu no topo com nome+selo, fundo `rgba(255,255,255,0.72)` e blur;
  - sem overflow horizontal.

## Atualizacao 2026-06-12: hierarquia visual premium do perfil publico

A tela publica do psicologo foi refinada para priorizar leitura profissional, usando o LinkedIn apenas como referencia de hierarquia: nome forte, subtitulo legivel, texto confortavel e conteudo de secoes com contraste suficiente.

A decisao foi nao alterar dados, rotas, contratos ou funcionalidades. O ajuste ficou restrito a escala, contraste, line-height, padding e compactacao vertical. O card principal agora destaca `nome -> profissao/CRP/avaliacao -> bio -> chips`, enquanto as secoes internas deixam de parecer rotulos administrativos e passam a funcionar como blocos de conteudo editorial.

Tambem foi ajustado o estado sem avaliacoes: em vez de enfatizar `0,0` e estrelas vazias, a interface exibe um estado vazio compacto e discreto. Cards de atendimento e formacao foram compactados para leitura tipo linha informativa, sem desperdiçar altura.

Validacoes executadas: `pnpm --dir frontend biome:fix`, `pnpm --dir frontend check`, `pnpm --dir frontend build`, `pnpm check` e HTTP 200 na rota publica local do perfil.

## Ajuste complementar em 2026-06-12 - estado vazio de avaliações consistente com publicações

A tela pública do psicólogo mantém a hierarquia premium, mas o estado vazio de `Avaliações` foi simplificado para seguir o mesmo padrão de `Publicações`. Quando não há avaliações, a interface agora mostra somente a mensagem textual `Este profissional ainda não possui avaliações.`, sem nota zero, estrelas, contador, gráfico ou ícone de rating.

A decisão reduz ruído visual e evita que a ausência de dados pareça um indicador negativo do profissional. Quando existem avaliações, a UI continua exibindo nota média, estrelas, quantidade e cards normalmente. Não houve alteração de backend, contratos, rotas ou persistência.

Validações executadas: `pnpm --dir frontend check`, `pnpm --dir frontend build`, `pnpm check` e HTTP 200 na rota pública local do perfil.

## Ajuste complementar em 2026-06-12 - largura util do card principal mobile

O card principal do perfil publico foi refinado para preservar a composicao premium do PDF, sem migrar para uma estrutura tipo LinkedIn. A decisao foi manter avatar sobreposto a capa e nome ao lado da foto, mas reduzir o impacto horizontal do avatar no mobile e remover o botao de favorito do fluxo textual.

O favorito passa a flutuar no topo do card, o avatar mobile fica mais compacto e o nome usa escala responsiva com `clamp`, mantendo hierarquia forte em telas estreitas. O container mobile tambem passa a evitar overflow horizontal, para que a composicao caiba na viewport sem cortes laterais. Nao houve mudanca de dados, rotas, contratos, backend, Prisma ou packages.

Validacoes executadas: `pnpm --dir frontend check`, `pnpm --dir frontend build`, `pnpm check` e HTTP 200 na rota publica local do perfil.

## Ajuste complementar em 2026-06-16 - refinamento premium das seções e sticky mobile tardio

O perfil público do psicólogo recebeu um novo refinamento visual solicitado pelo usuário para separar melhor a experiência mobile da desktop e elevar a leitura das seções internas.

Decisões:

- A navegação sticky mobile passa a ser um header fixo independente, exibido somente depois que o usuário passa pelo conteúdo inicial do perfil/vídeo. Esse header mostra nome + selo verificado e as abas `Geral`, `Publicações` e `Avaliações` em controle segmentado discreto.
- A navegação sticky anterior fica restrita ao desktop, evitando duplicidade visual no mobile e mantendo o comportamento de abas/query params já existente.
- A ação das abas no header mobile preserva `router.replace`, não altera a lógica de dados e apenas adiciona scroll suave para o container de conteúdo.
- As seções de Atendimento, Formação, Avaliações e Publicações foram refinadas por composição, espaçamento, contraste, sombra e hierarquia, sem aumentar excessivamente a altura e sem mudar contrato/API.
- Os botões `Ver todas` viraram chips discretos com fonte controlada por estilo inline de 13px, porque os estilos globais de `button { font: inherit; }` ficam fora das layers do Tailwind e podem sobrescrever utilitários de texto em botões.
- O botão flutuante desktop do WhatsApp ganhou keyframe global para a animação já referenciada pela classe Tailwind arbitrária; o próprio uso de `motion-safe` mantém respeito a `prefers-reduced-motion`.
- O vídeo de apresentação não recebeu nova lógica neste recorte: permanece usando o `VerticalVideoPlayer` compartilhado, que já preserva proporção, fundo preto e fullscreen.

Consequências:

- Mobile fica mais limpo na primeira dobra e só apresenta o header persistente quando ele passa a agregar contexto.
- Desktop mantém navegação sticky sem regressão funcional.
- As seções internas ficam mais humanas e premium usando dados reais existentes.
- Não houve alteração em backend, Prisma, contrato, persistência, packages, favoritos, contato/WhatsApp ou regras de publicação/avaliação.

Validações executadas:

- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- HTTP local 200 em `http://localhost:3002/app/psychologist/demo-psychologist-camila-rocha`.
- Chrome headless/CDP em 390px confirmando renderização com API local, header mobile fixo após scroll (`top=0`, `opacity=1`, aba ativa `Geral`), seções principais presentes e chips `Ver todas` discretos.

## Ajuste complementar em 2026-06-16 - sticky complementar, menu fixo e cards de atendimento

O perfil público do psicólogo recebeu refinamento visual adicional para corrigir conflito percebido entre o novo sticky mobile e a navegação fixa da aplicação, além de ajustar a hierarquia dos cards internos.

Decisões:

- A rota dinâmica `/app/psychologist/:id` passa a ser reconhecida pela navegação mobile do shell privado, mantendo o menu fixo original disponível durante toda a navegação e destacando `Psicólogos` como origem contextual.
- O sticky mobile de perfil permanece tardio e complementar: continua aparecendo apenas após scroll, mas usa z-index menor que as camadas principais de navegação para não substituir visualmente o menu fixo.
- O CTA mobile de WhatsApp deixa de ocupar o rodapé absoluto e passa a usar a variável global de espaçamento da navegação (`--lectum-mobile-nav-aware-fab-bottom`), ficando acima do menu fixo sem sobreposição.
- O card informativo `Quer falar com o profissional?` foi elevado para a mesma família visual das seções do perfil, com padding maior, título mais legível e texto descritivo em escala compatível.
- Os cards de Atendimento inverteram a hierarquia visual para `informação -> categoria -> ícone`, removendo fundo circular e sombra azul dos ícones. O ícone agora é apenas apoio visual discreto à direita.

Consequências:

- Mobile preserva o menu fixo da aplicação e adiciona o sticky como camada contextual, sem trocar a navegação principal.
- O CTA de WhatsApp permanece presente, mas não bloqueia a navegação inferior.
- Atendimento, Formação, Avaliações, Especialidades, Publicações e o card de contato passam a comunicar uma família visual mais consistente.
- Não houve alteração de dados, contratos, backend, Prisma, persistência, packages, favoritos, regras de avaliação ou fluxo de WhatsApp.

Validações executadas: `pnpm --dir frontend check`, `pnpm --dir frontend build`, `pnpm check`, HTTP 200 local no perfil demo e Chrome headless/CDP em 390px e 1440px validando menu fixo, sticky, CTA, contato e cards de Atendimento.

## Ajuste complementar em 2026-06-17 - CTA de avaliações condicionado à assinatura

A seção `Avaliações` da aba `Geral` passou a usar a assinatura profissional ativa/cortesia (`profile.verified`) como regra de exposição de CTA:

- assinantes/verificados com avaliações exibem `Ver todas` para navegar à aba completa;
- assinantes/verificados sem avaliações exibem `Avaliar`, levando diretamente ao fluxo de criação de avaliação daquele psicólogo;
- perfis gratuitos não exibem botão algum nessa seção, mesmo que tenham avaliações legadas ou nenhum dado, e o header não reserva espaço vazio.

A decisão transforma a coleta de avaliações em benefício perceptível do plano profissional sem alterar a elegibilidade real da TASK-17, que continua sendo validada no fluxo `/app/reviews/new` pelo backend. O ajuste ficou restrito ao frontend do perfil público, sem mudança de contrato, Prisma, persistência, packages, WhatsApp ou navegação das abas completas.

Validações executadas: `pnpm --dir frontend check`, `pnpm --dir frontend build`, `pnpm check` e Chrome/CDP mobile nas rotas demo cobrindo assinante com avaliações, assinante temporário sem avaliações e gratuito sem avaliações. A assinatura temporária criada para validação foi removida ao final.

## Ajuste complementar em 2026-07-04 - copy vazia de publicações

O estado vazio de `Publicações` no perfil público do psicólogo passa a usar a frase `Este profissional ainda não fez nenhuma publicação.` tanto na prévia da aba `Geral` quanto na aba completa `Publicações`.

A decisão remove a expressão mais técnica/ambígua `publicações públicas` ou `publicações persistidas e publicadas`, preservando a contagem real `0` e sem alterar backend, contratos, persistência, ordenação, layout estrutural ou regras de publicação.

Validações executadas: `pnpm --dir frontend check`, `pnpm --dir frontend build`, `pnpm check` e Chrome headless local 390x844 em `/psychologists/cmr6pzpbn000h5guht478a9l4?tab=publicacoes`.
