# ADR 0105 — Tratamento visual premium para Top Mentores

## Status

Aceita

## Contexto

A tela de Top Mentores precisava transmitir prestígio e reconhecimento, usando pódium, medalhas e anéis metálicos para diferenciar os três primeiros colocados. Também havia necessidade de remover efeitos de fundo que criavam manchas atrás do pódium e deixavam a composição menos sofisticada.

## Decisão

Aplicar um sistema visual específico para o ranking de mentores no frontend:

- fundo geral cinza uniforme;
- pódium sem card/container decorativo ao redor;
- avatares do Top 1, Top 2 e Top 3 com anéis metálicos baseados nas cores definidas para ouro, prata e bronze;
- medalhas de posição usando as mesmas famílias de metais;
- brilho sutil por CSS, respeitando `prefers-reduced-motion`;
- lista inferior com hierarquia corrigida: `Classificação geral` como título principal e descrição como apoio.

A tela continua consumindo a API real de ranking com `limit: 5`. Não foram adicionados mocks permanentes; quando houver até cinco profissionais elegíveis retornados pela API, todos serão exibidos.

## Consequências

- O tratamento metálico fica centralizado em classes globais reutilizáveis de CSS.
- O pódium passa a depender apenas dos dados reais retornados pelo ranking.
- Caso o ambiente de desenvolvimento precise exibir cinco itens, a base de dados local deve possuir cinco psicólogos elegíveis com sinais de ranking, em vez de preencher a interface com dados falsos.
