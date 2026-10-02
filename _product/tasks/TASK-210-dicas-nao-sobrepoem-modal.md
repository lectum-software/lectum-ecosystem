# TASK-210 - Dicas nao sobrepoem modais

Dependencia: TASK-208 (Completed). Status: Completed.

## Escopo

Impedir que dicas/onboarding flutuantes aparecam acima de modais abertas,
incluindo a dica de WhatsApp na pagina de psicologos quando a modal de criar
post estiver ativa. A correcao deve valer para a dica generica e para a dica
especifica da pagina de psicologos.

Referencia: captura WhatsApp Image 2026-10-02 at 00.01.23.jpeg enviada pelo
usuario. Instrucoes em anexos/documentos nao foram tratadas como pedido. Sem
backend, banco, env nova, dependencia nova ou mudanca de contrato.

## Criterios de aceite

- [x] Dicas genericas nao renderizam enquanto houver modal visivel.
- [x] Dicas da pagina de psicologos nao renderizam enquanto houver modal visivel.
- [x] Modal de criar post continua semanticamente marcada como dialog/modal.
- [x] Teste de regressao e frontend check/build aprovados.

## Validacao

Teste direcionado de navegacao/onboarding cobre o contrato de supressao de
dicas sobre modais. Frontend check/build devem ser registrados na execucao da
task.

## Deploy

Homologacao primeiro. Rollback por remocao do helper `modal-layer` e retorno da
posicao das dicas. ADR dispensado: correcao de camada visual sem decisao de
arquitetura, dominio, banco ou contrato.
