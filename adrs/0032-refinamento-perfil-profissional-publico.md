# ADR-0032: Refinamento mobile-first do perfil profissional público

## Status

Accepted

## Task relacionada

TASK-15 (ajuste complementar solicitado sobre a tela pública do psicólogo)

## Contexto

A tela `/app/psychologist/[id]` precisava se aproximar da referência `Perfil Profissional - Sobre.jpg` e do ajuste visual solicitado: remover elementos administrativos/duplicados, reduzir ruído de navegação dentro do perfil e deixar o vídeo de apresentação reproduzível no próprio card.

O endpoint de detalhe já era leitura pública-safe e havia campos persistidos em `psychologist_profile` para cidade/UF de atendimento e `target_audience`, mas esses dados ainda não eram expostos no contrato do perfil público.

## Decisão

- O perfil profissional público continua usando `PrivateTemplate`, mas a rota agora passa `allowAnonymous` e `showNavigation={false}` para não renderizar a navegação inferior dentro da vitrine.
- O card lateral desktop de contato/agenda foi removido; o CTA principal permanece como botão de WhatsApp condicionado ao dado real.
- O vídeo de apresentação passou a ter prévia visual com `next/image` e botão de play; ao acionar, o `<video>` substitui a prévia e reproduz no mesmo local, sem nova aba.
- `target_audience`, `professional_address_city` e `professional_address_state` foram promovidos ao contrato public-safe do perfil público. CPF, e-mail, telefone bruto, tokens e documentos seguem fora da resposta.
- A modalidade presencial/híbrida passa a exibir `Online e Presencial em CIDADE/UF` quando cidade/UF reais existirem.

## Consequências

- A vitrine do psicólogo fica mais fiel ao protótipo mobile-first e sem navegação concorrendo com o conteúdo.
- A API expõe novos campos public-safe já persistidos, sem migration e sem dados fictícios.
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
  - atendimento e público atendido vindos da API real.

## Pendências

- Nenhuma pendência externa nova. Legendas/transcrições para vídeos de profissionais continuam fora deste recorte e devem ser tratadas em task futura de acessibilidade/conteúdo.
