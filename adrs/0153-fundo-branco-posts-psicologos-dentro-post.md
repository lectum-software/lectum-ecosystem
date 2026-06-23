# ADR 0153: Fundo branco para posts e respostas de psicologos dentro do post

Data: 2026-06-23

## Status

Aceito

## Contexto

A tela de detalhe do post destacava arvores de respostas de psicologos verificados com fundo azul claro. O usuario pediu que, dentro do post, todos os posts e respostas usem fundo branco, inclusive os conteudos de psicologos.

## Decisao

Remover o fundo azulado condicionado ao autor psicologo/verificado nos cards de respostas dentro do detalhe do post. O destaque de confianca continua vindo de selo de verificado, badge de mentor e CTA de WhatsApp, sem alterar a cor de fundo do card.

O card do post original tambem deve manter fundo branco em repouso e hover, para evitar variacao visual azulada dentro da tela de detalhe.

## Consequencias

- A hierarquia visual fica mais neutra e consistente entre pacientes e psicologos.
- Psicologos continuam identificaveis por elementos semanticos e de conversao, nao por background.
- Estados temporarios de foco/scroll podem continuar usando destaque proprio quando necessario, desde que nao sejam confundidos com destaque permanente por tipo de autor.

## Validacao

- Validar visualmente no detalhe do post, especialmente em comentarios/respostas de psicologos com e sem midia.
- Executar checks/build do frontend e checks gerais do monorepo.
