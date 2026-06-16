# ADR 0110 — Publicações compactas no perfil e WhatsApp como ação mobile única

## Status

Aceita

## Task relacionada

TASK-15 — Perfil profissional público

## Contexto

A aba `Publicações` do perfil do psicólogo já reutilizava o card real da comunidade, mas ainda mantinha textos e labels redundantes para o contexto do perfil: frase `X publicações deste profissional`, chip `Resposta`, rótulo `Resposta profissional em destaque`, título interno em respostas e CTA de WhatsApp dentro do card.

No mobile, o perfil também passou a precisar de uma hierarquia mais focada: sem navegação inferior concorrendo com a conversão e com o botão de WhatsApp fixo como ação principal. A seção `Atendimento` precisava reforçar a leitura de categoria acima do conteúdo.

## Decisão

- O perfil continua reutilizando `CommunityPostCard`, mas o componente recebeu o modo opcional `profilePublicationMode`.
- Nesse modo, respostas do profissional são renderizadas como contribuição principal do card: autoria do psicólogo, texto da resposta e mídia da resposta, sem chip `Resposta`, sem título interno e sem rótulo de resposta em destaque.
- A linha de autoria no modo de perfil usa uma linha única com nome truncável, selo verificado preenchido e selo Top Mentor preservados lado a lado.
- Textos de posts e respostas no perfil são limitados a duas linhas com ação inline `... ver mais`, alinhada ao padrão de feed.
- O CTA de WhatsApp foi removido dos cards de publicações do perfil; a conversão fica concentrada no botão fixo geral do perfil.
- O cabeçalho de `Publicações` passa a exibir um chip numérico discreto ao lado do título, removendo a frase abaixo do título.
- No mobile da rota `/app/psychologist/[id]`, a navegação inferior do shell privado fica oculta e o CTA fixo de WhatsApp usa o rodapé como ação principal. O conteúdo recebeu padding inferior suficiente para não ficar coberto.
- Os cards de `Atendimento` passam a renderizar label acima do valor principal, com ícone lateral discreto.

## Consequências

- A aba `Publicações` fica mais próxima do feed/comunidade, mas remove duplicidades que só faziam sentido fora do perfil.
- Respostas profissionais deixam de parecer posts com título artificial.
- O perfil mobile fica mais orientado à conversão por WhatsApp e menos dependente da navegação global inferior.
- A decisão é somente frontend; não altera backend, banco, Prisma, contratos, ordenação de publicações, regras de avaliações, regras de destaque profissional, packages ou persistência.

## Validação

- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- Chrome headless local em 390px na rota `http://localhost:3000/app/psychologist/demo-psychologist-camila-rocha?tab=publicacoes`, confirmando chip numérico ao lado de `Publicações`, ausência da nav inferior mobile, CTA fixo de WhatsApp e card com nome/selo/Top Mentor na mesma linha.
- Chrome headless local em 1440px na mesma rota, confirmando layout desktop preservado e publicações no padrão de card real da comunidade.
- Chrome headless local em 390px na rota `http://localhost:3000/app/psychologist/demo-psychologist-camila-rocha`, confirmando `Atendimento` com labels acima dos valores e CTA fixo sem encobrir a leitura.

## Pendências

Builder/Quick Copy não esteve disponível como ferramenta direta no ambiente; a validação visual foi feita com browser local e comparação com a família visual de perfil/comunidade já implementada.

## Atualizacao 2026-06-16 - CTA de WhatsApp alinhado ao video do perfil

- A secao de video de apresentacao do perfil passou a agrupar video e CTA inline de WhatsApp no mesmo wrapper centralizado.
- O botao inline de WhatsApp respeita a mesma largura util do video: largura total no mobile dentro do card e `sm:max-w-[260px]` no desktop, evitando deslocamento lateral.
- O CTA fixo mobile e o botao flutuante desktop foram preservados para manter a conversao persistente, enquanto o CTA contextual abaixo do video facilita a acao imediata apos assistir.
- A alteracao e somente frontend e nao muda contato, rastreamento de clique WhatsApp, backend, banco, Prisma, contracts ou packages.

Validacao complementar:

- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- Chrome headless local em 390px e 1440px na rota `http://localhost:3000/app/psychologist/demo-psychologist-camila-rocha`, confirmando video e botao alinhados/centralizados com a mesma largura util.

## Atualizacao 2026-06-16 - navegacao contextual nas abas completas

- As abas completas `Publicacoes` e `Avaliacoes` passam a ter cabecalho proprio com seta de retorno para `Geral`, titulo e chip numerico na mesma linha.
- A seta usa a mesma navegacao por query params do perfil: ao voltar para `Geral`, o parametro `tab` e as paginacoes de aba sao removidos, preservando links diretos como `?tab=publicacoes` e `?tab=avaliacoes`.
- A barra sticky desktop `Geral/Publicacoes/Avaliacoes` foi removida para reduzir persistencia visual no desktop; a navegacao desktop permanece contextual dentro das abas e pelos pontos de entrada da aba Geral.
- O sticky mobile existente foi preservado, mantendo o comportamento atual no mobile e adicionando apenas o retorno contextual nas abas completas.
- A alteracao e somente frontend e nao muda backend, banco, Prisma, contratos, ordenacao, avaliacoes, publicacoes, favoritos, WhatsApp ou packages.

Validacao complementar:

- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- Chrome headless/CDP mobile 390px confirmou seta em `Publicacoes`, retorno para `Geral`, seta em `Avaliacoes` e chip de avaliacoes.
- Chrome headless/CDP desktop 1440px confirmou ausencia de `data-profile-sticky-navigation` e de navegacao segmentada fixa visivel.
