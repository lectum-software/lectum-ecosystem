# ADR-0055: Refatorar tela de psicólogos para layout imersivo mobile 9:16 com destaque no card principal

## Status

Accepted

## Task relacionada

Refatoração da tela `/app/psychologists` baseada em referência visual (modo imersivo), conforme solicitação do usuário.

## Contexto

A listagem anterior de psicólogos usava estrutura tradicional de paginação e cards múltiplos, com excesso de rolagem e comportamento não aderente ao protótipo imersivo. A nova entrega exige:

- card visual em destaque ocupando quase toda a área útil;
- barra de busca e controles sobrepostos na imagem;
- coluna de ações laterais direita;
- overlay de texto com nome, cargo, nota e bio;
- navegação inferior fixa e sem scroll horizontal;
- responsividade entre 320px e 430px usando constantes de layout.

## Decisão

Mantive a rota `/app/psychologists` em único card imersivo, reutilizando dados/filtros já existentes e o fluxo de favoritos/compartilhamento, com as seguintes decisões técnicas:

- remover visualmente o comportamento de listagem vertical e renderizar apenas o primeiro psicólogo em destaque;
- introduzir métricas de layout responsivo (`isSmall`, `horizontalPadding`, `actionButtonSize`, `actionGap`, `titleSize`, `bioSize`, `navBarHeight`, `searchRightGap`);
- implementar estrutura de sobreposição com `position: absolute` para busca, filtros, botão play, ações laterais e bloco de informação;
- preservar `PrivateTemplate` com navegação inferior customizada fixa para evitar sobreposição indevida;
- manter acessibilidade básica via rótulos, labels e atalhos de fechamento do modal (Escape).

## Consequências

- Melhor aderência visual à referência e redução do “ruído” de layout na descoberta de psicólogo.
- Melhor aproveitamento de tela (padrão 9:16 mobile), com redução de complexidade do scroll vertical.
- Há dependência de dados reais (foto/video + metadados), então o estado vazio/filtro continua coberto pela lógica já existente.
- Decisão de manter somente o primeiro item em destaque pode impactar usabilidade de múltiplos profissionais; a paginação foi mantida no serviço, mas não apresentada no layout novo.

## Validação

- `pnpm check`
- `pnpm --dir frontend check`
- `pnpm --dir frontend build`

## Pendências

- Validar com design QA visual no dispositivo se espaçamentos laterais e tamanhos de botões atendem exatamente ao PDF de referência em todos os intervalos de largura.
