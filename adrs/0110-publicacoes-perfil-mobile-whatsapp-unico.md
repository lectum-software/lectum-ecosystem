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
