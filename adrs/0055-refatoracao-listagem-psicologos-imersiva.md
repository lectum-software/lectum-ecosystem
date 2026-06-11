# ADR-0055: Refatorar tela de psicólogos para layout imersivo mobile 9:16 com destaque no card principal

## Status

Accepted

## Task relacionada

Refatoracao da tela `/app/psychologists` baseada em referencia visual (modo imersivo), conforme solicitacoes do usuario.

## Contexto

A listagem anterior de psicologos usava estrutura tradicional de paginacao e cards multiplos, com excesso de rolagem e comportamento nao aderente ao prototipo imersivo. A nova entrega exige:

- card visual em destaque ocupando quase toda a área útil;
- barra de busca e controles sobrepostos na imagem;
- coluna de ações laterais direita;
- overlay de texto com nome, cargo, nota e bio;
- navegacao inferior fixa e sem scroll horizontal;
- responsividade entre 320px e 430px usando constantes de layout.

Em 2026-06-11, o usuario anexou o PDF `Nova tela psicologos.pdf` como referencia visual principal e explicitou que a tela nao deve criar uma navbar nova. A navbar precisa ser exatamente a mesma usada nas demais telas via `PrivateTemplate`.

## Decisão

Manter a rota `/app/psychologists` em unico card imersivo, reutilizando dados/filtros ja existentes e o fluxo de favoritos/compartilhamento, com as seguintes decisoes tecnicas:

- remover visualmente o comportamento de listagem vertical e renderizar apenas o primeiro psicologo em destaque;
- introduzir métricas de layout responsivo (`isSmall`, `horizontalPadding`, `actionButtonSize`, `actionGap`, `titleSize`, `bioSize`, `navBarHeight`, `searchRightGap`);
- implementar estrutura de sobreposicao com `position: absolute` para busca, filtros, botao play, acoes laterais e bloco de informacao;
- remover a navegacao customizada da tela e reutilizar exclusivamente a navbar padrao renderizada pelo `PrivateTemplate`;
- adicionar `contentClassName` opcional ao `PrivateTemplate` para permitir uma tela imersiva sem padding do `PageShell`, sem alterar a navbar nem o comportamento padrao das demais telas;
- manter a lista da navbar com `w-full` dentro do proprio `PrivateTemplate`, garantindo que os cinco itens continuem distribuidos no viewport mobile quando a tela usa conteudo sem padding;
- recalibrar a escala dos elementos imersivos (botoes laterais, botao de filtro, coluna de acoes e tipografia do overlay) para se aproximar do PDF sem alterar a navbar compartilhada;
- manter acessibilidade básica via rótulos, labels e atalhos de fechamento do modal (Escape).

## Consequências

- Melhor aderencia visual a referencia e reducao do ruido de layout na descoberta de psicologo.
- Melhor aproveitamento de tela (padrao 9:16 mobile), com reducao de complexidade do scroll vertical.
- A navbar volta a seguir exatamente o componente compartilhado usado em Perfil, Perfil Profissional, Setup do Perfil e demais telas privadas.
- Ha dependencia de dados reais (foto/video + metadados), entao o estado vazio/filtro continua coberto pela logica ja existente.
- Decisao de manter somente o primeiro item em destaque pode impactar usabilidade de multiplos profissionais; a paginacao foi mantida no servico, mas nao apresentada no layout novo.

## Validação

- `pnpm check`
- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- browser local em viewport mobile, usando o PDF anexado como comparacao visual.

## Pendências

- Validar com design QA visual no dispositivo fisico se espacamentos laterais e tamanhos de botoes atendem exatamente ao PDF de referencia em todos os intervalos de largura.

### Complemento 2026-06-11: visual matching sem pixel matching

Por orientacao do usuario, a calibracao do layout imersivo passa a ser tratada como **visual matching** e nao como pixel matching. A referencia PDF define hierarquia, peso visual, posicao relativa e sensacao de escala; o codigo nao deve perseguir coordenadas exatas que possam quebrar a responsividade ou a navbar compartilhada.

Decisoes complementares:

- manter a navbar compartilhada como limite arquitetural inalteravel da tela;
- dimensionar o botao de filtro como controle menor que acoes laterais, preservando leitura de busca + filtro no topo;
- ancorar a coluna lateral de acoes no meio-inferior da foto, em vez de centralizar matematicamente a coluna completa;
- tratar nota/rating como pill translucida para aproximar o peso visual da referencia;
- usar metricas por faixa compacta/normal, nao medidas absolutas do PDF.
