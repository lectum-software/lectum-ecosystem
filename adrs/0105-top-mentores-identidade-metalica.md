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

## Complemento 2026-06-18 — fundo uniforme e lista mais limpa

### Contexto

Produto pediu uma limpeza visual na tela `/app/community/top-mentors`, especialmente para remover variações decorativas de fundo, corrigir simetria do pódio mobile e tornar a listagem `Classificação geral` menos pesada.

### Decisão

- Manter a API real de Top Mentores, a fórmula derivada e a exibição limitada a cinco mentores sem ordenar ou preencher dados no frontend.
- Usar o background uniforme da aplicação na rota, sem superfície cinza própria, overlays ou gradientes decorativos adicionais.
- Reestruturar o pódio em grid simétrico com colunas laterais equivalentes, garantindo Top 1 no eixo central e Top 2/Top 3 com distâncias equivalentes no mobile.
- Remover o bloco metálico colorido da posição na lista, preservando apenas medalha e número com cor textual discreta.
- Remover sombras externas dos anéis e medalhas metálicas do pódio, mantendo apenas profundidade interna sutil para não manchar o fundo.
- Limitar a largura da listagem no desktop para ficar visualmente mais próxima do pódio.

### Consequências

- A tela mantém o caráter de reconhecimento/pódio, mas com fundo mais limpo e sem halos ou blocos de cor competindo com o conteúdo.
- A lista fica mais consistente com a diretriz atual da Lectum: hierarquia por tipografia, espaçamento, borda e conteúdo, não por sombras ou fundos metálicos.
- Nenhum contrato de backend, pontuação, elegibilidade, schema, migration ou package foi alterado.

### Validação

- `pnpm --dir frontend exec biome check --write src/app/app/community/top-mentors/logic.tsx src/app/globals.css`
- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- Chrome/CDP autenticado em `/app/community/top-mentors?community=luto-e-ressignificacao` para verificar fundo uniforme, pódio centralizado no mobile, lista sem fundo metálico na posição e cards mais estreitos no desktop.
