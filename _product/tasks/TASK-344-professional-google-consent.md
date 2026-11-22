# TASK-344 — Consentimento no cadastro profissional Google

- [x] Transportar a referência autorizada de visitante pelo formulário e pelo state cifrado do Google para psicólogos.
- [x] Associar o aceite prévio e o identificador de navegador na transação da nova conta.
- [x] Enfileirar professional_registration uma única vez, preservando validação de prazo, revisão, revogação e origem.
- [x] Validar regressões de pacientes, proteção do state e entrega profissional no PostgreSQL local e checks das aplicações.

ADR-0709. Sem alteração visual, migração, cobrança ou recuperação retroativa de consentimento. Cadastro profissional manual permanece fora deste ajuste. Sem push/deploy.

Validação: 12 testes específicos aprovados, incluindo PostgreSQL real local para profissionais e pacientes, sem envio externo. Backend check (1535 aprovados, 59 opcionais ignorados) e build aprovados; frontend check aprovado. Versão 0.1.839 local.
