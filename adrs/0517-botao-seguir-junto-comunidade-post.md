# ADR-0517: Botao de seguir junto ao nome da comunidade no detalhe do post

## Status

Accepted

## Task relacionada

TASK-26

## Contexto

No detalhe mobile do post, o cabecalho contextual exibe `Postado em`, o nome da comunidade e o controle de seguir. A captura enviada pelo usuario em `c:/Users/tulio/Downloads/WhatsApp Image 2026-09-17 at 21.34.56.jpeg` mostrou o botao `Seguir` visualmente alinhado a direita, separado do nome da comunidade, o que enfraquece a associacao entre acao e comunidade. O texto da imagem foi tratado apenas como conteudo visual; a instrucao ativa e o pedido do usuario nesta conversa.

A referencia visual ativa para a tela segue `_product/proto/Dentro do Post.jpg`. O Builder/Quick Copy foi tentado via CLI em `frontend/`, mas o cache local do `npx` retornou `ENOENT`, entao a execucao usou screenshot do usuario e imagem local como fallback auditavel.

## Decisao

No `PostHeader` do detalhe do post, o link do nome da comunidade deixa de ocupar todo o espaco restante da linha. Ele permanece truncavel e com `min-w-0`, mas passa a usar largura de conteudo encolhivel (`shrink`) para que o botao `Seguir`/`Seguindo` fique imediatamente ao lado do nome quando houver espaco, sem voltar ao alinhamento a direita.

## Consequencias

- O controle de seguir fica visualmente associado ao nome da comunidade no mobile.
- Nomes longos continuam protegidos por truncamento antes de deslocar ou encolher o botao.
- O ajuste e restrito a UI do detalhe do post e nao altera persistencia de seguir, analytics, rotas ou contratos.
- Se no futuro houver outros badges contextuais na mesma linha, deve-se manter a ordem nome -> seguir -> badges com itens de acao `shrink-0`.

## Producao e rollout

- Compatibilidade com dados existentes: total, pois nenhuma estrutura de dados muda.
- Banco/migration: sem alteracao.
- Envs: nenhuma env nova ou alterada; sem **ALERTA DE DEPLOY**.
- Compatibilidade entre apps: frontend novo funciona com backend atual e antigo porque nao altera payloads.
- Ordem de deploy: apenas frontend via push em `homolog`.
- Rollback: reverter o commit do frontend.
- Smoke de homologacao: validar o detalhe de post em viewport mobile apos deploy, conferindo que `Seguir`/`Seguindo` fica junto ao nome da comunidade.

## Validacao

- Validacao estatica confirmou que o link da comunidade no `PostHeader` usa `max-w-full shrink truncate` em vez de `flex-1`.
- `pnpm --dir frontend check`.
- `pnpm --dir frontend build`.
- `pnpm check`.
- Smoke local/browser mobile quando disponivel no ambiente.

## Pendencias

- Smoke visual final em homologacao apos o push, pois `homolog` dispara deploy automatico.