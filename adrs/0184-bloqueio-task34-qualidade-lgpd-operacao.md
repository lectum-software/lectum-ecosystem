# ADR-0184 - Bloqueio da revisão final de qualidade, segurança, LGPD e operação

## Status

Accepted (histórico; superado por exceção explícita em 2026-06-29)

## Contexto

A `TASK-34` é uma revisão final transversal. Ela não entrega uma tela isolada: audita autenticação, autorização por papel, soft delete, paginação, índices Prisma, estados de UI, logs, campos LGPD-sensíveis, documentação mínima de privacidade e operação.

As fontes de verdade atuais impedem concluir essa revisão com segurança:

- A `TASK-29B` continua `Blocked`. Parte dos eventos reais de notificação foi ligada, mas `visualizacao_perfil` e `compartilhamento` ainda não possuem produtores persistidos reais. Criar evento fake, endpoint simulado ou mock violaria a regra central do produto.
- O `README.md` operacional vigente posiciona a `TASK-41` antes da `TASK-34`. A `TASK-41` ainda está `Pending` e as minutas legais em `_product/legal` contêm placeholders de responsável legal, CNPJ/CPF, e-mails, endereço e datas, além de dependerem de aprovação do fundador e revisão jurídica.
- A `TASK-34` exige fluxos LGPD mínimos documentados. Essa documentação não deve ser tratada como concluída enquanto as páginas legais públicas ou seu bloqueio aceito fora do MVP não estiverem resolvidos.

## Decisão

Não executar hardening parcial nem marcar critérios de aceite da `TASK-34` enquanto as dependências finais não estiverem estabilizadas.

A `TASK-34` foi marcada como `Blocked` e deve ser retomada somente quando:

1. A `TASK-41` estiver concluída, ou seu bloqueio legal/editorial tiver sido aceito explicitamente para fora do MVP.
2. As pendências da `TASK-29B` para `visualizacao_perfil` e `compartilhamento` tiverem produtores persistidos reais, ou o produto tiver aceitado explicitamente manter esses eventos fora do MVP sem mock.
3. O escopo final permitir uma auditoria única de rotas, índices, soft delete, paginação, logs, LGPD e operação.

Nenhum package de teste ou observabilidade foi instalado nesta tentativa. Sentry permanece decidido/candidato conforme `PACKAGES.md`, mas não configurado nesta execução bloqueada.

## Consequências

- Evita falsa conclusão de uma task P0 de qualidade e LGPD.
- Preserva a regra de não usar mocks, dados fake permanentes ou endpoints simulados.
- Mantém as minutas legais fora de publicação enquanto contiverem placeholders.
- A execução futura da `TASK-34` deverá rodar os checks/builds relevantes e registrar evidências de auditoria somente após o desbloqueio.

## Task relacionada

- `TASK-34 - Qualidade, segurança, LGPD e operação`
- Dependências observadas: `TASK-29B`, `TASK-41`

## Validações

- Leitura das fontes obrigatórias da skill: `AGENTS.md`, `_product/tasks/README.md`, `ARCHITECTURE.md`, `DATA-MODEL.md`, `PACKAGES.md`, `PROTO-INVENTORY.md`, `ROADMAP-REVALIDADO.md` e arquivo da `TASK-34`.
- Verificação documental dos status de `TASK-29B` e `TASK-41`.
- Sem validação de build/check nesta tentativa porque nenhuma implementação de frontend, backend, Prisma ou package foi realizada.

## Complemento 2026-06-29

O bloqueio desta ADR foi superado para a execução atual:

- `TASK-29B` foi concluída com produtores persistidos reais para `visualizacao_perfil` e `compartilhamento`.
- O produto aceitou explicitamente manter a `TASK-41` fora do MVP por enquanto, sem publicar páginas legais com placeholders.
- A `TASK-34` foi executada e encerrada na ADR-0185 com auditoria de rotas, role guard, soft delete, paginação, logs, LGPD mínima, packages e validações.

Esta ADR permanece como registro da decisão de não executar hardening parcial enquanto as dependências finais não estavam estabilizadas.
