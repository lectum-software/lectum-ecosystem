# ADR-0247: Remocao do header global do Admin

## Status

Aceita

## Task relacionada

Ajuste visual avulso do painel Admin, apos TASK-46 e telas TASK-48 a TASK-65.

## Contexto

O shell do app `admin/` renderizava um header global sticky em todas as rotas
protegidas. Esse header continha um atalho de notificacoes e o botao de perfil
com o texto "Admin Lectum" no lado direito. A solicitacao de produto foi remover
esse header de todas as telas do painel, preservando a navegacao lateral e sem
criar comportamento paralelo por rota.

## Decisao

Remover o header global do componente compartilhado `AdminShell`, de modo que a
mudanca alcance todas as telas protegidas do painel de uma vez. O botao de menu
mobile foi mantido dentro do conteudo principal, sem recriar o header, para que
o drawer lateral continue acessivel em telas pequenas.

## Consequencias

- O conteudo das telas Admin passa a iniciar mais acima, sem a faixa superior
  com sino de notificacoes e perfil administrativo.
- A remocao fica centralizada no shell, evitando ajustes duplicados em cada
  rota do painel.
- Em mobile, continua existindo um botao de abertura do menu lateral no topo do
  conteudo; ele nao representa um header global nem inclui notificacoes/perfil.

## Validacao

- `pnpm --dir admin check`
- `pnpm --dir admin build`
- Smoke HTTP local em `http://localhost:3002/trafego` confirmou resposta `200`
  e ausencia das labels do header removido no HTML entregue.

## Pendencias

- Nenhuma.
