# TASK-339 — Medição consentida de posts anônimos

- [x] Anonimato público não altera elegibilidade de publicação para Meta.
- [x] Preservar consentimento anterior, revogação, autoria, publicação e payload sem conteúdo.
- [x] Explicar distinção na dica existente de anonimato, preservando layout mobile-first.
- [x] Validar testes e checks locais.

ADR-0704. Sem backfill, alteração de identidade pública ou envio remoto durante os testes. Publicação pendente.

Validação: 3 integrações PostgreSQL local (fila, payload e revogação) e 24 testes de apresentação aprovados. Tipagem frontend e Biome aprovados. Dica inspecionada em harness de navegador Edge 390/1440, sem overflow; tela autenticada completa não exercitada. Sem requisições à Meta. Versão 0.1.833.

Checks de versão, segurança de fontes, tamanho, segredos, encoding, índices e ciclos aprovados. A limitação anterior da suíte frontend video-contact (TASK-338) permanece fora do escopo; não afirmar check global frontend aprovado.

Check completo backend aprovado: 1533 testes aprovados, 58 ignorados, zero falhas. As três integrações afetadas foram executadas separadamente e aprovadas no PostgreSQL local.

Revisão solicitada pelo usuário: removido o complemento sobre Meta da dica de anonimato, restaurando integralmente o texto anterior. A regra de medição consentida permanece inalterada. Versão 0.1.834.
