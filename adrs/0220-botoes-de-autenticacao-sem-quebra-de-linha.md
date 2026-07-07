# ADR-0220: Botões de autenticação sem quebra de linha

## Status

Accepted

## Task relacionada

TASK-35 / ajuste posterior de regressão de UI em 2026-07-07

## Contexto

O gate de área restrita exibido em rotas privadas sem sessão, como `/app/profile`, voltava a quebrar o texto do CTA primário em duas linhas no layout desktop com sidebar. A causa era dupla: o componente base `Button` não impedia quebra de texto por padrão e o CTA usava a copy mais longa `Criar conta grátis` em um grid de duas colunas.

Esse comportamento enfraquece a consistência visual mobile-first/desktop-progressive e já havia sido apontado como regressão recorrente pelo usuário.

## Decisão

- O componente base `Button` passa a herdar `whitespace-nowrap` como padrão do design system Lectum, evitando que labels de botões quebrem linha por acidente.
- Os CTAs de autenticação do gate privado e do prompt progressivo passam a usar a copy curta `Criar conta`, mantendo paridade com `Fazer login`.
- Não foi criado componente paralelo nem pacote novo; a correção fica centralizada na fundação de UI existente.

## Consequências

- Botões do produto ficam mais resistentes a regressões de quebra de linha.
- Labels excepcionalmente longos precisarão ser tratados conscientemente no ponto de uso, com copy mais curta, largura maior ou override explícito se algum fluxo futuro realmente precisar de múltiplas linhas.
- A correção preserva os ícones e o layout responsivo atual.

## Validação

- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
- Browser local em `http://localhost:3000/app/profile` com Chrome headless:
  - desktop `1920x1080`: CTAs `Criar conta` e `Fazer login` renderizados em uma linha;
  - mobile base `390x844`: CTAs renderizados em uma linha no gate privado.

## Pendências

- Nenhuma pendência externa.
