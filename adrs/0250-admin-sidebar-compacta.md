# ADR-0250: Sidebar compacta no Admin

## Status

Aceita

## Task relacionada

Ajuste visual avulso do painel Admin, após TASK-46.

## Contexto

O menu lateral esquerdo do app `admin/` estava ocupando largura excessiva no
desktop, reduzindo a área útil das telas administrativas. A solicitação de
produto foi diminuir essa largura sem recriar o shell, sem alterar navegação e
sem afetar autenticação, APIs ou dados reais.

Referência visual local consultada: `_product/proto/admin/Dashboard.png`.
Builder/Quick Copy não esteve disponível como ferramenta neste ambiente; a
implementação usou a imagem local e a solicitação visual do produto.

## Decisão

Reduzir a sidebar expandida no desktop de `w-72` para `w-60` e ajustar o padding
do conteúdo protegido de `lg:pl-72` para `lg:pl-60`, mantendo a largura
recolhida em `w-20`.

Para preservar a coerência mobile-first, o drawer móvel também foi levemente
compactado de `min(84vw, 320px)` para `min(80vw, 300px)`.

## Consequências

- As telas Admin ganham mais área horizontal útil no desktop.
- A navegação lateral continua compartilhada, responsiva e acessível pelo mesmo
  componente `AdminShell`.
- Rótulos longos permanecem truncáveis pela implementação já existente, sem
  criar overflow horizontal.
- Não houve mudança de pacote, backend, banco, rotas ou contrato de API.

## Validação

- `pnpm --dir admin check`
- `pnpm --dir admin build`
- Smoke HTTP local em `http://localhost:3002/psicologos` retornou `200`.

## Pendências

- Nenhuma.
