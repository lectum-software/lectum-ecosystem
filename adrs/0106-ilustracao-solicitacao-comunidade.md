# ADR 0106: Ilustração e refinamento visual da solicitação de comunidade

## Status

Aceito

## Contexto

A tela `/app/community/suggest` precisava ficar mais consistente com a família visual das telas internas da Lectum, substituindo a composição ilustrativa criada por ícones por um asset SVG fornecido pelo usuário e reduzindo o peso vertical do header.

## Decisão

- O SVG fornecido foi salvo como asset estático em `frontend/public/images/community-request-illustration.svg`.
- A tela passou a renderizar a ilustração com `next/image`, preservando proporção horizontal e evitando cortes/distorções.
- O header foi compactado para o padrão interno com botão de voltar à esquerda, título centralizado e altura controlada.
- O texto principal e o card do formulário foram refinados usando tokens/classes já existentes do design system da Lectum.

## Consequências

- A tela passa a depender de um asset real versionado no repositório, sem gerar ilustrações por CSS/ícones soltos.
- A experiência mobile e desktop permanece responsiva sem criar nova dependência de pacote.
- A ação de envio e a integração com a API de sugestão de comunidade permanecem inalteradas.