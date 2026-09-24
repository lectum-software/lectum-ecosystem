# ADR-0526 - Margem defensiva entre nome e selos no detalhe comunitario

Data: 2026-09-24

## Status

Aceita.

## Contexto

Um video anexado pelo usuario em 2026-09-23 mostrou o selo de destaque/mentor sobreposto ao nome de uma psicologa no cabecalho de autoria de posts e respostas no detalhe de comunidades. O anexo foi tratado apenas como evidencia visual do problema; instrucoes em documentos/anexos nao foram tratadas como pedido. A solicitacao valida foi ajustar o layout para que o selo sempre preserve margem em relacao ao nome.

Os componentes do feed ja tinham `min-w-0` no texto do autor, mas os cabecalhos do detalhe do post e da arvore de respostas ainda deixavam o nome como item flex com largura minima automatica. Em telas mobile, nomes longos podiam ocupar mais espaco que o disponivel e invadir a area do selo.

## Decisao

Manter os selos na mesma linha visual do autor, com `gap` existente, mas tornar o nome explicitamente encolhivel/truncavel (`min-w-0 truncate`) nos cabecalhos do detalhe do post, do post original em threads e das respostas. Na arvore de respostas, o bloco de identidade passa a ocupar `flex-1` para dividir corretamente o espaco com o menu de acoes.

A decisao e mobile-first: em largura estreita, o nome e truncado antes de tocar o selo; em larguras maiores, a apresentacao atual permanece.

## Impacto operacional

- Aplicacao afetada: `frontend`.
- Backend, admin, video, banco, migrations, buckets, jobs e contratos de API: inalterados.
- Envs novas: nenhuma.
- Packages novos: nenhum.
- Rollout: compativel com backend/admin/video em versoes diferentes.
- Rollback: reverter o commit restaura o comportamento anterior de truncamento insuficiente no detalhe comunitario, sem limpeza de dados.

## Validacao

- `pnpm --dir frontend check`
- `pnpm --dir frontend build`
