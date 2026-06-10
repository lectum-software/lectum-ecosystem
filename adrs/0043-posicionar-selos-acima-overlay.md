# ADR-0043: Posicionar selos acima do overlay no card de psicólogo

## Status

Accepted

## Task relacionada

Ajuste visual solicitado para posicionamento de selos no card de psicólogo.

## Contexto

Após mover os selos para uma coluna vertical no lado esquerdo, foi solicitado que eles fiquem abaixo dessa coluna e
"acima do overlay" do card, para manter a separação visual entre ações no painel inferior e badges de benefícios.

## Decisão

- Mantive a pilha vertical de selos no lado esquerdo (`left: 3.2%`).
- Alterei o posicionamento vertical para ser calculado a partir do fim do card:
  - `bottom: calc(var(--psychologist-overlay-height) + 8px)`
- Com isso, o bloco de selos fica imediatamente acima da borda superior do overlay (com pequeno espaçamento), em vez de
  alinhar-se com a base dos botões no mesmo ponto de overlay.
- Preservei a tipografia, altura e espaçamento entre os selos (`gap`) conforme já definidos.

## Consequências

- Os selos ficam visíveis na área superior ao overlay, empilhados verticalmente.
- Mantém a simetria visual com os botões de ação do lado direito e reduz risco de sobreposição excessiva dentro do
  painel de informações.

## Validação

- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- `pnpm check`
- Validação visual no navegador após publicação local da listagem de psicólogos.

## Pendências

- Nenhuma.
