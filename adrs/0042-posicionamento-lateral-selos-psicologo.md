# ADR-0042: Posicionamento lateral dos selos no card de psicólogo

## Status

Accepted

## Task relacionada

Ajuste visual do card de psicólogo após solicitação de alinhamento dos elementos do overlay.

## Contexto

Após centralizar os ícones de ação (favoritar/compartilhar) no lado direito, o fluxo de produto passou a pedir
que os selos do card (benefícios) acompanhem a mesma lógica visual de empilhamento vertical,
agora posicionados no lado oposto.

## Decisão

- Removi a linha horizontal de selos existente no corpo do overlay.
- Reposicionei os selos como um bloco absoluto com `left: 3.2%`, `top` alinhado ao mesmo ponto de
  ancoragem vertical usado para o botão de favoritar (`calc(100% - (var(--psychologist-overlay-height) + 17%))`).
- Mantive o comportamento atual de texto/altura do selo e adicionei espaçamento vertical interno via `gap`.
- Mantive a orientação e o estilo de visual do selo (truncamento, centralização, raio, borda e tipografia), para preservar
  consistência visual com os blocos anteriores.

## Consequências

- Os selos passam a ficar em coluna vertical no lado esquerdo do card, opostos aos botões de favoritar e compartilhar.
- O fluxo de leitura visual do overlay fica mais simétrico entre lados opostos.
- Não há impacto funcional ou de regra de negócio, apenas de layout.

## Validação

- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- Conferência visual no navegador da listagem de psicólogos e de favoritos.

## Pendências

- Nenhuma.
